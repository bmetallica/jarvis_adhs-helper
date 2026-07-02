<script lang="ts">
  // Muster aus dem RAG-Tagebuch (nur mit JARVIS-Verbindung). Hochsensible Daten bleiben im LAN.
  import { diaryQuery, scheduleNightlyInsight, aiAvailable } from "$lib/ai";
  import { loadSamples, summarize, summaryText, type TimeSummary } from "$lib/timetrainer";
  import { routines } from "$lib/stores/routines";

  // Zeitschätzungs-Trainer: neutrale Kalibrierung (lokal, ohne KI).
  let timeSummary = $state<TimeSummary | null>(null);
  $effect(() => {
    void loadSamples().then((s) => (timeSummary = summarize(s)));
  });

  // Routine-Schritte, deren reale Dauer deutlich von der geplanten abweicht.
  const stepFacts = $derived(
    (() => {
      const out: string[] = [];
      for (const r of $routines) {
        for (const s of r.steps) {
          const m = s.measuredSec ?? [];
          if (m.length < 3 || !s.durationSec) continue;
          const sorted = [...m].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          if (median > s.durationSec * 1.5 || median < s.durationSec * 0.5) {
            out.push(`${s.icon || "•"} ${s.title}: geplant ${Math.round(s.durationSec / 60)} min, real Ø ${Math.round(median / 60)} min`);
          }
        }
      }
      return out.slice(0, 4);
    })(),
  );

  let query = $state("");
  let busy = $state(false);
  let results = $state<{ content: string; score: number; metadata?: Record<string, unknown> }[] | null>(null);
  let scheduled = $state(false);

  const presets = [
    "Wie liefen die Nachmittage zuletzt?",
    "Wann gab es Fokus-Crashs?",
    "Was hat bei Übergängen geholfen?",
  ];

  async function run(q: string) {
    if (!q.trim() || busy) return;
    query = q;
    busy = true;
    results = await diaryQuery(q);
    busy = false;
  }

  async function scheduleNightly() {
    scheduled = await scheduleNightlyInsight();
  }
</script>

{#if timeSummary || stepFacts.length}
  <div class="card mb-4">
    <h2 class="mb-1 text-lg font-bold">⏱️ Deine Zeit-Kalibrierung</h2>
    <p class="mb-2 text-sm text-ink-faint">Lokal gemessen, ganz neutral — Zeitblindheit lässt sich kalibrieren.</p>
    {#if timeSummary}
      <p class="rounded-xl bg-surface-2 px-3 py-2 text-sm">{summaryText(timeSummary)}</p>
    {/if}
    {#if stepFacts.length}
      <ul class="mt-2 flex flex-col gap-1">
        {#each stepFacts as f (f)}
          <li class="rounded-xl bg-surface-2 px-3 py-1.5 text-sm">{f}</li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<div class="card">
  <h2 class="mb-1 text-lg font-bold">Muster im Tagebuch</h2>
  {#if !aiAvailable()}
    <p class="text-sm text-ink-faint">
      Nur mit JARVIS-Verbindung. Check-ins und Notizen werden dann privat im lokalen RAG gespeichert
      und hier durchsuchbar. (Ich → JARVIS-Verbindung)
    </p>
  {:else}
    <p class="mb-3 text-sm text-ink-faint">Durchsuche vergangene Einträge nach Mustern.</p>
    <div class="mb-2 flex gap-2">
      <input
        class="flex-1 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-calm"
        placeholder="Frage stellen …"
        bind:value={query}
        onkeydown={(e) => e.key === "Enter" && run(query)}
      />
      <button class="btn-primary" onclick={() => run(query)} disabled={busy}>{busy ? "…" : "Suchen"}</button>
    </div>
    <div class="mb-3 flex flex-wrap gap-1">
      {#each presets as p (p)}
        <button class="chip" onclick={() => run(p)}>{p}</button>
      {/each}
    </div>

    {#if results !== null}
      {#if results.length === 0}
        <p class="text-sm text-ink-faint">Noch keine passenden Einträge. Trag ein paar Check-ins ein. 🌿</p>
      {:else}
        <ul class="flex flex-col gap-2">
          {#each results as r (r.content)}
            <li class="rounded-xl bg-surface-2 px-3 py-2 text-sm">{r.content}</li>
          {/each}
        </ul>
      {/if}
    {/if}

    <button class="btn-ghost mt-3 text-sm" onclick={scheduleNightly} disabled={scheduled}>
      {scheduled ? "✓ nächtliche Analyse geplant" : "🌙 Nächtliche Muster-Analyse einplanen (schont den Server)"}
    </button>
  {/if}
</div>
