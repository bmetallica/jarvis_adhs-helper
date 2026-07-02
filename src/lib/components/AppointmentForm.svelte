<script lang="ts">
  import { untrack } from "svelte";
  import type { Appointment, Recurrence } from "$lib/types";
  import { appointments, newChecklist, type AppointmentDraft } from "$lib/stores/appointments";
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { toLocalInput, fromLocalInput, leaveTime, hhmm } from "$lib/date";

  interface Props {
    appointment?: Appointment | null;
    onclose: () => void;
  }
  let { appointment = null, onclose }: Props = $props();

  const a0 = untrack(() => appointment);

  let title = $state(a0?.title ?? "");
  let icon = $state(a0?.icon ?? "🗓️");
  let when = $state(toLocalInput(a0?.startsAt ?? defaultStart()));
  let travelMin = $state(a0?.travelMin ?? 15);
  let bufferMin = $state(a0?.bufferMin ?? 10);
  let prepMin = $state(a0?.prepMin ?? 0);
  let companionId = $state<string | null>(a0?.companionId ?? null);
  let recurrence = $state<Recurrence>(a0?.recurrence ?? "none");
  let notes = $state(a0?.notes ?? "");
  let prepText = $state(a0 ? a0.prep.map((p) => p.text).join("\n") : "");

  // Erinnerungsstufen als Toggles (Minuten vor Start).
  const STAGES = [
    { off: 1440, label: "Tag vorher" },
    { off: 120, label: "2 Std" },
    { off: 30, label: "30 Min" },
  ];
  let stages = $state<number[]>(a0?.reminderOffsetsMin ?? [1440, 120]);

  function defaultStart(): number {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.getTime();
  }
  function toggleStage(off: number) {
    stages = stages.includes(off) ? stages.filter((s) => s !== off) : [...stages, off];
  }

  async function save() {
    if (!title.trim()) return;
    const draft: AppointmentDraft = {
      title: title.trim(),
      icon: icon || "🗓️",
      startsAt: fromLocalInput(when),
      travelMin: Math.max(0, travelMin),
      bufferMin: Math.max(0, bufferMin),
      prepMin: Math.max(0, prepMin),
      companionId,
      prep: a0
        ? mergePrep(a0)
        : newChecklist(prepText.split("\n")),
      reminderOffsetsMin: [...stages].sort((x, y) => y - x),
      recurrence,
      notes: notes.trim(),
      profileId: a0?.profileId ?? $settings.activeProfileId,
    };
    if (a0) {
      await appointments.update({ ...a0, ...draft });
    } else {
      await appointments.add(draft);
    }
    onclose();
  }

  // Beim Bearbeiten Checklisten-Text wieder in Items überführen, Done-Status erhalten wo Text gleich.
  function mergePrep(a: Appointment) {
    const lines = prepText.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.map((text) => {
      const existing = a.prep.find((p) => p.text === text);
      return existing ?? { id: `c_${Math.random().toString(36).slice(2, 8)}`, text, done: false };
    });
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
  <button class="absolute inset-0" aria-label="Schließen" onclick={onclose}></button>
  <div
    class="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-surface-1 p-5
      sm:rounded-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
  >
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold">{a0 ? "Termin bearbeiten" : "Neuer Termin"}</h2>
      <button class="btn-ghost px-2 py-1" onclick={onclose} aria-label="Schließen">✕</button>
    </div>

    <div class="flex flex-col gap-3">
      <div class="flex gap-2">
        <input class="w-16 rounded-2xl bg-surface-2 px-3 py-3 text-center text-2xl focus:outline-none focus:ring-2 focus:ring-calm" bind:value={icon} maxlength="2" aria-label="Symbol" />
        <input class="flex-1 rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Titel (z. B. Logopädie Lukas)" bind:value={title} />
      </div>

      <label class="text-sm text-ink-soft">
        Wann?
        <input type="datetime-local" class="mt-1 w-full rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" bind:value={when} />
      </label>

      <!-- Der ADHS-Kern: Losgeh-Rechner (Rückwärtsplanung) -->
      <div class="rounded-2xl bg-surface-2 p-3">
        <p class="mb-2 text-sm font-semibold">⏱️ Losgeh-Rechner (rückwärts vom Start)</p>
        <div class="flex gap-3">
          <label class="flex-1 text-sm text-ink-soft">
            Anziehen/Packen (min)
            <input type="number" min="0" class="mt-1 w-full rounded-xl bg-surface-3 px-3 py-2 focus:outline-none" bind:value={prepMin} />
          </label>
          <label class="flex-1 text-sm text-ink-soft">
            Weg (min)
            <input type="number" min="0" class="mt-1 w-full rounded-xl bg-surface-3 px-3 py-2 focus:outline-none" bind:value={travelMin} />
          </label>
          <label class="flex-1 text-sm text-ink-soft">
            Puffer (min)
            <input type="number" min="0" class="mt-1 w-full rounded-xl bg-surface-3 px-3 py-2 focus:outline-none" bind:value={bufferMin} />
          </label>
        </div>
        {#if fromLocalInput(when) > 0}
          <p class="mt-2 text-sm font-semibold text-calm">
            🚪 Losmachen um {hhmm(leaveTime(fromLocalInput(when), Math.max(0, travelMin) + Math.max(0, prepMin), Math.max(0, bufferMin)))} Uhr
          </p>
        {/if}
      </div>

      <!-- Begleitung (Mental-Load-Sichtbarkeit) -->
      {#if $profiles.length > 1}
        <label class="text-sm text-ink-soft">
          Wer begleitet/bringt?
          <select class="mt-1 w-full rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none" bind:value={companionId}>
            <option value={null}>—</option>
            {#each $profiles as p (p.id)}
              <option value={p.id}>{p.avatar} {p.name}</option>
            {/each}
          </select>
        </label>
      {/if}

      <!-- Erinnerungsstufen -->
      <div>
        <p class="mb-1.5 text-sm text-ink-soft">Erinnern</p>
        <div class="flex flex-wrap gap-2">
          {#each STAGES as s (s.off)}
            <button
              class="rounded-full px-3 py-1.5 text-sm transition-colors {stages.includes(s.off) ? 'bg-calm text-surface-0' : 'bg-surface-2 text-ink-soft'}"
              onclick={() => toggleStage(s.off)}
            >
              {s.label}
            </button>
          {/each}
          <span class="chip">+ „Jetzt losgehen" automatisch</span>
        </div>
      </div>

      <!-- Vorbereitungs-Checkliste -->
      <label class="text-sm text-ink-soft">
        Mitnehmen/Vorbereiten (eine Zeile = ein Punkt)
        <textarea rows="3" class="mt-1 w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" placeholder={"Versichertenkarte\nÜberweisung\nFragenliste"} bind:value={prepText}></textarea>
      </label>

      <!-- Wiederholung -->
      <label class="text-sm text-ink-soft">
        Wiederholung
        <select class="mt-1 w-full rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none" bind:value={recurrence}>
          <option value="none">einmalig</option>
          <option value="weekly">wöchentlich</option>
          <option value="daily">täglich</option>
        </select>
      </label>

      <div class="mt-2 flex gap-2">
        <button class="btn-ghost flex-1" onclick={onclose}>Abbrechen</button>
        <button class="btn-primary flex-1" onclick={save}>Speichern</button>
      </div>
    </div>
  </div>
</div>
