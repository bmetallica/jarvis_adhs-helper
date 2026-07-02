// Familien-Quests: gemeinsames XP-Ziel („500 XP zusammen → Pizza-Abend"). Koppelt Kooperation
// an Belohnung statt an Ermahnung. Geteilt (Familie).
import { writable } from "svelte/store";
import type { Quest } from "../types";
import { db } from "../db";
import { uid } from "../util";

function createQuests() {
  const { subscribe, set } = writable<Quest[]>([]);

  async function load() {
    const all = await (await db()).getAll("quests");
    all.sort((a, b) => b.createdAt - a.createdAt);
    set(all);
  }

  async function add(title: string, icon: string, goalXp: number, reward: string) {
    if (!title.trim() || goalXp <= 0) return;
    const now = Date.now();
    await (await db()).put("quests", {
      id: uid("quest"),
      title: title.trim(),
      icon: icon || "🏆",
      goalXp,
      progressXp: 0,
      reward: reward.trim(),
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
    await load();
  }

  /** XP auf alle offenen Quests einzahlen (von jeder Pet-XP-Quelle aufgerufen). */
  async function addProgress(xp: number) {
    if (xp <= 0) return;
    const d = await db();
    const all = await d.getAll("quests");
    let changed = false;
    for (const q of all) {
      if (q.status !== "open") continue;
      const progressXp = Math.min(q.goalXp, q.progressXp + xp);
      await d.put("quests", {
        ...q,
        progressXp,
        status: progressXp >= q.goalXp ? "done" : "open",
        updatedAt: Date.now(),
      });
      changed = true;
    }
    if (changed) await load();
  }

  async function redeem(id: string) {
    const d = await db();
    const q = await d.get("quests", id);
    if (!q || q.status !== "done") return;
    await d.put("quests", { ...q, status: "redeemed", updatedAt: Date.now() });
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("quests", id);
    await load();
  }

  return { subscribe, load, add, addProgress, redeem, remove };
}

export const quests = createQuests();
