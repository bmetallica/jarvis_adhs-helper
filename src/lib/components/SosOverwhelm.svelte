<script lang="ts">
  // SOS – Akuter Meltdown. Führt das Elternteil im reizarmen Vollbild Schritt für Schritt durch die
  // Co-Regulation (erst das eigene Nervensystem herunterfahren), mit gesprochenen Sätzen (offline)
  // und optionalem rosa Rauschen. Ein Tap startet — keine Profilwahl, keine Dialoge.
  import { onDestroy } from "svelte";
  import { speak, pinkNoise } from "$lib/feedback";

  interface Props {
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  let step = $state(0);
  let breath = $state<"ein" | "halten" | "aus">("ein");
  let noiseOn = $state(false);
  let stopNoise: (() => void) | null = null;
  let breatheTimer: ReturnType<typeof setTimeout> | null = null;

  const steps = [
    { title: "Erst du. Atme mit mir.", say: "Atme langsam mit mir ein. Und wieder aus.", breathing: true },
    { title: "Geh auf Augenhöhe.", say: "Geh runter auf Augenhöhe mit deinem Kind.", breathing: false },
    { title: "Sprich leise.", say: "Ich bin bei dir. Wir schaffen das zusammen.", quote: "„Ich bin bei dir, wir schaffen das zusammen.“", breathing: false },
    { title: "Wie geht es dir jetzt?", say: "", breathing: false },
  ];
  const cur = $derived(steps[step]);

  function runBreath() {
    const seq: { p: "ein" | "halten" | "aus"; ms: number }[] = [
      { p: "ein", ms: 4000 },
      { p: "halten", ms: 4000 },
      { p: "aus", ms: 6000 },
    ];
    let i = 0;
    breath = seq[0].p;
    const tick = () => {
      breatheTimer = setTimeout(() => {
        i = (i + 1) % seq.length;
        breath = seq[i].p;
        tick();
      }, seq[i].ms);
    };
    tick();
  }
  function stopBreath() {
    if (breatheTimer) clearTimeout(breatheTimer);
    breatheTimer = null;
  }

  function enter(i: number) {
    step = i;
    stopBreath();
    if (steps[i].say) speak(steps[i].say, { force: true });
    if (steps[i].breathing) runBreath();
  }
  function next() {
    if (step < steps.length - 1) enter(step + 1);
  }
  function toggleNoise() {
    if (noiseOn) {
      stopNoise?.();
      stopNoise = null;
      noiseOn = false;
    } else {
      stopNoise = pinkNoise(0.06);
      noiseOn = true;
    }
  }

  // Start sofort beim Öffnen.
  $effect(() => {
    enter(0);
  });
  onDestroy(() => {
    stopBreath();
    stopNoise?.();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  });

  const scale = $derived(breath === "aus" ? 0.7 : 1.35);
</script>

<!-- Extrem reizarm: tiefes Dunkel, wenig Kontrast, große Flächen -->
<div class="fixed inset-0 z-[95] flex flex-col bg-[#0a0d11] p-6 text-ink pt-[max(1rem,env(safe-area-inset-top))]">
  <div class="flex items-center justify-between">
    <button class="text-sm text-ink-faint" onclick={toggleNoise}>{noiseOn ? "🔇 Rauschen aus" : "🌊 Rosa Rauschen"}</button>
    <button class="text-sm text-ink-faint" onclick={onclose}>schließen ✕</button>
  </div>

  <div class="flex flex-1 flex-col items-center justify-center gap-8 text-center">
    {#if cur.breathing}
      <div
        class="grid h-48 w-48 place-items-center rounded-full bg-calm/15 transition-transform duration-[4000ms] ease-soft"
        style="transform:scale({scale})"
      >
        <span class="text-lg text-calm">{breath === "ein" ? "Einatmen" : breath === "halten" ? "Halten" : "Ausatmen"}</span>
      </div>
    {/if}

    <h2 class="max-w-md text-3xl font-bold">{cur.title}</h2>
    {#if cur.quote}
      <p class="max-w-md rounded-2xl bg-surface-1 px-5 py-4 text-xl text-ink">{cur.quote}</p>
    {/if}
  </div>

  <div class="flex flex-col items-center gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
    {#if step < steps.length - 1}
      <button class="btn-primary w-full max-w-sm py-5 text-xl" onclick={next}>Weiter →</button>
      <button class="text-sm text-ink-faint" onclick={onclose}>Mir geht es wieder besser</button>
    {:else}
      <button class="btn-primary w-full max-w-sm py-5 text-xl" onclick={onclose}>Es geht wieder 🌿</button>
      <button class="text-sm text-ink-faint" onclick={() => enter(0)}>Nochmal von vorne</button>
    {/if}
  </div>
</div>
