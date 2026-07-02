<script lang="ts">
  // Familien-Hauptquartier (Wand-Tablet). Großer Wochenkalender (Termine + Essen), „Jetzt dran",
  // Familienchat. Tierwesen klein unten rechts. Aus Distanz lesbar.
  import { pet } from "$lib/stores/pet";
  import { timers } from "$lib/stores/timers";
  import { tasks } from "$lib/stores/tasks";
  import { messages } from "$lib/stores/messages";
  import { settings } from "$lib/stores/settings";
  import { appointments } from "$lib/stores/appointments";
  import { now } from "$lib/stores/clock";
  import { wsConnected } from "$lib/jarvis/events";
  import { stageFor } from "$lib/pet";
  import { route } from "$lib/router";
  import { hhmm, leaveTime, relativeWhen } from "$lib/date";
  import { attention } from "$lib/attention";
  import { windDownActive } from "$lib/winddown";
  import { acquireWakeLock } from "$lib/wakelock";
  import PetCanvas from "$lib/components/PetCanvas.svelte";
  import TimerView from "$lib/components/TimerView.svelte";
  import WeekCalendar from "$lib/components/WeekCalendar.svelte";

  const running = $derived($timers.filter((t) => t.status === "running"));
  const openToday = $derived([...$tasks].filter((t) => t.today && !t.done).sort((a, b) => a.order - b.order));
  const recentMsgs = $derived($messages.slice(-6));

  // Heutige Termine mit Losgeh-Zeit — die wichtigste Info an der Küchenwand.
  const todayAppts = $derived(
    [...$appointments]
      .filter((a) => a.startsAt > $now - 30 * 60000 && new Date(a.startsAt).toDateString() === new Date($now).toDateString())
      .sort((a, b) => a.startsAt - b.startsAt)
      .slice(0, 4),
  );
  const leaveAt = (a: (typeof todayAppts)[number]) => leaveTime(a.startsAt, a.travelMin + (a.prepMin ?? 0), a.bufferMin);

  // Rotierender Ticker: „braucht Aufmerksamkeit" wechselt alle 8 s durch.
  let tick = $state(0);
  $effect(() => {
    const id = setInterval(() => (tick += 1), 8000);
    return () => clearInterval(id);
  });
  const ticker = $derived($attention.length ? $attention[tick % $attention.length] : null);

  // Nacht-Dimmen: ab Wind-down (oder 22:00 als Default) sanft abdunkeln.
  const dimmed = $derived(
    windDownActive($now, $settings.windDownStart || "22:00"),
  );

  let chatText = $state("");
  async function sendChat() {
    if (!chatText.trim()) return;
    await messages.post(chatText, "chat");
    chatText = "";
  }

  // Display dauerhaft wach halten (Wand-Tablet); re-acquire nach Tab-Wechsel inklusive.
  $effect(() => acquireWakeLock());
</script>

<div
  class="fixed inset-0 z-40 flex flex-col gap-3 overflow-y-auto bg-surface-0 p-4 transition-[filter] duration-1000"
  style={dimmed ? "filter: brightness(0.55)" : ""}
>
  <!-- Kopf -->
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Familien-Hauptquartier <span class="ml-2 text-lg font-normal text-ink-faint">{hhmm($now)} Uhr{dimmed ? " · 🌙" : ""}</span></h1>
    <div class="flex items-center gap-3">
      <span class="chip">{$wsConnected ? "🟢 live" : "⚪ lokal"}</span>
      <button class="btn-soft" onclick={() => route.go("home")}>✕ Beenden</button>
    </div>
  </div>

  <!-- Rotierender Aufmerksamkeits-Ticker -->
  {#if ticker}
    <div class="card flex items-center gap-3 border border-joy/40 py-2.5">
      <span class="text-xl">{ticker.icon}</span>
      <span class="flex-1 text-lg">{ticker.text}</span>
      {#if $attention.length > 1}<span class="chip">{(tick % $attention.length) + 1}/{$attention.length}</span>{/if}
    </div>
  {/if}

  <!-- Heutige Termine mit Losgeh-Zeit -->
  {#if todayAppts.length}
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {#each todayAppts as a (a.id)}
        <div class="card py-2.5 {$now >= leaveAt(a) && $now < a.startsAt ? 'border-2 border-gentle' : ''}">
          <p class="truncate font-bold">{a.icon} {a.title}</p>
          <p class="text-sm text-ink-soft">
            {hhmm(a.startsAt)} Uhr
            {#if a.travelMin + (a.prepMin ?? 0) + a.bufferMin > 0}
              · 🚪 {$now >= leaveAt(a) ? "jetzt losmachen!" : `losmachen ${hhmm(leaveAt(a))}`}
            {/if}
          </p>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Wochenkalender (groß) -->
  <section>
    <h2 class="mb-2 text-sm font-bold text-ink-faint">Diese Woche</h2>
    <WeekCalendar />
  </section>

  <!-- Untere Reihe: Jetzt dran + Familienchat -->
  <div class="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
    <!-- Jetzt dran + Timer -->
    <section class="flex flex-col gap-3">
      {#if running.length}
        <div class="card flex flex-wrap justify-around gap-4">
          {#each running.slice(0, 3) as t (t.id)}
            <TimerView timer={t} size={130} compact />
          {/each}
        </div>
      {/if}
      <div class="card flex-1">
        <p class="mb-2 text-lg font-bold">Jetzt dran</p>
        {#if openToday.length}
          <ul class="flex flex-col gap-2">
            {#each openToday.slice(0, 5) as t, i (t.id)}
              <li class="flex items-center gap-3 rounded-2xl px-3 py-2 {i === 0 ? 'bg-calm/15 text-lg font-bold' : 'bg-surface-2'}">
                <span>{t.icon || (i === 0 ? "🎯" : "•")}</span>
                <span class="truncate">{t.title}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-ink-soft">Nichts geplant — alles ruhig. 🌿</p>
        {/if}
      </div>
    </section>

    <!-- Familienchat -->
    <section class="card flex flex-col">
      <p class="mb-2 text-lg font-bold">💬 Familienchat</p>
      <div class="flex-1 space-y-1.5 overflow-y-auto">
        {#each recentMsgs as m (m.id)}
          {#if m.kind === "chat"}
            <p class="text-sm"><span class="font-semibold">{m.fromAvatar} {m.fromName}:</span> {m.text}</p>
          {:else}
            <p class="text-xs text-ink-faint">{m.fromAvatar} {m.text}</p>
          {/if}
        {/each}
        {#if recentMsgs.length === 0}
          <p class="text-sm text-ink-faint">Noch keine Nachrichten.</p>
        {/if}
      </div>
      <div class="mt-2 flex gap-2">
        <input
          class="flex-1 rounded-2xl bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calm"
          placeholder="Nachricht …"
          bind:value={chatText}
          onkeydown={(e) => e.key === "Enter" && sendChat()}
        />
        <button class="btn-primary px-4" onclick={sendChat}>↑</button>
      </div>
    </section>
  </div>

  <!-- Tier klein unten rechts -->
  <button
    class="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-3xl bg-surface-1/90 p-2 shadow-xl backdrop-blur"
    onclick={() => route.go("pet")}
    aria-label="Zum Tier"
  >
    <PetCanvas pet={$pet} size={72} />
    <div class="pr-2 text-left">
      <p class="text-sm font-bold">{$pet.name}</p>
      <p class="text-[11px] text-ink-faint">{stageFor($pet.xp).title} · 🪙 {$pet.coins}</p>
    </div>
  </button>
</div>
