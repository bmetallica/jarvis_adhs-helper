// Daten-Export/-Import als JSON-Datei — das Sicherheitsnetz neben dem Account-Sync.
// Schützt vor Server-Verlust und gibt Datensouveränität (Tagebuch!).
import { db, type AdhsDB } from "./db";
import type { StoreNames } from "idb";

type StoreName = StoreNames<AdhsDB>;

/** Alle Objekt-Stores außer kv (kv wird separat als Objekt exportiert). */
const DATA_STORES: StoreName[] = [
  "profiles", "timers", "tasks", "routines", "inbox", "checkins", "appointments", "deadlines",
  "shopping", "meals", "habits", "rewards", "responsibilities", "appreciations", "messages",
  "medications", "outbox", "diary", "polls", "locations", "safefoods", "pharmacy",
  "wishes", "dopamine", "quests", "repairs", "focusstatus",
];

export interface BackupFile {
  app: "adhs-helper";
  format: 1;
  exportedAt: number;
  stores: Record<string, unknown[]>;
  kv: Record<string, unknown>;
}

export async function exportAll(): Promise<BackupFile> {
  const d = await db();
  const stores: Record<string, unknown[]> = {};
  for (const name of DATA_STORES) {
    const items = await d.getAll(name);
    // Blobs (Sprachnotizen) überleben JSON nicht — Feld weglassen statt kaputt exportieren.
    stores[name] = items.map((it) => {
      const clone = { ...(it as Record<string, unknown>) };
      if (clone.audio instanceof Blob) delete clone.audio;
      return clone;
    });
  }
  const kv: Record<string, unknown> = {};
  for (const key of await d.getAllKeys("kv")) {
    kv[String(key)] = await d.get("kv", key);
  }
  return { app: "adhs-helper", format: 1, exportedAt: Date.now(), stores, kv };
}

/** Export als Datei herunterladen. */
export async function downloadBackup(): Promise<void> {
  const data = await exportAll();
  const ts = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `adhs-helper-backup-${ts}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export interface BackupPreview {
  exportedAt: number;
  counts: { store: string; n: number }[];
  total: number;
}

/** Datei prüfen und Vorschau liefern (ohne etwas zu ändern). */
export function previewBackup(raw: string): { ok: true; data: BackupFile; preview: BackupPreview } | { ok: false; error: string } {
  let data: BackupFile;
  try {
    data = JSON.parse(raw) as BackupFile;
  } catch {
    return { ok: false, error: "Keine gültige JSON-Datei." };
  }
  if (data?.app !== "adhs-helper" || !data.stores || typeof data.stores !== "object") {
    return { ok: false, error: "Das ist kein ADHS-Helper-Backup." };
  }
  const counts = Object.entries(data.stores)
    .filter(([, v]) => Array.isArray(v) && v.length > 0)
    .map(([store, v]) => ({ store, n: (v as unknown[]).length }));
  const total = counts.reduce((s, c) => s + c.n, 0);
  return { ok: true, data, preview: { exportedAt: data.exportedAt ?? 0, counts, total } };
}

/** Backup einspielen: ersetzt die lokalen Daten vollständig (nach ausdrücklicher Bestätigung!). */
export async function restoreBackup(data: BackupFile): Promise<void> {
  const d = await db();
  for (const name of DATA_STORES) {
    const items = data.stores[name];
    if (!Array.isArray(items)) continue;
    const tx = d.transaction(name, "readwrite");
    await tx.store.clear();
    for (const it of items) await tx.store.put(it as never);
    await tx.done;
  }
  if (data.kv && typeof data.kv === "object") {
    for (const [key, value] of Object.entries(data.kv)) {
      await d.put("kv", value, key);
    }
  }
}
