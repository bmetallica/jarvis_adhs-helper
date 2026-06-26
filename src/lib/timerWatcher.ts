// Globaler Timer-Wächter: löst sanfte Vorwarnungen an den Marken aus und beendet abgelaufene
// Timer ruhig. Läuft an einer einzigen Stelle (App), damit Warnungen auch auf anderen Screens
// feuern. Idempotent über `firedWarnings` (persistiert) + In-Memory-Dedupe pro Session.
import { get } from "svelte/store";
import { timers } from "./stores/timers";
import { db } from "./db";
import { warnCue, doneCue } from "./feedback";
import { pet } from "./stores/pet";
import { XP } from "./pet";
import type { TimerItem } from "./types";

const doneFired = new Set<string>();

export async function tickTimers(nowMs: number): Promise<void> {
  const list = get(timers) as TimerItem[];
  for (const t of list) {
    if (t.status !== "running") continue;
    const rem = (t.endsAt - nowMs) / 1000;

    // Läuft wieder (Restart/Resume mit Restzeit) → „done"-Sperre aufheben.
    if (rem > 0 && doneFired.has(t.id)) doneFired.delete(t.id);

    if (rem <= 0) {
      if (!doneFired.has(t.id)) {
        doneFired.add(t.id);
        doneCue();
        await timers.markDone(t.id);
        // Durchgehaltener Timer zahlt aufs Familien-Tier ein.
        await pet.award(XP.timer, t.profileId, `Timer: ${t.label}`);
      }
      continue;
    }

    // Vorwarn-Marken, die jetzt erreicht sind und noch nicht ausgelöst wurden.
    const due = t.warnAtSec.filter((w) => rem <= w && !t.firedWarnings.includes(w));
    if (due.length) {
      warnCue();
      const updated: TimerItem = { ...t, firedWarnings: [...t.firedWarnings, ...due] };
      await (await db()).put("timers", updated);
      await timers.load();
    }
  }
}

/** Aufräumen, wenn ein Timer entfernt/neugestartet wurde. */
export function resetDoneFired(id: string): void {
  doneFired.delete(id);
}
