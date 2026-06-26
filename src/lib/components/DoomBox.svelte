<script lang="ts">
  // Doom Box (Archiv): eingeschläferte Dinge — ohne Scham, jederzeit aufweckbar.
  import { shopping } from "$lib/stores/shopping";
  import { routines } from "$lib/stores/routines";

  const archivedShopping = $derived($shopping.filter((i) => i.archived));
  const archivedRoutines = $derived($routines.filter((r) => r.archived));
  const total = $derived(archivedShopping.length + archivedRoutines.length);
  let open = $state(false);
</script>

<section class="card">
  <button class="flex w-full items-center justify-between" onclick={() => (open = !open)}>
    <span class="text-lg font-bold">📦 Doom Box (Archiv)</span>
    <span class="chip">{total} schläft{total === 1 ? "" : "en"}</span>
  </button>

  {#if open}
    <p class="mt-2 text-sm text-ink-faint">
      Diese Dinge schlafen friedlich im Keller. Du kannst sie jederzeit aufwecken — oder einfach
      vergessen. Kein Druck.
    </p>

    {#if total === 0}
      <p class="mt-3 text-sm text-ink-soft">Nichts archiviert. 🌿</p>
    {/if}

    {#if archivedRoutines.length}
      <p class="mt-3 text-sm font-semibold text-ink-soft">Routinen</p>
      {#each archivedRoutines as r (r.id)}
        <div class="mt-1 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <span>{r.icon}</span>
          <span class="flex-1">{r.title}</span>
          <button class="btn-soft px-3 py-1 text-xs" onclick={() => routines.setArchived(r.id, false)}>aufwecken</button>
          <button class="btn-ghost px-2 py-1 text-xs text-ink-faint" onclick={() => routines.remove(r.id)}>✕</button>
        </div>
      {/each}
    {/if}

    {#if archivedShopping.length}
      <p class="mt-3 text-sm font-semibold text-ink-soft">Einkauf</p>
      {#each archivedShopping as it (it.id)}
        <div class="mt-1 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <span class="flex-1">{it.text}</span>
          <button class="btn-soft px-3 py-1 text-xs" onclick={() => shopping.setArchived(it.id, false)}>aufwecken</button>
          <button class="btn-ghost px-2 py-1 text-xs text-ink-faint" onclick={() => shopping.remove(it.id)}>✕</button>
        </div>
      {/each}
    {/if}
  {/if}
</section>
