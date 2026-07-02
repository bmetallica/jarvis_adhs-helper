// Impulskauf-Parkplatz: Wünsche parken statt sofort kaufen. „Ist notiert!" beruhigt das
// Dopamin-System; nach der Reifezeit fragt die App neutral nach — kein Verbot, keine Scham.
import { writable } from "svelte/store";
import type { WishItem } from "../types";
import { db } from "../db";
import { uid } from "../util";

function createWishes() {
  const { subscribe, set } = writable<WishItem[]>([]);

  async function load() {
    const all = await (await db()).getAll("wishes");
    all.sort((a, b) => b.createdAt - a.createdAt);
    set(all);
  }

  async function add(text: string, priceText = "", matureDays = 14, profileId: string | null = null) {
    if (!text.trim()) return;
    await (await db()).put("wishes", {
      id: uid("wish"),
      text: text.trim(),
      priceText: priceText.trim(),
      profileId,
      matureDays,
      decision: null,
      decidedAt: null,
      createdAt: Date.now(),
    });
    await load();
  }

  async function decide(id: string, decision: "keep" | "drop") {
    const d = await db();
    const w = await d.get("wishes", id);
    if (!w) return;
    await d.put("wishes", { ...w, decision, decidedAt: Date.now() });
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("wishes", id);
    await load();
  }

  return { subscribe, load, add, decide, remove };
}

export const wishes = createWishes();

/** Reif = Reifezeit vorbei und noch unentschieden. */
export function isMature(w: WishItem, nowMs: number): boolean {
  return w.decision === null && nowMs >= w.createdAt + w.matureDays * 86_400_000;
}
