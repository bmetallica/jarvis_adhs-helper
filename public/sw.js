/*
 * ADHS-Helper Service Worker — offline-first App-Shell.
 * Strategie:
 *  - App-Shell + Build-Assets: Cache-first (mit Netz-Revalidate für Navigation).
 *  - Alles unter /api/ : NIE cachen (geht an JARVIS, lastsensibel, immer frisch).
 *  - Web-Push-Handler ist vorbereitet, aber erst mit gültigem Zertifikat aktiv (siehe KONZEPT 10.3).
 */
const CACHE = "adhs-shell-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // API-Aufrufe (JARVIS-Gateway) niemals cachen.
  if (url.pathname.startsWith("/api/") || req.method !== "GET") return;

  // Navigationsanfragen: Netz zuerst, Fallback auf gecachte Shell (Offline-Start).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html").then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Statische Assets: Cache zuerst, sonst Netz (und nachladen).
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// --- Web-Push (vorbereitet; wirksam erst mit vertrauenswürdigem Kontext / Reverse-Proxy) ---
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "ADHS-Helper", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "ADHS-Helper";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "adhs",
      renotify: true,
      data: data.url || "/",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(target);
    }),
  );
});
