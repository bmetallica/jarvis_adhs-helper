<script lang="ts">
  import { shopping } from "$lib/stores/shopping";
  import { settings } from "$lib/stores/settings";

  let text = $state("");
  const openItems = $derived($shopping.filter((i) => !i.done));
  const doneItems = $derived($shopping.filter((i) => i.done));

  async function add() {
    if (!text.trim()) return;
    await shopping.add(text, $settings.activeProfileId);
    text = "";
  }
  async function check(id: string) {
    await shopping.toggle(id); // Ton + XP übernimmt der Store
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex gap-2">
    <input
      class="flex-1 rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
      placeholder="Was fehlt? (z. B. Milch)"
      bind:value={text}
      onkeydown={(e) => e.key === "Enter" && add()}
    />
    <button class="btn-primary" onclick={add}>+</button>
  </div>

  {#if openItems.length === 0 && doneItems.length === 0}
    <div class="card text-center text-ink-soft">Liste ist leer 🌿</div>
  {/if}

  {#if openItems.length}
    <ul class="flex flex-col gap-1.5">
      {#each openItems as it (it.id)}
        <li>
          <button class="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left active:scale-[0.99]" onclick={() => check(it.id)}>
            <span class="grid h-6 w-6 place-items-center rounded-md bg-surface-3"></span>
            <span class="flex-1">{it.text}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if doneItems.length}
    <details class="card">
      <summary class="cursor-pointer text-sm text-ink-faint">{doneItems.length} im Wagen</summary>
      <ul class="mt-2 flex flex-col gap-1">
        {#each doneItems as it (it.id)}
          <li>
            <button class="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left" onclick={() => shopping.toggle(it.id)}>
              <span class="grid h-6 w-6 place-items-center rounded-md bg-calm text-surface-0">✓</span>
              <span class="flex-1 text-ink-faint line-through">{it.text}</span>
            </button>
          </li>
        {/each}
      </ul>
      <button class="btn-ghost mt-2 text-sm" onclick={() => shopping.clearDone()}>Erledigte entfernen</button>
    </details>
  {/if}
</div>
