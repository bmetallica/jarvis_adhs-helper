// Wächter für Termin- und Fristen-Erinnerungen. An die zentrale Uhr gekoppelt (App-weit).
// Feuert mehrstufige, sanfte Vorwarnungen — inkl. der wichtigsten ADHS-Erinnerung: „Jetzt losgehen".
import { get } from "svelte/store";
import { appointments } from "./stores/appointments";
import { deadlines } from "./stores/deadlines";
import { medications, todayAt, takenAround, daysLeft, refillDue } from "./stores/medications";
import { db } from "./db";
import { deliverReminder } from "./notify";
import { warnCue } from "./feedback";
import { hhmm, leaveTime, relativeWhen, ymd } from "./date";
import { settings } from "./stores/settings";
import { windDownActive } from "./winddown";
import type { Appointment, Deadline, Medication } from "./types";

// In-Memory-Dedupe pro Session (zusätzlich zur persistierten firedReminders-Liste).
const seen = new Set<string>();

function once(key: string): boolean {
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

async function checkAppointments(nowMs: number) {
  const list = get(appointments) as Appointment[];
  const d = await db();
  for (const a of list) {
    // „Jetzt losgehen" — die zentrale Vorlauf-Erinnerung (inkl. Anzieh-/Packzeit).
    const lead = a.travelMin + (a.prepMin ?? 0);
    const leave = leaveTime(a.startsAt, lead, a.bufferMin);
    if (!a.leaveFired && nowMs >= leave && nowMs < a.startsAt && once(`ap-leave-${a.id}-${a.startsAt}`)) {
      warnCue();
      const mins = lead + a.bufferMin;
      deliverReminder(
        `🚶 Jetzt losmachen: ${a.title}`,
        mins > 0 ? `Start ${hhmm(a.startsAt)} Uhr — plane ~${mins} min Vorlauf ein.` : `Start ${hhmm(a.startsAt)} Uhr.`,
      );
      await d.put("appointments", { ...a, leaveFired: true, leaveSoonFired: true });
      await appointments.load();
      continue;
    }
    // Übergangs-Vorwarnung 10 min vor der Losgeh-Zeit (Transitions brauchen Anlauf).
    const soonAt = leave - 10 * 60000;
    if (
      !a.leaveSoonFired && !a.leaveFired && lead + a.bufferMin > 0 &&
      nowMs >= soonAt && nowMs < leave && once(`ap-soon-${a.id}-${a.startsAt}`)
    ) {
      warnCue();
      deliverReminder(`🚪 Gleich losmachen: ${a.title}`, `Losgeh-Zeit ~${hhmm(leave)} Uhr — jetzt in Ruhe fertig machen.`);
      await d.put("appointments", { ...a, leaveSoonFired: true });
      await appointments.load();
      continue;
    }
    // Stufen-Erinnerungen (Minuten vor Start).
    const due = a.reminderOffsetsMin.filter((off) => {
      const at = a.startsAt - off * 60000;
      return nowMs >= at && nowMs < a.startsAt && !a.firedReminders.includes(off);
    });
    if (due.length && once(`ap-${a.id}-${a.startsAt}-${due.join(",")}`)) {
      warnCue();
      deliverReminder(`🗓️ ${a.title}`, `${relativeWhen(a.startsAt, nowMs)} · ${hhmm(a.startsAt)} Uhr`);
      await d.put("appointments", { ...a, firedReminders: [...a.firedReminders, ...due] });
      await appointments.load();
    }
  }
}

async function checkDeadlines(nowMs: number) {
  const list = get(deadlines) as Deadline[];
  const d = await db();
  for (const dl of list) {
    if (dl.done) continue;
    const due = dl.reminderOffsetsMin.filter((off) => {
      const at = dl.dueAt - off * 60000;
      return nowMs >= at && !dl.firedReminders.includes(off);
    });
    if (due.length && once(`dl-${dl.id}-${due.join(",")}`)) {
      warnCue();
      deliverReminder(`⏰ Frist: ${dl.title}`, `fällig ${relativeWhen(dl.dueAt, nowMs)}`);
      await d.put("deadlines", { ...dl, firedReminders: [...dl.firedReminders, ...due] });
      await deadlines.load();
    }
  }
}

function checkMedications(nowMs: number) {
  const list = get(medications) as Medication[];
  for (const m of list) {
    // Rezept-Vorlauf-Warner (BTM oft nur 30 Tage, Termine/Vorbereitung dauern): einmal pro Tag.
    if (refillDue(m)) {
      const key = `refill-${m.id}-${ymd(nowMs)}`;
      if (once(key)) {
        const d = daysLeft(m);
        deliverReminder(
          `📋 Rezept besorgen: ${m.name}`,
          `Bestand reicht noch ~${d} Tage${m.isBtm ? " (BTM — früh anrufen!)" : ""}.`,
        );
      }
    }
    for (const time of m.times) {
      const ts = todayAt(time);
      // Fällig: Zeit erreicht, innerhalb 2 h, heute noch nicht eingenommen.
      if (nowMs >= ts && nowMs < ts + 2 * 3600_000 && !takenAround(m, ts)) {
        const key = `med-${m.id}-${ymd(nowMs)}-${time}`;
        if (once(key)) {
          warnCue();
          deliverReminder(`💊 Zeit für ${m.name}`, `geplant ${time} Uhr`);
        }
      }
    }
  }
}

// Wind-down: einmal pro Abend ein sanfter Anstupser Richtung Abendroutine.
function checkWindDown(nowMs: number) {
  const s = get(settings);
  if (!s.windDownStart) return;
  if (!windDownActive(nowMs, s.windDownStart)) return;
  // Nur am Abend selbst erinnern (nicht nachts nach Mitternacht).
  const hour = new Date(nowMs).getHours();
  if (hour < 12) return;
  const key = `winddown-${ymd(nowMs)}`;
  if (once(key)) {
    deliverReminder("🌙 Wind-down", "Dein Morgen-Ich freut sich über Schlaf. Ein kleiner Schritt: Abendroutine starten.");
  }
}

export async function tickReminders(nowMs: number): Promise<void> {
  await checkAppointments(nowMs);
  await checkDeadlines(nowMs);
  checkMedications(nowMs);
  checkWindDown(nowMs);
}
