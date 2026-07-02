<script lang="ts">
  // Kalender-Verbindungen: Abo-URL für native Kalender (Sperrbildschirm!) und Import von
  // Schul-/Vereinskalendern (.ics) in die Termin-Liste.
  import { icsFeedUrl, parseIcs, type IcsEvent } from "$lib/ics";
  import { appointments } from "$lib/stores/appointments";
  import { settings } from "$lib/stores/settings";
  import { pushToast } from "$lib/notify";
  import { dateShort, hhmm } from "$lib/date";

  let feedUrl = $state<string | null>(null);
  let open = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);
  let found = $state<(IcsEvent & { include: boolean })[]>([]);

  $effect(() => {
    if (open && feedUrl === null) void icsFeedUrl().then((u) => (feedUrl = u));
  });

  async function copyUrl() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      pushToast("Abo-Link kopiert", "In der Kalender-App unter ‚Kalender abonnieren' einfügen.");
    } catch {
      /* Anzeige unten reicht */
    }
  }

  function onFile(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    (e.currentTarget as HTMLInputElement).value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const now = Date.now();
      const evs = parseIcs(String(reader.result ?? "")).filter((ev) => ev.startsAt > now);
      found = evs.slice(0, 50).map((ev) => ({ ...ev, include: true }));
      if (!found.length) pushToast("Keine kommenden Termine in der Datei gefunden");
    };
    reader.readAsText(f);
  }

  async function importAll() {
    const chosen = found.filter((f) => f.include);
    for (const ev of chosen) {
      await appointments.add({
        title: ev.title,
        icon: "🗓️",
        startsAt: ev.startsAt,
        travelMin: 15,
        bufferMin: 10,
        companionId: null,
        prep: [],
        reminderOffsetsMin: [1440],
        recurrence: "none",
        notes: "importiert (ICS)",
        profileId: $settings.activeProfileId,
      });
    }
    found = [];
    pushToast(`${chosen.length} Termin(e) importiert 📆`);
  }
</script>

<section class="card">
  <button class="flex w-full items-center justify-between" onclick={() => (open = !open)}>
    <span class="text-lg font-bold">📆 Kalender verbinden (ICS)</span>
    <span class="text-ink-faint">{open ? "▾" : "▸"}</span>
  </button>
  {#if open}
    <div class="mt-3 flex flex-col gap-3">
      <div>
        <p class="mb-1 text-sm font-semibold">Familien-Termine im Handy-Kalender</p>
        {#if feedUrl}
          <p class="mb-2 break-all rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-soft">{feedUrl}</p>
          <button class="btn-soft w-full text-sm" onclick={copyUrl}>Abo-Link kopieren</button>
        {:else}
          <p class="text-xs text-ink-faint">Nur mit dem App-Server (serve.js) verfügbar.</p>
        {/if}
      </div>
      <div class="border-t border-surface-2 pt-3">
        <p class="mb-1 text-sm font-semibold">Schul-/Vereinskalender importieren</p>
        <button class="btn-soft w-full text-sm" onclick={() => fileInput?.click()}>ICS-Datei wählen</button>
        <input type="file" accept=".ics,text/calendar" class="hidden" bind:this={fileInput} onchange={onFile} />
        {#if found.length}
          <ul class="mt-2 flex max-h-60 flex-col gap-1 overflow-y-auto">
            {#each found as f, i (i)}
              <li class="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-1.5 text-sm">
                <input type="checkbox" class="h-4 w-4 accent-calm" bind:checked={f.include} />
                <span class="flex-1">{f.title}</span>
                <span class="text-xs text-ink-faint">{dateShort(f.startsAt)} {hhmm(f.startsAt)}</span>
              </li>
            {/each}
          </ul>
          <button class="btn-primary mt-2 w-full text-sm" onclick={importAll}>Ausgewählte importieren</button>
        {/if}
      </div>
    </div>
  {/if}
</section>
