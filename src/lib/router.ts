// Winziger Hash-Router (kein Framework-Overhead, offline-tauglich, kein Server-Routing nötig).
import { writable } from "svelte/store";

export type RouteName = "home" | "plan" | "timer" | "diary" | "pet" | "family" | "me" | "kiosk";

export const ROUTES: RouteName[] = ["home", "plan", "timer", "diary", "pet", "family", "me", "kiosk"];

function parse(): RouteName {
  const h = location.hash.replace(/^#\/?/, "").split("/")[0];
  return (ROUTES as string[]).includes(h) ? (h as RouteName) : "home";
}

function createRouter() {
  const { subscribe, set } = writable<RouteName>(parse());
  if (typeof window !== "undefined") {
    window.addEventListener("hashchange", () => set(parse()));
  }
  function go(r: RouteName) {
    location.hash = `#/${r}`;
  }
  return { subscribe, go };
}

export const route = createRouter();
