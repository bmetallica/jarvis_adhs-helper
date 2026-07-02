#!/usr/bin/env node
/*
 * ADHS-Helper — schlanker statischer Produktions-Server (abhängigkeitsfrei, nur Node-Bordmittel).
 *
 * Liefert den gebauten PWA-Ordner `dist/` aus, mit:
 *   - SPA-Fallback (Hash-Router; unbekannte Pfade → index.html)
 *   - korrekten MIME-Typen (inkl. .webmanifest)
 *   - kein Caching für index.html und sw.js (immer frische Shell / Service-Worker-Update)
 *   - optionalem TLS (HTTPS) via Zertifikat/Key — wichtig für PWA-Features & sicheren Kontext
 *   - sauberem Pfad-Schutz (kein Verzeichnis-Ausbruch)
 *
 * Konfiguration ausschließlich über Umgebungsvariablen (passt zum systemd-EnvironmentFile):
 *   HOST            Bind-Adresse      (Default 0.0.0.0 = alle Interfaces im LAN)
 *   PORT            Port              (Default 8090)
 *   DIST_DIR        Auszuliefernder Ordner (Default <repo>/dist)
 *   TLS_CERT        Pfad zum Zertifikat (PEM) — wenn gesetzt + TLS_KEY: HTTPS statt HTTP
 *   TLS_KEY         Pfad zum privaten Schlüssel (PEM)
 *   JARVIS_UPSTREAM JARVIS-Gateway-URL (z. B. https://192.168.1.224:8088) — aktiviert den PROXY
 *   JARVIS_KEY      Plugin-API-Key (jvp_…), wird serverseitig injiziert (nie im Browser)
 *   JARVIS_INSECURE "1" = selbstsigniertes Upstream-Zertifikat akzeptieren (LAN-Default sinnvoll)
 *
 * Architektur:
 *   - Liefert das statische PWA-Frontend aus `dist/` aus.
 *   - Ist JARVIS_UPSTREAM gesetzt, wirkt der Server zusätzlich als ZENTRALER PROXY: Anfragen an
 *     /api/* (inkl. WebSocket /api/v1/ws) werden an JARVIS weitergeleitet, der Plugin-Key wird
 *     serverseitig injiziert. Dadurch: zentrale Konfiguration (einmal hier statt in jedem Client),
 *     Key bleibt geheim, kein CORS-/Zertifikatsproblem im Browser (same-origin). Siehe KONZEPT/DEPLOY.
 */

