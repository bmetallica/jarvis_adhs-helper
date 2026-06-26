// jarvis-client — das EINZIGE Tor zum JARVIS-Gateway (/api/v1/*). Kein UI-Code ruft fetch direkt.
// Enthält die Lastschonung aus KONZEPT §8: Queue, Single-Flight, Backoff, Cache.
// Endpunkte gemäß material/pluginsystem.md (Anhang A). KI-Methoden werden in Schritt 6 genutzt.
import { get } from "svelte/store";
import { settings } from "../stores/settings";
import { profiles } from "../stores/profiles";
import { RequestQueue, type Priority } from "./queue";

export interface JarvisConfig {
  base: string; // z. B. https://192.168.1.224:8088
  key: string; // jvp_...
}

export class JarvisError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string = "error",
  ) {
    super(message);
    this.name = "JarvisError";
  }
}

const queue = new RequestQueue(2);

// In-Memory: laufende identische Anfragen (Single-Flight) + Kurzzeit-Cache.
const inflight = new Map<string, Promise<unknown>>();
const cache = new Map<string, { value: unknown; expiry: number }>();

// Proxy-Modus: zentral über den ADHS-Server konfiguriert (Key serverseitig, same-origin).
let proxyMode = false;
export function isProxyMode(): boolean {
  return proxyMode;
}

/** Beim Start die Server-Konfiguration laden (entscheidet Proxy vs. direkte Verbindung). */
export async function loadAppConfig(): Promise<void> {
  try {
    const r = await fetch("/app-config.json", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      proxyMode = !!j.proxy;
    }
  } catch {
    proxyMode = false;
  }
}

function cfg(): JarvisConfig | null {
  // Proxy-Modus: same-origin, kein Key im Browser (Server injiziert ihn).
  if (proxyMode) return { base: "", key: "" };
  const s = get(settings);
  if (!s.jarvisBaseUrl || !s.jarvisKey) return null;
  return { base: s.jarvisBaseUrl.replace(/\/+$/, ""), key: s.jarvisKey };
}

export function isConfigured(): boolean {
  return cfg() !== null;
}

// Optionaler Handler für 401 (Session abgelaufen / nicht eingeloggt) — von auth.ts gesetzt.
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  unauthorizedHandler = fn;
}

/** Aktiven JARVIS-Nutzer bestimmen (Profil-Mapping → Name). */
function resolveUser(explicit?: string | null): string | null {
  if (explicit) return explicit;
  const s = get(settings);
  const p = get(profiles).find((x) => x.id === s.activeProfileId);
  return p?.jarvisUser || p?.name || null;
}

function headers(user?: string | null, extra: Record<string, string> = {}): HeadersInit {
  const c = cfg();
  const h: Record<string, string> = { "X-JARVIS-API": "v1", ...extra };
  // Im Proxy-Modus injiziert der Server den Key — Browser sendet keinen Authorization-Header.
  if (!proxyMode && c?.key) h["Authorization"] = `Bearer ${c.key}`;
  const u = resolveUser(user);
  if (u) h["X-JARVIS-User"] = u;
  return h;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface CoreOpts {
  priority?: Priority;
  user?: string | null;
  signal?: AbortSignal;
  retries?: number; // bei 429/502
}

/** Kern-Request mit Backoff bei Überlast (429) / Upstream weg (502). */
async function core<T>(
  method: string,
  path: string,
  body: unknown,
  opts: CoreOpts = {},
  raw = false,
): Promise<T> {
  const c = cfg();
  if (!c) throw new JarvisError("JARVIS nicht konfiguriert", 0, "unconfigured");
  const url = `${c.base}/api/v1${path}`;
  const isForm = body instanceof FormData;
  const maxRetries = opts.retries ?? 2;

  const exec = async (): Promise<T> => {
    let attempt = 0;
    for (;;) {
      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers: headers(opts.user, isForm ? {} : body != null ? { "Content-Type": "application/json" } : {}),
          body: isForm ? body : body != null ? JSON.stringify(body) : undefined,
          signal: opts.signal,
        });
      } catch (e) {
        // Netzfehler (Server aus, Zertifikat nicht akzeptiert, LAN weg).
        throw new JarvisError(
          "Keine Verbindung zu JARVIS (Netz/Zertifikat prüfen).",
          0,
          "network",
        );
      }

      // Graceful Degradation bei Überlast/Upstream — kurzer Backoff, dann erneut.
      if ((res.status === 429 || res.status === 502 || res.status === 503) && attempt < maxRetries) {
        const wait = 600 * Math.pow(2, attempt) + Math.random() * 300;
        attempt++;
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        if (res.status === 401) unauthorizedHandler?.();
        let code = "error";
        let msg = `Fehler ${res.status}`;
        try {
          const j = await res.json();
          msg = j?.error?.message ?? j?.detail ?? msg;
          code = j?.error?.code ?? code;
        } catch {
          /* kein JSON */
        }
        throw new JarvisError(msg, res.status, code);
      }

      if (raw) return res as unknown as T;
      const ct = res.headers.get("content-type") ?? "";
      return (ct.includes("application/json") ? await res.json() : await res.text()) as T;
    }
  };

  return queue.add(exec, opts.priority ?? "normal");
}

