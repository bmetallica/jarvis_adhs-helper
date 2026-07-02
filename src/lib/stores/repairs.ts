// Reparatur-Ritual: das „Danach" von Konflikten. Geführtes 3-Schritte-Skript als Karte ans
// Familienboard; die andere Seite kann annehmen. RSD-schonend: kein Schuld-Vokabular. Geteilt.
import { writable } from "svelte/store";
import type { RepairCard } from "../types";
import { db } from "../db";
import { uid } from "../util";

function createRepairs() {
  const { subscribe, set } = writable<RepairCard[]>([]);

  async function load() {
    const all = await (await db()).getAll("repairs");
    all.sort((a, b) => b.createdAt - a.createdAt);
    set(all);
  }

  async function add(card: Omit<RepairCard, "id" | "acknowledgedBy" | "createdAt">) {
    await (await db()).put("repairs", {
      ...card,
      id: uid("rep"),
      acknowledgedBy: [],
      createdAt: Date.now(),
    });
    await load();
  }

  /** Karte annehmen (Profil bestätigt: „Ich habe es gelesen, danke"). */
  async function acknowledge(id: string, profileId: string) {
    const d = await db();
    const r = await d.get("repairs", id);
    if (!r || r.acknowledgedBy.includes(profileId)) return;
    await d.put("repairs", { ...r, acknowledgedBy: [...r.acknowledgedBy, profileId] });
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("repairs", id);
    await load();
  }

  return { subscribe, load, add, acknowledge, remove };
}

export const repairs = createRepairs();
