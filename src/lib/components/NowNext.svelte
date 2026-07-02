<script lang="ts">
  // Now-Next-Board: "Jetzt → Als Nächstes" als große Karten. Stärkstes Anti-Überforderungs-Pattern.
  // Reihenfolge per Hoch/Runter (einfacher & barrierefreier als Drag auf Touch).
  import { tasks } from "$lib/stores/tasks";
  import { settings } from "$lib/stores/settings";
  import { recordSample } from "$lib/timetrainer";
  import type { Task } from "$lib/types";

  let newTitle = $state("");
  let newEstimate = $state<number | null>(null);
  const ESTIMATES = [5, 15, 30, 60];

  // Zeitschätzungs-Trainer: nach dem Erledigen einer geschätzten Aufgabe kurz nachfragen.
  let askActual = $state<Task | null>(null);

  const todays = $derived(
    [...$tasks].filter((t) => t.today).sort((a, b) => a.order - b.order),
  );
  const open = $derived(todays.filter((t) => !t.done));
  const doneCount = $derived(todays.filter((t) => t.done).length);

  async function addTask() {
    if (!newTitle.trim()) return;
    await tasks.add({ title: newTitle, today: true, profileId: $settings.activeProfileId, estimateMin: newEstimate });
    newTitle = "";
    newEstimate = null;
  }

  async function complete(t: Task) {
    await tasks.toggle(t.id); // Ton + XP übernimmt der Store (pet.award)
    if (t.estimateMin && !t.done) askActual = t;
  }

  async function answerActual(min: number | null) {
    const t = askActual;
    askActual = null;
    if (t && min != null && t.estimateMin) {
      await tasks.setActual(t.id, min);
      await recordSample(t.estimateMin, min);
    }
  }

  async function move(t: Task, dir: -1 | 1) {
    const ids = open.map((x) => x.id);
    const i = ids.indexOf(t.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    // Erledigte ans Ende anhängen, Reihenfolge stabil halten.
    await tasks.reorder([...ids, ...todays.filter((x) => x.done).map((x) => x.id)]);
  }
</script>

<div class="flex flex-col gap-3">
  {#if open.length === 0}
    <div class="card text-center text-ink-soft">
      {#if doneCount > 0}
        🎉 Alles erledigt für heute. Stark!
      {:else}
        Noch nichts auf dem Board — und das ist okay. Füge unten eine Sache hinzu.
      {/if}
    </div>
  {:else}
    <!-- JETZT -->
    <div class="card border-2 border-calm/40">
      <p class="chip mb-2 text-calm">Jetzt</p>
      <div class="flex items-center gap-3">
        <span class="text-3xl">{open[0].icon || "🎯"}</span>
        <p class="flex-1 text-xl font-bold">{open[0].title}</p>
        {#if open[0].estimateMin}<span class="chip">~{open[0].estimateMin} min</span>{/if}
      </div>
      <button class="btn-primary mt-4 w-full py-5 text-lg" onclick={() => complete(open[0])}>
        Erledigt ✓
      </button>
    </div>

    <!-- ALS NÄCHSTES -->
    {#if open[1]}
      <div class="card">
        <p class="chip mb-2">Als Nächstes</p>
        <div class="flex items-center gap-3">
          <span class="text-2xl">{open[1].icon || "•"}</span>
          <p class="flex-1 text-lg">{open[1].title}</p>
        </div>
      </div>
    {/if}

    <!-- Weitere (klein, einklappbar gehalten) -->
    {#if open.length > 2}
      <div class="card">
        <p class="mb-2 text-sm text-ink-faint">Später heute</p>
        <ul class="flex flex-col gap-1">
          {#each open.slice(2) as t (t.id)}
            <li class="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <span>{t.icon || "•"}</span>
              <span class="flex-1 text-sm">{t.title}</span>
              <button class="btn-ghost px-2 py-0.5 text-xs" onclick={() => move(t, -1)} aria-label="hoch">↑</button>
              <button class="btn-ghost px-2 py-0.5 text-xs" onclick={() => complete(t)} aria-label="erledigt">✓</button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/if}

  <!-- Hinzufügen -->
  <div class="flex gap-2">
    <input
      class="flex-1 rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint
        focus:outline-none focus:ring-2 focus:ring-calm"
      placeholder="Eine Sache hinzufügen …"
      bind:value={newTitle}
      onkeydown={(e) => e.key === "Enter" && addTask()}
    />
    <button class="btn-primary" onclick={addTask}>+</button>
  </div>
  {#if newTitle.trim()}
    <div class="flex items-center gap-2">
      <span class="text-xs text-ink-faint">Wie lange (Schätzung)?</span>
      {#each ESTIMATES as e (e)}
        <button
          class="chip {newEstimate === e ? 'bg-calm text-surface-0' : ''}"
          onclick={() => (newEstimate = newEstimate === e ? null : e)}>{e} min</button
        >
      {/each}
    </div>
  {/if}

  <!-- Zeitschätzungs-Trainer: kurze, neutrale Nachfrage (überspringbar) -->
  {#if askActual}
    <div class="card border border-calm/40">
      <p class="mb-2 text-sm font-semibold">⏱️ Und wie lange war es wirklich? <span class="font-normal text-ink-faint">(geschätzt: {askActual.estimateMin} min)</span></p>
      <div class="flex flex-wrap gap-2">
        {#each [5, 15, 30, 60, 120] as m (m)}
          <button class="chip" onclick={() => answerActual(m)}>{m} min</button>
        {/each}
        <button class="btn-ghost px-2 py-1 text-xs" onclick={() => answerActual(null)}>überspringen</button>
      </div>
    </div>
  {/if}

  {#if doneCount > 0}
    <button class="btn-ghost text-sm" onclick={() => tasks.clearDone()}>
      {doneCount} erledigt — aufräumen
    </button>
  {/if}
</div>
