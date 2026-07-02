// Body-Doubling Stufe 1: „X fokussiert gerade an Y (noch Z min)" — über den Familien-Sync
// sichtbar. Alleine arbeiten fühlt sich weniger alleine an; andere können anfeuern (👍).
import { writable } from "svelte/store";
import type { FocusStatus } from "../types";
import { db } from "../db";

function createFocusStatus() {
  const { subscribe, set } = writable<FocusStatus[]>([]);

  async function load() {
    const all = await (await db()).getAll("focusstatus");
    all.sort((a, b) => b.updatedAt - a.updatedAt);
    set(all);
  }

  /** Eigenen Status setzen/erneuern (ein Eintrag pro Profil, id = profileId). */
  async function setStatus(profileId: string, name: string, avatar: string, text: string, untilMs: number) {
    await (await db()).put("focusstatus", {
      id: profileId,
      name,
      avatar,
      text: text.trim(),
      until: untilMs,
      cheers: 0,
      updatedAt: Date.now(),
    });
    await load();
  }

  async function clearStatus(profileId: string) {
    await (await db()).delete("focusstatus", profileId);
    await load();
  }

  async function cheer(profileId: string) {
    const d = await db();
    const s = await d.get("focusstatus", profileId);
    if (!s) return;
    await d.put("focusstatus", { ...s, cheers: s.cheers + 1, updatedAt: Date.now() });
    await load();
  }

  return { subscribe, load, setStatus, clearStatus, cheer };
}

export const focusstatus = createFocusStatus();

/** Aktiv = Endzeit noch nicht erreicht. */
export function isActiveFocus(s: FocusStatus, nowMs: number): boolean {
  return s.until > nowMs;
}
