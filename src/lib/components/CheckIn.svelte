<script lang="ts">
  // Stimmung / Energie / Fokus in 3 Taps. Für sich selbst, nie als Bewertung.
  import { checkins } from "$lib/stores/checkins";
  import { settings } from "$lib/stores/settings";
  import { profiles } from "$lib/stores/profiles";
  import { pet } from "$lib/stores/pet";
  import { XP } from "$lib/pet";
  import { diaryLog } from "$lib/ai";

  let mood = $state(3);
  let energy = $state(3);
  let focus = $state(3);
  let saved = $state(false);

  const scales = [
    { key: "mood" as const, label: "Stimmung", emojis: ["😞", "🙁", "😐", "🙂", "😄"] },
    { key: "energy" as const, label: "Energie", emojis: ["🪫", "😴", "😐", "🙂", "⚡"] },
    { key: "focus" as const, label: "Fokus", emojis: ["🌫️", "😵‍💫", "😐", "🎯", "🔆"] },
  ];

  function val(key: "mood" | "energy" | "focus") {
    return key === "mood" ? mood : key === "energy" ? energy : focus;
  }
  function set(key: "mood" | "energy" | "focus", v: number) {
    if (key === "mood") mood = v;
    else if (key === "energy") energy = v;
    else focus = v;
  }

  let note = $state("");

  async function save() {
    await checkins.record({ mood, energy, focus, profileId: $settings.activeProfileId });
    await pet.award(XP.checkin, $settings.activeProfileId);
    // Optional ins RAG-Tagebuch (nur wenn verbunden) — pro Nutzer namespaced.
    const who = $profiles.find((p) => p.id === $settings.activeProfileId)?.name ?? "jemand";
    void diaryLog(
      `Check-in ${who}: Stimmung ${mood}/5, Energie ${energy}/5, Fokus ${focus}/5.${note.trim() ? " " + note.trim() : ""}`,
      { type: "checkin", mood, energy, focus },
    );
    note = "";
    saved = true;
    setTimeout(() => (saved = false), 1500);
  }
</script>

<div class="card">
  <h2 class="mb-1 text-lg font-bold">Wie geht's gerade?</h2>
  <p class="mb-4 text-sm text-ink-faint">Drei Taps — nur für dich.</p>

  {#each scales as s (s.key)}
    <div class="mb-4">
      <p class="mb-1.5 text-sm text-ink-soft">{s.label}</p>
      <div class="flex justify-between gap-1">
        {#each s.emojis as e, i (i)}
          <button
            class="grid h-12 flex-1 place-items-center rounded-2xl text-2xl transition-all
              {val(s.key) === i + 1 ? 'bg-calm scale-105' : 'bg-surface-2'}"
            aria-label="{s.label} {i + 1}"
            onclick={() => set(s.key, i + 1)}
          >
            {e}
          </button>
        {/each}
      </div>
    </div>
  {/each}

  <textarea
    rows="2"
    bind:value={note}
    placeholder="Notiz (optional, z. B. Fokus-Crash gegen 15 Uhr)"
    class="mb-3 w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
  ></textarea>

  <button class="btn-primary w-full" onclick={save}>
    {saved ? "Gespeichert ✓" : "Eintragen"}
  </button>
</div>
