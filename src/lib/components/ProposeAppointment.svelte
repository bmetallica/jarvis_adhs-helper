<script lang="ts">
  // Termin vorschlagen (manuell oder per Sprache). Prüft Konflikte im Familienkalender und sendet
  // bei Bedarf eine Abstimmung (Ja/Nein) an die Eingeladenen. Bei Zustimmung wird der Termin angelegt.
  import { polls, conflictsFor } from "$lib/stores/polls";
  import { appointments, newChecklist } from "$lib/stores/appointments";
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { parseAppointment, transcribe, aiAvailable } from "$lib/ai";
  import { toLocalInput, fromLocalInput, dateShort, hhmm } from "$lib/date";
  import { pushToast } from "$lib/notify";

  interface Props {
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  let title = $state("");
  let icon = $state("🗓️");
  let when = $state(toLocalInput(defaultStart()));
  let durationMin = $state(60);
  let travelMin = $state(15);
  let invitees = $state<string[]>($profiles.filter((p) => p.id !== $settings.activeProfileId).map((p) => p.id));
  let freeText = $state("");
  let parsing = $state(false);
  let recording = $state(false);
  let rec: MediaRecorder | null = null;
  let chunks: Blob[] = [];

  const micPossible = typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

  function defaultStart(): number {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.getTime();
  }

  const startsAt = $derived(fromLocalInput(when));
  const conflicts = $derived(conflictsFor(startsAt, durationMin));

  function toggleInvitee(id: string) {
    invitees = invitees.includes(id) ? invitees.filter((x) => x !== id) : [...invitees, id];
  }

  async function applyParse(textIn: string) {
    if (!textIn.trim()) return;
    parsing = true;
    const p = await parseAppointment(textIn);
    if (p.title) title = p.title;
    if (p.startsAt) when = toLocalInput(p.startsAt);
    if (p.travelMin) travelMin = p.travelMin;
    parsing = false;
  }

  async function toggleVoice() {
    if (recording) {
      rec?.stop();
      return;
    }
    if (!micPossible) {
      pushToast("Mikrofon braucht HTTPS", "Bitte den Termin tippen.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        recording = false;
        const blob = new Blob(chunks, { type: rec?.mimeType || "audio/webm" });
        const text = await transcribe(blob);
        if (text) {
          freeText = text;
          await applyParse(text);
        } else {
          pushToast("Transkription nicht möglich", "Keine JARVIS-Verbindung?");
        }
      };
      rec.start();
      recording = true;
    } catch {
      recording = false;
    }
  }

  async function send() {
    if (!title.trim()) return;
    // Ohne Eingeladene direkt in den Kalender (keine Abstimmung nötig).
    if (invitees.length === 0) {
      await appointments.add({
        title: title.trim(),
        icon,
        startsAt,
        travelMin,
        bufferMin: 10,
        companionId: null,
        prep: newChecklist([]),
        reminderOffsetsMin: [1440, 120],
        recurrence: "none",
        notes: "",
        profileId: $settings.activeProfileId,
      });
      pushToast("Termin angelegt ✓", title.trim());
      onclose();
      return;
    }
    const note = conflicts.length
      ? `Zu der Zeit ist schon eingetragen: ${conflicts.map((c) => `${c.title} (${hhmm(c.startsAt)})`).join(", ")}`
      : "";
    await polls.createAppointmentPoll({ title: title.trim(), icon, startsAt, durationMin, travelMin, inviteeIds: invitees, note });
    pushToast("Termin-Anfrage gesendet", "Die Familie wird gefragt.");
    onclose();
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
  <button class="absolute inset-0" aria-label="Schließen" onclick={onclose}></button>
  <div class="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-surface-1 p-5 sm:rounded-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold">Termin vorschlagen</h2>
      <button class="btn-ghost px-2 py-1" onclick={onclose} aria-label="Schließen">✕</button>
    </div>

    <!-- Sprache/Text -->
    <div class="mb-3 rounded-2xl bg-surface-2 p-3">
      <p class="mb-1 text-sm font-semibold">🎤 Beschreiben {aiAvailable() ? "" : "(braucht JARVIS)"}</p>
      <textarea rows="2" class="w-full resize-none rounded-xl bg-surface-3 px-3 py-2 text-sm focus:outline-none" placeholder="z. B. Pfadfinder-Treffen am 15. Juli um 19 Uhr, 30 min Fahrt" bind:value={freeText}></textarea>
      <div class="mt-2 flex gap-2">
        <button class="btn-soft flex-1 {recording ? 'bg-gentle text-surface-0' : ''}" onclick={toggleVoice}>{recording ? "⏹ Stopp" : "🎤 Sprechen"}</button>
        <button class="btn-soft flex-1" onclick={() => applyParse(freeText)} disabled={parsing || !freeText.trim()}>{parsing ? "…" : "✨ Erkennen"}</button>
      </div>
    </div>

    <!-- Felder -->
    <div class="flex flex-col gap-3">
      <div class="flex gap-2">
        <input class="w-16 rounded-2xl bg-surface-2 px-3 py-3 text-center text-2xl focus:outline-none" bind:value={icon} maxlength="2" aria-label="Symbol" />
        <input class="flex-1 rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Titel" bind:value={title} />
      </div>
      <label class="text-sm text-ink-soft">Wann?
        <input type="datetime-local" class="mt-1 w-full rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" bind:value={when} />
      </label>
      <div class="flex gap-3">
        <label class="flex-1 text-sm text-ink-soft">Dauer (min)
          <input type="number" min="15" step="15" class="mt-1 w-full rounded-xl bg-surface-2 px-3 py-2 focus:outline-none" bind:value={durationMin} />
        </label>
        <label class="flex-1 text-sm text-ink-soft">Vorlauf (min)
          <input type="number" min="0" class="mt-1 w-full rounded-xl bg-surface-2 px-3 py-2 focus:outline-none" bind:value={travelMin} />
        </label>
      </div>

      <!-- Konflikt-Hinweis -->
      {#if conflicts.length}
        <div class="rounded-2xl bg-gentle/10 p-3 text-sm text-gentle">
          ⚠️ Zu der Zeit ist schon eingetragen:
          {#each conflicts as c (c.startsAt + c.title)}
            <span class="block">• {c.title} ({dateShort(c.startsAt)} {hhmm(c.startsAt)} Uhr)</span>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-calm">✓ Im Familienkalender ist die Zeit frei.</p>
      {/if}

      <!-- Eingeladene -->
      <div>
        <p class="mb-1 text-sm text-ink-soft">Wen fragen?</p>
        <div class="flex flex-wrap gap-2">
          {#each $profiles.filter((p) => p.id !== $settings.activeProfileId) as p (p.id)}
            <button class="chip {invitees.includes(p.id) ? 'bg-calm text-surface-0' : ''}" onclick={() => toggleInvitee(p.id)}>
              {p.avatar} {p.name}
            </button>
          {/each}
        </div>
      </div>

      <div class="mt-2 flex gap-2">
        <button class="btn-ghost flex-1" onclick={onclose}>Abbrechen</button>
        <button class="btn-primary flex-1" onclick={send} disabled={!title.trim()}>
          {invitees.length ? "Anfrage senden" : "Termin anlegen"}
        </button>
      </div>
    </div>
  </div>
</div>
