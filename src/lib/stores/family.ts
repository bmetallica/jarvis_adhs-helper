// Familie & Paar: Verantwortungsbereiche (Mental-Load-Sichtbarkeit) + Wertschätzungs-Feed.
import { writable, get } from "svelte/store";
import type { Responsibility, Appreciation } from "../types";
import { db } from "../db";
import { uid } from "../util";

function createResponsibilities() {
  const { subscribe, set } = writable<Responsibility[]>([]);

  async function load() {
    const all = await (await db()).getAll("responsibilities");
    all.sort((a, b) => a.createdAt - b.createdAt);
    set(all);
  }
  async function add(title: string, icon: string, ownerId: string | null) {
    await (await db()).put("responsibilities", {
      id: uid("resp"),
      title: title.trim() || "Bereich",
      icon: icon || "📦",
      ownerId,
      createdAt: Date.now(),
    });
    await load();
  }
  async function setOwner(id: string, ownerId: string | null) {
    const r = get({ subscribe }).find((x) => x.id === id);
    if (!r) return;
    await (await db()).put("responsibilities", { ...r, ownerId });
    await load();
  }
  async function remove(id: string) {
    await (await db()).delete("responsibilities", id);
    await load();
  }
  return { subscribe, load, add, setOwner, remove };
}

function createAppreciations() {
  const { subscribe, set } = writable<Appreciation[]>([]);

  async function load() {
    const all = await (await db()).getAll("appreciations");
    all.sort((a, b) => b.createdAt - a.createdAt);
    set(all);
  }
  async function add(fromId: string | null, toId: string | null, text: string) {
    if (!text.trim()) return;
    await (await db()).put("appreciations", {
      id: uid("app"),
      fromId,
      toId,
      text: text.trim(),
      createdAt: Date.now(),
    });
    await load();
  }
  async function remove(id: string) {
    await (await db()).delete("appreciations", id);
    await load();
  }
  return { subscribe, load, add, remove };
}

export const responsibilities = createResponsibilities();
export const appreciations = createAppreciations();

/** Vorschläge für Verantwortungsbereiche (häufige Mental-Load-Quellen). */
export const RESP_SUGGESTIONS = [
  { title: "Arzttermine Kinder", icon: "🏥" },
  { title: "Essensplanung & Einkauf", icon: "🛒" },
  { title: "Müll & Recycling", icon: "🗑️" },
  { title: "Schule & Kita", icon: "🎒" },
  { title: "Wäsche", icon: "🧺" },
  { title: "Finanzen & Rechnungen", icon: "💶" },
  { title: "Geburtstage & Geschenke", icon: "🎁" },
  { title: "Putzen", icon: "🧹" },
];
