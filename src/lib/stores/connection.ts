// Verbindungs-Status zu JARVIS (für die Settings-UI und spätere KI-Features).
import { writable } from "svelte/store";
import { jarvis, isConfigured, JarvisError, type MeInfo } from "../jarvis/client";

export type ConnStatus = "unconfigured" | "testing" | "connected" | "error";

interface ConnState {
  status: ConnStatus;
  info: MeInfo | null;
  error: string | null;
  /** Heuristik: liegt vermutlich ein Zertifikatsproblem vor? */
  certHint: boolean;
  /** Hat der/die aktuelle Nutzer/in JARVIS-Admin-Rechte? (Scope „*" oder „admin".) */
  isAdmin: boolean;
}

function detectAdmin(info: MeInfo | null): boolean {
  const sc = info?.scopes ?? [];
  return sc.includes("*") || sc.includes("admin") || sc.includes("api:admin");
}

function createConnection() {
  const { subscribe, set, update } = writable<ConnState>({
    status: isConfigured() ? "error" : "unconfigured",
    info: null,
    error: null,
    certHint: false,
    isAdmin: false,
  });

  async function test() {
    if (!isConfigured()) {
      set({ status: "unconfigured", info: null, error: null, certHint: false, isAdmin: false });
      return;
    }
    update((s) => ({ ...s, status: "testing", error: null, certHint: false }));
    jarvis.clearCache();
    try {
      const info = await jarvis.me();
      set({ status: "connected", info, error: null, certHint: false, isAdmin: detectAdmin(info) });
    } catch (e) {
      const err = e as JarvisError;
      // Netzfehler bei HTTPS + IP deutet oft auf ein nicht akzeptiertes Self-Signed-Zert hin.
      const certHint = err.code === "network";
      set({
        status: "error",
        info: null,
        error: err.message || "Verbindung fehlgeschlagen",
        certHint,
        isAdmin: false,
      });
    }
  }

  function reset() {
    set({ status: isConfigured() ? "error" : "unconfigured", info: null, error: null, certHint: false, isAdmin: false });
  }

  return { subscribe, test, reset };
}

export const connection = createConnection();
