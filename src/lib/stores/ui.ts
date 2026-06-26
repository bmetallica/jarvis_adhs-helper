// Globaler UI-Zustand (Overlays, die von überall geöffnet werden).
import { writable } from "svelte/store";

export const brainDumpOpen = writable(false);
export const coachOpen = writable(false);
export const calmOpen = writable(false);
export const proposeOpen = writable(false);
export const sosOpen = writable(false);
export const whereOpen = writable(false);

export function openPropose() {
  proposeOpen.set(true);
}

export function openSos() {
  sosOpen.set(true);
}

export function openWhere() {
  whereOpen.set(true);
}

export function openBrainDump() {
  brainDumpOpen.set(true);
}

export function openCoach() {
  coachOpen.set(true);
}

export function openCalm() {
  calmOpen.set(true);
}
