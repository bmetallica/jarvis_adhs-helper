<script lang="ts">
  import type { Appointment } from "$lib/types";
  import { appointments } from "$lib/stores/appointments";
  import { profiles } from "$lib/stores/profiles";
  import { now } from "$lib/stores/clock";
  import { relativeWhen, hhmm, dateShort, leaveTime, sleepsUntil } from "$lib/date";

  interface Props {
    appointment: Appointment;
    onedit: (a: Appointment) => void;
  }
  let { appointment: a, onedit }: Props = $props();

  const leave = $derived(leaveTime(a.startsAt, a.travelMin + (a.prepMin ?? 0), a.bufferMin));
  const sleeps = $derived(sleepsUntil(a.startsAt, $now));
  const leaveSoon = $derived($now >= leave - 15 * 60000 && $now < a.startsAt);
  const companion = $derived($profiles.find((p) => p.id === a.companionId) ?? null);
  const prepOpen = $derived(a.prep.filter((p) => !p.done).length);

  let expanded = $state(false);
</script>

<div class="card {leaveSoon ? 'border-2 border-gentle' : ''}">
  <div class="flex items-start gap-3">
    <span class="text-3xl">{a.icon}</span>
    <div class="flex-1">
      <div class="flex items-baseline justify-between gap-2">
        <p class="text-lg font-bold">{a.title}</p>
        <span class="text-sm font-semibold {leaveSoon ? 'text-gentle' : 'text-calm'}">
          {relativeWhen(a.startsAt, $now)}
        </span>
      </div>
      <p class="text-sm text-ink-soft">
        {dateShort(a.startsAt)} · {hhmm(a.startsAt)} Uhr
        {#if a.recurrence !== "none"}· 🔁{/if}
      </p>

      <!-- Losgeh-Zeit: der ADHS-Kern -->
      {#if a.travelMin + a.bufferMin > 0 && sleeps <= 1}
        <p class="mt-1 text-sm {leaveSoon ? 'font-semibold text-gentle' : 'text-ink-faint'}">
          🚶 Losgehen ~{hhmm(leave)} Uhr ({a.travelMin + a.bufferMin} min Vorlauf)
        </p>
      {/if}

      {#if companion}
        <p class="mt-1 text-sm text-ink-faint">👤 {companion.avatar} {companion.name} begleitet</p>
      {/if}
    </div>
  </div>

  <!-- Aktionen -->
  <div class="mt-3 flex flex-wrap items-center gap-2">
    {#if a.prep.length}
      <button class="chip" onclick={() => (expanded = !expanded)}>
        🎒 Vorbereitung {a.prep.length - prepOpen}/{a.prep.length}
      </button>
    {/if}
    <span class="flex-1"></span>
    <button class="btn-ghost px-3 py-1 text-sm" onclick={() => onedit(a)}>✏️</button>
    <button class="btn-soft px-3 py-1 text-sm" onclick={() => appointments.complete(a.id)}>✓ erledigt</button>
  </div>

  {#if expanded && a.prep.length}
    <ul class="mt-3 flex flex-col gap-1 border-t border-surface-2 pt-3">
      {#each a.prep as item (item.id)}
        <li>
          <button
            class="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-surface-2"
            onclick={() => appointments.togglePrep(a.id, item.id)}
          >
            <span class="grid h-6 w-6 place-items-center rounded-md {item.done ? 'bg-calm text-surface-0' : 'bg-surface-3'}">
              {item.done ? "✓" : ""}
            </span>
            <span class="{item.done ? 'text-ink-faint line-through' : ''}">{item.text}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
