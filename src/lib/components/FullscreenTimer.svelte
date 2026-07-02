<script lang="ts">
  // Vollbild-/Kioskmodus: große, aus Distanz ablesbare Scheibe (Wand-Tablet, Kinderzimmer).
  import type { TimerItem } from "$lib/types";
  import { acquireWakeLock } from "$lib/wakelock";
  import TimerView from "./TimerView.svelte";

  interface Props {
    timer: TimerItem;
    onclose: () => void;
  }
  let { timer, onclose }: Props = $props();

  // Display anlassen, solange der Vollbild-Timer offen ist (Zeit sichtbar halten).
  $effect(() => acquireWakeLock());

  let big = $state(280);
  $effect(() => {
    const calc = () => {
      const m = Math.min(window.innerWidth, window.innerHeight);
      big = Math.max(220, Math.min(460, Math.round(m * 0.7)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  });
</script>

<div
  class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-surface-0 p-6
    pt-[max(1rem,env(safe-area-inset-top))]"
>
  <button
    class="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] btn-ghost text-2xl"
    aria-label="Vollbild schließen"
    onclick={onclose}
  >
    ✕
  </button>

  <TimerView {timer} size={big} />
</div>
