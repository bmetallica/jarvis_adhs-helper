// Settings-Store: lädt aus IndexedDB, persistiert bei jeder Änderung.
import { writable } from "svelte/store";
import { DEFAULT_SETTINGS, type Settings } from "../types";
import { kvGet, kvSet } from "../db";

const KEY = "settings";

function createSettings() {
  const { subscribe, set, update } = writable<Settings>(DEFAULT_SETTINGS);
  let loaded = false;

  async function load() {
    const stored = await kvGet<Partial<Settings>>(KEY);
    set({ ...DEFAULT_SETTINGS, ...(stored ?? {}) });
    loaded = true;
  }

  async function patch(p: Partial<Settings>) {
    update((s) => {
      const next = { ...s, ...p };
      void kvSet(KEY, next);
      return next;
    });
  }

  return { subscribe, load, patch, isLoaded: () => loaded };
}

export const settings = createSettings();
