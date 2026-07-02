// Globaler UI-Zustand (Overlays, die von überall geöffnet werden).
import { writable } from "svelte/store";

export const brainDumpOpen = writable(false);
/** Eltern-PIN in dieser Sitzung entsperrt (bis Reload). */
export const pinUnlocked = writable(false);
export const coachOpen = writable(false);
export const calmOpen = writable(false);
export const proposeOpen = writable(false);
export const sosOpen = writable(false);
export const whereOpen = writable(false);
export const dopamineOpen = writable(false);
export const repairOpen = writable(false);

export function openDopamine() {
  dopamineOpen.set(true);
}

export function openRepair() {
  repairOpen.set(true);
}

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
