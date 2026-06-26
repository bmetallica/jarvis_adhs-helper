<script lang="ts">
  // Gemeinsamer Pause-Knopf: Dysregulation signalisieren → ruhiger Pausen-Timer + Atem-Guide +
  // sanfte Wieder-Annäherung danach. Co-Regulation für Paare UND Kinder. Pause = Selbstfürsorge.
  import { onDestroy } from "svelte";
  import { settings } from "$lib/stores/settings";

  type Phase = "idle" | "breathing" | "reconnect";
  let phase = $state<Phase>("idle");
  let seconds = $state(120);
  let remaining = $state(120);
  let breathePhase = $state<"ein" | "halten" | "aus">("ein");
  let interval: ReturnType<typeof setInterval> | null = null;
  let breatheTimer: ReturnType<typeof setInterval> | null = null;

  const PRESETS = [60, 120, 300];

  function startPause(s: number) {
    seconds = s;
    remaining = s;
    phase = "breathing";
    interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        stopTimers();
        phase = "reconnect";
      }
    }, 1000);
    // Atemrhythmus 4-4-6 (beruhigend, Ausatmen länger).
    if (!$settings.reduceMotion) cycleBreath();
  }

  function cycleBreath() {
    const seq: { p: "ein" | "halten" | "aus"; ms: number }[] = [
      { p: "ein", ms: 4000 },
      { p: "halten", ms: 4000 },
      { p: "aus", ms: 6000 },
    ];
    let i = 0;
    breathePhase = seq[0].p;
    const tick = () => {
      i = (i + 1) % seq.length;
      breathePhase = seq[i].p;
    };
    breatheTimer = setInterval(tick, 4666);
  }

  function stopTimers() {
    if (interval) clearInterval(interval);
    if (breatheTimer) clearInterval(breatheTimer);
    interval = null;
    breatheTimer = null;
  }

  function reset() {
    stopTimers();
    phase = "idle";
    remaining = seconds;
  }

  onDestroy(stopTimers);

  const scale = $derived(breathePhase === "ein" ? 1.35 : breathePhase === "halten" ? 1.35 : 0.7);
  const mm = $derived(`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`);
</script>

<div class="flex flex-col gap-4">
  {#if phase === "idle"}
    <div class="card text-center">
      <div class="text-5xl">🌫️</div>
      <h2 class="mt-3 text-lg font-bold">Kurze Pause?</h2>
      <p class="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        Wenn es zu viel wird (für dich oder ein Kind): eine Pause ist keine Flucht, sondern
        Selbstfürsorge. Atmet kurz durch — danach geht ihr ruhiger aufeinander zu.
      </p>
      <div class="mt-5 flex justify-center gap-2">
        {#each PRESETS as s (s)}
          <button class="btn-soft" onclick={() => startPause(s)}>{s < 60 ? `${s}s` : `${s / 60} min`}</button>
        {/each}
      </div>
    </div>
  {:else if phase === "breathing"}
    <div class="card flex flex-col items-center gap-6 py-10">
      <p class="text-xl font-bold tabular-nums">{mm}</p>
      <div
        class="grid h-40 w-40 place-items-center rounded-full bg-calm/20 transition-transform duration-[3500ms] ease-soft"
        style="transform:scale({scale})"
      >
        <span class="text-lg font-semibold text-calm">
          {breathePhase === "ein" ? "Einatmen" : breathePhase === "halten" ? "Halten" : "Ausatmen"}
        </span>
      </div>
      <p class="text-sm text-ink-faint">Folge dem Kreis. Nichts muss jetzt gelöst werden.</p>
      <button class="btn-ghost" onclick={reset}>Beenden</button>
    </div>
  {:else}
    <div class="card text-center">
      <div class="text-5xl">🤝</div>
      <h2 class="mt-3 text-lg font-bold">Sanft zurück</h2>
      <p class="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        Wenn ihr bereit seid, eine kleine Frage zur Annäherung:
      </p>
      <p class="mt-4 rounded-2xl bg-surface-2 p-4 text-ink">
        „Was brauchst du gerade von mir — Nähe, Ruhe oder eine Lösung?"
      </p>
      <button class="btn-primary mt-5" onclick={reset}>Fertig</button>
    </div>
  {/if}
</div>
