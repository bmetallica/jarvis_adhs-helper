<script lang="ts">
  // Wochen-Essensplan — reduziert Entscheidungslast. Niedrigschwellig (auch „nur Nudeln" ok).
  import { meals } from "$lib/stores/meals";
  import type { MealSlot } from "$lib/types";
  import { ymd, weekdayLong, dateShort } from "$lib/date";

  const SLOTS: { key: MealSlot; label: string; icon: string }[] = [
    { key: "fruh", label: "Früh", icon: "🥣" },
    { key: "mittag", label: "Mittag", icon: "🍽️" },
    { key: "abend", label: "Abend", icon: "🌙" },
  ];

  // Nächste 7 Tage ab heute.
  const days = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const t = Date.now() + i * 86_400_000;
      return { ts: t, date: ymd(t) };
    }),
  );

  function value(date: string, slot: MealSlot): string {
    return ($meals.find((m) => m.date === date && m.slot === slot)?.text) ?? "";
  }
</script>

<div class="flex flex-col gap-3">
  {#each days as d, i (d.date)}
    <div class="card">
      <p class="mb-2 font-bold">
        {i === 0 ? "Heute" : i === 1 ? "Morgen" : weekdayLong(d.ts)}
        <span class="text-sm font-normal text-ink-faint">· {dateShort(d.ts)}</span>
      </p>
      <div class="flex flex-col gap-2">
        {#each SLOTS as s (s.key)}
          <label class="flex items-center gap-2">
            <span class="w-8 text-center text-lg">{s.icon}</span>
            <input
              class="flex-1 rounded-xl bg-surface-2 px-3 py-2 placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-calm"
              placeholder={s.label}
              value={value(d.date, s.key)}
              onchange={(e) => meals.setSlot(d.date, s.key, e.currentTarget.value)}
            />
          </label>
        {/each}
      </div>
    </div>
  {/each}
</div>
