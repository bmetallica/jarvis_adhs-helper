<script lang="ts">
  // Wöchentlicher Paar-/Familien-Sync („Board Meeting"): geführte Agenda, zeitbegrenzt (damit es
  // nicht ausufert/eskaliert). Bekanntes ADHS-Paar-Werkzeug.
  import { onDestroy } from "svelte";
  import { tasks } from "$lib/stores/tasks";
  import { settings } from "$lib/stores/settings";

  const AGENDA = [
    { icon: "🎉", title: "Wins der Woche", hint: "Was lief gut? Jede Person nennt eine Sache." },
    { icon: "🌧️", title: "Was war schwer?", hint: "Ohne Schuld — nur benennen, was belastet hat." },
    { icon: "📅", title: "Kommende Woche", hint: "Termine, Besonderheiten, wer braucht Unterstützung?" },
    { icon: "🙏", title: "Eine Bitte pro Person", hint: "Konkret und freundlich, als Ich-Wunsch formuliert." },
  ];

  let active = $state(false);
  let step = $state(0);
  let remaining = $state(0);
  let interval: ReturnType<typeof setInterval> | null = null;
  let note = $state("");

  const STEP_SECONDS = 180;

  function start() {
    active = true;
    step = 0;
    remaining = STEP_SECONDS;
    interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) remaining = 0;
    }, 1000);
  }
  function nextStep() {
    if (step < AGENDA.length - 1) {
      step += 1;
      remaining = STEP_SECONDS;
    } else {
      finish();
    }
  }
  function finish() {
    if (interval) clearInterval(interval);
    interval = null;
    active = false;
    step = 0;
  }
  async function noteToTask() {
    if (!note.trim()) return;
    await tasks.add({ title: note, today: false, profileId: $settings.activeProfileId });
    note = "";
  }
  onDestroy(() => interval && clearInterval(interval));

  const mm = $derived(`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`);
</script>

{#if !active}
  <div class="card text-center">
    <div class="text-5xl">🗓️💞</div>
    <h2 class="mt-3 text-lg font-bold">Wochen-Sync</h2>
    <p class="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
      15 ruhige Minuten zu zweit: Wins feiern, Schweres benennen, die Woche planen, je eine Bitte.
      Zeitbegrenzt, damit es leicht bleibt.
    </p>
    <button class="btn-primary mt-5" onclick={start}>Sync starten</button>
  </div>
{:else}
  <div class="flex flex-col gap-4">
    <div class="card">
      <div class="mb-3 flex items-center justify-between">
        <span class="chip">Schritt {step + 1}/{AGENDA.length}</span>
        <span class="font-mono text-lg tabular-nums {remaining === 0 ? 'text-gentle' : 'text-calm'}">{mm}</span>
      </div>
      <div class="text-center">
        <div class="text-5xl">{AGENDA[step].icon}</div>
        <h3 class="mt-3 text-xl font-bold">{AGENDA[step].title}</h3>
        <p class="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{AGENDA[step].hint}</p>
      </div>
    </div>

    <div class="card">
      <p class="mb-2 text-sm text-ink-soft">Notiz/Aufgabe festhalten (optional)</p>
      <div class="flex gap-2">
        <input class="flex-1 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calm" placeholder="z. B. Babysitter für Freitag organisieren" bind:value={note} onkeydown={(e) => e.key === 'Enter' && noteToTask()} />
        <button class="btn-soft" onclick={noteToTask}>→ Aufgabe</button>
      </div>
    </div>

    <div class="flex gap-2">
      <button class="btn-ghost flex-1" onclick={finish}>Beenden</button>
      <button class="btn-primary flex-1" onclick={nextStep}>
        {step < AGENDA.length - 1 ? "Weiter →" : "Abschließen ✓"}
      </button>
    </div>
  </div>
{/if}
