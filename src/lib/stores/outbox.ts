// Notiz-Outbox: Notizen werden lokal gepuffert und über JARVIS nach Obsidian weitergeleitet.
// Offline bleibt die Notiz erhalten und wird beim nächsten Verbindungsaufbau gesendet.
import { writable, get } from "svelte/store";
import type { OutboxNote } from "../types";
import { db } from "../db";
import { uid } from "../util";
import { jarvis, isConfigured } from "../jarvis/client";

function createOutbox() {
  const { subscribe, set } = writable<OutboxNote[]>([]);

  async function load() {
    const all = await (await db()).getAll("outbox");
    all.sort((a, b) => b.createdAt - a.createdAt);
    set(all);
  }

  /** Versucht, eine Notiz an JARVIS→Obsidian zu senden. Mehrere Wege, best effort. */
  async function forward(text: string, meta: Record<string, unknown>): Promise<boolean> {
    if (!isConfigured()) return false;
    // 1) Dedizierte Notiz-/Obsidian-Tools (Namen je nach JARVIS-Setup).
    for (const tool of ["obsidian_note", "obsidian_append", "add_note", "note"]) {
      try {
        await jarvis.toolInvoke(tool, { content: text, text, ...meta });
        return true;
      } catch {
        /* nächster Versuch */
      }
    }
    // 2) Fallback: ins RAG (von dort kann JARVIS nach Obsidian spiegeln).
    try {
      await jarvis.ragInsert("obsidian_inbox", text, meta);
      return true;
    } catch {
      return false;
    }
  }

  /** Notiz hinzufügen (sofort senden versuchen, sonst puffern). */
  async function add(text: string, source: string, meta: Record<string, unknown> = {}) {
    if (!text.trim()) return;
    const note: OutboxNote = {
      id: uid("note"),
      text: text.trim(),
      source,
      meta: { source, ...meta },
      sent: false,
      createdAt: Date.now(),
    };
    const ok = await forward(note.text, note.meta);
    note.sent = ok;
    await (await db()).put("outbox", note);
    await load();
  }

  /** Alle noch nicht gesendeten Notizen erneut versuchen (bei Reconnect). */
  async function flush() {
    if (!isConfigured()) return;
    const pending = get({ subscribe }).filter((n) => !n.sent);
    for (const n of pending) {
      const ok = await forward(n.text, n.meta);
      if (ok) await (await db()).put("outbox", { ...n, sent: true });
    }
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("outbox", id);
    await load();
  }

  return { subscribe, load, add, flush, remove };
}

export const outbox = createOutbox();
