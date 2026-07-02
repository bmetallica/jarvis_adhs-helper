<script lang="ts">
  // Dopamin-Menü: vorbereitete schnelle Belohnungen/Pausen in drei „Gängen".
  // Im Moment der Unterstimulation fällt einem nichts ein — hier ist die Karte schon gedeckt.
  import { dopamine, COURSE_LABEL } from "$lib/stores/dopamine";
  import type { DopamineCourse, DopamineItem } from "$lib/types";
  import { successCue } from "$lib/feedback";

  interface Props {
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  let text = $state("");
  let course = $state<DopamineCourse>("starter");
  let picked = $state<DopamineItem | null>(null);

  const COURSES: DopamineCourse[] = ["starter", "main", "side"];
  const byCourse = $derived(
    (c: DopamineCourse) => $dopamine.filter((d) => d.course === c),
  );

  function pickRandom() {
    const pool = $dopamine.filter((d) => d.course !== "side");
    if (!pool.length) return;
    picked = pool[Math.floor(Math.random() * pool.length)];
    successCue();
  }

  async function add() {
    if (!text.trim()) return;
    await dopamine.add(text, course);
    text = "";
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
  <button class="absolute inset-0" aria-label="Schließen" onclick={onclose}></button>
  <div class="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-surface-1 p-5 sm:rounded-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-lg font-bold">🍭 Dopamin-Menü</h2>
      <button class="btn-ghost px-2 py-1" onclick={onclose} aria-label="Schließen">✕</button>
    </div>
    <p class="mb-3 text-sm text-ink-faint">
      Deine vorbereitete Karte für flaue Momente: kleine Belohnungen, die schnell wirken —
      ohne dass du jetzt nachdenken musst.
    </p>

    <button class="btn-primary mb-4 w-full py-4 text-lg" onclick={pickRandom}>🎲 Zieh eins für mich</button>
    {#if picked}
      <div class="mb-4 rounded-2xl border-2 border-joy/60 bg-joy/10 p-4 text-center">
        <p class="text-lg font-bold">{picked.text}</p>
        <p class="mt-1 text-xs text-ink-faint">{COURSE_LABEL[picked.course]}</p>
      </div>
    {/if}

    {#each COURSES as c (c)}
      <p class="mb-1 mt-3 text-sm font-semibold">{COURSE_LABEL[c]}</p>
      <ul class="flex flex-col gap-1.5">
        {#each byCourse(c) as d (d.id)}
          <li class="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <span class="flex-1">{d.text}</span>
            <button class="btn-ghost px-2 py-0.5 text-xs" aria-label="Entfernen" onclick={() => dopamine.remove(d.id)}>✕</button>
          </li>
        {/each}
        {#if byCourse(c).length === 0}
          <li class="rounded-xl border border-dashed border-surface-3 px-3 py-2 text-center text-xs text-ink-faint">noch leer</li>
        {/if}
      </ul>
    {/each}

    <div class="mt-4 flex flex-col gap-2">
      <input
        class="rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
        placeholder="Neues Menü-Item (z. B. Trampolin, 5 min)"
        bind:value={text}
        onkeydown={(e) => e.key === "Enter" && add()}
      />
      <div class="flex gap-2">
        {#each COURSES as c (c)}
          <button
            class="flex-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors
              {course === c ? 'bg-calm text-surface-0' : 'bg-surface-2 text-ink-soft'}"
            onclick={() => (course = c)}>{COURSE_LABEL[c]}</button
          >
        {/each}
      </div>
      <button class="btn-soft" onclick={add}>+ Hinzufügen</button>
    </div>
  </div>
</div>
