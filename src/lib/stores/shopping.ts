// Einkaufs-/Besorgungsliste. Lokal; wird in Schritt 8 über JARVIS-Shared-Storage familien-synchron.
import { writable, get } from "svelte/store";
import type { ShoppingItem } from "../types";
import { db } from "../db";
import { uid } from "../util";
import { pet } from "./pet";
import { XP } from "../pet";

function createShopping() {
  const { subscribe, set } = writable<ShoppingItem[]>([]);

  async function load() {
    const all = await (await db()).getAll("shopping");
    all.sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt);
    set(all);
  }

  async function add(text: string, addedBy: string | null = null): Promise<ShoppingItem | null> {
    if (!text.trim()) return null;
    const item: ShoppingItem = {
      id: uid("sh"),
      text: text.trim(),
      done: false,
      addedBy,
      createdAt: Date.now(),
    };
    await (await db()).put("shopping", item);
    await load();
    return item;
  }

  async function toggle(id: string) {
    const it = get({ subscribe }).find((x) => x.id === id);
    if (!it) return;
    const becomingDone = !it.done;
    await (await db()).put("shopping", { ...it, done: becomingDone });
    await load();
    if (becomingDone) await pet.award(XP.shopping, it.addedBy);
  }

  async function remove(id: string) {
    await (await db()).delete("shopping", id);
    await load();
  }

  async function clearDone() {
    const d = await db();
    const done = get({ subscribe }).filter((x) => x.done);
    await Promise.all(done.map((x) => d.delete("shopping", x.id)));
    await load();
  }

  return { subscribe, load, add, toggle, remove, clearDone };
}

export const shopping = createShopping();
