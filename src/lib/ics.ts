// ICS-Kalender: Termine leben nie nur in einer App.
// Export: Termine zum App-Server hochladen → Familie abonniert /calendar.ics im nativen Kalender.
// Import: Schul-/Vereinskalender (.ics-Datei) in die Termin-Liste übernehmen.
import { get } from "svelte/store";
import { appointments } from "./stores/appointments";

const DAY = 86_400_000;

/** Termine (letzte 7 Tage bis +90 Tage) zum Server hochladen (best effort). */
export async function updateIcsData(): Promise<void> {
  const now = Date.now();
  const items = get(appointments)
    .filter((a) => a.startsAt > now - 7 * DAY && a.startsAt < now + 90 * DAY)
    .map((a) => ({ id: a.id, title: a.title, icon: a.icon, startsAt: a.startsAt, endsAt: a.startsAt + 3600_000 }));
  await fetch("/ics/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  }).catch(() => {});
}

/** Abo-URL des Feeds abfragen (null, wenn der Server kein ICS anbietet, z. B. im Dev-Modus). */
export async function icsFeedUrl(): Promise<string | null> {
  try {
    const res = await fetch("/ics/info");
    if (!res.ok) return null;
    const data = (await res.json()) as { path?: string };
    return data.path ? new URL(data.path, location.origin).toString() : null;
  } catch {
    return null;
  }
}

/** Feed aktuell halten: bei Termin-Änderungen (debounced) neu hochladen. */
export function initIcsSync() {
  if (typeof window === "undefined") return;
  let t: ReturnType<typeof setTimeout> | null = null;
  let primed = false;
  appointments.subscribe(() => {
    if (!primed) {
      primed = true;
      return;
    }
    if (t) clearTimeout(t);
    t = setTimeout(() => void updateIcsData(), 5000);
  });
  setTimeout(() => void updateIcsData(), 8000);
}

// --- ICS-Import (pragmatischer Parser für Schul-/Vereinskalender) ---

export interface IcsEvent {
  title: string;
  startsAt: number;
}

/** ICS-Text parsen: VEVENTs mit SUMMARY + DTSTART. Wiederholungen: nur das erste Vorkommen. */
export function parseIcs(text: string): IcsEvent[] {
  // Gefaltete Zeilen entfalten (RFC 5545: Fortsetzung beginnt mit Leerzeichen/Tab).
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const events: IcsEvent[] = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const summary = /^SUMMARY(?:;[^:]*)?:(.*)$/m.exec(body)?.[1]?.trim();
    const dtstart = /^DTSTART(?:;[^:]*)?:(.*)$/m.exec(body)?.[1]?.trim();
    if (!summary || !dtstart) continue;
    const ts = parseIcsDate(dtstart);
    if (ts == null) continue;
    events.push({ title: summary.replace(/\\([;,nN\\])/g, (_, c) => (c.toLowerCase() === "n" ? " " : c)), startsAt: ts });
  }
  return events.sort((a, b) => a.startsAt - b.startsAt);
}

function parseIcsDate(v: string): number | null {
  // 20260812T140000Z | 20260812T140000 | 20260812
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
  if (!m) return null;
  const [, y, mo, d, h = "9", mi = "0", s = "0", z] = m;
  if (z) return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  return new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime();
}
