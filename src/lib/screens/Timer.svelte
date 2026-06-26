<script lang="ts">
  import { timers } from "$lib/stores/timers";
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { broadcastTimer } from "$lib/sync";
  import { hyperfocus } from "$lib/stores/hyperfocus";
  import { now } from "$lib/stores/clock";
  import { formatDuration } from "$lib/util";
  import TimerView from "$lib/components/TimerView.svelte";
  import FullscreenTimer from "$lib/components/FullscreenTimer.svelte";

  let hfMin = $state(45);
  let hfLabel = $state("");
  const hfRemaining = $derived($hyperfocus.active ? Math.max(0, ($hyperfocus.endsAt - $now) / 1000) : 0);

  const active = $derived($profiles.find((p) => p.id === $settings.activeProfileId) ?? null);
  const color = $derived(active?.color ?? "#4fd1c5");

  let label = $state("");
  let customMin = $state(10);
  let fullscreenId = $state<string | null>(null);

  const presets: { min: number; label: string }[] = [
    { min: 2, label: "2 min" },
    { min: 5, label: "5 min" },
    { min: 10, label: "10 min" },
    { min: 20, label: "20 min" },
    { min: 30, label: "30 min" },
    { min: 45, label: "45 min" },
  ];

  async function startPreset(min: number) {
    const lbl = label || `${min} Minuten`;
    await timers.start({ label: lbl, seconds: min * 60, color, profileId: active?.id ?? null });
    broadcastTimer(lbl);
    label = "";
  }

  async function startCustom() {
    await timers.start({
      label: label || `${customMin} Minuten`,
      seconds: Math.max(1, Math.round(customMin)) * 60,
      color,
      profileId: active?.id ?? null,
    });
    label = "";
  }

  async function startFirstStep() {
    // „Wall of Awful" überwinden: nur 2 Minuten verpflichten.
    const t = await timers.start({
      label: "Erster Schritt (nur 2 Minuten)",
      seconds: 120,
      color,
      style: "disc",
      profileId: active?.id ?? null,
    });
    fullscreenId = t.id;
  }

  const running = $derived(
    [...$timers].sort((a, b) => Number(b.status === "running") - Number(a.status === "running")),
  );

  const fullscreenTimer = $derived($timers.find((t) => t.id === fullscreenId) ?? null);
</script>

<div class="flex flex-col gap-5">
  <!-- Schnellstart -->
  <section class="card">
    <h2 class="mb-3 text-lg font-bold">Neuer Timer</h2>
    <input
      class="mb-3 w-full rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint
        focus:outline-none focus:ring-2 focus:ring-calm"
      placeholder="Wofür? (optional, z. B. Zähneputzen)"
      bind:value={label}
    />
    <div class="grid grid-cols-3 gap-2">
      {#each presets as p (p.min)}
        <button class="btn-soft py-4 text-lg" onclick={() => startPreset(p.min)}>{p.label}</button>
      {/each}
    </div>

    <div class="mt-4 flex items-center gap-3">
      <input
        type="range"
        min="1"
        max="120"
        bind:value={customMin}
        class="flex-1 accent-calm"
        aria-label="Eigene Dauer in Minuten"
      />
      <span class="w-16 text-right font-mono tabular-nums">{customMin} min</span>
      <button class="btn-primary" onclick={startCustom}>Start</button>
    </div>
  </section>

  <!-- Fokus / Erster Schritt -->
  <section class="card">
    <h2 class="mb-1 text-lg font-bold">Fokus-Session</h2>
    <p class="mb-3 text-sm text-ink-faint">
      Schwer anzufangen? Verpflichte dich zu <strong>nur 2 Minuten</strong>. Meist bleibt man dran.
    </p>
    <button class="btn-primary w-full py-5 text-lg" onclick={startFirstStep}>
      ▶ Erster Schritt — nur 2 Minuten
    </button>
  </section>

  <!-- Hyperfokus-Helfer mit Unterbrechung -->
  <section class="card">
    <h2 class="mb-1 text-lg font-bold">🌀 Hyperfokus-Fenster</h2>
    {#if $hyperfocus.active}
      <p class="mb-2 text-sm text-ink-soft">„{$hyperfocus.label}" läuft.</p>
      <p class="font-mono text-3xl font-bold tabular-nums text-calm">{formatDuration(hfRemaining)}</p>
      <p class="mt-1 text-xs text-ink-faint">15 min vorher Hinweis · 5 min vorher sanfte Unterbrechung zum Notieren.</p>
      <button class="btn-soft mt-3 w-full" onclick={() => hyperfocus.stop()}>Beenden</button>
    {:else}
      <p class="mb-3 text-sm text-ink-faint">
        Setz dir ein Zeitfenster. Ich melde mich 15 min vorher und unterbreche 5 min vor Schluss
        sanft, damit du deinen Stand festhalten kannst (geht als Notiz nach Obsidian).
      </p>
      <input
        class="mb-2 w-full rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
        placeholder="Woran arbeitest du? (optional)"
        bind:value={hfLabel}
      />
      <div class="flex items-center gap-3">
        <input type="range" min="15" max="180" step="5" bind:value={hfMin} class="flex-1 accent-calm" aria-label="Fokus-Dauer" />
        <span class="w-16 text-right font-mono tabular-nums">{hfMin} min</span>
      </div>
      <button class="btn-primary mt-3 w-full" onclick={() => hyperfocus.start(hfMin, hfLabel)}>Fokus starten</button>
    {/if}
  </section>

  <!-- Aktive Timer -->
  {#if running.length}
    <section class="flex flex-col gap-4">
      <h2 class="text-lg font-bold">Laufende Timer</h2>
      {#each running as t (t.id)}
        <div class="card">
          <div class="mb-2 flex justify-end">
            <button class="btn-ghost px-3 py-1 text-sm" onclick={() => (fullscreenId = t.id)}>
              ⛶ Vollbild
            </button>
          </div>
          <TimerView timer={t} size={200} />
        </div>
      {/each}
    </section>
  {:else}
    <section class="card text-center text-ink-faint">
      Noch kein Timer läuft. Such dir oben eine Dauer aus — alles in deinem Tempo. 🌿
    </section>
  {/if}
</div>

{#if fullscreenTimer}
  <FullscreenTimer timer={fullscreenTimer} onclose={() => (fullscreenId = null)} />
{/if}
