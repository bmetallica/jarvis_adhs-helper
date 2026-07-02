<script lang="ts">
  // Reparatur-Karten: das „Danach" von Konflikten, sichtbar für beide. Annehmen heißt nicht
  // „alles gut", sondern „ich habe es gelesen, danke". Kleiner gemeinsamer Pet-Bonus.
  import { repairs } from "$lib/stores/repairs";
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { pet } from "$lib/stores/pet";
  import { openRepair } from "$lib/stores/ui";
  import { dateShort } from "$lib/date";
  import { successCue } from "$lib/feedback";

  const meId = $derived($settings.activeProfileId);
  const meRole = $derived($profiles.find((p) => p.id === meId)?.role ?? null);

  async function acknowledge(id: string) {
    if (!meId) return;
    await repairs.acknowledge(id, meId);
    await pet.award(5, meId, "Reparatur angenommen 🫂");
    successCue();
  }
</script>

<div class="flex flex-col gap-4">
  <section class="card">
    <h2 class="mb-1 text-lg font-bold">🫂 Reparatur nach Streit</h2>
    <p class="mb-3 text-sm text-ink-faint">
      Eskalationen passieren — entscheidend ist die Reparatur danach. Drei geführte Schritte,
      ohne Schuld-Vokabular.
    </p>
    <button class="btn-primary w-full" onclick={openRepair}>Reparatur-Karte schreiben</button>
  </section>

  {#each $repairs as r (r.id)}
    <section class="card {r.toId === meId && !r.acknowledgedBy.includes(meId ?? '') ? 'border-2 border-joy/50' : ''}">
      <p class="mb-2 text-sm text-ink-faint">
        <strong class="text-ink">{r.fromName}</strong> → <strong class="text-ink">{r.toName}</strong>
        · {dateShort(r.createdAt)}
      </p>
      {#if r.whatHappened}<p class="text-sm"><span class="text-ink-faint">Was bei mir los war:</span> {r.whatHappened}</p>{/if}
      {#if r.sorryFor}<p class="mt-1 text-sm"><span class="text-ink-faint">Tut mir leid:</span> {r.sorryFor}</p>{/if}
      {#if r.wishFor}<p class="mt-1 text-sm"><span class="text-ink-faint">Wunsch:</span> {r.wishFor}</p>{/if}

      {#if meId && r.toId === meId && !r.acknowledgedBy.includes(meId)}
        <button class="btn-primary mt-3 w-full" onclick={() => acknowledge(r.id)}>Annehmen 💛</button>
      {:else if r.acknowledgedBy.length}
        <p class="mt-2 text-xs text-calm">✓ angenommen</p>
      {/if}
      {#if meRole === "parent" || r.fromId === meId}
        <button class="btn-ghost mt-1 px-2 py-0.5 text-xs text-ink-faint" onclick={() => repairs.remove(r.id)}>entfernen</button>
      {/if}
    </section>
  {/each}
</div>
