<script lang="ts">
  // Fristen mit Countdown + „Wall of Awful"-Zerlegung. Nie „rot überfällig" — sanft, schrittweise.
  import { deadlines, DEADLINE_CATEGORIES } from "$lib/stores/deadlines";
  import { newChecklist } from "$lib/stores/appointments";
  import { settings } from "$lib/stores/settings";
  import { now } from "$lib/stores/clock";
  import { relativeWhen, dateShort, toLocalInput, fromLocalInput, sleepsUntil } from "$lib/date";

  let showAdd = $state(false);
  let title = $state("");
  let category = $state(DEADLINE_CATEGORIES[0]);
  let due = $state(toLocalInput(Date.now() + 7 * 86_400_000));
  let stepsText = $state("");
  let expanded = $state<string | null>(null);

  async function add() {
    if (!title.trim()) return;
    await deadlines.add({
      title: title.trim(),
      category,
      dueAt: fromLocalInput(due),
      steps: newChecklist(stepsText.split("\n")),
      reminderOffsetsMin: [10080, 1440], // 1 Woche, 1 Tag vorher
      profileId: $settings.activeProfileId,
    });
    title = "";
    stepsText = "";
    showAdd = false;
  }
</script>

<div class="flex flex-col gap-3">
  <button class="btn-primary w-full" onclick={() => (showAdd = !showAdd)}>+ Neue Frist</button>

  {#if showAdd}
    <div class="card flex flex-col gap-2">
      <input class="rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Worum geht's? (z. B. Steuererklärung)" bind:value={title} />
      <div class="flex gap-2">
        <select class="flex-1 rounded-2xl bg-surface-2 px-3 py-3 focus:outline-none" bind:value={category}>
          {#each DEADLINE_CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}
        </select>
        <input type="datetime-local" class="flex-1 rounded-2xl bg-surface-2 px-3 py-3 focus:outline-none" bind:value={due} />
      </div>
      <textarea rows="3" class="resize-none rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" placeholder={"In Mini-Schritte zerlegen (eine Zeile = ein Schritt):\nUnterlagen sammeln\nFormular öffnen\n15 Min ausfüllen"} bind:value={stepsText}></textarea>
      <button class="btn-primary" onclick={add}>Speichern</button>
    </div>
  {/if}

  {#each $deadlines as d (d.id)}
    {@const open = d.steps.filter((s) => !s.done).length}
    <div class="card {d.done ? 'opacity-60' : ''}">
      <div class="flex items-start gap-3">
        <button
          class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg {d.done ? 'bg-calm text-surface-0' : 'bg-surface-3'}"
          aria-label="erledigt"
          onclick={() => deadlines.toggleDone(d.id)}
        >{d.done ? "✓" : ""}</button>
        <div class="flex-1">
          <div class="flex items-baseline justify-between gap-2">
            <p class="font-bold {d.done ? 'line-through' : ''}">{d.title}</p>
            <span class="text-sm font-semibold {sleepsUntil(d.dueAt, $now) <= 2 && !d.done ? 'text-gentle' : 'text-ink-soft'}">
              {relativeWhen(d.dueAt, $now)}
            </span>
          </div>
          <p class="text-xs text-ink-faint">{d.category} · fällig {dateShort(d.dueAt)}</p>

          {#if d.steps.length}
            <button class="chip mt-2" onclick={() => (expanded = expanded === d.id ? null : d.id)}>
              🧩 Schritte {d.steps.length - open}/{d.steps.length}
            </button>
          {/if}
        </div>
        <button class="btn-ghost px-2 py-1 text-sm text-ink-faint" onclick={() => deadlines.remove(d.id)} aria-label="löschen">✕</button>
      </div>

      {#if expanded === d.id && d.steps.length}
        <ul class="mt-3 flex flex-col gap-1 border-t border-surface-2 pt-3">
          {#each d.steps as s (s.id)}
            <li>
              <button class="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-surface-2" onclick={() => deadlines.toggleStep(d.id, s.id)}>
                <span class="grid h-6 w-6 place-items-center rounded-md {s.done ? 'bg-calm text-surface-0' : 'bg-surface-3'}">{s.done ? "✓" : ""}</span>
                <span class="{s.done ? 'text-ink-faint line-through' : ''}">{s.text}</span>
              </button>
            </li>
          {/each}
          <li class="px-2 pt-1 text-xs text-ink-faint">Ein Schritt genügt fürs Erste. 🌿</li>
        </ul>
      {/if}
    </div>
  {/each}

  {#if $deadlines.length === 0 && !showAdd}
    <div class="card text-center text-ink-soft">
      Keine offenen Fristen 🌿
    </div>
  {/if}
</div>