import http from "node:http";
import https from "node:https";
import crypto from "node:crypto";
import { createReadStream, existsSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { b64url, makeToken as makeTokenWith, verifyToken as verifyTokenWith } from "./authtoken.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseInt(process.env.PORT || "8090", 10);
const DIST = path.resolve(process.env.DIST_DIR || path.join(ROOT, "dist"));

// --- Proxy-Konfiguration (optional) ---
const JARVIS_UPSTREAM = (process.env.JARVIS_UPSTREAM || "").replace(/\/+$/, "");
const JARVIS_KEY = process.env.JARVIS_KEY || "";
const JARVIS_INSECURE = process.env.JARVIS_INSECURE === "1";
const PROXY_ENABLED = JARVIS_UPSTREAM.length > 0;
const upstreamUrl = PROXY_ENABLED ? new URL(JARVIS_UPSTREAM) : undefined;
const upstreamTls = upstreamUrl?.protocol === "https:";
const insecureAgent = upstreamTls ? new https.Agent({ rejectUnauthorized: !JARVIS_INSECURE }) : undefined;

// --- Master-Authentifizierung (für Internet-Exposition) ---
// Wenn APP_PASSWORD gesetzt ist, verlangt der Server vor JEDEM Zugriff auf /api/* und den WS ein
// gültiges Session-Cookie (per Login mit dem Masterpasswort). So ist JARVIS hinter dem Proxy
// geschützt — ein reines Client-Passwort würde den Proxy NICHT schützen.
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const AUTH_REQUIRED = APP_PASSWORD.length > 0;
// Secret für die Cookie-Signatur. Ohne festes Secret invalidiert ein Neustart alle Sessions.
const SESSION_SECRET = process.env.APP_SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 Tage
const COOKIE = "adhs_sess";

function makeToken() {
  return makeTokenWith(SESSION_SECRET, SESSION_TTL_MS);
}
function verifyToken(tok) {
  return verifyTokenWith(SESSION_SECRET, tok);
}
function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function isAuthed(req) {
  if (!AUTH_REQUIRED) return true;
  return verifyToken(parseCookies(req.headers.cookie)[COOKIE]);
}
function isHttps(req) {
  return Boolean(req.socket.encrypted) || req.headers["x-forwarded-proto"] === "https";
}
function passwordMatches(pw) {
  const a = crypto.createHash("sha256").update(String(pw)).digest();
  const b = crypto.createHash("sha256").update(APP_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

// --- Web-Push (RFC 8291/8292, abhängigkeitsfrei mit node:crypto) ---
// Architektur: Der CLIENT ist die Quelle der Erinnerungen (Termine/Fristen/Medikation) und lädt
// seinen „Erinnerungs-Plan" hierher hoch; der SERVER ist nur der Wecker, der fällige Einträge
// als Push zustellt — auch wenn die App geschlossen ist. VAPID-Schlüssel werden beim ersten
// Start erzeugt und in DATA_DIR persistiert.
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const PUSH_FILE = path.join(DATA_DIR, "push.json");
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

let pushState = { vapid: null, subs: {} };

function loadPushState() {
  try {
    pushState = JSON.parse(readFileSync(PUSH_FILE, "utf8"));
  } catch {
    pushState = { vapid: null, subs: {} };
  }
  if (!pushState.vapid) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    // Roher, unkomprimierter öffentlicher Punkt (65 Bytes) = die letzten 65 Bytes des SPKI-DER.
    const spki = publicKey.export({ type: "spki", format: "der" });
    pushState.vapid = {
      publicKey: b64url(spki.subarray(spki.length - 65)),
      privatePem: privateKey.export({ type: "pkcs8", format: "pem" }),
    };
    savePushState();
  }
}

let pushSaveTimer = null;
function savePushState() {
  if (pushSaveTimer) return;
  pushSaveTimer = setTimeout(() => {
    pushSaveTimer = null;
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      // 0600: enthält den privaten VAPID-Schlüssel und den ICS-Token.
      writeFileSync(PUSH_FILE, JSON.stringify(pushState), { mode: 0o600 });
    } catch (err) {
      console.error("[adhs-helper] Push-Status nicht speicherbar:", err.message);
    }
  }, 1500);
}

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

// Payload-Verschlüsselung nach RFC 8291 (aes128gcm).
function encryptPayload(sub, payloadBuf) {
  const uaPublic = Buffer.from(sub.keys.p256dh, "base64url"); // 65 Bytes
  const authSecret = Buffer.from(sub.keys.auth, "base64url"); // 16 Bytes
  const ecdh = crypto.createECDH("prime256v1");
  const asPublic = ecdh.generateKeys();
  const ecdhSecret = ecdh.computeSecret(uaPublic);
  const salt = crypto.randomBytes(16);

  const prkKey = hmac(authSecret, ecdhSecret);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = hmac(prkKey, Buffer.concat([keyInfo, Buffer.from([1])])).subarray(0, 32);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01", "latin1")).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01", "latin1")).subarray(0, 12);

  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const ct = Buffer.concat([
    cipher.update(Buffer.concat([payloadBuf, Buffer.from([2])])), // 0x02 = letzter Record
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  const header = Buffer.concat([salt, rs, Buffer.from([65]), asPublic]);
  return Buffer.concat([header, ct]);
}

// VAPID-JWT (ES256, JOSE-Signatur r||s) für den Push-Dienst des Browsers.
function vapidJwt(audience) {
  const enc = (o) => b64url(JSON.stringify(o));
  const unsigned = `${enc({ typ: "JWT", alg: "ES256" })}.${enc({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })}`;
  const sig = crypto.sign("sha256", Buffer.from(unsigned), {
    key: pushState.vapid.privatePem,
    dsaEncoding: "ieee-p1363",
  });
  return `${unsigned}.${b64url(sig)}`;
}

/** Einen Push an ein Abo senden. Entfernt tote Abos (404/410) selbst. */
function sendPush(endpointKey, payloadObj) {
  return new Promise((resolve) => {
    const entry = pushState.subs[endpointKey];
    if (!entry) return resolve(false);
    let body;
    try {
      body = encryptPayload(entry.sub, Buffer.from(JSON.stringify(payloadObj)));
    } catch {
      return resolve(false);
    }
    const url = new URL(entry.sub.endpoint);
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        method: "POST",
        path: url.pathname + url.search,
        headers: {
          TTL: "3600",
          Urgency: "high",
          "Content-Type": "application/octet-stream",
          "Content-Encoding": "aes128gcm",
          "Content-Length": body.length,
          Authorization: `vapid t=${vapidJwt(`${url.protocol}//${url.host}`)}, k=${pushState.vapid.publicKey}`,
        },
      },
      (res) => {
        res.resume();
        if (res.statusCode === 404 || res.statusCode === 410) {
          delete pushState.subs[endpointKey]; // Abo existiert nicht mehr
          savePushState();
        }
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      },
    );
    req.on("error", () => resolve(false));
    req.end(body);
  });
}

