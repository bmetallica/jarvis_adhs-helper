// Per-Account-Datensynchronisation (local-first).
//
// Persönliche Collections folgen dem eingeloggten Account über alle Geräte (scope=user — der Server
// isoliert per X-JARVIS-User automatisch). Familien-Listen (Einkauf/Essensplan) sind geteilt
// (scope=shared). Modell: Snapshot je Collection mit Revision (collection-level last-writer-wins).
// Bewusst einfach für den Familien-LAN-Fall (geringe Parallelität); löst Anlegen UND Löschen sauber.
//
// Offline/ohne JARVIS passiert nichts — lokal bleibt alles wie gehabt.
import { get, type Readable } from "svelte/store";
import type { StoreNames } from "idb";
import { db, type AdhsDB } from "./db";
import { jarvis, isConfigured } from "./jarvis/client";
import { publish, onPluginEvent, wsConnected } from "./jarvis/events";
import { settings } from "./stores/settings";

type StoreName = StoreNames<AdhsDB>;

interface SyncedStore {
  /** Name im IndexedDB (und Sync-Key). */
  name: StoreName;
  /** "user" = pro Account, "shared" = Familie. */
  scope: "user" | "shared";
  /** Der Svelte-Store (für Änderungs-Abo + Neuladen). */
  store: Readable<unknown> & { load: () => Promise<void> };
}

const registry: SyncedStore[] = [];
const rev = new Map<string, number>(); // zuletzt angewandte Revision je Collection (in-memory)
const pushTimer = new Map<string, ReturnType<typeof setTimeout>>();
// Collections mit lokalen, noch nicht gepushten Änderungen: bei eingehendem Pull wird dann
// auf Datensatz-Ebene GEMERGT statt blind ersetzt (kein stilles Verlieren eigener Änderungen).
const dirty = new Set<string>();
let applying = false; // true während eines Pulls → unterdrückt Rück-Push
let started = false;

const SYNC_COLL = "sync";
const topic = (name: string) => `jarvis/plugin/adhs/sync/${name}`;

/** Eine Collection für die Synchronisation registrieren. */
export function registerSynced(s: SyncedStore) {
  registry.push(s);
}

function shared(s: SyncedStore) {
  return s.scope === "shared";
}

// --- Push: lokalen Snapshot hochladen (debounced) ---
function schedulePush(s: SyncedStore) {
  if (!isConfigured() || applying) return;
  dirty.add(s.name);
  const t = pushTimer.get(s.name);
  if (t) clearTimeout(t);
  pushTimer.set(
    s.name,
    setTimeout(async () => {
      try {
        const items = await (await db()).getAll(s.name);
        const r = Date.now();
        rev.set(s.name, r);
        await jarvis.storagePut(SYNC_COLL, s.name, { items, rev: r }, shared(s), { priority: "low" });
        dirty.delete(s.name);
        publish(topic(s.name), { rev: r });
      } catch {
        /* offline — dirty bleibt gesetzt; späterer Push/Pull merged */
      }
    }, 900),
  );
}

// --- Pull: entfernten Snapshot anwenden (ersetzt lokal, wenn neuer) ---
async function pull(s: SyncedStore) {
  if (!isConfigured()) return;
  try {
    const res = await jarvis.storageGet<{ value?: { items?: unknown[]; rev?: number } } | { items?: unknown[]; rev?: number }>(
      SYNC_COLL,
      s.name,
      shared(s),
      { priority: "low" },
    );
    const blob = (res as { value?: { items?: unknown[]; rev?: number } })?.value ?? (res as { items?: unknown[]; rev?: number });
    const items = blob?.items;
    const remoteRev = blob?.rev ?? 0;

    if (!Array.isArray(items)) {
      // Kein entfernter Stand. Für Account-Collections lokal leeren (neuer/leerer Account).
      if (!shared(s) && (rev.get(s.name) ?? -1) !== 0) {
        await replaceLocal(s, []);
        rev.set(s.name, 0);
      }
      return;
    }
    if (remoteRev <= (rev.get(s.name) ?? -1)) return; // schon aktuell
    if (dirty.has(s.name)) {
      // Lokale Änderungen noch nicht gepusht → auf Datensatz-Ebene mergen statt überschreiben.
      await mergeLocal(s, items);
    } else {
      await replaceLocal(s, items);
    }
    rev.set(s.name, remoteRev);
  } catch {
    /* offline */
  }
}

