// Datums-Helfer — ADHS-gerechte, konkrete Zeitdarstellung (Countdown, „in X Schlafen").

import { pad2 } from "./util";

/** Lokales Datum als YYYY-MM-DD. */
export function ymd(d: Date | number): string {
  const x = typeof d === "number" ? new Date(d) : d;
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}

/** Mitternacht (lokal) eines Zeitpunkts. */
export function startOfDay(d: Date | number): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Anzahl Kalendertage zwischen heute und Ziel (0 = heute, 1 = morgen …). */
export function sleepsUntil(target: number, from: number = Date.now()): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(target).getTime();
  return Math.round((b - a) / 86_400_000);
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WEEKDAYS_LONG = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

export function weekdayShort(d: number | Date): string {
  return WEEKDAYS[new Date(d).getDay()];
}
export function weekdayLong(d: number | Date): string {
  return WEEKDAYS_LONG[new Date(d).getDay()];
}

/** Uhrzeit HH:MM. */
export function hhmm(d: number | Date): string {
  const x = new Date(d);
  return `${pad2(x.getHours())}:${pad2(x.getMinutes())}`;
}

/** Datum kompakt: „Di, 12.08." */
export function dateShort(d: number | Date): string {
  const x = new Date(d);
  return `${weekdayShort(x)}, ${pad2(x.getDate())}.${pad2(x.getMonth() + 1)}.`;
}

/**
 * Menschliche, ADHS-gerechte Relativangabe für einen zukünftigen/vergangenen Zeitpunkt.
 * Zeitblindheits-gerecht: macht „weit weg" vs. „gleich" fühlbar.
 */
export function relativeWhen(target: number, from: number = Date.now()): string {
  const diffMs = target - from;
  const past = diffMs < 0;
  const absMin = Math.round(Math.abs(diffMs) / 60000);
  const sleeps = sleepsUntil(target, from);

  if (past) {
    if (absMin < 1) return "gerade eben";
    if (absMin < 60) return `vor ${absMin} min`;
    if (absMin < 1440) return `vor ${Math.round(absMin / 60)} h`;
    return `vor ${Math.abs(sleeps)} Tagen`;
  }

  if (absMin < 1) return "jetzt gleich";
  if (absMin < 60) return `in ${absMin} min`;
  if (sleeps === 0) return `heute, in ${Math.round(absMin / 60)} h`;
  if (sleeps === 1) return "morgen";
  if (sleeps === 2) return "übermorgen";
  if (sleeps <= 7) return `in ${sleeps} Schlafen`;
  if (sleeps <= 21) return `in ${Math.round(sleeps / 7)} Wochen`;
  return `in ${sleeps} Tagen`;
}

/** Losgeh-Zeit eines Termins (Start minus Fahrt + Puffer). */
export function leaveTime(startsAt: number, travelMin: number, bufferMin: number): number {
  return startsAt - (travelMin + bufferMin) * 60000;
}

/** Wert für ein <input type="datetime-local"> aus Timestamp. */
export function toLocalInput(ts: number): string {
  const x = new Date(ts);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}T${pad2(x.getHours())}:${pad2(x.getMinutes())}`;
}

/** Timestamp aus <input type="datetime-local">-Wert. */
export function fromLocalInput(val: string): number {
  const t = new Date(val).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

/** Nächstes Vorkommen für Wiederholung (daily/weekly). */
export function nextOccurrence(startsAt: number, recurrence: "daily" | "weekly"): number {
  const step = recurrence === "daily" ? 86_400_000 : 7 * 86_400_000;
  let next = startsAt + step;
  const now = Date.now();
  while (next < now) next += step;
  return next;
}
