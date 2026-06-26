// Master-Authentifizierung (Client-Seite). Der Schutz selbst sitzt im Server (serve.js) — hier nur
// Status/Login-UI. Bei aktivem Schutz blockiert die App, bis das Masterpasswort eingegeben wurde.
import { writable } from "svelte/store";

interface AuthState {
  required: boolean;
  authed: boolean;
  checked: boolean;
}

function createAuth() {
  const { subscribe, set, update } = writable<AuthState>({ required: false, authed: true, checked: false });

  async function check() {
    try {
      const r = await fetch("/auth/status", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        set({ required: !!j.required, authed: !!j.authed, checked: true });
        return;
      }
    } catch {
      /* offline: ohne Server-Auth-Info davon ausgehen, dass nichts verlangt wird */
    }
    set({ required: false, authed: true, checked: true });
  }

  async function login(password: string): Promise<boolean> {
    try {
      const r = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        update((s) => ({ ...s, authed: true }));
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }

  async function logout() {
    try {
      await fetch("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    update((s) => ({ ...s, authed: false }));
  }

  /** Vom jarvis-client bei 401 aufgerufen → Status neu prüfen (ggf. Login-Overlay zeigen). */
  function onUnauthorized() {
    void check();
  }

  return { subscribe, check, login, logout, onUnauthorized };
}

export const auth = createAuth();
