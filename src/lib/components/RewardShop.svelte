<script lang="ts">
  import { pet, rewards } from "$lib/stores/pet";

  let showAdd = $state(false);
  let title = $state("");
  let icon = $state("🎁");
  let cost = $state(50);

  const coins = $derived($pet.coins);

  async function add() {
    if (!title.trim()) return;
    await rewards.add(title, icon, cost);
    title = "";
    icon = "🎁";
    cost = 50;
    showAdd = false;
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <p class="text-sm text-ink-soft">Eingelöst wird mit Münzen — euer Tier bleibt davon unberührt. 🪙</p>
  </div>

  {#each $rewards as r (r.id)}
    {@const affordable = coins >= r.cost}
    <div class="card flex items-center gap-3">
      <span class="text-3xl">{r.icon}</span>
      <div class="flex-1">
        <p class="font-bold">{r.title}</p>
        <p class="text-xs text-ink-faint">
          {r.cost} 🪙{#if r.redeemed > 0} · schon {r.redeemed}× eingelöst{/if}
        </p>
      </div>
      <button
        class="px-4 py-2 {affordable ? 'btn-primary' : 'btn-soft opacity-50'}"
        disabled={!affordable}
        onclick={() => rewards.redeem(r.id)}
      >
        Einlösen
      </button>
      <button class="btn-ghost px-2 py-1 text-sm text-ink-faint" aria-label="löschen" onclick={() => rewards.remove(r.id)}>✕</button>
    </div>
  {/each}

  {#if showAdd}
    <div class="card flex flex-col gap-2">
      <div class="flex gap-2">
        <input class="w-16 rounded-2xl bg-surface-2 px-3 py-3 text-center text-2xl focus:outline-none" bind:value={icon} maxlength="2" aria-label="Symbol" />
        <input class="flex-1 rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Belohnung" bind:value={title} />
      </div>
      <label class="flex items-center gap-3 text-sm text-ink-soft">
        Kosten
        <input type="number" min="1" class="w-24 rounded-xl bg-surface-2 px-3 py-2 focus:outline-none" bind:value={cost} /> 🪙
      </label>
      <button class="btn-primary" onclick={add}>Hinzufügen</button>
    </div>
  {:else}
    <button class="btn-soft w-full" onclick={() => (showAdd = true)}>+ Eigene Belohnung</button>
  {/if}
</div>
