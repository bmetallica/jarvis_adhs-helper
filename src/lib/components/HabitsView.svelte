<script lang="ts">
  // Gewohnheiten als „Garten" statt Kette — jeder erledigte Tag ist ein Punkt, Aussetzer = keine
  // Lücke/Schuld (RSD-Schutz). Heute mit einem Tap abhaken.
  import { habits } from "$lib/stores/habits";
  import { settings } from "$lib/stores/settings";

  let title = $state("");
  let icon = $state("🌱");

  async function add() {
    if (!title.trim()) return;
    await habits.add(title, icon, $settings.activeProfileId);
    title = "";
    icon = "🌱";
  }

  async function tap(id: string) {
    await habits.toggleToday(id); // Ton + XP übernimmt der Store
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex gap-2">
    <input class="w-16 rounded-2xl bg-surface-2 px-3 py-3 text-center text-2xl focus:outline-none focus:ring-2 focus:ring-calm" bind:value={icon} maxlength="2" aria-label="Symbol" />
    <input class="flex-1 rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Neue Gewohnheit (z. B. Wasser trinken)" bind:value={title} onkeydown={(e) => e.key === 'Enter' && add()} />
    <button class="btn-primary" onclick={add}>+</button>
  </div>

  {#each $habits as h (h.id)}
    {@const done = habits.doneToday(h)}
    {@const last14 = habits.last(h, 14)}
    <div class="card">
      <div class="flex items-center gap-3">
        <button
          class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl transition-all {done ? 'bg-calm scale-105' : 'bg-surface-2'}"
          aria-label="heute erledigt"
          onclick={() => tap(h.id)}
        >{h.icon}</button>
        <div class="flex-1">
          <p class="font-bold">{h.title}</p>
          <!-- "Garten": letzte 14 Tage als Punkte (additiv, keine Kette) -->
          <div class="mt-1.5 flex gap-1">
            {#each last14 as d, i (i)}
              <span class="h-3 w-3 rounded-full" style="background-color:{d ? '#9ece6a' : '#2a323d'}"></span>
            {/each}
          </div>
        </div>
        <button class="btn-ghost px-2 py-1 text-sm text-ink-faint" onclick={() => habits.remove(h.id)} aria-label="löschen">✕</button>
      </div>
    </div>
  {/each}

  {#if $habits.length === 0}
    <div class="card text-center text-ink-soft">
      Noch keine Gewohnheit. Klein anfangen — jeder Tag zählt für sich, ganz ohne Kette.
    </div>
  {/if}
</div>
