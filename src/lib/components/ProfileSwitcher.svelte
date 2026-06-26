<script lang="ts">
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";

  let open = $state(false);

  const active = $derived($profiles.find((p) => p.id === $settings.activeProfileId) ?? null);

  function pick(id: string) {
    profiles.setActive(id);
    open = false;
  }
</script>

<div class="relative">
  <button
    class="flex items-center gap-2 rounded-full bg-surface-2 py-1.5 pl-1.5 pr-3 active:scale-95"
    onclick={() => (open = !open)}
    aria-haspopup="listbox"
    aria-expanded={open}
  >
    <span
      class="grid h-8 w-8 place-items-center rounded-full text-lg"
      style="background:{active?.color ?? '#2a323d'}22"
    >
      {active?.avatar ?? "🙂"}
    </span>
    <span class="text-sm font-semibold">{active?.name ?? "Profil"}</span>
    <span class="text-ink-faint" aria-hidden="true">▾</span>
  </button>

  {#if open}
    <!-- Klick-Fänger -->
    <button
      class="fixed inset-0 z-40 cursor-default"
      aria-label="Schließen"
      onclick={() => (open = false)}
    ></button>
    <ul
      class="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border
        border-surface-2 bg-surface-1 shadow-xl shadow-black/40"
      role="listbox"
    >
      {#each $profiles as p (p.id)}
        <li role="option" aria-selected={p.id === active?.id}>
          <button
            class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2
              {p.id === active?.id ? 'bg-surface-2' : ''}"
            onclick={() => pick(p.id)}
          >
            <span
              class="grid h-8 w-8 place-items-center rounded-full text-lg"
              style="background:{p.color}22"
            >
              {p.avatar}
            </span>
            <span class="font-medium">{p.name}</span>
            {#if p.id === active?.id}
              <span class="ml-auto text-calm" aria-hidden="true">✓</span>
            {/if}
          </button>
        </li>
      {/each}
      {#if $profiles.length === 0}
        <li class="px-4 py-3 text-sm text-ink-faint">Noch kein Profil — unter „Ich" anlegen.</li>
      {/if}
    </ul>
  {/if}
</div>
