<script lang="ts">
  // Muster aus dem RAG-Tagebuch (nur mit JARVIS-Verbindung). Hochsensible Daten bleiben im LAN.
  import { diaryQuery, scheduleNightlyInsight, aiAvailable } from "$lib/ai";

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
