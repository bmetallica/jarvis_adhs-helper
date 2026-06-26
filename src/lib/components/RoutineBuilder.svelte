<script lang="ts">
  import { untrack } from "svelte";
  import type { Routine, RoutineStep } from "$lib/types";
  import { routines } from "$lib/stores/routines";
  import { settings } from "$lib/stores/settings";
  import { parseRoutine, aiAvailable } from "$lib/ai";
  import { uid } from "$lib/util";

  interface Props {
    routine?: Routine | null;
    onclose: () => void;
  }
  let { routine = null, onclose }: Props = $props();

  // Nur Initialwerte aus dem Prop übernehmen (Komponente wird pro Bearbeitung neu gemountet).
  let title = $state(untrack(() => routine?.title ?? ""));
  let icon = $state(untrack(() => routine?.icon ?? "📋"));
  let steps = $state<RoutineStep[]>(
    untrack(() =>
      routine
        ? routine.steps.map((s) => ({ ...s }))
        : [{ id: uid("s"), title: "", icon: "", durationSec: null }],
    ),
  );

  let freeText = $state("");
  let parsing = $state(false);

  async function fromText() {
    if (!freeText.trim() || parsing) return;
    parsing = true;
    const r = await parseRoutine(freeText);
    if (!title.trim()) title = r.title;
    const newSteps: RoutineStep[] = r.steps.map((s) => ({
      id: uid("s"),
      title: s.task,
      icon: "",
      durationSec: s.durationSec,
    }));
    // Leere Initial-Schritte ersetzen, sonst anhängen.
    const existing = steps.filter((s) => s.title.trim());
    steps = [...existing, ...newSteps];
    freeText = "";
    parsing = false;
  }

  function addStep() {
    steps = [...steps, { id: uid("s"), title: "", icon: "", durationSec: null }];
  }
  function removeStep(id: string) {
    steps = steps.filter((s) => s.id !== id);
  }
  function moveStep(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const copy = [...steps];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    steps = copy;
  }
  function setMinutes(s: RoutineStep, val: string) {
    const n = parseInt(val, 10);
    s.durationSec = Number.isFinite(n) && n > 0 ? n * 60 : null;
    steps = [...steps];
  }

  async function save() {
    const cleaned = steps.filter((s) => s.title.trim()).map((s) => ({ ...s, title: s.title.trim() }));
    if (!title.trim() || cleaned.length === 0) return;
    if (routine) {
      await routines.update({ ...routine, title: title.trim(), icon, steps: cleaned });
    } else {
      await routines.add({ title, icon, steps: cleaned }, $settings.activeProfileId);
    }
    onclose();
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
  <button class="absolute inset-0" aria-label="Schließen" onclick={onclose}></button>
  <div
    class="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-surface-1 p-5
      sm:rounded-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
  >
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold">{routine ? "Routine bearbeiten" : "Neue Routine"}</h2>
      <button class="btn-ghost px-2 py-1" onclick={onclose} aria-label="Schließen">✕</button>
    </div>

    <div class="mb-4 flex gap-2">
      <input
        class="w-16 rounded-2xl bg-surface-2 px-3 py-3 text-center text-2xl focus:outline-none
          focus:ring-2 focus:ring-calm"
        bind:value={icon}
        aria-label="Symbol"
        maxlength="2"
      />
      <input
        class="flex-1 rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2
          focus:ring-calm"
        placeholder="Titel (z. B. Morgenroutine)"
        bind:value={title}
      />
    </div>

    <!-- KI/Heuristik: aus Freitext Schritte erzeugen -->
    <div class="mb-3 rounded-2xl bg-surface-2 p-3">
      <p class="mb-1 text-sm font-semibold">
        ✨ Aus Text erzeugen
        <span class="text-xs font-normal text-ink-faint">{aiAvailable() ? "(JARVIS)" : "(lokal)"}</span>
      </p>
      <textarea
        rows="2"
        class="w-full resize-none rounded-xl bg-surface-3 px-3 py-2 text-sm focus:outline-none"
        placeholder="z. B. „Morgens: anziehen, frühstücken 15 min, Zähne putzen, Tasche packen"
        bind:value={freeText}
      ></textarea>
      <button class="btn-soft mt-2 w-full" onclick={fromText} disabled={parsing || !freeText.trim()}>
        {parsing ? "… zerlege" : "In Schritte zerlegen"}
      </button>
    </div>

    <p class="mb-2 text-sm font-semibold text-ink-soft">Schritte</p>
    <ul class="flex flex-col gap-2">
      {#each steps as s, i (s.id)}
        <li class="rounded-2xl bg-surface-2 p-2">
          <div class="flex items-center gap-2">
            <input
              class="w-12 rounded-xl bg-surface-3 px-2 py-2 text-center text-xl focus:outline-none"
              bind:value={s.icon}
              aria-label="Schritt-Symbol"
              maxlength="2"
              placeholder="•"
            />
            <input
              class="flex-1 rounded-xl bg-surface-3 px-3 py-2 focus:outline-none focus:ring-1
                focus:ring-calm"
              bind:value={s.title}
              placeholder="Schritt {i + 1}"
            />
            <button class="btn-ghost px-2 py-1 text-sm" onclick={() => moveStep(i, -1)} aria-label="hoch">↑</button>
            <button class="btn-ghost px-2 py-1 text-sm" onclick={() => moveStep(i, 1)} aria-label="runter">↓</button>
            <button class="btn-ghost px-2 py-1 text-sm" onclick={() => removeStep(s.id)} aria-label="löschen">✕</button>
          </div>
          <div class="mt-2 flex items-center gap-2 pl-14 text-sm text-ink-faint">
            <label class="flex items-center gap-2">
              ⏳
              <input
                type="number"
                min="0"
                class="w-20 rounded-xl bg-surface-3 px-2 py-1 focus:outline-none"
                placeholder="min"
                value={s.durationSec ? Math.round(s.durationSec / 60) : ""}
                oninput={(e) => setMinutes(s, e.currentTarget.value)}
              />
              Minuten (optional)
            </label>
          </div>
        </li>
      {/each}
    </ul>

    <button class="btn-soft mt-3 w-full" onclick={addStep}>+ Schritt</button>

    <div class="mt-5 flex gap-2">
      <button class="btn-ghost flex-1" onclick={onclose}>Abbrechen</button>
      <button class="btn-primary flex-1" onclick={save}>Speichern</button>
    </div>
  </div>
</div>
