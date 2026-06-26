// Zurücksetzen-Funktionen. Tier/Münzen-Reset (für Eltern) und Voll-Reset (nur JARVIS-Admin).
import { db } from "./db";
import { pet } from "./stores/pet";
import { jarvis, isConfigured } from "./jarvis/client";

/** Nur das Tierwesen + Münzen + Accessoires zurücksetzen. */
export async function resetPetAndCoins(): Promise<void> {
  await pet.resetPet();
  // Geteilten Tier-Zustand serverseitig überschreiben, damit er nicht zurücksynct.
  if (isConfigured()) {
    try {
      const state = await import("./pet").then((m) => m.defaultPet());
      await jarvis.storagePut("pet", "state", state, true);
    } catch {
      /* offline */
    }
  }
}

// Alle lokalen Daten-Stores (KV bewusst NICHT komplett — Settings/Verbindung bleiben).
const DATA_STORES = [
  "tasks",
  "routines",
  "inbox",
  "checkins",
  "appointments",
  "deadlines",
  "shopping",
  "meals",
  "habits",
  "rewards",
  "responsibilities",
  "appreciations",
  "messages",
  "medications",
] as const;

// Sync-Collections, die serverseitig geleert werden müssen (sonst kommen Daten zurück).
const SYNC_USER = ["tasks", "routines", "appointments", "deadlines", "habits", "checkins", "medications"];
const SYNC_SHARED = ["shopping", "meals", "responsibilities"];

/**
 * Voll-Reset: alle App-Daten lokal UND (best effort) serverseitig löschen. Verbindung/Settings
 * bleiben erhalten. Sollte nur Admins angeboten werden (siehe connection.isAdmin).
 */
export async function resetEverything(): Promise<void> {
  const d = await db();
  // Lokale Daten-Stores leeren.
  for (const s of DATA_STORES) {
    try {
      const tx = d.transaction(s, "readwrite");
      await tx.store.clear();
      await tx.done;
    } catch {
      /* Store evtl. nicht vorhanden */
    }
  }
  // Pet-KV zurücksetzen.
  await pet.resetPet();

  // Serverseitig: Sync-Snapshots, Pet, Board löschen, damit nichts zurücksynct.
  if (isConfigured()) {
    const del = (coll: string, key: string, shared: boolean) =>
      jarvis.storageDel(coll, key, shared).catch(() => {});
    for (const c of SYNC_USER) await del("sync", c, false);
    for (const c of SYNC_SHARED) await del("sync", c, true);
    await del("pet", "state", true);
    // Board-Nachrichten lassen wir stehen (gemeinsamer Verlauf) — bei Bedarf separat löschbar.
  }

  // Neu laden, damit alle Stores frisch initialisieren.
  if (typeof window !== "undefined") window.location.reload();
}
