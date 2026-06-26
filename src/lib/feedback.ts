// Sanftes, nicht-erschreckendes Feedback: weicher Ton (WebAudio) + optional Haptik.
// Bewusst leise/weich gehalten (RSD/Reizempfindlichkeit). Respektiert Settings.
import { get } from "svelte/store";
import { settings } from "./stores/settings";
import { vibrate } from "./util";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

/** Ein weicher Sinus-Ton mit sanftem Ein-/Ausblenden (kein harter Alarm). */
function tone(freq: number, durationMs: number, gain = 0.06) {
  const s = get(settings);
  if (!s.sound) return;
  const ac = audio();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const t0 = ac.currentTime;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.04);
  g.gain.linearRampToValueAtTime(0, t0 + durationMs / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.02);
}

/** Sanfte Vorwarnung an einer Zeitmarke. */
export function warnCue() {
  const s = get(settings);
  tone(523.25, 180); // C5, kurz
  vibrate(40, s.haptics);
}

/** Ruhiges Ende — zwei weiche, absteigende Töne. „Zeit ist um, alles gut." */
export function doneCue() {
  const s = get(settings);
  tone(587.33, 240); // D5
  setTimeout(() => tone(440, 320), 240); // A4
  vibrate([60, 60, 60], s.haptics);
}

/** Kleines Erfolgs-Pling (Schritt erledigt). */
export function successCue() {
  const s = get(settings);
  tone(659.25, 140); // E5
  setTimeout(() => tone(783.99, 180), 120); // G5
  vibrate(30, s.haptics);
}
