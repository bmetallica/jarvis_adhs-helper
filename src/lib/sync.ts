// Geräteübergreifende Synchronisation: verbindet Pet-Store, Event-Bus und JARVIS-Shared-Storage.
// Offline-first: ohne Verbindung passiert nichts, lokal bleibt alles funktionsfähig.
// Das kooperative Tier reagiert so „auf allen Monitoren im Haus" (aus der Idee).
import { get } from "svelte/store";
import { pet, rewards } from "./stores/pet";
import { messages } from "./stores/messages";
import { outbox } from "./stores/outbox";
import { profiles } from "./stores/profiles";
import { settings } from "./stores/settings";
import { jarvis, isConfigured } from "./jarvis/client";
import { startEvents, onPluginEvent, publish, wsConnected } from "./jarvis/events";
import { pushToast } from "./notify";
import type { PetState } from "./pet";

const PET_COLL = "pet";
const PET_KEY = "state";
const XP_TOPIC = "jarvis/plugin/adhs/gamification/xp";
const TIMER_TOPIC = "jarvis/plugin/adhs/timer/tick";
const CHAT_TOPIC = "jarvis/plugin/adhs/chat/new";
const REWARD_TOPIC = "jarvis/plugin/adhs/reward/redeemed";

let mirrorTimer: ReturnType<typeof setTimeout> | null = null;

/** Lokalen Pet-Zustand in den geteilten Familien-Storage spiegeln (debounced). */
function mirrorPet(state: PetState) {
  if (!isConfigured()) return;
  if (mirrorTimer) clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => {
    void jarvis
      .storagePut(PET_COLL, PET_KEY, state, true, { priority: "low" })
      .catch(() => {});
  }, 800);
}

/** Geteilten Pet-Zustand holen und lokal einmergen. */
async function pullPet() {
  if (!isConfigured()) return;
  try {
    const remote = await jarvis.storageGet<{ value?: PetState } | PetState>(PET_COLL, PET_KEY, true, {
      priority: "low",
    });
    const state = (remote as { value?: PetState })?.value ?? (remote as PetState);
    if (state && typeof state.xp === "number") await pet.mergeRemote(state);
  } catch {
    /* offline / nicht vorhanden */
  }
}

export function initSync() {
  if (!isConfigured()) return;

  // 1) Pet-Beiträge nach außen spiegeln + Event feuern (alle Geräte reagieren).
  pet.setPublisher((state, delta) => {
    mirrorPet(state);
    publish(XP_TOPIC, { delta, xp: state.xp, coins: state.coins, total: state.xp });
  });

  // 2) Belohnungs-Einlösung → Eltern benachrichtigen (Board, Eltern-Geräte, JARVIS-notify).
  rewards.setOnRedeem((info) => {
    void notifyReward(info);
  });

  // 3) Eingehende Events verarbeiten.
  onPluginEvent((ev) => {
    if (ev.topic === XP_TOPIC) {
      void pullPet();
    } else if (ev.topic === CHAT_TOPIC) {
      void messages.pullRemote();
    } else if (ev.topic === REWARD_TOPIC) {
      // Auf anderem Gerät wurde eingelöst → wenn ich Elternteil bin, informieren.
      if (isParentHere()) {
        pushToast(`🎁 ${String(ev.payload?.who ?? "Jemand")} hat eingelöst`, String(ev.payload?.title ?? ""));
      }
    } else if (ev.topic === "jarvis/plugin/adhs/poll/update") {
      pushToast("🗳️ Abstimmung", "Es gibt ein Update bei den Abstimmungen.");
    } else if (ev.topic === TIMER_TOPIC) {
      pushToast("⏳ Timer auf einem anderen Gerät", String(ev.payload?.label ?? "Timer"));
    } else if (ev.topic === "jarvis/core/timer_elapsed") {
      pushToast("⏰ Timer abgelaufen", String(ev.payload?.label ?? ""));
    }
  });

  // 4) WS starten + initialen Stand holen.
  startEvents();
  void pullPet();
  void messages.pullRemote();
  void outbox.flush();

  // 5) Bei (Wieder-)Verbindung erneut abgleichen.
  wsConnected.subscribe((up) => {
    if (up) {
      void pullPet();
      void messages.pullRemote();
      void outbox.flush(); // gepufferte Obsidian-Notizen nachsenden
    }
  });
}

function isParentHere(): boolean {
  const p = get(profiles).find((x) => x.id === get(settings).activeProfileId);
  return p?.role === "parent";
}

/** Belohnungs-Einlösung verteilen: Board-Eintrag, WS-Event, JARVIS-notify an Eltern. */
async function notifyReward(info: { title: string; cost: number; who: string }) {
  // 1) Board-Eintrag (sichtbar für alle).
  await messages.post(`${info.who} hat „${info.title}" eingelöst (${info.cost} 🪙).`, "reward", { name: info.who, avatar: "🎁" });
  // 2) Live-Event an andere Geräte.
  publish(REWARD_TOPIC, { who: info.who, title: info.title, cost: info.cost });
  // 3) Direkte Benachrichtigung an die Eltern (kanal-bewusst über JARVIS).
  if (!isConfigured()) return;
  const parents = get(profiles).filter((p) => p.role === "parent" && p.jarvisUser);
  for (const parent of parents) {
    try {
      await jarvis.notify({
        user: parent.jarvisUser!,
        text: `🎁 ${info.who} hat „${info.title}" eingelöst (${info.cost} Münzen).`,
        kind: "reward",
        speak: false,
      });
    } catch {
      /* offline */
    }
  }
}

/** Timer-Start/-Ende geräteübergreifend ankündigen (best effort). */
export function broadcastTimer(label: string) {
  if (isConfigured()) publish(TIMER_TOPIC, { label });
}
