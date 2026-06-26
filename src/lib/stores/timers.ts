// Timer-Store + Engine. Quelle der Wahrheit ist die absolute Endzeit (endsAt) — dadurch driftfrei
// über Reloads, App-Schließen und Hintergrund. Persistiert in IndexedDB.
import { writable, get } from "svelte/store";
import type { TimerItem, TimerStyle } from "../types";
import { db } from "../db";
import { uid, clamp } from "../util";

function createTimers() {
  const { subscribe, set } = writable<TimerItem[]>([]);

  async function load() {
    const all = await (await db()).getAll("timers");
    all.sort((a, b) => a.createdAt - b.createdAt);
    set(all);
  }

  async function persist(t: TimerItem) {
    await (await db()).put("timers", t);
    await load();
  }

  async function start(opts: {
    label: string;
    seconds: number;
    color?: string;
    style?: TimerStyle;
    warnAtSec?: number[];
    profileId?: string | null;
  }): Promise<TimerItem> {
    const seconds = clamp(Math.round(opts.seconds), 1, 24 * 3600);
    // Sinnvolle Default-Vorwarnungen, nur solche die < Dauer sind.
    const warn = (opts.warnAtSec ?? [300, 120, 60, 10]).filter((w) => w < seconds);
    const t: TimerItem = {
      id: uid("t"),
      label: opts.label.trim() || "Timer",
      durationSec: seconds,
      endsAt: Date.now() + seconds * 1000,
      remainingWhenPaused: null,
      status: "running",
      style: opts.style ?? "disc",
      color: opts.color ?? "#4fd1c5",
      warnAtSec: warn,
      firedWarnings: [],
      createdAt: Date.now(),
      profileId: opts.profileId ?? null,
    };
    await persist(t);
    return t;
  }

  async function pause(id: string) {
    const t = get({ subscribe }).find((x) => x.id === id);
    if (!t || t.status !== "running") return;
    const remaining = Math.max(0, Math.round((t.endsAt - Date.now()) / 1000));
    await persist({ ...t, status: "paused", remainingWhenPaused: remaining });
  }

  async function resume(id: string) {
    const t = get({ subscribe }).find((x) => x.id === id);
    if (!t || t.status !== "paused" || t.remainingWhenPaused == null) return;
    await persist({
      ...t,
      status: "running",
      endsAt: Date.now() + t.remainingWhenPaused * 1000,
      remainingWhenPaused: null,
    });
  }

  /** Timer auf volle Dauer zurücksetzen und neu starten. */
  async function restart(id: string) {
    const t = get({ subscribe }).find((x) => x.id === id);
    if (!t) return;
    await persist({
      ...t,
      status: "running",
      endsAt: Date.now() + t.durationSec * 1000,
      remainingWhenPaused: null,
      firedWarnings: [],
    });
  }

  /** Dauer im laufenden Betrieb anpassen (z. B. +1 min). */
  async function addSeconds(id: string, delta: number) {
    const t = get({ subscribe }).find((x) => x.id === id);
    if (!t) return;
    if (t.status === "paused" && t.remainingWhenPaused != null) {
      await persist({
        ...t,
        remainingWhenPaused: Math.max(0, t.remainingWhenPaused + delta),
        durationSec: Math.max(1, t.durationSec + delta),
      });
    } else {
      await persist({
        ...t,
        endsAt: t.endsAt + delta * 1000,
        durationSec: Math.max(1, t.durationSec + delta),
        status: "running",
      });
    }
  }

  async function remove(id: string) {
    await (await db()).delete("timers", id);
    await load();
  }

  async function markDone(id: string) {
    const t = get({ subscribe }).find((x) => x.id === id);
    if (!t || t.status === "done") return;
    await persist({ ...t, status: "done", remainingWhenPaused: 0 });
  }

  async function setStyle(id: string, style: TimerStyle) {
    const t = get({ subscribe }).find((x) => x.id === id);
    if (!t) return;
    await persist({ ...t, style });
  }

  /** Verbleibende Sekunden zu einem Zeitpunkt (rein, ohne Persistenz). */
  function remaining(t: TimerItem, nowMs: number): number {
    if (t.status === "paused") return t.remainingWhenPaused ?? 0;
    if (t.status === "done") return 0;
    return Math.max(0, (t.endsAt - nowMs) / 1000);
  }

  return {
    subscribe,
    load,
    start,
    pause,
    resume,
    restart,
    addSeconds,
    remove,
    markDone,
    setStyle,
    remaining,
  };
}

export const timers = createTimers();
