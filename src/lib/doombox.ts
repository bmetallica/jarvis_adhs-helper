// Doom-Box: stilles Einschläfern statt „überfällig". Was lange nicht angefasst wurde, wandert ohne
// Scham ins Archiv (RSD-Schutz). Jederzeit aufweckbar. Läuft einmal täglich.
import { get } from "svelte/store";
import { shopping } from "./stores/shopping";
import { routines } from "./stores/routines";
import { polls } from "./stores/polls";
import { kvGet, kvSet } from "./db";
import { ymd } from "./date";

const DAY = 86_400_000;
const SHOP_AGE = 14 * DAY; // Einkaufs-Einträge
const ROUTINE_AGE = 21 * DAY; // Routinen (etwas großzügiger)
const POLL_AGE = 14 * DAY; // offene Abstimmungen

function age(item: { lastTouchedAt?: number; createdAt: number }): number {
  return Date.now() - (item.lastTouchedAt ?? item.createdAt);
}

/** Einmal täglich aufrufen (idempotent über kv-Datum). */
export async function runDoomBoxDaily(): Promise<void> {
  const today = ymd(Date.now());
  if ((await kvGet<string>("doombox_last")) === today) return;
  await kvSet("doombox_last", today);

  // Einkaufs-Einträge: offen & alt → einschläfern.
  for (const it of get(shopping)) {
    if (!it.done && !it.archived && age(it) > SHOP_AGE) await shopping.setArchived(it.id, true);
  }
  // Routinen: lange ungenutzt → einschläfern.
  for (const r of get(routines)) {
    if (!r.archived && age(r) > ROUTINE_AGE) await routines.setArchived(r.id, true);
  }
  // Offene Abstimmungen: alt → schließen (gilt als eingeschläfert).
  for (const p of get(polls)) {
    if (p.status === "open" && Date.now() - p.updatedAt > POLL_AGE) await polls.close(p.id);
  }
}

export function countArchived(): number {
  const s = get(shopping).filter((x) => x.archived).length;
  const r = get(routines).filter((x) => x.archived).length;
  return s + r;
}