/**
 * Datensatz-Merge bei parallelen Änderungen: Union per id; existiert ein Item beidseitig,
 * gewinnt das mit dem jüngeren updatedAt (fehlt das Feld: lokale Fassung — eigene Eingaben
 * gehen nie still verloren). Entfernungen der Gegenseite können dabei wieder auftauchen —
 * der seltene, sichtbare Fall ist besser als stilles Verlieren. Danach direkt zurückpushen.
 */
async function mergeLocal(s: SyncedStore, remoteItems: unknown[]) {
  type Row = { id?: unknown; updatedAt?: unknown } & Record<string, unknown>;
  const d = await db();
  const local = (await d.getAll(s.name)) as Row[];
  const byId = new Map<string, Row>();
  for (const r of remoteItems as Row[]) {
    if (typeof r?.id === "string") byId.set(r.id, r);
  }
  let conflicts = 0;
  for (const l of local) {
    if (typeof l?.id !== "string") continue;
    const r = byId.get(l.id);
    if (!r) {
      byId.set(l.id, l); // nur lokal vorhanden → behalten
      continue;
    }
    const lu = typeof l.updatedAt === "number" ? l.updatedAt : null;
    const ru = typeof r.updatedAt === "number" ? r.updatedAt : null;
    if (lu != null && ru != null) {
      if (lu >= ru) byId.set(l.id, l);
    } else if (JSON.stringify(l) !== JSON.stringify(r)) {
      byId.set(l.id, l); // kein Zeitstempel: lokal gewinnt, aber sichtbar machen
      conflicts += 1;
    }
  }
  await replaceLocal(s, [...byId.values()]);
  if (conflicts > 0) {
    void import("./notify").then((n) =>
      n.pushToast("Parallel geändert", `„${s.name}" wurde zusammengeführt — bitte kurz prüfen.`),
    );
  }
  schedulePush(s); // gemergter Stand wird der neue Snapshot
}

/** IndexedDB-Store leeren und mit den Items füllen, danach Svelte-Store neu laden. */
async function replaceLocal(s: SyncedStore, items: unknown[]) {
  applying = true;
  try {
    const d = await db();
    const tx = d.transaction(s.name, "readwrite");
    await tx.store.clear();
    for (const it of items) await tx.store.put(it as never);
    await tx.done;
    await s.store.load();
  } finally {
    // Nach dem nächsten Tick wieder Pushes zulassen (Abo-Feuern des load() ignorieren).
    setTimeout(() => (applying = false), 0);
  }
}

export async function pullAll() {
  for (const s of registry) await pull(s);
}

/** Beim Account-Wechsel: Revisionen zurücksetzen und neu ziehen (anderer user-Namespace). */
function onAccountSwitch() {
  for (const s of registry) if (!shared(s)) rev.set(s.name, -1);
  void pullAll();
}

export function initDataSync() {
  if (started || !isConfigured()) return;
  started = true;

  // 1) Erststand ziehen, dann auf Änderungen lauschen (Reihenfolge wichtig: erst pull, dann push-Abo).
  void pullAll().then(() => {
    for (const s of registry) {
      let primed = false;
      s.store.subscribe(() => {
        if (!primed) {
          primed = true; // erste (sofortige) Emission ignorieren
          return;
        }
        if (!applying) schedulePush(s);
      });
    }
  });

  // 2) Eingehende Sync-Events → betroffene Collection neu ziehen.
  onPluginEvent((ev) => {
    const s = registry.find((x) => topic(x.name) === ev.topic);
    if (s) void pull(s);
  });

  // 3) Bei (Wieder-)Verbindung und Fensterfokus erneut abgleichen.
  wsConnected.subscribe((up) => {
    if (up) void pullAll();
  });
  if (typeof window !== "undefined") {
    window.addEventListener("focus", () => void pullAll());
  }

  // 4) Account-Wechsel beobachten.
  let lastAccount = get(settings).activeProfileId;
  settings.subscribe((s) => {
    if (s.activeProfileId !== lastAccount) {
      lastAccount = s.activeProfileId;
      onAccountSwitch();
    }
  });
}
