// Tagebuch: eigene Einträge schreiben UND lesen/suchen. Pro Account synchronisiert; optional RAG.
import { writable, get } from "svelte/store";
import type { DiaryEntry } from "../types";
import { db } from "../db";
import { uid } from "../util";
import { settings } from "./settings";
import { diaryLog } from "../ai";

function createDiary() {
  const { subscribe, set } = writable<DiaryEntry[]>([]);

  async function load() {
    const all = await (await db()).getAll("diary");
    all.sort((a, b) => b.createdAt - a.createdAt); // neueste zuerst
    set(all);
  }

  async function add(text: string, mood: number | null = null, tags: string[] = []) {
    if (!text.trim()) return;
    const now = Date.now();
    const e: DiaryEntry = {
      id: uid("diary"),
      profileId: get(settings).activeProfileId,
      text: text.trim(),
      mood,
      tags,
      createdAt: now,
      updatedAt: now,
    };
    await (await db()).put("diary", e);
    await load();
    // Optional zusätzlich ins RAG-Tagebuch (für Muster-Suche), wenn verbunden.
    void diaryLog(e.text, { type: "diary", mood, tags });
  }

  async function update(e: DiaryEntry) {
    await (await db()).put("diary", { ...e, updatedAt: Date.now() });
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("diary", id);
    await load();
  }

  return { subscribe, load, add, update, remove };
}

export const diary = createDiary();
