<script lang="ts">
  // Tagebuch: schreiben UND lesen/suchen. Eigene Einträge (pro Account synchronisiert) + Outbox-Notizen
  // (Hyperfokus-Stände) sichtbar. Unten optionale RAG-Mustersuche (mit JARVIS).
  import { diary } from "$lib/stores/diary";
  import { outbox } from "$lib/stores/outbox";
  import { tasks } from "$lib/stores/tasks";
  import { habits } from "$lib/stores/habits";
  import { medications } from "$lib/stores/medications";
  import { checkins } from "$lib/stores/checkins";
  import { appointments } from "$lib/stores/appointments";
  import { settings } from "$lib/stores/settings";
  import { profiles } from "$lib/stores/profiles";
  import { dateShort, hhmm, relativeWhen, ymd, startOfDay, weekdayLong } from "$lib/date";
  import DiaryInsights from "$lib/components/DiaryInsights.svelte";
  import type { DiaryEntry } from "$lib/types";

  // --- Tagesansicht ---
  let dayOffset = $state(0); // 0 = heute, -1 = gestern …
  const dayMs = $derived(startOfDay(Date.now()).getTime() + dayOffset * 86_400_000);
  const dayStr = $derived(ymd(dayMs));
  const isToday = $derived(dayOffset === 0);
  const isMine = (pid: string | null) => pid === $settings.activeProfileId || pid === null;

  interface DayItem {
    ts: number;
    timed: boolean;
    icon: string;
    text: string;
  }

  const dayEntries = $derived(
    $diary.filter((e) => isMine(e.profileId) && ymd(e.createdAt) === dayStr),
  );

  const dayMoods = ["😞", "🙁", "😐", "🙂", "😄"];

  const dayItems = $derived(
    (() => {
      const items: DayItem[] = [];
      // Erledigte Aufgaben
      for (const t of $tasks)
        if (t.done && t.completedAt && isMine(t.profileId) && ymd(t.completedAt) === dayStr)
          items.push({ ts: t.completedAt, timed: true, icon: "✅", text: `Erledigt: ${t.title}` });
      // Termine an dem Tag (Familie)
      for (const a of $appointments)
        if (ymd(a.startsAt) === dayStr)
          items.push({ ts: a.startsAt, timed: true, icon: a.icon || "🗓️", text: a.title });
      // Medikation
      for (const m of $medications)
        if (isMine(m.profileId))
          for (const l of m.log) if (ymd(l) === dayStr) items.push({ ts: l, timed: true, icon: m.icon || "💊", text: `${m.name} genommen` });
      // Check-ins
      for (const c of $checkins)
        if (isMine(c.profileId) && ymd(c.createdAt) === dayStr)
          items.push({ ts: c.createdAt, timed: true, icon: "🌤️", text: `Check-in: Stimmung ${c.mood}/5 · Energie ${c.energy}/5 · Fokus ${c.focus}/5` });
      // Fokus-Notizen
      for (const n of $outbox)
        if (ymd(n.createdAt) === dayStr) items.push({ ts: n.createdAt, timed: true, icon: "✋", text: "Fokus-Stand notiert" });
      // Gewohnheiten (kein Zeitstempel → Mittag)
      const noon = dayMs + 12 * 3600_000;
      for (const h of $habits)
        if (isMine(h.profileId) && h.doneDates.includes(dayStr))
          items.push({ ts: noon, timed: false, icon: h.icon || "🌱", text: `Gewohnheit: ${h.title}` });
      return items.sort((a, b) => a.ts - b.ts);
    })(),
  );

  type Tab = "write" | "read" | "notes" | "patterns";
  let tab = $state<Tab>("write");

  let text = $state("");
  let mood = $state<number | null>(null);
  const moods = ["😞", "🙁", "😐", "🙂", "😄"];

  let query = $state("");
  let editing = $state<DiaryEntry | null>(null);

  const mine = $derived(
    $diary.filter((e) => e.profileId === $settings.activeProfileId || e.profileId === null),
  );
  const filtered = $derived(
    query.trim() ? mine.filter((e) => e.text.toLowerCase().includes(query.toLowerCase())) : mine,
  );

  async function save() {
    if (!text.trim()) return;
    if (editing) {
      await diary.update({ ...editing, text: text.trim(), mood });
      editing = null;
    } else {
      await diary.add(text, mood);
    }
    text = "";
    mood = null;
    tab = "read";
  }

  function startEdit(e: DiaryEntry) {
    editing = e;
    text = e.text;
    mood = e.mood;
    tab = "write";
  }

  function nameOf(id: string | null) {
    return $profiles.find((p) => p.id === id)?.name ?? "";
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "write", label: "Schreiben" },
    { id: "read", label: "Lesen" },
    { id: "notes", label: "Notizen" },
    { id: "patterns", label: "Muster" },
  ];
</script>

