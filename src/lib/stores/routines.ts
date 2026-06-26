// Routinen-Store: geordnete Listen atomarer Schritte + Vorlagen.
import { writable, get } from "svelte/store";
import type { Routine, RoutineStep } from "../types";
import { db } from "../db";
import { uid } from "../util";

/** Mitgelieferte Vorlagen (ADHS-Alltag). Werden beim ersten Start optional angeboten. */
export const ROUTINE_TEMPLATES: Omit<Routine, "id" | "createdAt" | "profileId">[] = [
  {
    title: "Morgenroutine",
    icon: "🌅",
    steps: [
      { id: "s1", title: "Aufstehen & Licht an", icon: "💡", durationSec: null },
      { id: "s2", title: "Anziehen", icon: "👕", durationSec: 300 },
      { id: "s3", title: "Frühstücken", icon: "🥣", durationSec: 900 },
      { id: "s4", title: "Zähneputzen", icon: "🪥", durationSec: 120 },
      { id: "s5", title: "Schultasche / Sachen", icon: "🎒", durationSec: 180 },
    ],
  },
  {
    title: "Abendroutine",
    icon: "🌙",
    steps: [
      { id: "s1", title: "Aufräumen (5 Dinge)", icon: "🧸", durationSec: 300 },
      { id: "s2", title: "Schlafanzug an", icon: "🛌", durationSec: null },
      { id: "s3", title: "Zähneputzen", icon: "🪥", durationSec: 120 },
      { id: "s4", title: "Vorlesen / ruhig werden", icon: "📖", durationSec: 600 },
    ],
  },
  {
    title: "Hausaufgaben",
    icon: "✏️",
    steps: [
      { id: "s1", title: "Platz freiräumen", icon: "🧹", durationSec: 120 },
      { id: "s2", title: "Was ist auf? (kurz sammeln)", icon: "📋", durationSec: 180 },
      { id: "s3", title: "Fokusblock 1", icon: "⏳", durationSec: 900 },
      { id: "s4", title: "Pause", icon: "🌿", durationSec: 300 },
      { id: "s5", title: "Fokusblock 2", icon: "⏳", durationSec: 900 },
    ],
  },
];

function createRoutines() {
  const { subscribe, set } = writable<Routine[]>([]);

  async function load() {
    const all = await (await db()).getAll("routines");
    all.sort((a, b) => a.createdAt - b.createdAt);
    set(all);
  }

  async function add(
    data: Pick<Routine, "title" | "icon" | "steps">,
    profileId: string | null = null,
  ): Promise<Routine> {
    const r: Routine = {
      id: uid("rt"),
      title: data.title.trim() || "Routine",
      icon: data.icon || "📋",
      steps: data.steps,
      profileId,
      createdAt: Date.now(),
      lastTouchedAt: Date.now(),
    };
    await (await db()).put("routines", r);
    await load();
    return r;
  }

  async function addFromTemplate(
    tpl: (typeof ROUTINE_TEMPLATES)[number],
    profileId: string | null = null,
  ) {
    // Schritt-IDs neu vergeben, damit Kopien unabhängig sind.
    const steps: RoutineStep[] = tpl.steps.map((s) => ({ ...s, id: uid("s") }));
    return add({ title: tpl.title, icon: tpl.icon, steps }, profileId);
  }

  async function update(r: Routine) {
    await (await db()).put("routines", r);
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("routines", id);
    await load();
  }

  /** Doom-Box: als „benutzt" markieren (beim Start einer Routine) → wird nicht eingeschläfert. */
  async function touch(id: string) {
    const r = get({ subscribe }).find((x) => x.id === id);
    if (!r) return;
    await (await db()).put("routines", { ...r, lastTouchedAt: Date.now(), archived: false });
    await load();
  }

  async function setArchived(id: string, archived: boolean) {
    const r = get({ subscribe }).find((x) => x.id === id);
    if (!r) return;
    await (await db()).put("routines", { ...r, archived, lastTouchedAt: archived ? r.lastTouchedAt : Date.now() });
    await load();
  }

  function emptyStep(): RoutineStep {
    return { id: uid("s"), title: "", icon: "", durationSec: null };
  }

  return { subscribe, load, add, addFromTemplate, update, remove, touch, setArchived, emptyStep, get: () => get({ subscribe }) };
}

export const routines = createRoutines();
