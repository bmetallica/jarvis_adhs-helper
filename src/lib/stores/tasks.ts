// Tasks-Store: atomare Aufgaben, optional auf dem heutigen Now-Next-Board.
import { writable, get } from "svelte/store";
import type { Task } from "../types";
import { db } from "../db";
import { uid } from "../util";
import { pet } from "./pet";
import { XP } from "../pet";

function createTasks() {
  const { subscribe, set } = writable<Task[]>([]);

  async function load() {
    const all = await (await db()).getAll("tasks");
    all.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
    set(all);
  }

  async function add(opts: {
    title: string;
    icon?: string;
    today?: boolean;
    profileId?: string | null;
  }): Promise<Task> {
    const list = get({ subscribe });
    const maxOrder = list.reduce((m, t) => Math.max(m, t.order), 0);
    const t: Task = {
      id: uid("task"),
      title: opts.title.trim() || "Aufgabe",
      icon: opts.icon ?? "",
      done: false,
      today: opts.today ?? true,
      order: maxOrder + 1,
      profileId: opts.profileId ?? null,
      createdAt: Date.now(),
      completedAt: null,
    };
    await (await db()).put("tasks", t);
    await load();
    return t;
  }

  async function toggle(id: string) {
    const t = get({ subscribe }).find((x) => x.id === id);
    if (!t) return;
    const becomingDone = !t.done;
    await (await db()).put("tasks", {
      ...t,
      done: becomingDone,
      completedAt: becomingDone ? Date.now() : null,
    });
    await load();
    // XP fürs Familien-Tier (nur beim Erledigen, nicht beim Rückgängigmachen).
    if (becomingDone) await pet.award(XP.task, t.profileId, `Aufgabe: ${t.title}`);
  }

  async function update(t: Task) {
    await (await db()).put("tasks", t);
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("tasks", id);
    await load();
  }

  /** Reihenfolge auf dem Board neu setzen (Liste von IDs in Wunschreihenfolge). */
  async function reorder(ids: string[]) {
    const map = new Map(get({ subscribe }).map((t) => [t.id, t]));
    const d = await db();
    await Promise.all(
      ids.map((id, i) => {
        const t = map.get(id);
        return t ? d.put("tasks", { ...t, order: i + 1 }) : Promise.resolve();
      }),
    );
    await load();
  }

  /** Erledigte Aufgaben des Tages aufräumen. */
  async function clearDone() {
    const d = await db();
    const done = get({ subscribe }).filter((t) => t.done);
    await Promise.all(done.map((t) => d.delete("tasks", t.id)));
    await load();
  }

  return { subscribe, load, add, toggle, update, remove, reorder, clearDone };
}

export const tasks = createTasks();
