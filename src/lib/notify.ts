// Lokale Benachrichtigungen (offline, ohne Server). Nutzt die Notification-API, wenn erlaubt;
// fällt sonst auf eine In-App-Toast-Anzeige zurück. JARVIS-Kanäle (Telegram/Satellit/Push) und
// echtes Web-Push kommen in Schritt 6/9. Bewusst sanft formuliert (kein Druck, kein Rot).
import { writable } from "svelte/store";

export interface Toast {
  id: string;
  title: string;
  body: string;
  /** Optionale Aktion (z. B. „Neu laden" beim App-Update). */
  action?: { label: string; run: () => void };
  /** Bleibt stehen, bis der Nutzer reagiert (für Updates o. Ä.). */
  sticky?: boolean;
}

export const toasts = writable<Toast[]>([]);

export function pushToast(title: string, body = "", opts: Pick<Toast, "action" | "sticky"> = {}) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  toasts.update((t) => [...t, { id, title, body, ...opts }]);
  if (!opts.sticky) setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), 8000);
}

export function dismissToast(id: string) {
  toasts.update((t) => t.filter((x) => x.id !== id));
}

export function notifyPermission(): NotificationPermission {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

export async function requestNotifyPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

/** Sanfte Erinnerung lokal zustellen: System-Notification falls erlaubt, sonst In-App-Toast. */
export function deliverReminder(title: string, body = "") {
  // Optionales lokales Sprach-Nudging (offline). Lazy-Import vermeidet Zyklen.
  void import("./feedback").then((f) => f.speak(`${title}. ${body}`.replace(/[🚶🗓️⏰💊✋⏳]/gu, "").trim()));
  let shown = false;
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/icons/icon-192.png", tag: "adhs-reminder" });
      shown = true;
    } catch {
      shown = false;
    }
  }
  // Immer auch in-app zeigen (falls App offen) — doppelte Sicherung gegen Vergessen.
  pushToast(title, body);
  return shown;
}
