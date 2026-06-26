// Safe-Food-Pool: Mahlzeiten, die bei allen „immer funktionieren". Mit Sensorik-Tag. Geteilt.
import { writable } from "svelte/store";
import type { SafeFood } from "../types";
import { db } from "../db";
import { uid } from "../util";

export const TEXTURES = ["beliebig", "knusprig", "weich", "Suppe", "Brei", "warm", "kalt"];

const DEFAULTS: { text: string; texture: string }[] = [
  { text: "Nudeln mit Butter", texture: "weich" },
  { text: "Toast", texture: "knusprig" },
  { text: "Reis mit Sauce", texture: "weich" },
];

function createSafeFoods() {
  const { subscribe, set } = writable<SafeFood[]>([]);

  async function load() {
    let all = await (await db()).getAll("safefoods");
    if (all.length === 0) {
      const d = await db();
      for (const f of DEFAULTS) await d.put("safefoods", { ...f, id: uid("sf"), createdAt: Date.now() });
      all = await d.getAll("safefoods");
    }
    all.sort((a, b) => a.createdAt - b.createdAt);
    set(all);
  }

  async function add(text: string, texture = "beliebig") {
    if (!text.trim()) return;
    await (await db()).put("safefoods", { id: uid("sf"), text: text.trim(), texture, createdAt: Date.now() });
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("safefoods", id);
    await load();
  }

  return { subscribe, load, add, remove };
}

export const safefoods = createSafeFoods();
