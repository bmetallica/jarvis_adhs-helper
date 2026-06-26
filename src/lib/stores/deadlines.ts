// Fristen-Store (Rechnungen, Steuer, Behörden) mit „Wall of Awful"-Zerlegung.
import { writable, get } from "svelte/store";
import type { Deadline } from "../types";
import { db } from "../db";
import { uid } from "../util";

export type DeadlineDraft = Omit<Deadline, "id" | "createdAt" | "firedReminders" | "done">;

export const DEADLINE_CATEGORIES = ["Rechnung", "Steuer", "Behörde", "Vertrag", "Gesundheit", "Sonstiges"];

function createDeadlines() {
  const { subscribe, set } = writable<Deadline[]>([]);

  async function load() {
    const all = await (await db()).getAll("deadlines");
    all.sort((a, b) => Number(a.done) - Number(b.done) || a.dueAt - b.dueAt);
    set(all);
  }

  async function add(d: DeadlineDraft): Promise<Deadline> {
    const item: Deadline = { ...d, id: uid("dl"), firedReminders: [], done: false, createdAt: Date.now() };
    await (await db()).put("deadlines", item);
    await load();
    return item;
  }

  async function update(d: Deadline) {
    await (await db()).put("deadlines", d);
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("deadlines", id);
    await load();
  }

  async function toggleDone(id: string) {
    const d = get({ subscribe }).find((x) => x.id === id);
    if (!d) return;
    await update({ ...d, done: !d.done });
  }

  async function toggleStep(id: string, stepId: string) {
    const d = get({ subscribe }).find((x) => x.id === id);
    if (!d) return;
    const steps = d.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
    await update({ ...d, steps });
  }

  return { subscribe, load, add, update, remove, toggleDone, toggleStep };
}

export const deadlines = createDeadlines();
