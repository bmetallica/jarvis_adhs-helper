// Medikations-Tracker. ADHS-zentral: Einnahme festhalten, nächste Dosis + Rebound-Fenster sehen.
// Hochsensible Daten → bleiben lokal (bzw. nutzerisoliert), kein Cloud-Egress.
import { writable, get } from "svelte/store";
import type { Medication } from "../types";
import { db } from "../db";
import { uid } from "../util";
import { ymd, hhmm } from "../date";

function createMedications() {
  const { subscribe, set } = writable<Medication[]>([]);

  async function load() {
    const all = await (await db()).getAll("medications");
    all.sort((a, b) => a.createdAt - b.createdAt);
    set(all);
  }

  async function add(data: Omit<Medication, "id" | "log" | "createdAt">) {
    await (await db()).put("medications", { ...data, id: uid("med"), log: [], createdAt: Date.now() });
    await load();
  }

  async function update(m: Medication) {
    await (await db()).put("medications", m);
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("medications", id);
    await load();
  }

  /** Einnahme jetzt festhalten. */
  async function take(id: string) {
    const m = get({ subscribe }).find((x) => x.id === id);
    if (!m) return;
    const log = [...m.log, Date.now()].slice(-60);
    await (await db()).put("medications", { ...m, log });
    await load();
  }

  return { subscribe, load, add, update, remove, take };
}

export const medications = createMedications();

// --- Hilfen ---

/** Letzte Einnahme (ms) oder null. */
export function lastTaken(m: Medication): number | null {
  return m.log.length ? m.log[m.log.length - 1] : null;
}

/** Wurde heute zur Zeit `t` (±90 min) bereits eingenommen? */
export function takenAround(m: Medication, ts: number): boolean {
  return m.log.some((l) => Math.abs(l - ts) <= 90 * 60000);
}

/** Heutiger Timestamp für eine HH:MM-Zeit. */
export function todayAt(time: string): number {
  const [h, min] = time.split(":").map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(h || 0, min || 0, 0, 0);
  return d.getTime();
}

/** Nächste anstehende Einnahme als Text (heute/ morgen). */
export function nextDoseText(m: Medication): string | null {
  if (!m.times.length) return null;
  const now = Date.now();
  const todays = m.times.map(todayAt).sort((a, b) => a - b);
  const upcoming = todays.find((t) => t > now);
  if (upcoming) return `${hhmm(upcoming)} Uhr`;
  return `morgen ${m.times.slice().sort()[0]} Uhr`;
}

/** Rebound-Fenster nach letzter Einnahme als Text. */
export function reboundText(m: Medication): string | null {
  const last = lastTaken(m);
  if (!last || !m.reboundMin) return null;
  return `Rebound ~${hhmm(last + m.reboundMin * 60000)} Uhr`;
}

export function takenTodayCount(m: Medication): number {
  const today = ymd(Date.now());
  return m.log.filter((l) => ymd(l) === today).length;
}
