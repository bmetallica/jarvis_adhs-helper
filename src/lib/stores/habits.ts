// Gewohnheiten — bewusst OHNE Streak/Kette (RSD-Schutz). Jeder Tag ist additiv positiv.
import { writable, get } from "svelte/store";
import type { Habit } from "../types";
import { db } from "../db";
import { uid } from "../util";
import { ymd } from "../date";
import { pet } from "./pet";
import { XP } from "../pet";

function createHabits() {
  const { subscribe, set } = writable<Habit[]>([]);

  async function load() {
    const all = await (await db()).getAll("habits");
    all.sort((a, b) => a.createdAt - b.createdAt);
    set(all);
  }

  async function add(title: string, icon: string, profileId: string | null = null): Promise<Habit> {
    const h: Habit = {
      id: uid("hb"),
      title: title.trim() || "Gewohnheit",
      icon: icon || "🌱",
      profileId,
      createdAt: Date.now(),
      doneDates: [],
    };
    await (await db()).put("habits", h);
    await load();
    return h;
  }

  async function remove(id: string) {
    await (await db()).delete("habits", id);
    await load();
  }

  /** Heute für die Gewohnheit umschalten. */
  async function toggleToday(id: string) {
    const h = get({ subscribe }).find((x) => x.id === id);
    if (!h) return;
    const today = ymd(Date.now());
    const has = h.doneDates.includes(today);
    const doneDates = has ? h.doneDates.filter((d) => d !== today) : [...h.doneDates, today];
    await (await db()).put("habits", { ...h, doneDates });
    await load();
    if (!has) await pet.award(XP.habit, h.profileId, `Gewohnheit: ${h.title}`);
  }

  function doneToday(h: Habit): boolean {
    return h.doneDates.includes(ymd(Date.now()));
  }

  /** Erledigte Tage der letzten n Tage (für die „Garten"-Visualisierung). */
  function last(h: Habit, n: number): boolean[] {
    const out: boolean[] = [];
    const now = Date.now();
    for (let i = n - 1; i >= 0; i--) {
      out.push(h.doneDates.includes(ymd(now - i * 86_400_000)));
    }
    return out;
  }

  return { subscribe, load, add, remove, toggleToday, doneToday, last };
}

export const habits = createHabits();
