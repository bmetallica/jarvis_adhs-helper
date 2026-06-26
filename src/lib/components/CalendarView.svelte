<script lang="ts">
  // Ruhige Kalender-Ansicht: Heute / Morgen / Diese Woche / Später als Listen großer Karten.
  // Kein überladenes Monatsraster (ADHS-gerecht).
  import type { Appointment } from "$lib/types";
  import { appointments, newChecklist } from "$lib/stores/appointments";
  import { settings } from "$lib/stores/settings";
  import { now } from "$lib/stores/clock";
  import { sleepsUntil } from "$lib/date";
  import { parseAppointment, aiAvailable } from "$lib/ai";
  import { pushToast } from "$lib/notify";
  import AppointmentCard from "./AppointmentCard.svelte";
  import AppointmentForm from "./AppointmentForm.svelte";

  let showForm = $state(false);
  let editing = $state<Appointment | null>(null);
  let quickText = $state("");
  let parsing = $state(false);

  async function quickAdd() {
    if (!quickText.trim() || parsing) return;
    parsing = true;
    const p = await parseAppointment(quickText);
    if (p.startsAt) {
      await appointments.add({
        title: p.title,
        icon: "🗓️",
        startsAt: p.startsAt,
        travelMin: p.travelMin,
        bufferMin: 10,
        companionId: null,
        prep: newChecklist(p.prep),
        reminderOffsetsMin: [1440, 120],
        recurrence: "none",
        notes: "",
        profileId: $settings.activeProfileId,
      });
      pushToast("Termin angelegt ✓", p.title);
      quickText = "";
    } else {
      // Zeit nicht erkannt → Formular vorbefüllt öffnen wäre ideal; hier Hinweis + Formular.
      pushToast("Zeit nicht erkannt", "Bitte im Formular ergänzen.");
      openNew();
    }
    parsing = false;
  }

  function openNew() {
    editing = null;
    showForm = true;
  }
  function openEdit(a: Appointment) {
    editing = a;
    showForm = true;
  }

  // Vergangene (heute, schon vorbei) ausblenden außer am selben Tag.
  const upcoming = $derived(
    [...$appointments]
      .filter((a) => a.startsAt > $now - 2 * 3600_000)
      .sort((a, b) => a.startsAt - b.startsAt),
  );

  function group(a: Appointment): string {
    const s = sleepsUntil(a.startsAt, $now);
    if (s <= 0) return "Heute";
    if (s === 1) return "Morgen";
    if (s <= 7) return "Diese Woche";
    return "Später";
  }

  const groups = $derived(["Heute", "Morgen", "Diese Woche", "Später"].map((g) => ({
    name: g,
    items: upcoming.filter((a) => group(a) === g),
  })));
</script>

<div class="flex flex-col gap-4">
  <!-- Schnell per Sprache/Text: „Logopädie Lukas Dienstag 15 Uhr, 30 min Fahrt" -->
  <div class="rounded-2xl bg-surface-1 p-3">
    <div class="flex gap-2">
      <input
        class="flex-1 rounded-2xl bg-surface-2 px-4 py-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
        placeholder="✨ „Zahnarzt Mama Do 14 Uhr, 20 min Fahrt"
        bind:value={quickText}
        onkeydown={(e) => e.key === "Enter" && quickAdd()}
      />
      <button class="btn-primary" onclick={quickAdd} disabled={parsing || !quickText.trim()}>
        {parsing ? "…" : "+"}
      </button>
    </div>
    <p class="mt-1 text-xs text-ink-faint">{aiAvailable() ? "JARVIS erkennt Datum & Vorlauf" : "Tipp: per Formular unten genau eintragen"}</p>
  </div>

  <button class="btn-soft w-full" onclick={openNew}>+ Termin im Formular</button>

  {#if upcoming.length === 0}
    <div class="card text-center text-ink-soft">
      Keine anstehenden Termine. Lege oben einen an — mit Vorlaufzeit, damit du rechtzeitig
      losmachst.
    </div>
  {:else}
    {#each groups as g (g.name)}
      {#if g.items.length}
        <section class="flex flex-col gap-2">
          <h3 class="px-1 text-sm font-bold text-ink-faint">{g.name}</h3>
          {#each g.items as a (a.id)}
            <AppointmentCard appointment={a} onedit={openEdit} />
          {/each}
        </section>
      {/if}
    {/each}
  {/if}
</div>

{#if showForm}
  <AppointmentForm appointment={editing} onclose={() => (showForm = false)} />
{/if}
