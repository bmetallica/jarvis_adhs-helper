// Apotheken-/Beschaffungs-Log. Geteilt (datasync) → der Partner muss nicht dieselben Apotheken
// nochmal abtelefonieren. Optional zusätzlich ins RAG (semantische Suche via JARVIS).
import { writable, get } from "svelte/store";
import type { PharmacyNote } from "../types";
import { db } from "../db";
import { uid } from "../util";
import { settings } from "./settings";
import { jarvis, isConfigured } from "../jarvis/client";

function createPharmacy() {
  const { subscribe, set } = writable<PharmacyNote[]>([]);

  async function load() {
    const all = await (await db()).getAll("pharmacy");
    all.sort((a, b) => b.createdAt - a.createdAt);
    set(all);
  }

  async function add(medName: string, text: string) {
    if (!text.trim()) return;
    const note: PharmacyNote = {
      id: uid("ph"),
      medName: medName.trim(),
      text: text.trim(),
      profileId: get(settings).activeProfileId,
      createdAt: Date.now(),
    };
    await (await db()).put("pharmacy", note);
    await load();
    if (isConfigured()) {
      jarvis.ragInsert("pharmacy", `${medName}: ${text}`, { ts: new Date().toISOString() }).catch(() => {});
    }
  }

  async function remove(id: string) {
    await (await db()).delete("pharmacy", id);
    await load();
  }

  return { subscribe, load, add, remove };
}

export const pharmacy = createPharmacy();
