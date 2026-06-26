<script lang="ts">
  // Wochen-Essensplan — reduziert Entscheidungslast. Niedrigschwellig (auch „nur Nudeln" ok).
  import { meals } from "$lib/stores/meals";
  import { safefoods, TEXTURES } from "$lib/stores/safefoods";
  import type { MealSlot } from "$lib/types";
  import { ymd, weekdayLong, dateShort } from "$lib/date";
  import { pushToast } from "$lib/notify";

  const SLOTS: { key: MealSlot; label: string; icon: string }[] = [
    { key: "fruh", label: "Früh", icon: "🥣" },
    { key: "mittag", label: "Mittag", icon: "🍽️" },
    { key: "abend", label: "Abend", icon: "🌙" },
  ];

  let showSafe = $state(false);
  let newSafe = $state("");
  let newTexture = $state("beliebig");

  /** Joker: füllt die heutigen Slots mit zufälligen Safe-Foods (ohne Diskussion). */
  async function joker() {
    const pool = [...$safefoods];
    if (pool.length === 0) {
      pushToast("Noch keine Safe-Foods", "Lege unten welche an.");
      return;
    }
    const today = ymd(Date.now());
    // mischen
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const slots: MealSlot[] = ["fruh", "mittag", "abend"];
    for (let i = 0; i < slots.length; i++) {
      await meals.setSlot(today, slots[i], pool[i % pool.length].text);
    }
    pushToast("Safe-Food-Joker 🃏", "Heute ist versorgt — kein Stress.");
  }

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
  <!-- Safe-Food-Joker -->
  <div class="card">
    <div class="flex items-center justify-between gap-2">
      <div>
        <p class="font-bold">🃏 Safe-Food-Joker</p>
        <p class="text-xs text-ink-faint">Plan kollabiert? Ein Klick füllt heute mit „funktioniert immer".</p>
      </div>
      <button class="btn-primary px-4" onclick={joker}>Joker</button>
    </div>
    <button class="btn-ghost mt-2 text-sm" onclick={() => (showSafe = !showSafe)}>
      {showSafe ? "Safe-Foods ausblenden" : "Safe-Foods verwalten"}
    </button>
    {#if showSafe}
      <div class="mt-2 flex flex-col gap-2 border-t border-surface-2 pt-2">
        {#each $safefoods as f (f.id)}
          <div class="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-1.5 text-sm">
            <span class="flex-1">{f.text}</span>
            <span class="chip text-xs">{f.texture}</span>
            <button class="btn-ghost px-2 py-0.5 text-xs text-ink-faint" onclick={() => safefoods.remove(f.id)}>✕</button>
          </div>
        {/each}
        <div class="flex gap-2">
          <input class="flex-1 rounded-xl bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-calm" placeholder="Safe-Food (z. B. Pfannkuchen)" bind:value={newSafe} />
          <select class="rounded-xl bg-surface-2 px-2 py-2 text-sm focus:outline-none" bind:value={newTexture}>
            {#each TEXTURES as t (t)}<option value={t}>{t}</option>{/each}
          </select>
          <button class="btn-soft px-3" onclick={() => { safefoods.add(newSafe, newTexture); newSafe = ''; }}>+</button>
        </div>
      </div>
    {/if}
  </div>

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
