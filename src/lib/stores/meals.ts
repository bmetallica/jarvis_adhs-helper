// Essensplan — reduziert tägliche „Was kochen wir?"-Entscheidungslast. Niedrigschwellig.
import { writable, get } from "svelte/store";
import type { MealEntry, MealSlot } from "../types";
import { db } from "../db";
import { uid } from "../util";

function createMeals() {
  const { subscribe, set } = writable<MealEntry[]>([]);

  async function load() {
    const all = await (await db()).getAll("meals");
    set(all);
  }

  function forDay(date: string): MealEntry[] {
    return get({ subscribe }).filter((m) => m.date === date);
  }

  /** Slot eines Tages setzen (leerer Text → löschen). */
  async function setSlot(date: string, slot: MealSlot, text: string) {
    const existing = get({ subscribe }).find((m) => m.date === date && m.slot === slot);
    const d = await db();
    if (!text.trim()) {
      if (existing) await d.delete("meals", existing.id);
    } else if (existing) {
      await d.put("meals", { ...existing, text: text.trim() });
    } else {
      await d.put("meals", { id: uid("ml"), date, slot, text: text.trim() });
    }
    await load();
  }

  return { subscribe, load, forDay, setSlot };
}

export const meals = createMeals();
