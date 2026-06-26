// Profil-Store: lokale Familien-Profile (Rollen, kein Login im Alltag).
import { writable, get } from "svelte/store";
import type { Profile, ProfileRole } from "../types";
import { db } from "../db";
import { settings } from "./settings";
import { uid } from "../util";

const PALETTE = ["#4fd1c5", "#ffb86b", "#8aa0ff", "#f6a6c1", "#9ece6a", "#c0a8ff"];
const AVATARS = ["🦊", "🐻", "🐼", "🐬", "🦉", "🐢", "🦄", "🐧"];

function createProfiles() {
  const { subscribe, set } = writable<Profile[]>([]);

  async function load() {
    const all = await (await db()).getAll("profiles");
    all.sort((a, b) => a.createdAt - b.createdAt);
    set(all);
  }

  async function add(name: string, role: ProfileRole = "parent", avatar?: string): Promise<Profile> {
    const existing = await (await db()).getAll("profiles");
    const p: Profile = {
      id: uid("p"),
      name: name.trim() || "Profil",
      avatar: avatar || AVATARS[existing.length % AVATARS.length],
      color: PALETTE[existing.length % PALETTE.length],
      role,
      createdAt: Date.now(),
    };
    await (await db()).put("profiles", p);
    await load();
    // Erstes Profil wird automatisch aktiv.
    if (existing.length === 0) await settings.patch({ activeProfileId: p.id });
    return p;
  }

  async function update(p: Profile) {
    await (await db()).put("profiles", p);
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("profiles", id);
    await load();
    const rest = await (await db()).getAll("profiles");
    const active = get(settings).activeProfileId;
    if (active === id) await settings.patch({ activeProfileId: rest[0]?.id ?? null });
  }

  async function setActive(id: string) {
    await settings.patch({ activeProfileId: id });
  }

  /**
   * Familien-Roster aus JARVIS-Nutzern übernehmen. Profil-ID = Nutzername (stabil über alle Geräte),
   * sodass Accounts in jedem Browser identisch erscheinen. Vorhandene Anzeige-Metadaten bleiben,
   * fehlende werden aus `meta` (geteilter Storage) oder Defaults ergänzt.
   */
  async function upsertRoster(
    usernames: string[],
    meta: Record<string, { avatar?: string; color?: string; name?: string; role?: ProfileRole }> = {},
  ): Promise<Record<string, { avatar: string; color: string; name: string; role: ProfileRole }>> {
    const d = await db();
    const existing = await d.getAll("profiles");
    const byId = new Map(existing.map((p) => [p.id, p]));
    const out: Record<string, { avatar: string; color: string; name: string; role: ProfileRole }> = {};

    let idx = existing.length;
    for (const uname of usernames) {
      const cur = byId.get(uname);
      const m = meta[uname] ?? {};
      const profile: Profile = cur
        ? { ...cur, jarvisUser: uname, name: m.name ?? cur.name, avatar: m.avatar ?? cur.avatar, color: m.color ?? cur.color }
        : {
            id: uname,
            name: m.name ?? uname,
            avatar: m.avatar ?? AVATARS[idx % AVATARS.length],
            color: m.color ?? PALETTE[idx % PALETTE.length],
            role: m.role ?? "parent",
            jarvisUser: uname,
            createdAt: Date.now(),
          };
      if (!cur) idx++;
      await d.put("profiles", profile);
      out[uname] = { avatar: profile.avatar, color: profile.color, name: profile.name, role: profile.role };
    }
    await load();
    return out;
  }

  return { subscribe, load, add, update, remove, setActive, upsertRoster };
}

export const profiles = createProfiles();
