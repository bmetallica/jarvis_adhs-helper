<script lang="ts">
  // Übergabe-Modus: „Spezialanleitung" für Oma/Babysitter/Schule. Bündelt Routine in Bildern,
  // Medikationszeiten und De-Eskalations-Sätze als sauberes, druckbares (PDF) Blatt.
  import { profiles } from "$lib/stores/profiles";
  import { routines } from "$lib/stores/routines";
  import { medications } from "$lib/stores/medications";
  import { dateShort } from "$lib/date";

  interface Props {
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  let childId = $state<string | null>($profiles.find((p) => p.role === "child")?.id ?? $profiles[0]?.id ?? null);
  let includedRoutines = $state<string[]>([]);
  let sentences = $state<string[]>([
    "Ich bin bei dir, wir schaffen das zusammen.",
    "Du musst gar nichts sofort — wir machen einen kleinen Schritt.",
    "Erst eine kurze Pause, dann geht es leichter.",
  ]);

  const child = $derived($profiles.find((p) => p.id === childId) ?? null);
  const childMeds = $derived($medications.filter((m) => m.profileId === childId));
  const allRoutines = $derived($routines.filter((r) => !r.archived));
  const chosen = $derived(allRoutines.filter((r) => includedRoutines.includes(r.id)));

  // Standard: Routinen mit „Abend"/„Schlaf" vorauswählen.
  $effect(() => {
    if (includedRoutines.length === 0) {
      const ev = allRoutines.filter((r) => /abend|schlaf|nacht/i.test(r.title)).map((r) => r.id);
      if (ev.length) includedRoutines = ev;
    }
  });

  function toggleRoutine(id: string) {
    includedRoutines = includedRoutines.includes(id) ? includedRoutines.filter((x) => x !== id) : [...includedRoutines, id];
  }
  function setSentence(i: number, v: string) {
    sentences[i] = v;
    sentences = [...sentences];
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
  <button class="absolute inset-0 handover-no-print" aria-label="Schließen" onclick={onclose}></button>
  <div class="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-1 p-5 sm:rounded-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]">
    <!-- Steuerung (nicht im Druck) -->
    <div class="handover-no-print">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold">Übergabe für Betreuer</h2>
        <button class="btn-ghost px-2 py-1" onclick={onclose} aria-label="Schließen">✕</button>
      </div>
      <p class="mb-3 text-sm text-ink-faint">Für wen? Was soll auf den Bogen?</p>

      {#if $profiles.length > 1}
        <div class="mb-3 flex flex-wrap gap-2">
          {#each $profiles as p (p.id)}
            <button class="chip {childId === p.id ? 'bg-calm text-surface-0' : ''}" onclick={() => (childId = p.id)}>{p.avatar} {p.name}</button>
          {/each}
        </div>
      {/if}

      {#if allRoutines.length}
        <p class="mb-1 text-sm font-semibold">Routinen einbeziehen</p>
        <div class="mb-3 flex flex-wrap gap-2">
          {#each allRoutines as r (r.id)}
            <button class="chip {includedRoutines.includes(r.id) ? 'bg-calm text-surface-0' : ''}" onclick={() => toggleRoutine(r.id)}>{r.icon} {r.title}</button>
          {/each}
        </div>
      {/if}

      <p class="mb-1 text-sm font-semibold">De-Eskalations-Sätze (anpassbar)</p>
      <div class="mb-4 flex flex-col gap-2">
        {#each sentences as s, i (i)}
          <input class="rounded-xl bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-calm" value={s} oninput={(e) => setSentence(i, e.currentTarget.value)} />
        {/each}
      </div>

      <div class="mb-4 flex gap-2">
        <button class="btn-ghost flex-1" onclick={onclose}>Schließen</button>
        <button class="btn-primary flex-1" onclick={() => window.print()}>🖨️ Drucken / Als PDF</button>
      </div>
    </div>

    <!-- Druckbarer Bogen -->
    <div class="handover-print rounded-2xl bg-white p-5 text-[#111]">
      <h1 class="text-2xl font-bold">Spezialanleitung für {child?.name ?? "—"} {child?.avatar ?? ""}</h1>
      <p class="mb-4 text-sm text-[#555]">Stand: {dateShort(Date.now())}</p>

      {#if chosen.length}
        {#each chosen as r (r.id)}
          <h2 class="mt-3 text-lg font-bold">{r.icon} {r.title}</h2>
          <ol class="ml-1 mt-1 list-none">
            {#each r.steps as step, i (step.id)}
              <li class="flex items-center gap-2 py-0.5">
                <span class="font-bold">{i + 1}.</span>
                <span class="text-lg">{step.icon || "•"}</span>
                <span>{step.title}{#if step.durationSec} ({Math.round(step.durationSec / 60)} min){/if}</span>
              </li>
            {/each}
          </ol>
        {/each}
      {/if}

      {#if childMeds.length}
        <h2 class="mt-4 text-lg font-bold">💊 Medikation</h2>
        <ul class="ml-1 mt-1">
          {#each childMeds as m (m.id)}
            <li class="py-0.5"><strong>{m.name}</strong>: {m.times.join(", ")} Uhr</li>
          {/each}
        </ul>
      {/if}

      <h2 class="mt-4 text-lg font-bold">🫂 Wenn es schwierig wird</h2>
      <ul class="ml-1 mt-1">
        {#each sentences.filter((s) => s.trim()) as s (s)}
          <li class="py-0.5">„{s}"</li>
        {/each}
      </ul>

      <p class="mt-5 text-xs text-[#777]">Danke, dass du auf {child?.name ?? "das Kind"} aufpasst. 💛</p>
    </div>
  </div>
</div>
