// Hyperfokus-Helfer mit Unterbrechung.
// Ablauf: Fokusfenster festlegen → 15 min vorher sanft informieren → 5 min vorher HART unterbrechen
// und anbieten, den aktuellen Stand zu notieren (geht via Outbox nach Obsidian, auch offline).
// Zustand in localStorage gespiegelt, damit ein Reload die Session nicht verliert.
import { writable, get } from "svelte/store";
import { deliverReminder } from "../notify";
import { warnCue, doneCue } from "../feedback";

export interface HyperfocusState {
  active: boolean;
  label: string;
  startedAt: number;
  endsAt: number;
  warned15: boolean;
  /** true = harte Unterbrechung läuft (Overlay zeigt sich). */
  interrupting: boolean;
  handled: boolean; // Unterbrechung wurde quittiert (Notiz gespeichert/übersprungen)
}

const KEY = "hyperfocus";

function restore(): HyperfocusState {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (raw) return JSON.parse(raw) as HyperfocusState;
  } catch {
    /* ignore */
  }
  return { active: false, label: "", startedAt: 0, endsAt: 0, warned15: false, interrupting: false, handled: false };
}

function createHyperfocus() {
  const { subscribe, set } = writable<HyperfocusState>(restore());

  function persist(s: HyperfocusState) {
    set(s);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }

  function start(minutes: number, label: string) {
    const now = Date.now();
    persist({
      active: true,
      label: label.trim() || "Fokus",
      startedAt: now,
      endsAt: now + minutes * 60000,
      warned15: minutes <= 15, // bei kurzen Fenstern keine 15-min-Vorwarnung
      interrupting: false,
      handled: false,
    });
  }

  function stop() {
    persist({ active: false, label: "", startedAt: 0, endsAt: 0, warned15: false, interrupting: false, handled: false });
  }

  /** Unterbrechung quittiert (nach Notiz/Überspringen) — Fenster sanft auslaufen lassen. */
  function acknowledge() {
    const s = get({ subscribe });
    persist({ ...s, interrupting: false, handled: true });
  }

  /** Von der zentralen Uhr getrieben. */
  function tick(now: number) {
    const s = get({ subscribe });
    if (!s.active) return;
    const remaining = s.endsAt - now;

    // 15 min vorher sanft informieren.
    if (!s.warned15 && remaining <= 15 * 60000 && remaining > 5 * 60000) {
      warnCue();
      deliverReminder(`⏳ Fokus „${s.label}": noch 15 Minuten`, "Bald einen guten Punkt zum Abschließen suchen.");
      persist({ ...s, warned15: true });
      return;
    }
    // 5 min vorher HART unterbrechen.
    if (!s.handled && !s.interrupting && remaining <= 5 * 60000) {
      doneCue();
      deliverReminder(`✋ Stopp: „${s.label}"`, "Halte kurz deinen Stand fest.");
      persist({ ...s, interrupting: true });
      return;
    }
    // Fenster zu Ende.
    if (remaining <= 0) {
      stop();
    }
  }

  return { subscribe, start, stop, acknowledge, tick };
}

export const hyperfocus = createHyperfocus();
