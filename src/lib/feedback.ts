// Sanftes, nicht-erschreckendes Feedback: weicher Ton (WebAudio) + optional Haptik.
// Bewusst leise/weich gehalten (RSD/Reizempfindlichkeit). Respektiert Settings.
import { get, writable } from "svelte/store";
import { settings } from "./stores/settings";
import { vibrate } from "./util";

/** Anzahl laufender Endlos-Alarme (für ein globales „Stoppen"-Banner). */
export const alarmsRunning = writable(0);

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

/** Nutzer-Lautstärke als Faktor: 0.5 (Default) = bisheriger Pegel, 1 = doppelt. */
function volumeScale(): number {
  const v = get(settings).alarmVolume;
  const vol = typeof v === "number" && isFinite(v) ? v : 0.5;
  return Math.min(1, Math.max(0.05, vol)) / 0.5;
}

/** Sinus-Ton mit sanftem Ein-/Ausblenden. Pegel folgt der Alarm-Lautstärke in den Einstellungen. */
function tone(freq: number, durationMs: number, gain = 0.2, force = false) {
  const s = get(settings);
  if (!s.sound && !force) return;
  gain = Math.min(0.9, gain * volumeScale());
  const ac = audio();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const t0 = ac.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.setValueAtTime(gain, t0 + durationMs / 1000 - 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.02);
}

/** Sanfte Vorwarnung an einer Zeitmarke — jetzt klar hörbar. */
export function warnCue() {
  const s = get(settings);
  tone(523.25, 320); // C5
  vibrate(60, s.haptics);
}

/** Ende-Klang — zwei volle Töne (für das ruhige Markieren; Alarm-Schleife siehe startAlarm). */
export function doneCue() {
  const s = get(settings);
  tone(659.25, 360); // E5
  setTimeout(() => tone(523.25, 480), 320); // C5
  vibrate([120, 80, 120], s.haptics);
}

/** Erfolgs-Pling (Schritt erledigt). */
export function successCue() {
  const s = get(settings);
  tone(659.25, 220); // E5
  setTimeout(() => tone(783.99, 280), 150); // G5
  vibrate(40, s.haptics);
}

// --- Endlos-Alarm (läuft, bis manuell gestoppt) ---
const alarms = new Map<string, ReturnType<typeof setInterval>>();

/** Ein Durchlauf des gewählten Klangprofils. Exportiert für die Hörprobe in den Einstellungen. */
export function playAlarmSample() {
  const s = get(settings);
  const profile = s.alarmSound ?? "triad";
  if (profile === "bell") {
    // Glocke: ein voller, langsam ausklingender Ton mit Oberton.
    tone(1046.5, 900, 0.3, true);
    setTimeout(() => tone(2093, 500, 0.1, true), 30);
  } else if (profile === "soft") {
    // Sanft: zwei weiche, tiefere Töne — für Reizempfindliche.
    tone(523.25, 420, 0.18, true);
    setTimeout(() => tone(659.25, 520, 0.18, true), 460);
  } else {
    // Dreiklang, kräftig (Default).
    tone(880, 260, 0.28, true);
    setTimeout(() => tone(660, 260, 0.28, true), 280);
    setTimeout(() => tone(990, 380, 0.28, true), 560);
  }
  vibrate([250, 120, 250], s.haptics);
}

/** Lautes, wiederkehrendes Alarm-Signal (abgelaufener Timer) — bis stopAlarm(). */
export function startAlarm(key: string) {
  if (alarms.has(key)) return;
  const s = get(settings);
  playAlarmSample();
  const id = setInterval(playAlarmSample, 1500);
  alarms.set(key, id);
  alarmsRunning.update((n) => n + 1);
  // Optional: nach N Minuten selbst verstummen (0 = bis manuell gestoppt).
  const autoMin = s.alarmAutoStopMin ?? 0;
  if (autoMin > 0) setTimeout(() => stopAlarm(key), autoMin * 60_000);
}

export function stopAlarm(key: string) {
  const id = alarms.get(key);
  if (id == null) return;
  clearInterval(id);
  alarms.delete(key);
  alarmsRunning.update((n) => Math.max(0, n - 1));
}

export function stopAllAlarms() {
  for (const id of alarms.values()) clearInterval(id);
  alarms.clear();
  alarmsRunning.set(0);
}

export function isAlarming(key: string): boolean {
  return alarms.has(key);
}

/**
 * Lokales Sprach-Nudging über die Web Speech API — funktioniert OFFLINE und ohne KI-Server.
 * So bleibt akustisches Nudging barrierefrei, auch wenn JARVIS gerade nicht erreichbar ist.
 */
export function speak(text: string, opts: { force?: boolean } = {}) {
  const s = get(settings);
  if (!opts.force && (!s.sound || !s.voiceNudges)) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 0.98;
    u.pitch = 1;
    const de = window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith("de"));
    if (de) u.voice = de;
    window.speechSynthesis.cancel(); // nicht stapeln
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/** Beruhigendes rosa Rauschen (WebAudio, lokal). Gibt eine Stopp-Funktion zurück. */
export function pinkNoise(volume = 0.08): () => void {
  const ac = audio();
  if (!ac) return () => {};
  if (ac.state === "suspended") void ac.resume();
  const bufferSize = 4096;
  const node = ac.createScriptProcessor ? ac.createScriptProcessor(bufferSize, 1, 1) : null;
  const gain = ac.createGain();
  gain.gain.value = volume;
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  if (node) {
    node.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    };
    node.connect(gain).connect(ac.destination);
    return () => {
      try {
        node.disconnect();
        gain.disconnect();
      } catch {
        /* ignore */
      }
    };
  }
  return () => {};
}
