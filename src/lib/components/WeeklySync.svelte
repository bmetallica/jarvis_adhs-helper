<script lang="ts">
  // Wöchentlicher Paar-/Familien-Sync („Board Meeting"): geführte Agenda, zeitbegrenzt (damit es
  // nicht ausufert/eskaliert). Bekanntes ADHS-Paar-Werkzeug.
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { tasks } from "$lib/stores/tasks";
  import { settings } from "$lib/stores/settings";
  import { checkins } from "$lib/stores/checkins";
  import { appreciations } from "$lib/stores/family";
  import { habits } from "$lib/stores/habits";
  import { weeklyReview, aiAvailable } from "$lib/ai";

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

  // --- KI-Wochenrückblick: nüchterne lokale Wochendaten → stärkenorientierter Kurztext ---
  let review = $state("");
  let reviewBusy = $state(false);
  let reviewFailed = $state(false);

  function weekFacts(): string {
    const weekAgo = Date.now() - 7 * 86_400_000;
    const doneTasks = get(tasks).filter((t) => t.completedAt && t.completedAt > weekAgo);
    const cis = get(checkins).filter((c) => c.createdAt > weekAgo);
    const avg = (k: "mood" | "energy" | "focus") =>
      cis.length ? Math.round((cis.reduce((s, c) => s + c[k], 0) / cis.length) * 10) / 10 : null;
    const lowDays = [...new Set(cis.filter((c) => c.mood <= 2).map((c) => new Date(c.createdAt).toLocaleDateString("de-DE", { weekday: "long" })))];
    const apps = get(appreciations).filter((a) => a.createdAt > weekAgo).length;
    const habitTicks = get(habits).reduce(
      (s, h) => s + h.doneDates.filter((d) => new Date(d).getTime() > weekAgo).length,
      0,
    );
    return [
      `Erledigte Aufgaben diese Woche: ${doneTasks.length}`,
      doneTasks.length ? `Beispiele: ${doneTasks.slice(0, 5).map((t) => t.title).join(", ")}` : "",
      cis.length ? `Check-ins: ${cis.length} (Ø Stimmung ${avg("mood")}, Energie ${avg("energy")}, Fokus ${avg("focus")} von 5)` : "Keine Check-ins.",
      lowDays.length ? `Tage mit niedriger Stimmung: ${lowDays.join(", ")}` : "",
      `Ausgesprochene Wertschätzungen: ${apps}`,
      `Gewohnheits-Haken: ${habitTicks}`,
    ].filter(Boolean).join("\n");
  }

  async function makeReview() {
    reviewBusy = true;
    reviewFailed = false;
    review = "";
    const ok = await weeklyReview(weekFacts(), (s) => (review += (review ? " " : "") + s));
    reviewBusy = false;
    if (!ok && !review) reviewFailed = true;
  }
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

    {#if aiAvailable()}
      <div class="mt-5 border-t border-surface-2 pt-4 text-left">
        <p class="mb-2 text-sm font-semibold">🤖 KI-Wochenrückblick <span class="font-normal text-ink-faint">(stärkenorientiert, als Gesprächseinstieg)</span></p>
        {#if review}
          <p class="rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed">{review}</p>
        {/if}
        {#if reviewFailed}
          <p class="mb-2 text-sm text-gentle">Gerade nicht erreichbar — der Sync geht auch wunderbar ohne.</p>
        {/if}
        <button class="btn-soft mt-2 w-full text-sm" onclick={makeReview} disabled={reviewBusy}>
          {reviewBusy ? "denke nach …" : review ? "Neu erzeugen" : "Rückblick erzeugen"}
        </button>
      </div>
    {/if}
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
