// Pet-Store: kooperatives Familien-Tier (XP-Pool, Wachstum, Entdeckungsreise) + Belohnungs-Laden.
// Zustand liegt in IndexedDB (kv 'pet'), Belohnungen im Store 'rewards'. Familien-geteilt; in
// Schritt 8 zusätzlich über JARVIS-Shared-Storage synchronisiert (atomares $inc).
import { writable, get } from "svelte/store";
import { defaultPet, GIFTS, stageFor, idleDays, type PetState } from "../pet";
import type { Reward } from "../types";
import { kvGet, kvSet, db } from "../db";
import { uid } from "../util";
import { successCue } from "../feedback";
import { pushToast } from "../notify";
import { settings } from "./settings";
import { profiles } from "./profiles";

const KEY = "pet";

function createPet() {
  const { subscribe, set } = writable<PetState>(defaultPet());

  // Optionaler Publisher für geräteübergreifende Sync (von sync.ts gesetzt). Entkoppelt, damit
  // der Pet-Store keine Abhängigkeit zur Event-/Sync-Schicht hat (kein Import-Zyklus).
  let publisher: ((p: PetState, delta: number) => void) | null = null;
  function setPublisher(fn: (p: PetState, delta: number) => void) {
    publisher = fn;
  }

  async function load() {
    const stored = await kvGet<PetState>(KEY);
    set(stored ? { ...defaultPet(), ...stored } : defaultPet());
  }

  async function persist(p: PetState) {
    await kvSet(KEY, p);
    set(p);
  }

  /** Entfernten geteilten Zustand einmergen (XP wächst nur, Münzen folgen dem höheren Wert). */
  async function mergeRemote(remote: Partial<PetState>) {
    const p = get({ subscribe });
    if (remote.xp == null) return;
    // Konvergenz: XP nie verringern; den höheren Stand übernehmen.
    if (remote.xp <= p.xp && (remote.coins ?? 0) <= p.coins) return;
    const next: PetState = {
      ...p,
      name: remote.name ?? p.name,
      xp: Math.max(p.xp, remote.xp),
      coins: Math.max(p.coins, remote.coins ?? p.coins),
      contributions: { ...p.contributions, ...(remote.contributions ?? {}) },
      lastActiveTs: Math.max(p.lastActiveTs, remote.lastActiveTs ?? 0),
      // Inventar vereinen; angelegte Accessoires vom höheren XP-Stand übernehmen.
      accessories: Array.from(new Set([...(p.accessories ?? []), ...(remote.accessories ?? [])])),
      equipped: remote.xp >= p.xp ? (remote.equipped ?? p.equipped ?? []) : (p.equipped ?? []),
    };
    await persist(next);
  }

  /** Kernfunktion: XP gutschreiben (Tier wächst), Münzen gutschreiben, Beitrag merken. */
  async function award(amount: number, profileId: string | null, label?: string) {
    const p = get({ subscribe });
    const prevStage = stageFor(p.xp);

    const next: PetState = {
      ...p,
      xp: p.xp + amount,
      coins: p.coins + amount,
      lastActiveTs: Date.now(),
      contributions: {
        ...p.contributions,
        [profileId ?? "_"]: (p.contributions[profileId ?? "_"] ?? 0) + amount,
      },
    };

    // Rückkehr von der Entdeckungsreise → Geschenk.
    if (p.onJourney) {
      next.onJourney = false;
      next.pendingGift = GIFTS[Math.floor(Math.random() * GIFTS.length)];
      next.coins += 15; // kleines Willkommens-Plus
      pushToast(`${p.name} ist zurück! 🎁`, `Mitgebracht: ${next.pendingGift}`);
    }

    await persist(next);
    successCue();
    publisher?.(next, amount); // geräteübergreifend spiegeln (falls verbunden)

    // Familien-Quests: jede XP zahlt auf gemeinsame Ziele ein (lazy import vermeidet Zyklen).
    void import("./quests").then((m) => m.quests.addProgress(amount)).catch(() => {});

    // Stufenaufstieg feiern.
    const newStage = stageFor(next.xp);
    if (newStage.index > prevStage.index) {
      pushToast(`${next.name} ist gewachsen! ✨`, `Neue Stufe: ${newStage.title}`);
    } else if (label) {
      // dezenter Hinweis nur bei größeren Beträgen
      if (amount >= 20) pushToast(`+${amount} für ${next.name}`, label);
    }
  }

  async function rename(name: string) {
    await persist({ ...get({ subscribe }), name: name.trim() || "Pixel" });
  }

  /** Tier + Münzen + Beiträge + Accessoires auf Anfang zurücksetzen (Name bleibt). */
  async function resetPet() {
    const cur = get({ subscribe });
    const fresh = { ...defaultPet(), name: cur.name, seed: cur.seed };
    await persist(fresh);
    publisher?.(fresh, 0);
  }

  async function collectGift() {
    await persist({ ...get({ subscribe }), pendingGift: null });
  }

  /** Tägliche Prüfung: bei längerer Inaktivität auf Entdeckungsreise schicken (kein Tod!). */
  async function checkJourney() {
    const p = get({ subscribe });
    if (!p.onJourney && idleDays(p.lastActiveTs) >= 2) {
      await persist({ ...p, onJourney: true });
      pushToast(`${p.name} geht auf Entdeckungsreise 🧭`, "Kommt mit einem Geschenk zurück, wenn ihr wieder loslegt.");
    }
  }

  async function spendCoins(amount: number): Promise<boolean> {
    const p = get({ subscribe });
    if (p.coins < amount) return false;
    await persist({ ...p, coins: p.coins - amount });
    return true;
  }

  /** Accessoire kaufen (Münzen) — danach im Inventar, kann angelegt werden. */
  async function buyAccessory(id: string, cost: number): Promise<boolean> {
    const p = get({ subscribe });
    if (p.accessories.includes(id)) return true;
    if (p.coins < cost) return false;
    const next = { ...p, coins: p.coins - cost, accessories: [...p.accessories, id], equipped: [...p.equipped, id] };
    await persist(next);
    publisher?.(next, 0);
    return true;
  }

  /** Accessoire an-/ablegen. */
  async function toggleEquip(id: string) {
    const p = get({ subscribe });
    if (!p.accessories.includes(id)) return;
    const equipped = p.equipped.includes(id) ? p.equipped.filter((x) => x !== id) : [...p.equipped, id];
    const next = { ...p, equipped };
    await persist(next);
    publisher?.(next, 0);
  }

  return { subscribe, load, award, rename, resetPet, collectGift, checkJourney, spendCoins, buyAccessory, toggleEquip, setPublisher, mergeRemote };
}

