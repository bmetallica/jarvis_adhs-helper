// Such-Gedächtnis: Standort-Notizen. Geteilt (datasync scope=shared) → beide Eltern profitieren.
// Lokale Volltextsuche; optional zusätzlich ins RAG (für semantische Suche via JARVIS).
import { writable, get } from "svelte/store";
import type { LocationNote } from "../types";
import { db } from "../db";
import { uid } from "../util";
import { settings } from "./settings";
import { jarvis, isConfigured } from "../jarvis/client";

function createLocations() {
  const { subscribe, set } = writable<LocationNote[]>([]);

  async function load() {
    const all = await (await db()).getAll("locations");
    all.sort((a, b) => b.createdAt - a.createdAt); // neueste zuerst (gilt als aktuell)
    set(all);
  }

  async function remember(text: string) {
    if (!text.trim()) return;
    const note: LocationNote = {
      id: uid("loc"),
      text: text.trim(),
      profileId: get(settings).activeProfileId,
      createdAt: Date.now(),
    };
    await (await db()).put("locations", note);
    await load();
    // Optional fürs semantische RAG (best effort, eigener Namespace).
    if (isConfigured()) {
      jarvis.ragInsert("locations", note.text, { ts: new Date().toISOString() }).catch(() => {});
    }
  }

  async function forget(id: string) {
    await (await db()).delete("locations", id);
    await load();
  }

  /** Lokale Suche: alle Tokens der Anfrage müssen im Satz vorkommen. */
  function search(query: string): LocationNote[] {
    const q = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    if (!q.length) return get({ subscribe }).slice(0, 10);
    return get({ subscribe }).filter((n) => {
      const t = n.text.toLowerCase();
      return q.some((tok) => t.includes(tok));
    });
  }

  return { subscribe, load, remember, forget, search };
}

export const locations = createLocations();