const endpointKeyOf = (endpoint) => crypto.createHash("sha256").update(String(endpoint)).digest("hex").slice(0, 24);

// Wecker: fällige Plan-Einträge zustellen (alle 30 s). Verpasstes > 30 min alt wird still verworfen.
function tickPushPlans() {
  const now = Date.now();
  let changed = false;
  for (const [key, entry] of Object.entries(pushState.subs)) {
    for (const item of entry.plan || []) {
      if (item.fired) continue;
      if (item.at > now) continue;
      item.fired = true;
      changed = true;
      if (now - item.at <= 30 * 60000) {
        void sendPush(key, { title: item.title, body: item.body || "", tag: item.id, url: "/" });
      }
    }
  }
  if (changed) savePushState();
}

function handlePushRoutes(pathname, req, res) {
  if (!pathname.startsWith("/push/")) return false;
  if (AUTH_REQUIRED && !isAuthed(req)) {
    send(res, 401, { "Content-Type": "application/json" },
      JSON.stringify({ error: { code: "unauthorized", message: "Anmeldung erforderlich.", status: 401 } }));
    return true;
  }
  if (pathname === "/push/key" && req.method === "GET") {
    send(res, 200, { "Content-Type": "application/json", "Cache-Control": "no-store" },
      JSON.stringify({ key: pushState.vapid.publicKey }));
    return true;
  }
  if (req.method !== "POST") {
    send(res, 405, { "Content-Type": "text/plain" }, "Method Not Allowed");
    return true;
  }
  readBody(req, (raw) => {
    let body = {};
    try { body = JSON.parse(raw || "{}"); } catch { body = {}; }
    const ok = () => send(res, 200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true }));

    if (pathname === "/push/subscribe" && body.sub?.endpoint && body.sub?.keys?.p256dh) {
      const key = endpointKeyOf(body.sub.endpoint);
      pushState.subs[key] = { sub: body.sub, plan: pushState.subs[key]?.plan || [], updatedAt: Date.now() };
      savePushState();
      return ok();
    }
    if (pathname === "/push/unsubscribe" && body.endpoint) {
      delete pushState.subs[endpointKeyOf(body.endpoint)];
      savePushState();
      return ok();
    }
    if (pathname === "/push/plan" && body.endpoint && Array.isArray(body.items)) {
      const key = endpointKeyOf(body.endpoint);
      const entry = pushState.subs[key];
      if (!entry) return send(res, 404, { "Content-Type": "application/json" },
        JSON.stringify({ error: { code: "not_subscribed", message: "Kein Push-Abo für dieses Gerät." } }));
      // fired-Markierungen für unveränderte Einträge übernehmen (kein Doppel-Push).
      const oldFired = new Set((entry.plan || []).filter((i) => i.fired).map((i) => i.id));
      entry.plan = body.items.slice(0, 300).map((i) => ({
        id: String(i.id).slice(0, 120),
        at: Number(i.at) || 0,
        title: String(i.title).slice(0, 140),
        body: String(i.body || "").slice(0, 240),
        fired: oldFired.has(String(i.id)),
      }));
      entry.updatedAt = Date.now();
      savePushState();
      return ok();
    }
    if (pathname === "/push/test" && body.endpoint) {
      void sendPush(endpointKeyOf(body.endpoint), {
        title: "Test-Erinnerung 🔔",
        body: "Push funktioniert — auch bei geschlossener App.",
        tag: "test",
      }).then((sent) =>
        send(res, sent ? 200 : 502, { "Content-Type": "application/json" }, JSON.stringify({ ok: sent })));
      return;
    }
    send(res, 400, { "Content-Type": "application/json" },
      JSON.stringify({ error: { code: "bad_request", message: "Ungültige Push-Anfrage." } }));
  });
  return true;
}

