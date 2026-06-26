// Familien-Nachrichtenboard: ein gemeinsamer Chat für alle. Lokal-first (IndexedDB) + Sync über
// JARVIS-Shared-Storage + WS-Event für Echtzeit. Offline werden Nachrichten lokal gezeigt; sobald
// verbunden, gehen sie an alle Geräte. Auch Ziel für System-Hinweise (Belohnung/Wertschätzung).
import { writable, get } from "svelte/store";
import type { Message, MessageKind } from "../types";
import { db } from "../db";
import { uid } from "../util";
import { settings } from "./settings";
import { profiles } from "./profiles";
import { jarvis, isConfigured } from "../jarvis/client";
import { publish } from "../jarvis/events";

const COLL = "chat";
const TOPIC = "jarvis/plugin/adhs/chat/new";
const MAX_LOCAL = 300;

function createMessages() {
  const { subscribe, set } = writable<Message[]>([]);

  async function load() {
    const all = await (await db()).getAll("messages");
    all.sort((a, b) => a.createdAt - b.createdAt);
    set(all.slice(-MAX_LOCAL));
  }

  async function saveLocal(m: Message) {
    await (await db()).put("messages", m);
  }

  function author(): { id: string | null; name: string; avatar: string } {
    const p = get(profiles).find((x) => x.id === get(settings).activeProfileId);
    return { id: p?.id ?? null, name: p?.name ?? "Ich", avatar: p?.avatar ?? "🙂" };
  }

  /** Nachricht senden (Chat) oder System-Eintrag posten. */
  async function post(text: string, kind: MessageKind = "chat", override?: { name: string; avatar: string }) {
    if (!text.trim()) return;
    const a = override ? { id: null, ...override } : author();
    const m: Message = {
      id: uid("msg"),
      fromId: a.id,
      fromName: a.name,
      fromAvatar: a.avatar,
      text: text.trim(),
      kind,
      createdAt: Date.now(),
    };
    await saveLocal(m);
    await load();
    // Verteilen, wenn verbunden.
    if (isConfigured()) {
      try {
        await jarvis.storagePut(COLL, m.id, m, true, { priority: "low" });
        publish(TOPIC, { id: m.id });
      } catch {
        /* offline → liegt lokal, wird beim nächsten Sync nicht automatisch hochgeladen (v1) */
      }
    }
  }

  /** Entfernte Nachrichten holen und lokal einmergen (bei WS-Event / Reconnect). */
  async function pullRemote() {
    if (!isConfigured()) return;
    try {
      const res = await jarvis.storageList<unknown>(COLL, true);
      const list = normalize(res);
      const d = await db();
      const known = new Set((await d.getAll("messages")).map((m) => m.id));
      let added = false;
      for (const m of list) {
        if (m && m.id && !known.has(m.id)) {
          await d.put("messages", m);
          added = true;
        }
      }
      if (added) await load();
    } catch {
      /* offline */
    }
  }

  return { subscribe, load, post, pullRemote };
}

/** Tolerant gegenüber verschiedenen storageList-Formaten (Array, {items}, Map …). */
function normalize(res: unknown): Message[] {
  let items: unknown[] = [];
  if (Array.isArray(res)) items = res;
  else if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    if (Array.isArray(o.items)) items = o.items;
    else if (Array.isArray(o.values)) items = o.values;
    else items = Object.values(o);
  }
  return items
    .map((it) => {
      const v = (it as { value?: unknown })?.value ?? it;
      return v as Message;
    })
    .filter((m): m is Message => !!m && typeof (m as Message).id === "string" && typeof (m as Message).text === "string");
}

export const messages = createMessages();
