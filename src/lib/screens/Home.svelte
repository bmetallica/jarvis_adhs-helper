<script lang="ts">
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { timers } from "$lib/stores/timers";
  import { tasks } from "$lib/stores/tasks";
  import { appointments } from "$lib/stores/appointments";
  import { pet } from "$lib/stores/pet";
  import { now } from "$lib/stores/clock";
  import { route } from "$lib/router";
  import { openBrainDump, openCoach, openCalm, openPropose, openSos, openWhere, openDopamine } from "$lib/stores/ui";
  import { relativeWhen, hhmm, leaveTime } from "$lib/date";
  import { stageFor } from "$lib/pet";
  import { attention } from "$lib/attention";
  import TimerView from "$lib/components/TimerView.svelte";
  import PetCanvas from "$lib/components/PetCanvas.svelte";
  import WaitingCard from "$lib/components/WaitingCard.svelte";
  import RoutineRunner from "$lib/components/RoutineRunner.svelte";
  import { routines } from "$lib/stores/routines";
  import { windDownActive } from "$lib/winddown";
  import type { Routine } from "$lib/types";
  import FocusStatusCard from "$lib/components/FocusStatusCard.svelte";
  import PeakWindowCard from "$lib/components/PeakWindowCard.svelte";

  const active = $derived($profiles.find((p) => p.id === $settings.activeProfileId) ?? null);
  const runningTimers = $derived($timers.filter((t) => t.status === "running"));
  const openToday = $derived(
    [...$tasks].filter((t) => t.today && !t.done).sort((a, b) => a.order - b.order),
  );
  const nextAppt = $derived(
    [...$appointments].filter((a) => a.startsAt > $now - 30 * 60000).sort((a, b) => a.startsAt - b.startsAt)[0] ??
      null,
  );
  const nextLeaveAt = $derived(
    nextAppt ? leaveTime(nextAppt.startsAt, nextAppt.travelMin + (nextAppt.prepMin ?? 0), nextAppt.bufferMin) : 0,
  );
  const apptLeaveSoon = $derived(nextAppt ? $now >= nextLeaveAt - 30 * 60000 && $now < nextAppt.startsAt : false);

  // Abend-Modul: Wind-down aktiv → Ein-Tipp-Einstieg in die Abendroutine.
  const windDown = $derived(
    $settings.windDownStart ? windDownActive($now, $settings.windDownStart) && new Date($now).getHours() >= 12 : false,
  );
  const eveningRoutine = $derived(
    $routines.find((r) => !r.archived && /abend|schlaf|nacht|bett/i.test(r.title)) ?? null,
  );
  let runningRoutine = $state<Routine | null>(null);

  function greeting(): string {
    const h = new Date().getHours();
    if (h < 5) return "Gute Nacht";
    if (h < 11) return "Guten Morgen";
    if (h < 17) return "Hallo";
    if (h < 22) return "Guten Abend";
    return "Gute Nacht";
  }
</script>

