<script lang="ts">
  import { routines, ROUTINE_TEMPLATES } from "$lib/stores/routines";
  import { inbox } from "$lib/stores/inbox";
  import { appointments } from "$lib/stores/appointments";
  import { settings } from "$lib/stores/settings";
  import { now } from "$lib/stores/clock";
  import { sleepsUntil } from "$lib/date";
  import type { Routine, Appointment } from "$lib/types";
  import NowNext from "$lib/components/NowNext.svelte";
  import InboxList from "$lib/components/InboxList.svelte";
  import CheckIn from "$lib/components/CheckIn.svelte";
  import DiaryInsights from "$lib/components/DiaryInsights.svelte";
  import RoutineRunner from "$lib/components/RoutineRunner.svelte";
  import RoutineBuilder from "$lib/components/RoutineBuilder.svelte";
  import CalendarView from "$lib/components/CalendarView.svelte";
  import DeadlineList from "$lib/components/DeadlineList.svelte";
  import HomeworkCapture from "$lib/components/HomeworkCapture.svelte";
  import IcsTools from "$lib/components/IcsTools.svelte";
  import ShoppingList from "$lib/components/ShoppingList.svelte";
  import MealPlan from "$lib/components/MealPlan.svelte";
  import HabitsView from "$lib/components/HabitsView.svelte";
  import AppointmentForm from "$lib/components/AppointmentForm.svelte";
  import AppointmentCard from "$lib/components/AppointmentCard.svelte";

  type Tab = "today" | "dates" | "routines" | "lists" | "habits" | "inbox" | "checkin";
  let tab = $state<Tab>("today");
  let datesSub = $state<"appointments" | "deadlines">("appointments");
  let listsSub = $state<"shopping" | "meals">("shopping");

  let running = $state<Routine | null>(null);
  let editing = $state<Routine | null>(null);
  let showBuilder = $state(false);
  let editAppt = $state<Appointment | null>(null);
  let showApptForm = $state(false);

  const openInbox = $derived($inbox.filter((i) => !i.processed).length);
  const todayAppts = $derived(
    [...$appointments]
      .filter((a) => sleepsUntil(a.startsAt, $now) === 0 && a.startsAt > $now - 2 * 3600_000)
      .sort((a, b) => a.startsAt - b.startsAt),
  );

  const tabs: { id: Tab; label: string; badge?: number }[] = $derived([
    { id: "today", label: "Heute" },
    { id: "dates", label: "Termine" },
    { id: "routines", label: "Routinen" },
    { id: "lists", label: "Listen" },
    { id: "habits", label: "Gewohnheiten" },
    { id: "inbox", label: "Eingang", badge: openInbox },
    { id: "checkin", label: "Check-in" },
  ]);

  function newRoutine() {
    editing = null;
    showBuilder = true;
  }
  function editRoutine(r: Routine) {
    editing = r;
    showBuilder = true;
  }
  function openEditAppt(a: Appointment) {
    editAppt = a;
    showApptForm = true;
  }
</script>

<div class="flex flex-col gap-4">
  <!-- Haupt-Tabs (scrollbar) -->
  <div class="flex gap-1 overflow-x-auto rounded-2xl bg-surface-1 p-1">
    {#each tabs as t (t.id)}
      <button
        class="relative whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors
          {tab === t.id ? 'bg-calm text-surface-0' : 'text-ink-soft'}"
        onclick={() => (tab = t.id)}
      >
        {t.label}
        {#if t.badge}
          <span class="ml-1 rounded-full bg-joy px-1.5 text-xs text-surface-0">{t.badge}</span>
        {/if}
      </button>
    {/each}
  </div>

  {#if tab === "today"}
    <NowNext />
    {#if todayAppts.length}
      <section class="flex flex-col gap-2">
        <h3 class="px-1 text-sm font-bold text-ink-faint">Heute anstehend</h3>
        {#each todayAppts as a (a.id)}
          <AppointmentCard appointment={a} onedit={openEditAppt} />
        {/each}
      </section>
    {/if}
  {:else if tab === "dates"}
    <div class="flex gap-1 rounded-2xl bg-surface-1 p-1">
      <button class="flex-1 rounded-xl px-3 py-2 text-sm font-semibold {datesSub === 'appointments' ? 'bg-calm text-surface-0' : 'text-ink-soft'}" onclick={() => (datesSub = 'appointments')}>🗓️ Termine</button>
      <button class="flex-1 rounded-xl px-3 py-2 text-sm font-semibold {datesSub === 'deadlines' ? 'bg-calm text-surface-0' : 'text-ink-soft'}" onclick={() => (datesSub = 'deadlines')}>⏰ Fristen</button>
    </div>
    {#if datesSub === "appointments"}
      <CalendarView />
      <IcsTools />
    {:else}
      <HomeworkCapture />
      <DeadlineList />
    {/if}
  {:else if tab === "routines"}
    <div class="flex flex-col gap-3">
      {#each $routines.filter((r) => !r.archived) as r (r.id)}
        <div class="card flex items-center gap-3">
          <span class="text-3xl">{r.icon}</span>
          <div class="flex-1">
            <p class="font-bold">{r.title}</p>
            <p class="text-xs text-ink-faint">{r.steps.length} Schritte</p>
          </div>
          <button class="btn-soft px-3 py-2" onclick={() => editRoutine(r)} aria-label="bearbeiten">✏️</button>
          <button class="btn-primary px-4 py-2" onclick={() => (running = r)}>▶ Start</button>
        </div>
      {/each}

      {#if $routines.length === 0}
        <div class="card text-center text-ink-soft">Noch keine Routine. Nimm eine Vorlage oder bau deine eigene.</div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {#each ROUTINE_TEMPLATES as tpl (tpl.title)}
            <button class="card flex items-center gap-2 text-left" onclick={() => routines.addFromTemplate(tpl, $settings.activeProfileId)}>
              <span class="text-2xl">{tpl.icon}</span>
              <span class="text-sm font-semibold">{tpl.title}</span>
            </button>
          {/each}
        </div>
      {/if}
      <button class="btn-soft w-full" onclick={newRoutine}>+ Eigene Routine</button>
    </div>
  {:else if tab === "lists"}
    <div class="flex gap-1 rounded-2xl bg-surface-1 p-1">
      <button class="flex-1 rounded-xl px-3 py-2 text-sm font-semibold {listsSub === 'shopping' ? 'bg-calm text-surface-0' : 'text-ink-soft'}" onclick={() => (listsSub = 'shopping')}>🛒 Einkauf</button>
      <button class="flex-1 rounded-xl px-3 py-2 text-sm font-semibold {listsSub === 'meals' ? 'bg-calm text-surface-0' : 'text-ink-soft'}" onclick={() => (listsSub = 'meals')}>🍽️ Essensplan</button>
    </div>
    {#if listsSub === "shopping"}
      <ShoppingList />
    {:else}
      <MealPlan />
    {/if}
  {:else if tab === "habits"}
    <HabitsView />
  {:else if tab === "inbox"}
    <InboxList />
  {:else if tab === "checkin"}
    <CheckIn />
    <DiaryInsights />
  {/if}
</div>

{#if running}
  <RoutineRunner routine={running} onclose={() => (running = null)} />
{/if}
{#if showBuilder}
  <RoutineBuilder routine={editing} onclose={() => (showBuilder = false)} />
{/if}
{#if showApptForm}
  <AppointmentForm appointment={editAppt} onclose={() => (showApptForm = false)} />
{/if}
