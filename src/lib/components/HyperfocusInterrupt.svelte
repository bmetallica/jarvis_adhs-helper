<script lang="ts">
  // Harte Hyperfokus-Unterbrechung: anhalten und den aktuellen Stand festhalten. Die Notiz geht
  // über die Outbox nach Obsidian (offline gepuffert, später weitergeleitet).
  import { hyperfocus } from "$lib/stores/hyperfocus";
  import { outbox } from "$lib/stores/outbox";
  import { settings } from "$lib/stores/settings";
  import { profiles } from "$lib/stores/profiles";

  let note = $state("");
  let saving = $state(false);
  let savedHint = $state(false);

  const label = $derived($hyperfocus.label);

  async function saveAndContinue() {
    saving = true;
    if (note.trim()) {
      const who = $profiles.find((p) => p.id === $settings.activeProfileId)?.name ?? "jemand";
      const stamp = new Date().toLocaleString("de-DE");
      await outbox.add(
        `# Hyperfokus-Stand: ${label}\n${stamp} · ${who}\n\n${note.trim()}`,
        "hyperfokus",
        { label, who },
      );
      savedHint = true;
    }
    saving = false;
    hyperfocus.acknowledge();
  }

  function skip() {
    hyperfocus.acknowledge();
  }

  function stopNow() {
    hyperfocus.stop();
  }
</script>

<div class="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
  <div class="w-full max-w-md rounded-3xl bg-surface-1 p-6 shadow-2xl">
    <div class="text-center">
      <div class="text-5xl">✋</div>
      <h2 class="mt-2 text-xl font-bold">Stopp – kurz auftauchen</h2>
      <p class="mt-1 text-sm text-ink-soft">
        Dein Fokusfenster „{label}" endet in 5 Minuten. Halte fest, wo du gerade stehst — dann ist
        der Wiedereinstieg leicht.
      </p>
    </div>

    <textarea
      bind:value={note}
      rows="4"
      placeholder="Wo stehe ich gerade? Was ist der nächste Schritt?"
      class="mt-4 w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
    ></textarea>

    {#if savedHint}
      <p class="mt-2 text-center text-sm text-calm">Notiz gespeichert → geht nach Obsidian. ✓</p>
    {/if}

    <div class="mt-4 flex flex-col gap-2">
      <button class="btn-primary w-full" onclick={saveAndContinue} disabled={saving}>
        {saving ? "… speichere" : "Stand notieren & weitermachen"}
      </button>
      <div class="flex gap-2">
        <button class="btn-ghost flex-1" onclick={skip}>Ohne Notiz weiter</button>
        <button class="btn-soft flex-1" onclick={stopNow}>Fokus jetzt beenden</button>
      </div>
    </div>
    <p class="mt-3 text-center text-xs text-ink-faint">
      Die letzten 5 Minuten sind zum Abschließen – kein Druck.
    </p>
  </div>
</div>
