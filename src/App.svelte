<script lang="ts">
  import { route } from "$lib/router";
  import { settings } from "$lib/stores/settings";
  import { profiles } from "$lib/stores/profiles";
  import { auth } from "$lib/stores/auth";
  import LoginGate from "$lib/components/LoginGate.svelte";
  import MasterLogin from "$lib/components/MasterLogin.svelte";
  import { now } from "$lib/stores/clock";
  import { tickTimers } from "$lib/timerWatcher";
  import { tickReminders } from "$lib/reminderWatcher";
  import { pet } from "$lib/stores/pet";
  import { hyperfocus } from "$lib/stores/hyperfocus";
  import { alarmsRunning, stopAllAlarms } from "$lib/feedback";
  import { windDownActive } from "$lib/winddown";
  import { brainDumpOpen, openBrainDump, coachOpen, calmOpen, proposeOpen, sosOpen, whereOpen, dopamineOpen, repairOpen } from "$lib/stores/ui";
  import DopamineMenu from "$lib/components/DopamineMenu.svelte";
  import RepairRitual from "$lib/components/RepairRitual.svelte";
  import HyperfocusInterrupt from "$lib/components/HyperfocusInterrupt.svelte";
  import BottomNav from "$lib/components/BottomNav.svelte";
  import BrainDump from "$lib/components/BrainDump.svelte";
  import CoachChat from "$lib/components/CoachChat.svelte";
  import CalmCorner from "$lib/components/CalmCorner.svelte";
  import ProposeAppointment from "$lib/components/ProposeAppointment.svelte";
  import SosOverwhelm from "$lib/components/SosOverwhelm.svelte";
  import WhereIsIt from "$lib/components/WhereIsIt.svelte";
  import ToastHost from "$lib/components/ToastHost.svelte";
  import ProfileSwitcher from "$lib/components/ProfileSwitcher.svelte";
  import Home from "$lib/screens/Home.svelte";
  import Plan from "$lib/screens/Plan.svelte";
  import Timer from "$lib/screens/Timer.svelte";
  import Diary from "$lib/screens/Diary.svelte";
  import Pet from "$lib/screens/Pet.svelte";
  import Family from "$lib/screens/Family.svelte";
  import Me from "$lib/screens/Me.svelte";
  import Kiosk from "$lib/screens/Kiosk.svelte";

  const titles: Record<string, string> = {
    home: "Jetzt",
    plan: "Plan",
    timer: "Timer & Fokus",
    diary: "Tagebuch",
    pet: "Familien-Tier",
    family: "Familie & Paar",
    me: "Ich",
    kiosk: "Hauptquartier",
  };

  // Reizarm-Modus / Bewegungsreduktion global auf <html> spiegeln.
  // Wind-down: ab der eingestellten Abendzeit dimmt die App automatisch ins Calm-Theme.
  $effect(() => {
    const root = document.documentElement;
    const windDown = $settings.windDownStart ? windDownActive($now, $settings.windDownStart) : false;
    root.classList.toggle("calm-mode", $settings.calmMode || windDown);
    root.classList.toggle("reduce-motion", $settings.reduceMotion);
    root.classList.toggle("large-text", $settings.largeText);
    root.classList.toggle("readable-font", $settings.readableFont);
  });

  // Globale Wächter: an die zentrale Uhr gekoppelt, laufen auf allen Screens.
  $effect(() => {
    void tickTimers($now);
    void tickReminders($now);
    hyperfocus.tick($now);
  });

  // Account-Auswahl nötig? (Mitglieder vorhanden, aber auf diesem Gerät keiner gewählt.)
  const needLogin = $derived(
    $profiles.length > 0 && !$profiles.some((p) => p.id === $settings.activeProfileId),
  );

  // Entdeckungsreise-Prüfung — höchstens einmal pro Minute (nicht bei jedem Uhren-Tick).
  let lastJourneyCheck = 0;
  $effect(() => {
    if ($now - lastJourneyCheck > 60_000) {
      lastJourneyCheck = $now;
      void pet.checkJourney();
    }
  });
</script>

{#if $route === "kiosk"}
  <Kiosk />
{:else}
  <div class="mx-auto flex min-h-screen max-w-xl flex-col">
    <header
      class="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-surface-2
        bg-surface-0/90 px-4 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <h1 class="text-lg font-bold tracking-tight">{titles[$route]}</h1>
      <ProfileSwitcher />
    </header>

    <main class="flex-1 px-4 pb-28 pt-4">
      {#if $route === "home"}
        <Home />
      {:else if $route === "plan"}
        <Plan />
      {:else if $route === "timer"}
        <Timer />
      {:else if $route === "diary"}
        <Diary />
      {:else if $route === "pet"}
        <Pet />
      {:else if $route === "family"}
        <Family />
      {:else if $route === "me"}
        <Me />
      {/if}
    </main>

    <!-- Globaler Brain-Dump: immer einen Tap entfernt (über der Bottom-Nav). -->
    <button
      class="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-4 z-30 grid h-14 w-14
        place-items-center rounded-full bg-joy text-2xl text-surface-0 shadow-xl shadow-black/40
        transition-transform active:scale-90"
      aria-label="Gedanken festhalten"
      onclick={openBrainDump}
    >
      💡
    </button>

    <BottomNav />
  </div>
{/if}

{#if $brainDumpOpen}
  <BrainDump onclose={() => brainDumpOpen.set(false)} />
{/if}

{#if $coachOpen}
  <CoachChat onclose={() => coachOpen.set(false)} />
{/if}

{#if $calmOpen}
  <CalmCorner onclose={() => calmOpen.set(false)} />
{/if}

{#if $hyperfocus.interrupting}
  <HyperfocusInterrupt />
{/if}

{#if $proposeOpen}
  <ProposeAppointment onclose={() => proposeOpen.set(false)} />
{/if}

{#if $sosOpen}
  <SosOverwhelm onclose={() => sosOpen.set(false)} />
{/if}

{#if $whereOpen}
  <WhereIsIt onclose={() => whereOpen.set(false)} />
{/if}

{#if $dopamineOpen}
  <DopamineMenu onclose={() => dopamineOpen.set(false)} />
{/if}

{#if $repairOpen}
  <RepairRitual onclose={() => repairOpen.set(false)} />
{/if}

{#if $auth.required && !$auth.authed}
  <MasterLogin />
{:else if needLogin && $route !== "kiosk"}
  <LoginGate />
{/if}

{#if $alarmsRunning > 0}
  <button
    class="fixed inset-x-0 top-0 z-[85] flex items-center justify-center gap-2 bg-gentle py-3 text-lg font-bold text-surface-0 shadow-lg pt-[max(0.75rem,env(safe-area-inset-top))]"
    onclick={stopAllAlarms}
  >
    ⏰ Timer abgelaufen — tippen zum Stoppen
  </button>
{/if}

<ToastHost />
