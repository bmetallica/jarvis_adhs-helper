// Accounts = JARVIS-Nutzer. Der Roster wird zentral aus JARVIS geladen, damit Familienmitglieder
// in JEDEM Browser/Gerät erscheinen. Anzeige-Metadaten (Avatar/Farbe) liegen im geteilten
// JARVIS-Storage und sind so überall gleich. Lokaler Fallback bleibt erhalten (offline-first).
import { writable, get } from "svelte/store";
import { jarvis, isConfigured } from "../jarvis/client";
import { profiles } from "./profiles";

export type RosterMeta = Record<string, { avatar?: string; color?: string; name?: string; role?: "parent" | "child" | "other" }>;

export const rosterStatus = writable<"idle" | "syncing" | "ok" | "error">("idle");

/** JARVIS-/Roster-Antwort in eine Liste von Nutzernamen normalisieren (tolerant ggü. Formaten). */
function normalizeUsers(res: unknown): string[] {
  const arr = Array.isArray(res) ? res : (res as { users?: unknown })?.users;
  if (!Array.isArray(arr)) return [];
  const names = arr
    .map((u) => (typeof u === "string" ? u : (u as { username?: string; name?: string })?.username ?? (u as { name?: string })?.name))
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  return Array.from(new Set(names));
}

const SHARED_COLL = "family";
const SHARED_KEY = "roster_meta";

/** Geteilte Roster-Metadaten holen (Avatar/Farbe je Nutzer) — best effort. */
async function pullMeta(): Promise<RosterMeta> {
  try {
    const r = await jarvis.storageGet<{ value?: RosterMeta } | RosterMeta>(SHARED_COLL, SHARED_KEY, true, { priority: "low" });
    return ((r as { value?: RosterMeta })?.value ?? (r as RosterMeta)) || {};
  } catch {
    return {};
  }
}

async function pushMeta(meta: RosterMeta) {
  try {
    await jarvis.storagePut(SHARED_COLL, SHARED_KEY, meta, true, { priority: "low" });
  } catch {
    /* offline */
  }
}

/** Aktuelle Anzeige-Metadaten aller Roster-Profile in den geteilten Storage schreiben.
 *  Nach einer Profil-Änderung (Rolle/Avatar/Name) aufrufen → alle Geräte ziehen nach. */
export async function pushRosterMeta(): Promise<void> {
  if (!isConfigured()) return;
  const meta: RosterMeta = {};
  for (const p of get(profiles)) {
    if (!p.jarvisUser) continue; // nur echte JARVIS-Accounts teilen
    meta[p.jarvisUser] = { avatar: p.avatar, color: p.color, name: p.name, role: p.role };
  }
  if (Object.keys(meta).length) await pushMeta(meta);
}

/** Roster aus JARVIS synchronisieren: Nutzer holen → Profile spiegeln → Metadaten teilen. */
export async function syncRoster(): Promise<void> {
  if (!isConfigured()) return;
  rosterStatus.set("syncing");
  try {
    const usernames = normalizeUsers(await jarvis.users());
    if (usernames.length === 0) {
      rosterStatus.set("ok");
      return;
    }
    const meta = await pullMeta();
    const merged = await profiles.upsertRoster(usernames, meta);
    // Zusammengeführte Metadaten zurückschreiben, damit alle Geräte dieselben Avatare sehen.
    await pushMeta(merged);
    rosterStatus.set("ok");
  } catch {
    rosterStatus.set("error");
  }
}
