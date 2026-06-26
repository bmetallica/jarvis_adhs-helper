<script lang="ts">
  // Großer Wochenkalender (aktuelle Woche, Mo–So). Zeigt Termine + geplante Essen je Tag.
  // Für Kiosk/Hauptquartier gedacht, aber auch sonst nutzbar.
  import { appointments } from "$lib/stores/appointments";
  import { meals } from "$lib/stores/meals";
  import { now } from "$lib/stores/clock";
  import { ymd, hhmm } from "$lib/date";
  import type { MealSlot } from "$lib/types";

  const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const SLOT_ICON: Record<MealSlot, string> = { fruh: "🥣", mittag: "🍽️", abend: "🌙" };

  // Montag der aktuellen Woche.
  const monday = $derived(
    (() => {
      const d = new Date($now);
      d.setHours(0, 0, 0, 0);
      const off = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - off);
      return d.getTime();
    })(),
  );

  const days = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const ts = monday + i * 86_400_000;
      const date = ymd(ts);
      return {
        ts,
        date,
        label: WD[i],
        dayNum: new Date(ts).getDate(),
        isToday: date === ymd($now),
        appts: $appointments.filter((a) => ymd(a.startsAt) === date).sort((a, b) => a.startsAt - b.startsAt),
        meals: $meals.filter((m) => m.date === date),
      };
    }),
  );
</script>

<div class="grid grid-cols-7 gap-2">
  {#each days as d (d.date)}
    <div class="flex flex-col rounded-2xl border p-2 {d.isToday ? 'border-calm bg-calm/10' : 'border-surface-2 bg-surface-1'}">
      <div class="mb-2 text-center">
        <p class="text-xs text-ink-faint">{d.label}</p>
        <p class="text-lg font-bold {d.isToday ? 'text-calm' : ''}">{d.dayNum}</p>
      </div>

      <div class="flex flex-1 flex-col gap-1">
        {#each d.appts as a (a.id)}
          <div class="rounded-lg bg-surface-2 px-1.5 py-1 text-xs">
            <span class="font-semibold text-calm">{hhmm(a.startsAt)}</span>
            <span class="block truncate">{a.icon} {a.title}</span>
          </div>
        {/each}
      </div>

      {#if d.meals.length}
        <div class="mt-2 border-t border-surface-2 pt-1">
          {#each d.meals as m (m.id)}
            <p class="truncate text-[11px] text-ink-soft">{SLOT_ICON[m.slot]} {m.text}</p>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>
