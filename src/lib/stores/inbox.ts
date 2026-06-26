// Brain-Dump / Quick-Capture Posteingang. Erfassen ist getrennt vom Verarbeiten (ADHS-gerecht).
import { writable, get } from "svelte/store";
import type { InboxItem } from "../types";
import { db } from "../db";
import { uid } from "../util";

function createInbox() {
  const { subscribe, set } = writable<InboxItem[]>([]);

  async function load() {
    const all = await (await db()).getAll("inbox");
    all.sort((a, b) => b.createdAt - a.createdAt); // neueste zuerst
    set(all);
  }

  async function capture(opts: {
    text: string;
    kind?: "text" | "voice";
    audio?: Blob | null;
    profileId?: string | null;
  }): Promise<InboxItem> {
    const item: InboxItem = {
      id: uid("in"),
      text: opts.text.trim(),
      kind: opts.kind ?? "text",
      audio: opts.audio ?? null,
      processed: false,
      profileId: opts.profileId ?? null,
      createdAt: Date.now(),
    };
    await (await db()).put("inbox", item);
    await load();
    return item;
  }

  async function update(item: InboxItem) {
    await (await db()).put("inbox", item);
    await load();
  }

  async function markProcessed(id: string) {
    const it = get({ subscribe }).find((x) => x.id === id);
    if (!it) return;
    await (await db()).put("inbox", { ...it, processed: true });
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("inbox", id);
    await load();
  }

  return { subscribe, load, capture, update, markProcessed, remove };
}

export const inbox = createInbox();