<div class="flex flex-col gap-4">
  <section class="card">
    <p class="text-ink-faint">{greeting()}{active ? `, ${active.name}` : ""} 👋</p>
    <p class="mt-1 text-lg font-semibold">Schön, dass du da bist. Alles in deinem Tempo.</p>
  </section>

  <!-- SOS: Akut-Co-Regulation (immer einen Tap entfernt) -->
  <button
    class="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-gentle/60 bg-gentle/10 py-4 text-lg font-bold text-gentle active:scale-[0.99]"
    onclick={openSos}
  >
    🆘 SOS – Akuter Meltdown
  </button>

  <!-- Braucht deine Aufmerksamkeit -->
  {#if $attention.length}
    <section class="card border-2 border-joy/40">
      <p class="mb-2 flex items-center gap-2 font-bold">
        <span class="grid h-6 min-w-6 place-items-center rounded-full bg-joy px-1.5 text-sm text-surface-0">
          {$attention.length}
        </span>
        Braucht deine Aufmerksamkeit
      </p>
      <ul class="flex flex-col gap-1.5">
        {#each $attention as a (a.icon + a.text)}
          <li>
            <button class="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 text-left active:scale-[0.99]" onclick={a.go}>
              <span class="text-lg">{a.icon}</span>
              <span class="flex-1 text-sm">{a.text}</span>
              <span class="text-ink-faint">›</span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <!-- Nächster Termin (mit Losgeh-Hinweis) -->
  {#if nextAppt}
    <section class="card {apptLeaveSoon ? 'border-2 border-gentle' : ''}">
      <button class="flex w-full items-center gap-3 text-left" onclick={() => route.go("plan")}>
        <span class="text-3xl">{nextAppt.icon}</span>
        <div class="flex-1">
          <p class="font-bold">{nextAppt.title}</p>
          <p class="text-sm text-ink-soft">
            {relativeWhen(nextAppt.startsAt, $now)} · {hhmm(nextAppt.startsAt)} Uhr
          </p>
          {#if nextAppt.travelMin + (nextAppt.prepMin ?? 0) + nextAppt.bufferMin > 0 && $now < nextLeaveAt}
            <p class="mt-1 text-sm font-semibold {apptLeaveSoon ? 'text-gentle' : 'text-ink-soft'}">
              🚪 Losmachen um {hhmm(nextLeaveAt)} Uhr
            </p>
          {:else if apptLeaveSoon && $now >= nextLeaveAt}
            <p class="mt-1 text-sm font-semibold text-gentle">🚶 Jetzt losmachen!</p>
          {/if}
        </div>
      </button>
    </section>
  {/if}

  <!-- Abend-Modul: Wind-down → sanfter Einstieg in die Abendroutine -->
  {#if windDown}
    <section class="card border border-calm/40">
      <p class="font-bold">🌙 Wind-down</p>
      <p class="mt-1 text-sm text-ink-soft">Dein Morgen-Ich freut sich über Schlaf. Ein kleiner Schritt genügt.</p>
      {#if eveningRoutine}
        <button class="btn-primary mt-2 w-full" onclick={() => (runningRoutine = eveningRoutine)}>
          {eveningRoutine.icon} {eveningRoutine.title} starten
        </button>
      {:else}
        <button class="btn-soft mt-2 w-full" onclick={() => route.go("plan")}>Abendroutine anlegen →</button>
      {/if}
    </section>
  {/if}

  <!-- Warte-Modus: passt etwas Kleines in die Zeit bis zur Losgeh-Zeit? -->
  <WaitingCard />

  <!-- Medikations-Fokus-Fenster (nur Anzeige, kein medizinischer Rat) -->
  <PeakWindowCard />

  <!-- Body-Doubling: wer fokussiert gerade woran? -->
  <FocusStatusCard />

  <!-- Laufende Timer (kompakt) -->
  {#if runningTimers.length}
    <section class="card flex flex-col gap-4">
      <p class="chip">Läuft gerade</p>
      {#each runningTimers as t (t.id)}
        <button class="text-left" onclick={() => route.go("timer")}>
          <TimerView timer={t} size={140} compact />
        </button>
      {/each}
    </section>
  {/if}

  <!-- Now / Next (echte Aufgaben vom Board) -->
  <section class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div class="card border-2 {openToday[0] ? 'border-calm/40' : 'border-transparent'}">
      <p class="chip mb-2 {openToday[0] ? 'text-calm' : ''}">Jetzt</p>
      {#if openToday[0]}
        <div class="mb-3 flex items-center gap-2">
          <span class="text-2xl">{openToday[0].icon || "🎯"}</span>
          <p class="text-lg font-bold">{openToday[0].title}</p>
        </div>
        <button class="btn-primary w-full" onclick={() => tasks.toggle(openToday[0].id)}>
          Erledigt ✓
        </button>
      {:else}
        <p class="text-ink-soft">Noch nichts geplant — und das ist okay.</p>
      {/if}
    </div>
    <div class="card">
      <p class="chip mb-2">Als Nächstes</p>
      {#if openToday[1]}
        <div class="flex items-center gap-2">
          <span class="text-xl">{openToday[1].icon || "•"}</span>
          <p class="text-ink">{openToday[1].title}</p>
        </div>
      {:else}
        <button class="text-ink-soft underline-offset-2 hover:underline" onclick={() => route.go("plan")}>
          Tagesplan öffnen →
        </button>
      {/if}
    </div>
  </section>

  <!-- Schnellaktionen -->
  <section class="grid grid-cols-2 gap-3">
    <button class="btn-primary py-6 text-lg" onclick={() => route.go("timer")}>
      ⏳ Timer starten
    </button>
    <button class="btn-soft py-6 text-lg" onclick={openPropose}>➕ Termin anlegen</button>
    <button class="btn-soft py-6 text-lg" onclick={openCoach}>💬 Coach fragen</button>
    <button class="btn-soft py-6 text-lg" onclick={() => route.go("plan")}>🗓️ Plan ansehen</button>
  </section>

  <!-- Familien-Tier (kompakt) -->
  <section class="card">
    <button class="flex w-full items-center gap-4 text-left" onclick={() => route.go("pet")}>
      <PetCanvas pet={$pet} size={84} />
      <div class="flex-1">
        <p class="font-bold">{$pet.name}</p>
        <p class="text-sm text-ink-soft">
          {#if $pet.onJourney}
            🧭 auf Entdeckungsreise …
          {:else if $pet.pendingGift}
            🎁 hat ein Geschenk mitgebracht!
          {:else}
            Stufe {stageFor($pet.xp).title} · {$pet.xp} XP
          {/if}
        </p>
      </div>
      <span class="chip">🪙 {$pet.coins}</span>
    </button>
  </section>

  <!-- Schnellzugänge -->
  <section class="grid grid-cols-2 gap-3">
    <button class="btn-soft py-4" onclick={openBrainDump}>💡 Gedanke festhalten</button>
    <button class="btn-soft py-4" onclick={openWhere}>🔎 Wo ist …?</button>
    <button class="btn-soft py-4" onclick={openCalm}>🌿 Ruhe-Ecke</button>
    <button class="btn-soft py-4" onclick={openDopamine}>🍭 Dopamin-Menü</button>
  </section>

  {#if !active}
    <section class="card text-center">
      <p class="mb-3 text-ink-soft">Noch kein Profil angelegt.</p>
      <button class="btn-primary" onclick={() => route.go("me")}>Profil anlegen</button>
    </section>
  {/if}
</div>

{#if runningRoutine}
  <RoutineRunner routine={runningRoutine} onclose={() => (runningRoutine = null)} />
{/if}
