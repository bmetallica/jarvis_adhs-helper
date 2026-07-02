// Zeitschätzungs-Trainer: Zeitblindheit ist kalibrierbar. Wir sammeln Paare aus geschätzter
// und gefühlter Ist-Dauer (rollend, letzte 100) und zeigen den Faktor NEUTRAL — keine Moralkeule.
import { kvGet, kvSet } from "./db";

export interface TimeSample {
  /** geschätzt (Minuten) */
  e: number;
  /** tatsächlich (Minuten) */
  a: number;
  ts: number;
}

const KEY = "timetrainer";

export async function loadSamples(): Promise<TimeSample[]> {
  return (await kvGet<TimeSample[]>(KEY)) ?? [];
}

export async function recordSample(estimateMin: number, actualMin: number): Promise<void> {
  if (estimateMin <= 0 || actualMin <= 0) return;
  const all = await loadSamples();
  all.push({ e: estimateMin, a: actualMin, ts: Date.now() });
  await kvSet(KEY, all.slice(-100));
}

export interface TimeSummary {
  n: number;
  /** Median-Faktor Ist/Schätzung (1.0 = perfekt, 2.0 = doppelt so lang wie gedacht). */
  factor: number;
}

export function summarize(samples: TimeSample[]): TimeSummary | null {
  if (samples.length < 3) return null;
  const ratios = samples.map((s) => s.a / s.e).sort((x, y) => x - y);
  const mid = Math.floor(ratios.length / 2);
  const factor = ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2;
  return { n: samples.length, factor: Math.round(factor * 10) / 10 };
}

/** Freundlicher, neutraler Satz für die Insights-Ansicht. */
export function summaryText(s: TimeSummary): string {
  if (s.factor >= 1.4) {
    return `Dinge dauern bei dir im Schnitt ×${s.factor} länger als gedacht (${s.n} Messungen). Tipp: Schätzung mal ${s.factor} nehmen — dann stimmt dein Plan.`;
  }
  if (s.factor <= 0.7) {
    return `Du schätzt großzügig: Real ×${s.factor} der Schätzung (${s.n} Messungen). Du darfst dir mehr zutrauen.`;
  }
  return `Deine Zeitschätzung ist ziemlich gut kalibriert (Faktor ×${s.factor} bei ${s.n} Messungen). 💛`;
}
