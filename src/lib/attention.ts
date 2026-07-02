// „Braucht deine Aufmerksamkeit" — zentrale Sammelstelle (Home-Karte, Kiosk, App-Icon-Badge).
// Out of sight, out of mind: der Badge holt die Info aufs Homescreen-Icon, bevor die App offen ist.
import { derived, type Readable } from "svelte/store";
import { settings } from "./stores/settings";
import { polls } from "./stores/polls";
import { pet } from "./stores/pet";
import { medications, todayAt, takenAround } from "./stores/medications";
import { inbox } from "./stores/inbox";
import { wishes, isMature } from "./stores/wishes";
import { repairs } from "./stores/repairs";
import { now } from "./stores/clock";
import { route, type RouteName } from "./router";

export interface AttentionItem {
  icon: string;
  text: string;
  go: () => void;
}

export const attention: Readable<AttentionItem[]> = derived(
  [settings, polls, pet, medications, inbox, wishes, repairs, now],
  ([$settings, $polls, $pet, $medications, $inbox, $wishes, $repairs, $now]) => {
    const meId = $settings.activeProfileId;
    const items: AttentionItem[] = [];
    const goTo = (r: RouteName) => () => route.go(r);

    // Offene Abstimmungen / Termin-Anfragen, bei denen ich abstimmen soll und noch nicht habe.
    for (const p of $polls) {
      if (p.status !== "open") continue;
      const targeted = p.voterIds.length === 0 || (meId != null && p.voterIds.includes(meId));
      const voted = meId != null && (p.votes[meId]?.length ?? 0) > 0;
      if (targeted && !voted) {
        items.push({
          icon: p.kind === "appointment" ? "📅" : "🗳️",
          text: p.kind === "appointment" ? `Termin-Anfrage: ${p.appointment?.title ?? p.question}` : `Abstimmung: ${p.question}`,
          go: goTo("family"),
        });
      }
    }
    // Tier hat ein Geschenk mitgebracht.
    if ($pet.pendingGift) {
      items.push({ icon: "🎁", text: `${$pet.name} hat ein Geschenk mitgebracht`, go: goTo("pet") });
    }
    // Fällige Medikation (heute, Zeit vorbei, noch nicht genommen).
    for (const m of $medications) {
      if (m.profileId !== meId && m.profileId !== null) continue;
      for (const time of m.times) {
        const ts = todayAt(time);
        if ($now >= ts && $now < ts + 2 * 3600_000 && !takenAround(m, ts)) {
          items.push({ icon: m.icon || "💊", text: `${m.name} fällig (${time} Uhr)`, go: goTo("me") });
          break;
        }
      }
    }
    // Unverarbeiteter Posteingang (Brain-Dump).
    const inboxOpen = $inbox.filter((i) => !i.processed).length;
    if (inboxOpen > 0) {
      items.push({ icon: "💭", text: `${inboxOpen} Gedanke(n) im Posteingang`, go: goTo("plan") });
    }
    // Reife Wünsche (Impulskauf-Parkplatz): neutrale Nachfrage fällig.
    const mature = $wishes.filter((w) => isMature(w, $now)).length;
    if (mature > 0) {
      items.push({ icon: "🎈", text: `${mature} geparkte(r) Wunsch/Wünsche zum Entscheiden`, go: goTo("me") });
    }
    // Reparatur-Karten an mich, noch nicht angenommen.
    for (const r of $repairs) {
      if (meId != null && r.toId === meId && !r.acknowledgedBy.includes(meId)) {
        items.push({ icon: "🫂", text: `Reparatur-Karte von ${r.fromName}`, go: goTo("family") });
      }
    }
    return items;
  },
);

/** App-Icon-Badge (Badging-API) an die Aufmerksamkeits-Zählung koppeln. Best effort. */
export function initAppBadge() {
  if (typeof navigator === "undefined" || typeof navigator.setAppBadge !== "function") return;
  attention.subscribe((items) => {
    try {
      if (items.length > 0) void navigator.setAppBadge(items.length);
      else void navigator.clearAppBadge?.();
    } catch {
      /* nicht unterstützt */
    }
  });
}
