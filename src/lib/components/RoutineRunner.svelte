<script lang="ts">
  // Ein-Schritt-Fokus: zeigt nur den AKTUELLEN Schritt groß. Rest ausgeblendet → keine
  // Überforderung. "Erledigt" → nächster Schritt mit kleiner Belohnungs-Animation.
  import type { Routine } from "$lib/types";
  import { timers } from "$lib/stores/timers";
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { pet } from "$lib/stores/pet";
  import { XP } from "$lib/pet";
  import { doneCue } from "$lib/feedback";
  import { formatDuration } from "$lib/util";

  interface Props {
    routine: Routine;
    onclose: () => void;
  }
  let { routine, onclose }: Props = $props();

  let index = $state(0);
  let justDone = $state(false);

  const active = $derived($profiles.find((p) => p.id === $settings.activeProfileId) ?? null);
  const total = $derived(routine.steps.length);
  const step = $derived(routine.steps[index] ?? null);
  const finished = $derived(index >= total);

  function next() {
    justDone = true;
    void pet.award(XP.routineStep, active?.id ?? null);
    setTimeout(() => {
      justDone = false;
      index += 1;
      if (index >= total) {
        doneCue();
        void pet.award(XP.routineComplete, active?.id ?? null, `Routine: ${routine.title}`);
      }
    }, 450);
  }

  function startStepTimer() {
    if (!step?.durationSec) return;
    timers.start({
      label: step.title,
      seconds: step.durationSec,
      color: active?.color ?? "#4fd1c5",
      profileId: active?.id ?? null,
    });
  }

  function restart() {
    index = 0;
  }
</script>

<div class="fixed inset-0 z-50 flex flex-col bg-surface-0 p-6
  pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-2xl">{routine.icon}</span>
      <h2 class="text-lg font-bold">{routine.title}</h2>
    </div>
    <button class="btn-ghost px-2 py-1" onclick={onclose} aria-label="Schließen">✕</button>
  </div>

  <!-- Fortschritt (ruhig, ohne Druck) -->
  <div class="mb-8 flex gap-1.5">
    {#each routine.steps as _, i (i)}
      <span
        class="h-2 flex-1 rounded-full transition-colors duration-300"
        style="background-color:{i < index ? (active?.color ?? '#4fd1c5') : '#2a323d'}"
      ></span>
    {/each}
  </div>

  <div class="flex flex-1 flex-col items-center justify-center text-center">
    {#if finished}
      <div class="text-6xl">🎉</div>
      <p class="mt-4 text-2xl font-bold">Geschafft!</p>
      <p class="mt-2 text-ink-soft">Alle Schritte erledigt. Stark — in deinem Tempo.</p>
      <div class="mt-8 flex gap-2">
        <button class="btn-soft" onclick={restart}>↻ Nochmal</button>
        <button class="btn-primary" onclick={onclose}>Fertig</button>
      </div>
    {:else if step}
      <div
        class="text-7xl transition-transform duration-300 {justDone ? 'scale-125' : 'scale-100'}"
      >
        {step.icon || "✅"}
      </div>
      <p class="mt-6 text-3xl font-bold">{step.title}</p>
      <p class="mt-2 text-ink-faint">Schritt {index + 1} von {total}</p>

      {#if step.durationSec}
        <button class="btn-soft mt-6" onclick={startStepTimer}>
          ⏳ Timer ({formatDuration(step.durationSec)})
        </button>
      {/if}

      <button
        class="btn-primary mt-10 w-full max-w-xs py-6 text-xl {justDone ? 'opacity-60' : ''}"
        onclick={next}
        disabled={justDone}
      >
        {justDone ? "✓ Super!" : "Erledigt →"}
      </button>

      <button class="btn-ghost mt-3 text-sm" onclick={() => (index += 1)}>
        überspringen
      </button>
    {/if}
  </div>
</div>