<div class="flex flex-col gap-4">
  <div class="flex gap-1 overflow-x-auto rounded-2xl bg-surface-1 p-1">
    {#each tabs as t (t.id)}
      <button
        class="whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors
          {tab === t.id ? 'bg-calm text-surface-0' : 'text-ink-soft'}"
        onclick={() => (tab = t.id)}
      >
        {t.label}
      </button>
    {/each}
  </div>

  {#if tab === "write"}
    <section class="card">
      <h2 class="mb-1 text-lg font-bold">{editing ? "Eintrag bearbeiten" : "Neuer Eintrag"}</h2>
      <p class="mb-3 text-sm text-ink-faint">Schreib einfach drauflos — kein richtig oder falsch.</p>
      <textarea
        bind:value={text}
        rows="6"
        placeholder="Was war heute los? Was beschäftigt dich?"
        class="w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
      ></textarea>
      <div class="mt-3 flex items-center gap-2">
        <span class="text-sm text-ink-soft">Stimmung:</span>
        {#each moods as e, i (i)}
          <button
            class="grid h-10 w-10 place-items-center rounded-xl text-xl {mood === i + 1 ? 'bg-calm' : 'bg-surface-2'}"
            aria-label="Stimmung {i + 1}"
            onclick={() => (mood = mood === i + 1 ? null : i + 1)}
          >
            {e}
          </button>
        {/each}
      </div>
      <button class="btn-primary mt-4 w-full" onclick={save} disabled={!text.trim()}>
        {editing ? "Speichern" : "Eintragen"}
      </button>
      {#if editing}
        <button class="btn-ghost mt-2 w-full" onclick={() => { editing = null; text = ""; mood = null; }}>Abbrechen</button>
      {/if}
    </section>
  {:else if tab === "read"}
    <input
      class="rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
      placeholder="🔎 Alle Einträge durchsuchen"
      bind:value={query}
    />

    {#if query.trim()}
      <!-- Suchmodus über alle Tage -->
      {#if filtered.length === 0}
        <div class="card text-center text-ink-soft">Nichts gefunden.</div>
      {:else}
        {#each filtered as e (e.id)}
          <div class="card">
            <div class="mb-1 flex items-center justify-between text-xs text-ink-faint">
              <span>{dateShort(e.createdAt)} · {hhmm(e.createdAt)} Uhr</span>
              <span>{e.mood ? moods[e.mood - 1] : ""}</span>
            </div>
            <p class="whitespace-pre-wrap text-ink">{e.text}</p>
            <div class="mt-2 flex gap-2">
              <button class="btn-ghost px-3 py-1 text-sm" onclick={() => startEdit(e)}>✏️</button>
              <button class="btn-ghost px-3 py-1 text-sm text-ink-faint" onclick={() => diary.remove(e.id)}>löschen</button>
            </div>
          </div>
        {/each}
      {/if}
    {:else}
      <!-- Tagesansicht: immer ein Tag -->
      <div class="flex items-center justify-between rounded-2xl bg-surface-1 p-2">
        <button class="btn-soft px-3 py-2" onclick={() => (dayOffset -= 1)} aria-label="Vorheriger Tag">‹</button>
        <div class="text-center">
          <p class="font-bold">{isToday ? "Heute" : weekdayLong(dayMs)}</p>
          <p class="text-xs text-ink-faint">{dateShort(dayMs)}</p>
        </div>
        <button
          class="btn-soft px-3 py-2 {isToday ? 'opacity-40' : ''}"
          onclick={() => (dayOffset = Math.min(0, dayOffset + 1))}
          disabled={isToday}
          aria-label="Nächster Tag"
        >›</button>
      </div>
      {#if !isToday}
        <button class="btn-ghost text-sm" onclick={() => (dayOffset = 0)}>↩ zurück zu heute</button>
      {/if}

      <!-- Tagebucheinträge des Tages -->
      {#each dayEntries as e (e.id)}
        <div class="card">
          <div class="mb-1 flex items-center justify-between text-xs text-ink-faint">
            <span>{hhmm(e.createdAt)} Uhr</span>
            <span>{e.mood ? dayMoods[e.mood - 1] : ""}</span>
          </div>
          <p class="whitespace-pre-wrap text-ink">{e.text}</p>
          <div class="mt-2 flex gap-2">
            <button class="btn-ghost px-3 py-1 text-sm" onclick={() => startEdit(e)}>✏️</button>
            <button class="btn-ghost px-3 py-1 text-sm text-ink-faint" onclick={() => diary.remove(e.id)}>löschen</button>
          </div>
        </div>
      {/each}

      <!-- Tagesrückblick: alles, was an dem Tag passiert ist -->
      <div class="card">
        <p class="mb-2 text-sm font-bold text-ink-faint">An diesem Tag</p>
        {#if dayItems.length === 0 && dayEntries.length === 0}
          <p class="text-sm text-ink-soft">Für diesen Tag ist nichts erfasst.</p>
        {:else if dayItems.length === 0}
          <p class="text-sm text-ink-soft">Keine weiteren Aktivitäten erfasst.</p>
        {:else}
          <ul class="flex flex-col gap-1.5">
            {#each dayItems as it (it.ts + it.text)}
              <li class="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                <span class="text-lg">{it.icon}</span>
                <span class="w-12 text-xs text-ink-faint">{it.timed ? hhmm(it.ts) : "—"}</span>
                <span class="flex-1">{it.text}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      {#if isToday}
        <button class="btn-soft w-full" onclick={() => (tab = "write")}>+ Eintrag für heute</button>
      {/if}
    {/if}
  {:else if tab === "notes"}
    <p class="text-sm text-ink-faint">Festgehaltene Hyperfokus-Stände (gehen nach Obsidian).</p>
    {#each $outbox as n (n.id)}
      <div class="card">
        <p class="whitespace-pre-wrap text-sm text-ink">{n.text}</p>
        <p class="mt-2 text-xs text-ink-faint">
          {relativeWhen(n.createdAt)} · {n.sent ? "→ gesendet ✓" : "wartet auf Verbindung …"}
        </p>
      </div>
    {/each}
    {#if $outbox.length === 0}
      <div class="card text-center text-ink-soft">Noch keine Notizen.</div>
    {/if}
  {:else}
    <DiaryInsights />
  {/if}
</div>
