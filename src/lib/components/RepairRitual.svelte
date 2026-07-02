<script lang="ts">
  // Reparatur-Ritual: das „Danach" von Konflikten. RSD + Impulsivität ⇒ Eskalationen passieren;
  // entscheidend ist die Reparatur — und genau dafür fehlen im Affekt die Worte. Drei geführte
  // Schritte, ohne Schuld-Vokabular. Optional hilft die KI beim sanften Formulieren.
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { repairs } from "$lib/stores/repairs";
  import { reframeMessage } from "$lib/ai";
  import { pushToast } from "$lib/notify";
  import { successCue } from "$lib/feedback";

  interface Props {
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  const me = $derived($profiles.find((p) => p.id === $settings.activeProfileId) ?? null);
  const others = $derived($profiles.filter((p) => p.id !== $settings.activeProfileId));

  let toId = $state<string | null>(null);
  let whatHappened = $state("");
  let sorryFor = $state("");
  let wishFor = $state("");
  let softening = $state(false);

  $effect(() => {
    if (toId === null && others.length === 1) toId = others[0].id;
  });

  const ready = $derived(toId != null && (whatHappened.trim() || sorryFor.trim() || wishFor.trim()));

  async function soften() {
    if (!wishFor.trim() || softening) return;
    softening = true;
    const r = await reframeMessage(wishFor);
    softening = false;
    wishFor = r.text;
  }

  async function send() {
    const to = $profiles.find((p) => p.id === toId);
    if (!to || !me) return;
    await repairs.add({
      fromId: me.id,
      fromName: me.name,
      toId: to.id,
      toName: to.name,
      whatHappened: whatHappened.trim(),
      sorryFor: sorryFor.trim(),
      wishFor: wishFor.trim(),
    });
    successCue();
    pushToast("Reparatur-Karte geschickt 🫂", `${to.name} sieht sie auf dem Familienboard.`);
    onclose();
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
  <button class="absolute inset-0" aria-label="Schließen" onclick={onclose}></button>
  <div class="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-surface-1 p-5 sm:rounded-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-lg font-bold">🫂 Reparatur nach einem Streit</h2>
      <button class="btn-ghost px-2 py-1" onclick={onclose} aria-label="Schließen">✕</button>
    </div>
    <p class="mb-4 text-sm text-ink-faint">
      Streit passiert — Reparatur zählt. Drei kleine Schritte, kein Schuld-Vokabular.
      Du musst nicht alle Felder füllen.
    </p>

    {#if others.length > 1}
      <p class="mb-1 text-sm font-semibold">An wen?</p>
      <div class="mb-3 flex flex-wrap gap-2">
        {#each others as p (p.id)}
          <button class="chip {toId === p.id ? 'bg-calm text-surface-0' : ''}" onclick={() => (toId = p.id)}>{p.avatar} {p.name}</button>
        {/each}
      </div>
    {/if}

    <label class="mb-3 block text-sm">
      <span class="font-semibold">1 · Was war bei mir los?</span>
      <span class="text-ink-faint">(Gefühl, nicht Vorwurf)</span>
      <textarea rows="2" class="mt-1 w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Ich war überreizt und alles war zu viel …" bind:value={whatHappened}></textarea>
    </label>

    <label class="mb-3 block text-sm">
      <span class="font-semibold">2 · Was tut mir leid?</span>
      <textarea rows="2" class="mt-1 w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Dass ich laut geworden bin." bind:value={sorryFor}></textarea>
    </label>

    <label class="mb-1 block text-sm">
      <span class="font-semibold">3 · Was wünsche ich mir?</span>
      <textarea rows="2" class="mt-1 w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Dass wir bei Überforderung früher Pause machen." bind:value={wishFor}></textarea>
    </label>
    {#if wishFor.trim()}
      <button class="btn-ghost mb-3 text-sm" onclick={soften} disabled={softening}>
        {softening ? "formuliere …" : "✨ Sanfter formulieren (RSD-sicher)"}
      </button>
    {/if}

    <div class="mt-2 flex gap-2">
      <button class="btn-ghost flex-1" onclick={onclose}>Abbrechen</button>
      <button class="btn-primary flex-1" onclick={send} disabled={!ready}>Karte schicken 🫂</button>
    </div>
  </div>
</div>
