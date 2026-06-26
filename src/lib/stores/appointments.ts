// Termin-Store. ADHS-Fokus: Vorlauf-/Losgeh-Zeit, nicht nur Startzeit.
import { writable, get } from "svelte/store";
import type { Appointment, ChecklistItem } from "../types";
import { db } from "../db";
import { uid } from "../util";
import { nextOccurrence } from "../date";

export type AppointmentDraft = Omit<
  Appointment,
  "id" | "createdAt" | "firedReminders" | "leaveFired"
>;

function createAppointments() {
  const { subscribe, set } = writable<Appointment[]>([]);

  async function load() {
    const all = await (await db()).getAll("appointments");
    all.sort((a, b) => a.startsAt - b.startsAt);
    set(all);
  }

  async function add(d: AppointmentDraft): Promise<Appointment> {
    const a: Appointment = {
      ...d,
      id: uid("ap"),
      firedReminders: [],
      leaveFired: false,
      createdAt: Date.now(),
    };
    await (await db()).put("appointments", a);
    await load();
    return a;
  }

  async function update(a: Appointment) {
    await (await db()).put("appointments", a);
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("appointments", id);
    await load();
  }

  async function togglePrep(id: string, itemId: string) {
    const a = get({ subscribe }).find((x) => x.id === id);
    if (!a) return;
    const prep = a.prep.map((p) => (p.id === itemId ? { ...p, done: !p.done } : p));
    await update({ ...a, prep });
  }

  /** Termin als erledigt behandeln: bei Wiederholung nächstes Vorkommen anlegen, sonst löschen. */
  async function complete(id: string) {
    const a = get({ subscribe }).find((x) => x.id === id);
    if (!a) return;
    if (a.recurrence === "none") {
      await remove(id);
    } else {
      await update({
        ...a,
        startsAt: nextOccurrence(a.startsAt, a.recurrence),
        firedReminders: [],
        leaveFired: false,
        prep: a.prep.map((p) => ({ ...p, done: false })),
      });
    }
  }

  return { subscribe, load, add, update, remove, togglePrep, complete };
}

export function newChecklist(texts: string[]): ChecklistItem[] {
  return texts.filter((t) => t.trim()).map((t) => ({ id: uid("c"), text: t.trim(), done: false }));
}

export const appointments = createAppointments();
