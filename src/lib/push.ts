// Web-Push-Client: Abo verwalten und den „Erinnerungs-Plan" (Termine/Fristen/Medikation der
// nächsten 7 Tage) zum App-Server hochladen. Der Server ist nur der Wecker — die Daten bleiben
// die Quelle hier im Client. Funktioniert nur über den eigenen App-Server (serve.js) mit TLS.
import { get } from "svelte/store";
import { appointments } from "./stores/appointments";
import { deadlines } from "./stores/deadlines";
import { medications, todayAt } from "./stores/medications";
import { leaveTime, hhmm } from "./date";

export interface PushPlanItem {
  id: string;
  at: number;
  title: string;
  body: string;
}

const DAY = 86_400_000;
const HORIZON = 7 * DAY;

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function keyToU8(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  const reg = await registration();
  if (!reg) return null;
  try {
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Prüft, ob der App-Server Push anbietet (nur serve.js, nicht der Vite-Dev-Server). */
export async function pushAvailable(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const res = await fetch("/push/key");
    if (!res.ok) return false;
    const data = (await res.json()) as { key?: string };
    return typeof data.key === "string" && data.key.length > 20;
  } catch {
    return false;
  }
}

export async function subscribePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "Dieser Browser unterstützt kein Web-Push." };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "Benachrichtigungen sind nicht erlaubt." };
  const res = await fetch("/push/key").catch(() => null);
  if (!res?.ok) return { ok: false, reason: "Der App-Server bietet kein Push an (siehe DEPLOY)." };
  const { key } = (await res.json()) as { key: string };
  const reg = await registration();
  if (!reg) return { ok: false, reason: "Kein Service Worker aktiv (HTTPS nötig)." };
  let sub: PushSubscription;
  try {
    sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyToU8(key) as BufferSource,
      }));
  } catch {
    return { ok: false, reason: "Push-Abo fehlgeschlagen (sicherer Kontext/HTTPS nötig)." };
  }
  const saved = await fetch("/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sub: sub.toJSON() }),
  }).catch(() => null);
  if (!saved?.ok) return { ok: false, reason: "Server hat das Abo nicht angenommen." };
  await updatePushPlan();
  return { ok: true };
}

export async function unsubscribePush(): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  await fetch("/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

export async function sendTestPush(): Promise<boolean> {
  const sub = await getPushSubscription();
  if (!sub) return false;
  const res = await fetch("/push/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => null);
  return Boolean(res?.ok);
}

/** Erinnerungs-Plan der nächsten 7 Tage aus den lokalen Daten bauen. */
export function buildReminderPlan(nowMs = Date.now()): PushPlanItem[] {
  const items: PushPlanItem[] = [];

  for (const a of get(appointments)) {
    if (a.startsAt <= nowMs || a.startsAt > nowMs + HORIZON) continue;
    const lead = a.travelMin + (a.prepMin ?? 0);
    const leave = leaveTime(a.startsAt, lead, a.bufferMin);
    if (leave > nowMs) {
      items.push({
        id: `ap-leave-${a.id}-${a.startsAt}`,
        at: leave,
        title: `🚶 Jetzt losmachen: ${a.title}`,
        body: `Start ${hhmm(a.startsAt)} Uhr`,
      });
      // Übergangs-Vorwarnung: 10 min vor der Losgeh-Zeit (Transitions brauchen Anlauf).
      if (lead + a.bufferMin > 0 && leave - 10 * 60000 > nowMs) {
        items.push({
          id: `ap-soon-${a.id}-${a.startsAt}`,
          at: leave - 10 * 60000,
          title: `🚪 Gleich losmachen: ${a.title}`,
          body: `Losgeh-Zeit ~${hhmm(leave)} Uhr — jetzt in Ruhe fertig machen.`,
        });
      }
    }
    for (const off of a.reminderOffsetsMin) {
      const at = a.startsAt - off * 60000;
      if (at > nowMs) {
        items.push({ id: `ap-${a.id}-${a.startsAt}-${off}`, at, title: `🗓️ ${a.title}`, body: `${hhmm(a.startsAt)} Uhr` });
      }
    }
  }

  for (const dl of get(deadlines)) {
    if (dl.done) continue;
    for (const off of dl.reminderOffsetsMin) {
      const at = dl.dueAt - off * 60000;
      if (at > nowMs && at <= nowMs + HORIZON) {
        items.push({ id: `dl-${dl.id}-${off}`, at, title: `⏰ Frist: ${dl.title}`, body: "" });
      }
    }
  }

  for (const m of get(medications)) {
    for (const time of m.times) {
      for (let d = 0; d < 7; d++) {
        const at = todayAt(time) + d * DAY;
        if (at > nowMs && at <= nowMs + HORIZON) {
          items.push({ id: `med-${m.id}-${time}-${Math.floor(at / DAY)}`, at, title: `💊 Zeit für ${m.name}`, body: `geplant ${time} Uhr` });
        }
      }
    }
  }

  items.sort((a, b) => a.at - b.at);
  return items.slice(0, 300);
}

/** Plan zum Server hochladen (nur wenn dieses Gerät ein Abo hat). */
export async function updatePushPlan(): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  await fetch("/push/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint, items: buildReminderPlan() }),
  }).catch(() => {});
}

/** Plan aktuell halten: bei Änderungen an Terminen/Fristen/Medikation (debounced) neu hochladen. */
export function initPushPlanSync() {
  if (!pushSupported()) return;
  let t: ReturnType<typeof setTimeout> | null = null;
  let primed = 0;
  const kick = () => {
    // Erste Emission jedes Stores (Initial-Load) überspringen.
    if (primed < 3) {
      primed += 1;
      return;
    }
    if (t) clearTimeout(t);
    t = setTimeout(() => void updatePushPlan(), 4000);
  };
  appointments.subscribe(kick);
  deadlines.subscribe(kick);
  medications.subscribe(kick);
  // Beim Start einmal aktualisieren (falls abonniert): hält den Plan frisch.
  setTimeout(() => void updatePushPlan(), 6000);
}
