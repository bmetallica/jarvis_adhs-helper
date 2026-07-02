<script lang="ts">
  // Eltern-PIN-Gate: schützt sensible Bereiche (Medikations-Bestände, Server-Einstellungen,
  // Löschaktionen) vor neugierigen Kinderfingern. Bewusst NICHT vor Alltagsfunktionen —
  // Autonomie bleibt (KONZEPT §1.3). Ohne gesetzte PIN ist das Gate unsichtbar.
  import type { Snippet } from "svelte";
  import { settings } from "$lib/stores/settings";
  import { pinUnlocked } from "$lib/stores/ui";

  interface Props {
    /** Beschriftung des gesperrten Bereichs. */
    label?: string;
    children: Snippet;
  }
  let { label = "Geschützter Bereich", children }: Props = $props();

  let input = $state("");
  let wrong = $state(false);

  const locked = $derived(($settings.parentPin ?? "") !== "" && !$pinUnlocked);

  function tryUnlock() {
    if (input === $settings.parentPin) {
      pinUnlocked.set(true);
      input = "";
      wrong = false;
    } else {
      wrong = true;
      input = "";
      setTimeout(() => (wrong = false), 1500);
    }
  }
</script>

{#if locked}
  <section class="card">
    <p class="mb-2 flex items-center gap-2 font-semibold"><span>🔒</span>{label}</p>
    <p class="mb-3 text-sm text-ink-faint">Mit Eltern-PIN entsperren (gilt bis zum Schließen der App).</p>
    <div class="flex gap-2">
      <input
        class="flex-1 rounded-2xl bg-surface-2 px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-calm {wrong ? 'ring-2 ring-gentle' : ''}"
        type="password"
        inputmode="numeric"
        maxlength="8"
        placeholder="PIN"
        bind:value={input}
        onkeydown={(e) => e.key === "Enter" && tryUnlock()}
      />
      <button class="btn-primary" onclick={tryUnlock}>Öffnen</button>
    </div>
    {#if wrong}<p class="mt-2 text-sm text-gentle">Das war nicht die richtige PIN.</p>{/if}
  </section>
{:else}
  {@render children()}
{/if}
