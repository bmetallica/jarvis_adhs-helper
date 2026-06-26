<script lang="ts">
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { timers } from "$lib/stores/timers";
  import { tasks } from "$lib/stores/tasks";
  import { appointments } from "$lib/stores/appointments";
  import { pet } from "$lib/stores/pet";
  import { polls } from "$lib/stores/polls";
  import { inbox } from "$lib/stores/inbox";
  import { medications, todayAt, takenAround } from "$lib/stores/medications";
  import { now } from "$lib/stores/clock";
  import { route } from "$lib/router";
  import { openBrainDump, openCoach, openCalm, openPropose } from "$lib/stores/ui";
  import { relativeWhen, hhmm, leaveTime } from "$lib/date";
  import { stageFor } from "$lib/pet";
  import TimerView from "$lib/components/TimerView.svelte";
  import PetCanvas from "$lib/components/PetCanvas.svelte";

  const active = $derived($profiles.find((p) => p.id === $settings.activeProfileId) ?? null);
  const meId = $derived($settings.activeProfileId);

  // --- „Braucht deine Aufmerksamkeit" — aktionsbedürftige Dinge bündeln ---
  interface Attn {
    icon: string;
    text: string;
    go: () => void;
  }
  const attention = $derived(
    (() => {
      const items: Attn[] = [];
      // Offene Abstimmungen / Termin-Anfragen, bei denen ich abstimmen soll und noch nicht habe.
      for (const p of $polls) {
        if (p.status !== "open") continue;
        const targeted = p.voterIds.length === 0 || (meId != null && p.voterIds.includes(meId));
        const voted = meId != null && (p.votes[meId]?.length ?? 0) > 0;
        if (targeted && !voted) {
          items.push({
            icon: p.kind === "appointment" ? "📅" : "🗳️",
            text: p.kind === "appointment" ? `Termin-Anfrage: ${p.appointment?.title ?? p.question}` : `Abstimmung: ${p.question}`,
            go: () => route.go("family"),
          });
        }
      }
      // Tier hat ein Geschenk mitgebracht.
      if ($pet.pendingGift) {
        items.push({ icon: "🎁", text: `${$pet.name} hat ein Geschenk mitgebracht`, go: () => route.go("pet") });
      }
      // Fällige Medikation (heute, Zeit vorbei, noch nicht genommen).
      for (const m of $medications) {
        if (m.profileId !== meId && m.profileId !== null) continue;
        for (const time of m.times) {
          const ts = todayAt(time);
          if ($now >= ts && $now < ts + 2 * 3600_000 && !takenAround(m, ts)) {
            items.push({ icon: m.icon || "💊", text: `${m.name} fällig (${time} Uhr)`, go: () => route.go("me") });
            break;
          }
        }
      }
      // Unverarbeiteter Posteingang (Brain-Dump).
      const inboxOpen = $inbox.filter((i) => !i.processed).length;
      if (inboxOpen > 0) {
        items.push({ icon: "💭", text: `${inboxOpen} Gedanke(n) im Posteingang`, go: () => route.go("plan") });
      }
      return items;
    })(),
  );
  const runningTimers = $derived($timers.filter((t) => t.status === "running"));
  const openToday = $derived(
    [...$tasks].filter((t) => t.today && !t.done).sort((a, b) => a.order - b.order),
  );
  const nextAppt = $derived(
    [...$appointments].filter((a) => a.startsAt > $now - 30 * 60000).sort((a, b) => a.startsAt - b.startsAt)[0] ??
      null,
  );
  const apptLeaveSoon = $derived(
    nextAppt ? $now >= leaveTime(nextAppt.startsAt, nextAppt.travelMin, nextAppt.bufferMin) - 30 * 60000 && $now < nextAppt.startsAt : false,
  );

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

  <!-- Braucht deine Aufmerksamkeit -->
  {#if attention.length}
    <section class="card border-2 border-joy/40">
      <p class="mb-2 flex items-center gap-2 font-bold">
        <span class="grid h-6 min-w-6 place-items-center rounded-full bg-joy px-1.5 text-sm text-surface-0">
          {attention.length}
        </span>
        Braucht deine Aufmerksamkeit
      </p>
      <ul class="flex flex-col gap-1.5">
        {#each attention as a (a.icon + a.text)}
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
          {#if apptLeaveSoon && nextAppt.travelMin + nextAppt.bufferMin > 0}
            <p class="mt-1 text-sm font-semibold text-gentle">
              🚶 Bald losmachen — ~{hhmm(leaveTime(nextAppt.startsAt, nextAppt.travelMin, nextAppt.bufferMin))} Uhr
            </p>
          {/if}
        </div>
      </button>
    </section>
  {/if}

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
    <button class="btn-soft py-4" onclick={openCalm}>🌿 Ruhe-Ecke</button>
  </section>

  {#if !active}
    <section class="card text-center">
      <p class="mb-3 text-ink-soft">Noch kein Profil angelegt.</p>
      <button class="btn-primary" onclick={() => route.go("me")}>Profil anlegen</button>
    </section>
  {/if}
</div>
