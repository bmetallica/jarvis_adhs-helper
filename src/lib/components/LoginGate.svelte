<script lang="ts">
  // Account-Auswahl („Anmelden"). Accounts kommen zentral aus JARVIS (auf jedem Gerät gleich).
  // Erscheint, wenn Mitglieder vorhanden sind, aber auf diesem Gerät keiner gewählt ist.
  import { profiles } from "$lib/stores/profiles";
  import { rosterStatus, syncRoster } from "$lib/stores/accounts";
  import { isProxyMode } from "$lib/jarvis/client";
</script>

<div class="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-surface-0 p-6">
  <div class="text-center">
    <div class="text-5xl">👋</div>
    <h1 class="mt-3 text-2xl font-bold">Wer bist du?</h1>
    <p class="mt-1 text-sm text-ink-soft">Wähle deinen Account.</p>
  </div>

  <div class="grid w-full max-w-sm grid-cols-2 gap-3">
    {#each $profiles as p (p.id)}
      <button
        class="card flex flex-col items-center gap-2 py-6 active:scale-95"
        onclick={() => profiles.setActive(p.id)}
      >
        <span class="grid h-16 w-16 place-items-center rounded-full text-3xl" style="background:{p.color}22">{p.avatar}</span>
        <span class="font-semibold">{p.name}</span>
      </button>
    {/each}
  </div>

  {#if $profiles.length === 0}
    <p class="text-center text-sm text-ink-faint">
      {#if $rosterStatus === "syncing"}
        … lade Familie aus JARVIS
      {:else}
        Noch keine Accounts. {isProxyMode() ? "Lege Nutzer im JARVIS-Admin an." : "Lege unter Ich ein Profil an."}
      {/if}
    </p>
  {/if}

  <button class="btn-ghost text-sm" onclick={() => syncRoster()}>🔄 Familie neu laden</button>
</div>