/** GET mit Single-Flight + optionalem Kurzzeit-Cache. */
async function cachedGet<T>(path: string, opts: CoreOpts & { cacheMs?: number } = {}): Promise<T> {
  const ckey = `GET:${path}:${resolveUser(opts.user) ?? ""}`;
  const now = Date.now();
  const hit = cache.get(ckey);
  if (hit && hit.expiry > now) return hit.value as T;
  if (inflight.has(ckey)) return inflight.get(ckey) as Promise<T>;

  const p = core<T>("GET", path, null, opts).then((v) => {
    if (opts.cacheMs) cache.set(ckey, { value: v, expiry: now + opts.cacheMs });
    inflight.delete(ckey);
    return v;
  }).catch((e) => {
    inflight.delete(ckey);
    throw e;
  });
  inflight.set(ckey, p);
  return p;
}

// ---------------------------------------------------------------------------
// Öffentliche API (Endpunkte gemäß pluginsystem.md Anhang A)
// ---------------------------------------------------------------------------

export interface MeInfo {
  user: string | null;
  user_id: number | null;
  scopes: string[];
  plugin: string;
}

export const jarvis = {
  /** Eigener Kontext/Scopes — auch für „Verbindung testen". */
  me(user?: string | null): Promise<MeInfo> {
    return core<MeInfo>("GET", "/me", null, { priority: "high", user, retries: 0 });
  },

  /** Liste der bedienbaren Nutzer (Familienmitglieder) — zentrale Account-Quelle. */
  users(): Promise<{ users: { name?: string; username?: string; id?: number }[] } | string[] | { name: string }[]> {
    return core("GET", "/users", null, { priority: "high", retries: 0 });
  },

  // --- LLM (Schritt 6) ---
  chat(
    payload: {
      system_prompt?: string;
      messages: { role: string; content: string }[];
      model?: string;
      think?: boolean;
      max_tokens?: number;
    },
    opts: CoreOpts = {},
  ): Promise<{ reply: string; model?: string }> {
    return core("POST", "/inference/chat", { ...payload, stream: false }, { priority: "high", ...opts });
  },

  /** Streaming-Chat (SSE). onSentence je Satz; gibt Volltext zurück. */
  async chatStream(
    payload: {
      system_prompt?: string;
      messages: { role: string; content: string }[];
      model?: string;
      think?: boolean;
      max_tokens?: number;
    },
    onSentence: (text: string) => void,
    opts: CoreOpts = {},
  ): Promise<string> {
    const res = await core<Response>(
      "POST",
      "/inference/chat",
      { ...payload, stream: true },
      { priority: "high", ...opts },
      true,
    );
    const reader = res.body?.getReader();
    if (!reader) return "";
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.sentence) {
            full += (full ? " " : "") + ev.sentence;
            onSentence(ev.sentence);
          }
        } catch {
          /* ignore */
        }
      }
    }
    return full;
  },

  /** Freitext → striktes JSON (Micro-Task-/Termin-Parser). Cacht gleiche Eingaben. */
  structure<T = unknown>(text: string, schema: unknown, opts: CoreOpts = {}): Promise<T> {
    return core<T>("POST", "/inference/structure", { text, schema }, { priority: "normal", ...opts });
  },

  // --- Vision (Bilder als data-URL; GPU-Server hat kein Internet) ---
  visionAnalyze(image: string, question: string, opts: CoreOpts = {}): Promise<{ answer: string; model?: string }> {
    return core("POST", "/vision/analyze", { image, question }, { priority: "normal", ...opts });
  },
  visionOcr(image: string, opts: CoreOpts = {}): Promise<{ text: string } | { answer: string }> {
    return core("POST", "/vision/ocr", { image }, { priority: "normal", ...opts });
  },
  visionClassify(image: string, labels: string[], opts: CoreOpts = {}): Promise<{ label: string; scores?: Record<string, number> }> {
    return core("POST", "/vision/classify", { image, labels }, { priority: "normal", ...opts });
  },

  // --- Audio ---
  async stt(file: Blob, language = "de", opts: CoreOpts = {}): Promise<{ text: string; language?: string }> {
    const fd = new FormData();
    fd.append("file", file, "note.webm");
    fd.append("language", language);
    return core("POST", "/audio/stt", fd, { priority: "high", ...opts });
  },

  tts(text: string, voice = "piper", opts: CoreOpts = {}): Promise<Response> {
    return core<Response>("POST", "/audio/tts", { text, voice, format: "wav" }, { priority: "normal", ...opts }, true);
  },

  // --- RAG / Tagebuch ---
  ragInsert(collection: string, content: string, metadata: Record<string, unknown> = {}, opts: CoreOpts = {}) {
    return core("POST", "/rag/insert", { collection, content, metadata }, { priority: "low", ...opts });
  },
  ragQuery(
    collection: string,
    query: string,
    limit = 5,
    opts: CoreOpts = {},
  ): Promise<{ results: { content: string; score: number; metadata?: Record<string, unknown> }[] }> {
    return core("POST", "/rag/query", { collection, query, limit }, { priority: "low", ...opts });
  },

  // --- Plugin-Storage (KV) ---
  storageGet<T = unknown>(collection: string, key: string, shared = false, opts: CoreOpts = {}): Promise<T> {
    return cachedGet<T>(`/storage/${collection}/${key}?scope=${shared ? "shared" : "user"}`, opts);
  },
  storagePut(collection: string, key: string, value: unknown, shared = false, opts: CoreOpts = {}) {
    return core("PUT", `/storage/${collection}/${key}?scope=${shared ? "shared" : "user"}`, { value }, opts);
  },
  storagePatch(collection: string, key: string, patch: unknown, shared = false, opts: CoreOpts = {}) {
    return core("PATCH", `/storage/${collection}/${key}?scope=${shared ? "shared" : "user"}`, patch, opts);
  },
  storageList<T = unknown>(collection: string, shared = false, opts: CoreOpts = {}): Promise<T> {
    return core<T>("GET", `/storage/${collection}?scope=${shared ? "shared" : "user"}`, null, { priority: "low", ...opts });
  },
  storageDel(collection: string, key: string, shared = false, opts: CoreOpts = {}) {
    return core("DELETE", `/storage/${collection}/${key}?scope=${shared ? "shared" : "user"}`, null, { priority: "low", ...opts });
  },

  // --- Benachrichtigungen (neutraler Nörgler, Schritt 7) ---
  notify(
    payload: {
      user?: string;
      channels?: string[];
      priority?: "low" | "normal" | "high";
      text: string;
      kind?: string;
      speak?: boolean;
      meta?: Record<string, unknown>;
    },
    opts: CoreOpts = {},
  ): Promise<{ delivered: boolean; spoken: boolean; targets: string[] }> {
    return core("POST", "/channels/notify", { channels: ["auto"], ...payload }, opts);
  },

  // --- Tools-Bridge (z. B. Notiz nach Obsidian) ---
  toolInvoke<T = unknown>(name: string, args: Record<string, unknown>, opts: CoreOpts = {}): Promise<T> {
    return core<T>("POST", `/tools/${name}/invoke`, { args }, { priority: "low", ...opts });
  },

  // --- Scheduler (Off-Peak-Jobs) ---
  schedulerCreate(job: unknown, opts: CoreOpts = {}) {
    return core("POST", "/scheduler/jobs", job, { priority: "low", ...opts });
  },

  /** Cache leeren (z. B. nach Konfigwechsel). */
  clearCache() {
    cache.clear();
    inflight.clear();
  },

  queueDepth() {
    return queue.pending;
  },
};

/** WebSocket zum Plugin-Event-Bus (Schritt 8). Gibt das rohe WS zurück. */
export function connectEvents(): WebSocket | null {
  const c = cfg();
  if (!c) return null;
  if (proxyMode) {
    // Same-origin: Server proxyt den WS und injiziert den Key.
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    return new WebSocket(`${scheme}://${location.host}/api/v1/ws`);
  }
  const wsBase = c.base.replace(/^http/, "ws");
  return new WebSocket(`${wsBase}/api/v1/ws?token=${encodeURIComponent(c.key)}`);
}