export const pet = createPet();

// --- Belohnungs-Laden ---

const DEFAULT_REWARDS: Omit<Reward, "id" | "createdAt" | "redeemed">[] = [
  { title: "30 Min Extra-Bildschirmzeit", icon: "📱", cost: 60 },
  { title: "Lieblingsessen wünschen", icon: "🍕", cost: 80 },
  { title: "Kino-/Spieleabend", icon: "🎬", cost: 150 },
  { title: "Gemeinsamer Ausflug", icon: "🎡", cost: 250 },
];

function createRewards() {
  const { subscribe, set } = writable<Reward[]>([]);

  // Hook für Benachrichtigungen (von sync.ts gesetzt) — entkoppelt, kein Import-Zyklus.
  let onRedeem: ((info: { title: string; cost: number; who: string }) => void) | null = null;
  function setOnRedeem(fn: (info: { title: string; cost: number; who: string }) => void) {
    onRedeem = fn;
  }

  async function load() {
    let all = await (await db()).getAll("rewards");
    if (all.length === 0) {
      // Beim ersten Mal sinnvolle Vorschläge anlegen.
      const d = await db();
      for (const r of DEFAULT_REWARDS) {
        await d.put("rewards", { ...r, id: uid("rw"), createdAt: Date.now(), redeemed: 0 });
      }
      all = await d.getAll("rewards");
    }
    all.sort((a, b) => a.cost - b.cost);
    set(all);
  }

  async function add(title: string, icon: string, cost: number) {
    await (await db()).put("rewards", {
      id: uid("rw"),
      title: title.trim() || "Belohnung",
      icon: icon || "🎁",
      cost: Math.max(1, Math.round(cost)),
      createdAt: Date.now(),
      redeemed: 0,
    });
    await load();
  }

  async function remove(id: string) {
    await (await db()).delete("rewards", id);
    await load();
  }

  /** Einlösen: nur wenn genug Münzen. Tier-XP bleibt unberührt (Tier schrumpft nie). */
  async function redeem(id: string): Promise<boolean> {
    const r = get({ subscribe }).find((x) => x.id === id);
    if (!r) return false;
    const ok = await pet.spendCoins(r.cost);
    if (!ok) return false;
    await (await db()).put("rewards", { ...r, redeemed: r.redeemed + 1 });
    await load();
    pushToast(`Eingelöst: ${r.title} ${r.icon}`, "Viel Freude!");
    // Eltern informieren (v. a. wenn ein Kind einlöst).
    const who = get(profiles).find((p) => p.id === get(settings).activeProfileId)?.name ?? "Jemand";
    onRedeem?.({ title: r.title, cost: r.cost, who });
    return true;
  }

  return { subscribe, load, add, remove, redeem, setOnRedeem };
}

export const rewards = createRewards();
