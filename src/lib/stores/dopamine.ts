// Dopamin-Menü: vorbereitete schnelle Belohnungen/Pausen. Im Moment der Unterstimulation
// fällt einem nichts ein — die Karte löst das. Persönlich (pro Account).
import { writable } from "svelte/store";
import type { DopamineCourse, DopamineItem } from "../types";
import { db } from "../db";
import { uid } from "../util";

export const COURSE_LABEL: Record<DopamineCourse, string> = {
  starter: "Vorspeise (~2 min)",
  main: "Hauptgang (~20 min)",
  side: "Beilage (nebenbei)",
};

export const COURSE_MINUTES: Record<DopamineCourse, number> = { starter: 2, main: 20, side: 0 };

const DEFAULTS: { text: string; course: DopamineCourse }[] = [
  { text: "Lieblingslied laut hören", course: "starter" },
  { text: "Kaltes Wasser ins Gesicht", course: "starter" },
  { text: "10 Hampelmänner", course: "starter" },
  { text: "Eine Folge Lieblingsserie", course: "main" },
  { text: "Runde um den Block", course: "main" },
  { text: "Podcast/Musik nebenbei", course: "side" },
];

function createDopamine() {
  const { subscribe, set } = writable<DopamineItem[]>([]);

  async function load() {
    let all = await (await db()).getAll("dopamine");
    if (all.length === 0) {
      const d = await db();
      for (const it of DEFAULTS) {
        await d.put("dopamine", {
          id: uid("dop"),
          text: it.text,
          course: it.course,
          minutes: COURSE_MINUTES[it.course],
          profileId: null,
          createdAt: Date.now(),
        });
      }
      all = await d.getAll("dopamine");
    }
    all.sort((a, b) => a.createdAt - b.createdAt);
    set(all);
  }

  async function add(text: string, course: DopamineCourse, minutes?: number) {
    if (!text.trim()) return;
    await (await db()).put("dopamine", {
      id: uid("dop"),
      text: text.trim(),
      course,
      minutes: minutes ?? COURSE_MINUTES[course],
      profileId: null,
      createdAt: Date.now(),
    });
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("dopamine", id);
    await load();
  }

  return { subscribe, load, add, remove };
}

export const dopamine = createDopamine();