// --- ICS-Kalender-Feed (read-only, Token-geschützt) ---
// Die App lädt ihre Termine hierher hoch (wie den Push-Plan); native Kalender-Apps abonnieren
// /calendar.ics?token=… — Termine landen so auf dem Sperrbildschirm der ganzen Familie.
function ensureIcsState() {
  if (!pushState.ics) {
    pushState.ics = { token: crypto.randomBytes(16).toString("hex"), items: [] };
    savePushState();
  }
  return pushState.ics;
}

function icsEscape(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsDate(ms) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildIcs(items) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//adhs-helper//DE",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:ADHS-Helper Familie",
  ];
  for (const it of items) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsEscape(it.id)}@adhs-helper`,
      `DTSTAMP:${icsDate(Date.now())}`,
      `DTSTART:${icsDate(it.startsAt)}`,
      `DTEND:${icsDate(it.endsAt || it.startsAt + 3600_000)}`,
      `SUMMARY:${icsEscape(`${it.icon ? it.icon + " " : ""}${it.title}`)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function handleIcsRoutes(pathname, url, req, res) {
  // Öffentlicher (Token-geschützter) Feed — Kalender-Apps können keine Cookies senden.
  if (pathname === "/calendar.ics") {
    const ics = ensureIcsState();
    const given = url.searchParams.get("token") || "";
    const a = crypto.createHash("sha256").update(given).digest();
    const b = crypto.createHash("sha256").update(ics.token).digest();
    if (!crypto.timingSafeEqual(a, b)) {
      send(res, 403, { "Content-Type": "text/plain" }, "Forbidden");
      return true;
    }
    send(res, 200, { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-cache" }, buildIcs(ics.items || []));
    return true;
  }
  if (!pathname.startsWith("/ics/")) return false;
  if (AUTH_REQUIRED && !isAuthed(req)) {
    send(res, 401, { "Content-Type": "application/json" },
      JSON.stringify({ error: { code: "unauthorized", message: "Anmeldung erforderlich.", status: 401 } }));
    return true;
  }
  if (pathname === "/ics/info" && req.method === "GET") {
    const ics = ensureIcsState();
    send(res, 200, { "Content-Type": "application/json", "Cache-Control": "no-store" },
      JSON.stringify({ path: `/calendar.ics?token=${ics.token}` }));
    return true;
  }
  if (pathname === "/ics/data" && req.method === "POST") {
    readBody(req, (raw) => {
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch { body = {}; }
      if (!Array.isArray(body.items)) {
        return send(res, 400, { "Content-Type": "application/json" },
          JSON.stringify({ error: { code: "bad_request", message: "items fehlt." } }));
      }
      const ics = ensureIcsState();
      ics.items = body.items.slice(0, 500).map((i) => ({
        id: String(i.id).slice(0, 80),
        title: String(i.title).slice(0, 140),
        icon: String(i.icon || "").slice(0, 4),
        startsAt: Number(i.startsAt) || 0,
        endsAt: Number(i.endsAt) || 0,
      }));
      savePushState();
      send(res, 200, { "Content-Type": "application/json" }, JSON.stringify({ ok: true }));
    });
    return true;
  }
  send(res, 404, { "Content-Type": "application/json" },
    JSON.stringify({ error: { code: "not_found", message: "Unbekannter ICS-Endpunkt." } }));
  return true;
}

// Einfaches Login-Rate-Limit gegen Brute Force (pro IP).
const loginFails = new Map();
function rlBlocked(ip) {
  const e = loginFails.get(ip);
  return e && e.count >= 8 && e.until > Date.now();
}
function rlFail(ip) {
  const e = loginFails.get(ip) || { count: 0, until: 0 };
  e.count += 1;
  e.until = Date.now() + 5 * 60000;
  loginFails.set(ip, e);
}
function readBody(req, cb) {
  let d = "";
  req.on("data", (c) => {
    d += c;
    if (d.length > 100000) req.destroy();
  });
  req.on("end", () => cb(d));
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

// Dateien, die nie gecacht werden dürfen (frische Shell / SW-Updates).
const NO_CACHE = new Set(["/index.html", "/sw.js", "/manifest.webmanifest"]);

function contentType(file) {
  return MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
}

// Sicherheits-Header (defensiv; nichts, was lokale Nutzung bricht).
// connect-src erlaubt bewusst auch fremde Hosts: im Direkt-Modus (ohne Proxy) spricht der
// Browser JARVIS im LAN direkt an. style-src 'unsafe-inline' wegen Inline-Styles (Farben).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' https: wss: http: ws:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join("; ");

function securityHeaders(req) {
  const h = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "Content-Security-Policy": CSP,
    "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
  };
  // HSTS nur hinter TLS (direkt oder via Reverse-Proxy) — sonst sperrt man sich HTTP-Zugriff.
  if (isHttps(req)) h["Strict-Transport-Security"] = "max-age=31536000";
  return h;
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body) res.end(body);
  else res.end();
}

function serveFile(req, res, file) {
  const ext = path.extname(file).toLowerCase();
  const rel = "/" + path.relative(DIST, file).split(path.sep).join("/");
  const headers = { "Content-Type": contentType(file) };

  if (NO_CACHE.has(rel) || ext === ".html") {
    headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
  } else if (file.includes(`${path.sep}assets${path.sep}`)) {
    // Vite-Assets sind content-hashed → lange cachen.
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else {
    headers["Cache-Control"] = "public, max-age=3600";
  }

  Object.assign(headers, securityHeaders(req));

  res.writeHead(200, headers);
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}

// Leitet eine HTTP-Anfrage an /api/* an das JARVIS-Gateway weiter, Key serverseitig injiziert.
function proxyHttp(req, res) {
  const targetPath = req.url; // inkl. Query
  const headers = { ...req.headers };
  delete headers.host; // Upstream-Host selbst setzen
  headers.host = upstreamUrl.host;
  if (JARVIS_KEY) headers["authorization"] = `Bearer ${JARVIS_KEY}`;

  const lib = upstreamTls ? https : http;
  const upReq = lib.request(
    {
      protocol: upstreamUrl.protocol,
      hostname: upstreamUrl.hostname,
      port: upstreamUrl.port || (upstreamTls ? 443 : 80),
      method: req.method,
      path: targetPath,
      headers,
      agent: insecureAgent,
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    },
  );
  upReq.on("error", (err) => {
    send(res, 502, { "Content-Type": "application/json" },
      JSON.stringify({ error: { code: "upstream_unavailable", message: err.message, status: 502 } }));
  });
  req.pipe(upReq);
}

function handler(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    let pathname = decodeURIComponent(url.pathname);

    // Web-Push: Schlüssel, Abo, Erinnerungs-Plan, Test (Session-geschützt wie /api/*).
    if (handlePushRoutes(pathname, req, res)) return;

    // ICS-Kalender: Feed (Token) + Daten-Upload (Session).
    if (handleIcsRoutes(pathname, url, req, res)) return;

    // Health-Endpoint für Uptime-Monitoring (ungated, verrät nichts Sensibles).
    if (pathname === "/healthz") {
      return send(res, 200, { "Content-Type": "application/json", "Cache-Control": "no-store" },
        JSON.stringify({ ok: true, uptimeSec: Math.round(process.uptime()) }));
    }

    // App-Konfiguration für den Client (z. B. ob der Proxy aktiv ist) — immer same-origin lesbar.
    if (pathname === "/app-config.json") {
      return send(res, 200, { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        JSON.stringify({ proxy: PROXY_ENABLED, authRequired: AUTH_REQUIRED }));
    }

    // --- Auth-Endpunkte (ungated) ---
    if (pathname === "/auth/status") {
      return send(res, 200, { "Content-Type": "application/json", "Cache-Control": "no-store" },
        JSON.stringify({ required: AUTH_REQUIRED, authed: isAuthed(req) }));
    }
    if (pathname === "/auth/login") {
      if (req.method !== "POST") return send(res, 405, { "Content-Type": "text/plain" }, "Method Not Allowed");
      const ip = req.socket.remoteAddress || "?";
      if (rlBlocked(ip)) {
        return send(res, 429, { "Content-Type": "application/json" },
          JSON.stringify({ error: { code: "rate_limited", message: "Zu viele Versuche. Kurz warten." } }));
      }
      return readBody(req, (body) => {
        let pw = "";
        try { pw = JSON.parse(body || "{}").password || ""; } catch { pw = ""; }
        if (!AUTH_REQUIRED || !passwordMatches(pw)) {
          rlFail(ip);
          return send(res, 401, { "Content-Type": "application/json" },
            JSON.stringify({ error: { code: "bad_password", message: "Falsches Passwort." } }));
        }
        loginFails.delete(ip);
        const cookie = `${COOKIE}=${makeToken()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}` + (isHttps(req) ? "; Secure" : "");
        return send(res, 200, { "Content-Type": "application/json", "Set-Cookie": cookie }, JSON.stringify({ ok: true }));
      });
    }
    if (pathname === "/auth/logout") {
      const cookie = `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` + (isHttps(req) ? "; Secure" : "");
      return send(res, 200, { "Content-Type": "application/json", "Set-Cookie": cookie }, JSON.stringify({ ok: true }));
    }

    // Proxy: alle /api/* an JARVIS weiterleiten (jede Methode) — NUR mit gültiger Session.
    if (pathname.startsWith("/api/")) {
      if (AUTH_REQUIRED && !isAuthed(req)) {
        return send(res, 401, { "Content-Type": "application/json" },
          JSON.stringify({ error: { code: "unauthorized", message: "Anmeldung erforderlich.", status: 401 } }));
      }
      if (!PROXY_ENABLED) {
        return send(res, 404, { "Content-Type": "application/json" },
          JSON.stringify({ error: { code: "no_proxy", message: "Kein JARVIS_UPSTREAM konfiguriert.", status: 404 } }));
      }
      return proxyHttp(req, res);
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return send(res, 405, { "Content-Type": "text/plain" }, "Method Not Allowed");
    }

    if (pathname === "/") pathname = "/index.html";

    // Pfad-Schutz: aufgelöster Pfad muss innerhalb von DIST bleiben.
    const target = path.normalize(path.join(DIST, pathname));
    if (!target.startsWith(DIST)) {
      return send(res, 403, { "Content-Type": "text/plain" }, "Forbidden");
    }

    if (existsSync(target) && statSync(target).isFile()) {
      return serveFile(req, res, target);
    }

    // SPA-Fallback: alles andere → index.html (Client-Router übernimmt).
    const index = path.join(DIST, "index.html");
    if (existsSync(index)) return serveFile(req, res, index);

    return send(res, 404, { "Content-Type": "text/plain" }, "Not Found");
  } catch (err) {
    send(res, 500, { "Content-Type": "text/plain" }, "Internal Server Error");
    console.error("[adhs-helper] Fehler:", err);
  }
}

function start() {
  // Web-Push initialisieren (VAPID-Schlüssel laden/erzeugen) und Wecker starten.
  loadPushState();
  setInterval(tickPushPlans, 30_000);

  if (!existsSync(DIST) || !existsSync(path.join(DIST, "index.html"))) {
    console.error(
      `[adhs-helper] Build nicht gefunden unter ${DIST}.\n` +
        `             Bitte zuerst 'npm ci && npm run build' ausführen.`,
    );
    process.exit(1);
  }

  const useTls = process.env.TLS_CERT && process.env.TLS_KEY;
  let server;
  let scheme = "http";

  if (useTls) {
    try {
      const opts = {
        cert: readFileSync(process.env.TLS_CERT),
        key: readFileSync(process.env.TLS_KEY),
      };
      server = https.createServer(opts, handler);
      scheme = "https";
    } catch (err) {
      console.error(`[adhs-helper] TLS-Zertifikat/Key nicht lesbar: ${err.message}`);
      process.exit(1);
    }
  } else {
    server = http.createServer(handler);
  }

  // Saubere, verständliche Fehlerbehandlung statt eines unhandled 'error'-Stacktrace.
  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      console.error(
        `[adhs-helper] Port ${PORT} auf ${HOST} ist bereits belegt.\n` +
          `             Bitte in /etc/adhs-helper.env einen freien PORT setzen ` +
          `(z. B. 8096) und 'sudo systemctl restart adhs-helper'.\n` +
          `             Belegung prüfen mit:  sudo ss -ltnp | grep :${PORT}`,
      );
    } else {
      console.error(`[adhs-helper] Server-Fehler: ${err && err.message ? err.message : err}`);
    }
    process.exit(1);
  });

  // WebSocket-Proxy für /api/v1/ws → JARVIS (Upgrade durchreichen, Key injizieren).
  if (PROXY_ENABLED) {
    server.on("upgrade", (req, clientSocket, head) => {
      if (!req.url.startsWith("/api/")) {
        clientSocket.destroy();
        return;
      }
      // WebSocket nur mit gültiger Session (sonst könnte man JARVIS-Events ungeschützt beziehen).
      if (AUTH_REQUIRED && !isAuthed(req)) {
        clientSocket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        clientSocket.destroy();
        return;
      }
      const headers = { ...req.headers };
      headers.host = upstreamUrl.host;
      if (JARVIS_KEY) headers["authorization"] = `Bearer ${JARVIS_KEY}`;

      const lib = upstreamTls ? https : http;
      const upReq = lib.request({
        protocol: upstreamUrl.protocol,
        hostname: upstreamUrl.hostname,
        port: upstreamUrl.port || (upstreamTls ? 443 : 80),
        method: req.method,
        path: req.url,
        headers,
        agent: insecureAgent,
      });
      upReq.on("upgrade", (upRes, upSocket, upHead) => {
        const lines = [
          "HTTP/1.1 101 Switching Protocols",
          ...Object.entries(upRes.headers).map(([k, v]) => `${k}: ${v}`),
          "",
          "",
        ];
        clientSocket.write(lines.join("\r\n"));
        if (upHead && upHead.length) clientSocket.write(upHead);
        upSocket.pipe(clientSocket);
        clientSocket.pipe(upSocket);
        const cleanup = () => {
          upSocket.destroy();
          clientSocket.destroy();
        };
        upSocket.on("error", cleanup);
        clientSocket.on("error", cleanup);
      });
      upReq.on("error", () => clientSocket.destroy());
      upReq.end();
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`[adhs-helper] läuft auf ${scheme}://${HOST}:${PORT}  (dist: ${DIST})`);
    if (PROXY_ENABLED) {
      console.log(`[adhs-helper] Proxy aktiv → JARVIS ${JARVIS_UPSTREAM}${JARVIS_INSECURE ? " (self-signed ok)" : ""}`);
    }
    console.log(
      AUTH_REQUIRED
        ? "[adhs-helper] Master-Auth AKTIV (Login erforderlich für /api/*)."
        : "[adhs-helper] Master-Auth aus (kein APP_PASSWORD) — nur fürs LAN geeignet.",
    );
    if (AUTH_REQUIRED && !process.env.APP_SESSION_SECRET) {
      console.log("[adhs-helper] Hinweis: APP_SESSION_SECRET setzen, sonst sind Sessions nach Neustart ungültig.");
    }
    if (!useTls) {
      console.log(
        "[adhs-helper] Hinweis: ohne TLS sind PWA-Installation/Web-Push eingeschränkt. " +
          "Für IP+Self-Signed siehe deploy/gen-cert.sh, langfristig Reverse-Proxy (KONZEPT.md §10).",
      );
    }
  });

  // Sauberes Herunterfahren für systemd (SIGTERM/SIGINT).
  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start();
