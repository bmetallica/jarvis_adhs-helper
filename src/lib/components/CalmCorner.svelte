<script lang="ts">
  // Ruhe-Ecke: Atem-Guide (4-7-8 / Box), beruhigende Fidget-Fläche (Canvas-Partikel), Reizarm.
  import { onDestroy } from "svelte";
  import { settings } from "$lib/stores/settings";

  interface Props {
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  let tab = $state<"breathe" | "fidget">("breathe");

  // --- Atem ---
  let pattern = $state<"478" | "box">("box");
  let phaseLabel = $state("Bereit");
  let scale = $state(0.7);
  let breatheTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  function runBreath() {
    stopBreath();
    const seq =
      pattern === "478"
        ? [
            { l: "Einatmen", s: 1.35, ms: 4000 },
            { l: "Halten", s: 1.35, ms: 7000 },
            { l: "Ausatmen", s: 0.7, ms: 8000 },
          ]
        : [
            { l: "Einatmen", s: 1.35, ms: 4000 },
            { l: "Halten", s: 1.35, ms: 4000 },
            { l: "Ausatmen", s: 0.7, ms: 4000 },
            { l: "Halten", s: 0.7, ms: 4000 },
          ];
    let i = 0;
    const step = () => {
      const cur = seq[i];
      phaseLabel = cur.l;
      scale = cur.s;
      breatheTimer = setTimeout(() => {
        i = (i + 1) % seq.length;
        step();
      }, cur.ms);
    };
    step();
  }
  function stopBreath() {
    if (breatheTimer) clearTimeout(breatheTimer);
    breatheTimer = null;
    phaseLabel = "Bereit";
    scale = 0.7;
  }

  // --- Fidget-Canvas: Partikel folgen dem Finger ---
  let canvas = $state<HTMLCanvasElement | null>(null);
  $effect(() => {
    if (tab !== "fidget" || !canvas) return;
    const cv = canvas;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      cv.width = cv.clientWidth * dpr;
      cv.height = cv.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random() * cv.width,
      y: Math.random() * cv.height,
      vx: 0,
      vy: 0,
      h: 160 + Math.random() * 80,
    }));
    let target = { x: cv.width / 2, y: cv.height / 2 };
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      target = { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
    };
    cv.addEventListener("pointermove", move);

    let raf = 0;
    const draw = () => {
      ctx.fillStyle = "rgba(14,17,22,0.25)";
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (const p of pts) {
        p.vx += (target.x - p.x) * 0.002;
        p.vy += (target.y - p.y) * 0.002;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx;
        p.y += p.vy;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${p.h}, 70%, 60%)`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    if (!$settings.reduceMotion) draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      cv.removeEventListener("pointermove", move);
    };
  });

  onDestroy(stopBreath);
</script>

<div class="fixed inset-0 z-50 flex flex-col bg-surface-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
  <header class="flex items-center justify-between px-4 py-3">
    <h2 class="text-lg font-bold">🌿 Ruhe-Ecke</h2>
    <button class="btn-ghost px-2 py-1" onclick={onclose} aria-label="Schließen">✕</button>
  </header>

  <div class="mx-4 mb-3 flex gap-1 rounded-2xl bg-surface-1 p-1">
    <button class="flex-1 rounded-xl px-3 py-2 text-sm font-semibold {tab === 'breathe' ? 'bg-calm text-surface-0' : 'text-ink-soft'}" onclick={() => (tab = 'breathe')}>Atmen</button>
    <button class="flex-1 rounded-xl px-3 py-2 text-sm font-semibold {tab === 'fidget' ? 'bg-calm text-surface-0' : 'text-ink-soft'}" onclick={() => (tab = 'fidget')}>Fidget</button>
  </div>

  {#if tab === "breathe"}
    <div class="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div class="flex gap-2">
        <button class="chip {pattern === 'box' ? 'bg-calm text-surface-0' : ''}" onclick={() => (pattern = 'box')}>Box (4-4-4-4)</button>
        <button class="chip {pattern === '478' ? 'bg-calm text-surface-0' : ''}" onclick={() => (pattern = '478')}>4-7-8</button>
      </div>
      <div
        class="grid h-52 w-52 place-items-center rounded-full bg-calm/20 transition-transform duration-[3500ms] ease-soft"
        style="transform:scale({scale})"
      >
        <span class="text-xl font-semibold text-calm">{phaseLabel}</span>
      </div>
      <div class="flex gap-2">
        {#if breatheTimer}
          <button class="btn-soft" onclick={stopBreath}>Stopp</button>
        {:else}
          <button class="btn-primary" onclick={runBreath}>Start</button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="flex-1 px-4 pb-6">
      <canvas bind:this={canvas} class="h-full w-full touch-none rounded-3xl bg-surface-1"></canvas>
      <p class="mt-2 text-center text-sm text-ink-faint">Fahr mit dem Finger über die Fläche.</p>
    </div>
  {/if}
</div>
