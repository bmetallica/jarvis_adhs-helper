// Stimmungs-/Energie-/Fokus-Check-in (Zero-Text). Für sich selbst, nie als Bewertung.
import { writable, get } from "svelte/store";
import type { Checkin } from "../types";
import { db } from "../db";
import { uid } from "../util";

function createCheckins() {
  const { subscribe, set } = writable<Checkin[]>([]);

  async function load() {
    const all = await (await db()).getAll("checkins");
    all.sort((a, b) => a.createdAt - b.createdAt);
    set(all);
  }

  async function record(opts: {
    mood: number;
    energy: number;
    focus: number;
    profileId?: string | null;
  }): Promise<Checkin> {
    const c: Checkin = {
      id: uid("ci"),
      mood: opts.mood,
      energy: opts.energy,
      focus: opts.focus,
      profileId: opts.profileId ?? null,
      createdAt: Date.now(),
    };
    await (await db()).put("checkins", c);
    await load();
    return c;
  }

  /** Letzter Check-in eines Profils (für Tageskurve / Anzeige). */
  function latestFor(profileId: string | null): Checkin | null {
    const list = get({ subscribe }).filter((c) => c.profileId === profileId);
    return list.length ? list[list.length - 1] : null;
  }

  return { subscribe, load, record, latestFor };
}

export const checkins = createCheckins();
