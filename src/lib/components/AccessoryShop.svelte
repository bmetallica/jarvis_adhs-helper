<script lang="ts">
  import { pet } from "$lib/stores/pet";
  import { ACCESSORIES } from "$lib/pet";
  import { pushToast } from "$lib/notify";

  const coins = $derived($pet.coins);
  const owned = $derived(new Set($pet.accessories ?? []));
  const equipped = $derived(new Set($pet.equipped ?? []));

  async function buy(id: string, cost: number, name: string) {
    const ok = await pet.buyAccessory(id, cost);
    pushToast(ok ? `Gekauft: ${name} ✓` : "Nicht genug Münzen", ok ? "Angelegt!" : `Du brauchst ${cost} 🪙`);
  }
</script>

<div class="flex flex-col gap-3">
  <p class="text-sm text-ink-soft">Schmücke euer Tier. Bezahlt mit Münzen — Wachstum bleibt unberührt. 🪙 {coins}</p>

  {#each ACCESSORIES as a (a.id)}
    <div class="card flex items-center gap-3">
      <span class="text-3xl">{a.icon}</span>
      <div class="flex-1">
        <p class="font-bold">{a.name}</p>
        <p class="text-xs text-ink-faint">{a.cost} 🪙</p>
      </div>
      {#if owned.has(a.id)}
        <button
          class="px-4 py-2 {equipped.has(a.id) ? 'btn-primary' : 'btn-soft'}"
          onclick={() => pet.toggleEquip(a.id)}
        >
          {equipped.has(a.id) ? "angelegt" : "anlegen"}
        </button>
      {:else}
        <button
          class="px-4 py-2 {coins >= a.cost ? 'btn-primary' : 'btn-soft opacity-50'}"
          disabled={coins < a.cost}
          onclick={() => buy(a.id, a.cost, a.name)}
        >
          Kaufen
        </button>
      {/if}
    </div>
  {/each}
</div>
