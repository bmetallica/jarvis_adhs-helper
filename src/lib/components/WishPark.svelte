<script lang="ts">
  // Impulskauf-Parkplatz: Wünsche parken statt sofort kaufen. „Ist notiert!" beruhigt das
  // Dopamin-System; nach der Reifezeit fragt die App neutral nach — Aufschub statt Verbot.
  import { wishes, isMature } from "$lib/stores/wishes";
  import { shopping } from "$lib/stores/shopping";
  import { settings } from "$lib/stores/settings";
  import { now } from "$lib/stores/clock";
  import { pushToast } from "$lib/notify";
  import { successCue } from "$lib/feedback";

  let text = $state("");
  let price = $state("");
  let matureDays = $state(14);

  const open = $derived($wishes.filter((w) => w.decision === null && !isMature(w, $now)));
  const mature = $derived($wishes.filter((w) => isMature(w, $now)));
  const kept = $derived($wishes.filter((w) => w.decision === "keep"));

  function daysUntilMature(createdAt: number, days: number): number {
    return Math.max(0, Math.ceil((createdAt + days * 86_400_000 - $now) / 86_400_000));
  }

  async function park() {
    if (!text.trim()) return;
    await wishes.add(text, price, matureDays, $settings.activeProfileId);
    text = "";
    price = "";
    successCue();
    pushToast("Ist notiert! 🎈", "Der Wunsch parkt jetzt — du musst nichts entscheiden.");
  }

  async function keep(id: string, wishText: string) {
    await wishes.decide(id, "keep");
    await shopping.add(wishText);
    pushToast("Auf die Einkaufsliste gesetzt", "Du wolltest es nach der Wartezeit immer noch. 💛");
  }

  async function drop(id: string) {
    await wishes.decide(id, "drop");
    pushToast("Losgelassen", "Kein Verlust — die Idee hatte ihren Moment.");
  }
</script>

<section class="card">
  <h2 class="mb-1 text-lg font-bold">🎈 Impulskauf-Parkplatz</h2>
  <p class="mb-3 text-sm text-ink-faint">
    Kaufimpuls? Hier parken statt bestellen. Nach der Wartezeit fragt die App neutral nach —
    was du dann noch willst, willst du wirklich.
  </p>

  <div class="mb-3 flex flex-col gap-2">
    <input
      class="rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
      placeholder="Was möchtest du gerade kaufen?"
      bind:value={text}
      onkeydown={(e) => e.key === "Enter" && park()}
    />
    <div class="flex gap-2">
      <input
        class="w-28 rounded-2xl bg-surface-2 px-3 py-2 text-sm placeholder:text-ink-faint focus:outline-none"
        placeholder="Preis"
        bind:value={price}
      />
      {#each [14, 30] as d (d)}
        <button
          class="flex-1 rounded-2xl px-3 py-2 text-sm font-medium transition-colors
            {matureDays === d ? 'bg-calm text-surface-0' : 'bg-surface-2 text-ink-soft'}"
          onclick={() => (matureDays = d)}>{d} Tage</button
        >
      {/each}
    </div>
    <button class="btn-primary" onclick={park}>🎈 Parken</button>
  </div>

  {#if mature.length}
    <p class="mb-2 text-sm font-semibold">Wartezeit vorbei — willst du das noch?</p>
    <ul class="mb-3 flex flex-col gap-2">
      {#each mature as w (w.id)}
        <li class="rounded-2xl border border-joy/40 bg-surface-2 p-3">
          <p class="font-semibold">{w.text} {w.priceText ? `· ${w.priceText}` : ""}</p>
          <div class="mt-2 flex gap-2">
            <button class="btn-primary flex-1 text-sm" onclick={() => keep(w.id, w.text)}>Ja, will ich noch</button>
            <button class="btn-ghost flex-1 text-sm" onclick={() => drop(w.id)}>Nein, loslassen</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if open.length}
    <p class="mb-1 text-sm font-semibold">Geparkt</p>
    <ul class="flex flex-col gap-1.5">
      {#each open as w (w.id)}
        <li class="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <span class="flex-1">{w.text} {w.priceText ? `· ${w.priceText}` : ""}</span>
          <span class="text-xs text-ink-faint">reift noch {daysUntilMature(w.createdAt, w.matureDays)} T.</span>
          <button class="btn-ghost px-2 py-0.5 text-xs" aria-label="Entfernen" onclick={() => wishes.remove(w.id)}>✕</button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if kept.length}
    <p class="mt-3 text-xs text-ink-faint">💛 {kept.length} Wunsch/Wünsche haben die Wartezeit überstanden.</p>
  {/if}
</section>
