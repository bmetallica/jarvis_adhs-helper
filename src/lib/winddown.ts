// Abend-Modul (Wind-down): Schlafmangel verschärft alle ADHS-Symptome; „Revenge Bedtime
// Procrastination" ist der häufigste Auslöser. Ab der Wind-down-Zeit dimmt die App ins
// Calm-Theme und erinnert EINMAL sanft — kein Nörgeln, keine Sperre (Autonomie bleibt).

/** Aktiv von der eingestellten Startzeit bis 04:00 am Folgetag. */
export function windDownActive(nowMs: number, startHHMM: string): boolean {
  if (!/^\d{1,2}:\d{2}$/.test(startHHMM)) return false;
  const [h, m] = startHHMM.split(":").map(Number);
  const d = new Date(nowMs);
  const minutes = d.getHours() * 60 + d.getMinutes();
  const start = h * 60 + m;
  // Abends nach Start ODER nachts vor 04:00 (übergreifend).
  return minutes >= start || minutes < 4 * 60;
}
