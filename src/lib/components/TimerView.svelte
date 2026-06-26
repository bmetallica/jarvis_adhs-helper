<script lang="ts">
  import type { TimerItem } from "$lib/types";
  import { now } from "$lib/stores/clock";
  import { timers } from "$lib/stores/timers";
  import { stopAlarm, alarmsRunning } from "$lib/feedback";
  import TimerDisc from "./TimerDisc.svelte";
  import TimerBar from "./TimerBar.svelte";
  import TimerDots from "./TimerDots.svelte";

  interface Props {
    timer: TimerItem;
    size?: number;
    compact?: boolean;
  }
  let { timer, size = 220, compact = false }: Props = $props();

  const rem = $derived(timers.remaining(timer, $now));
  const done = $derived(timer.status === "done" || rem <= 0);
  const paused = $derived(timer.status === "paused");

  // Alarm dieses Timers stoppen (jede Steuer-Aktion beendet den Endloston).
  function silence() {
    stopAlarm(timer.id);
  }
  function act(fn: () => void) {
    silence();
    fn();
  }
</script>

<div class="flex flex-col items-center gap-4">
  {#if timer.style === "bar"}
    <TimerBar remaining={rem} total={timer.durationSec} color={timer.color} label={timer.label} {paused} />
  {:else if timer.style === "dots"}
    <TimerDots remaining={rem} total={timer.durationSec} color={timer.color} label={timer.label} {paused} />
  {:else}
    <TimerDisc remaining={rem} total={timer.durationSec} color={timer.color} {size} label={timer.label} {paused} />
  {/if}

  {#if done}
    <p class="text-center text-lg font-semibold text-joy">Zeit ist um — alles gut. 🌿</p>
    {#if $alarmsRunning > 0}
      <button class="btn-primary w-full max-w-xs animate-pulse bg-gentle py-4 text-lg text-surface-0" onclick={silence}>
        ⏹ Alarm stoppen
      </button>
    {/if}
  {/if}

  {#if !compact}
    <div class="flex flex-wrap items-center justify-center gap-2">
      {#if done}
        <button class="btn-primary" onclick={() => act(() => timers.restart(timer.id))}>↻ Nochmal</button>
      {:else if paused}
        <button class="btn-primary" onclick={() => act(() => timers.resume(timer.id))}>▶ Weiter</button>
      {:else}
        <button class="btn-soft" onclick={() => act(() => timers.pause(timer.id))}>⏸ Pause</button>
      {/if}
      <button class="btn-soft" onclick={() => act(() => timers.addSeconds(timer.id, 60))}>+1 min</button>
      <button class="btn-ghost" onclick={() => act(() => timers.remove(timer.id))}>✕ Entfernen</button>
    </div>

    <!-- Stil-Umschalter (Novelty + persönliche Passung) -->
    <div class="flex gap-1">
      {#each [["disc", "◐"], ["bar", "▭"], ["dots", "⣿"]] as [st, ic] (st)}
        <button
          class="rounded-xl px-3 py-1.5 text-lg transition-colors
            {timer.style === st ? 'bg-calm text-surface-0' : 'bg-surface-2 text-ink-soft'}"
          aria-label="Stil {st}"
          onclick={() => timers.setStyle(timer.id, st as TimerItem['style'])}
        >
          {ic}
        </button>
      {/each}
    </div>
  {/if}
</div>
