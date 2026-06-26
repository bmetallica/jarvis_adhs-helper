<script lang="ts">
  // Posteingang verarbeiten — getrennt vom Erfassen. 1-Tap-Aktionen pro Eintrag.
  import { inbox } from "$lib/stores/inbox";
  import { tasks } from "$lib/stores/tasks";
  import { settings } from "$lib/stores/settings";
  import { transcribe, aiAvailable } from "$lib/ai";
  import { pushToast } from "$lib/notify";
  import type { InboxItem } from "$lib/types";

  const openItems = $derived($inbox.filter((i) => !i.processed));
  let transcribing = $state<string | null>(null);

  async function doTranscribe(it: InboxItem) {
    if (!it.audio) return;
    transcribing = it.id;
    const text = await transcribe(it.audio);
    transcribing = null;
    if (text) {
      await inbox.update({ ...it, text, kind: "voice" });
      pushToast("Transkribiert ✓");
    } else {
      pushToast("Transkription nicht möglich", "Keine JARVIS-Verbindung?");
    }
  }

  async function toTask(it: InboxItem) {
    await tasks.add({ title: it.text, today: true, profileId: it.profileId ?? $settings.activeProfileId });
    await inbox.markProcessed(it.id);
  }

  function playAudio(it: InboxItem) {
    if (!it.audio) return;
    const url = URL.createObjectURL(it.audio);
    const a = new Audio(url);
    void a.play();
    a.onended = () => URL.revokeObjectURL(url);
  }
</script>

<div class="flex flex-col gap-2">
  {#if openItems.length === 0}
    <div class="card text-center text-ink-soft">
      Posteingang leer 🌿 — alles erfasst. Tippe unten rechts auf 💡, um etwas festzuhalten.
    </div>
  {:else}
    {#each openItems as it (it.id)}
      <div class="card flex flex-col gap-3">
        <div class="flex items-start gap-2">
          <span class="text-lg">{it.kind === "voice" ? "🎤" : "💭"}</span>
          <p class="flex-1 text-ink">{it.text}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          {#if it.kind === "voice" && it.audio}
            <button class="btn-soft px-3 py-1.5 text-sm" onclick={() => playAudio(it)}>▶ Anhören</button>
            {#if aiAvailable()}
              <button class="btn-soft px-3 py-1.5 text-sm" onclick={() => doTranscribe(it)} disabled={transcribing === it.id}>
                {transcribing === it.id ? "… " : "📝 Transkribieren"}
              </button>
            {/if}
          {/if}
          <button class="btn-soft px-3 py-1.5 text-sm" onclick={() => toTask(it)}>→ Aufgabe</button>
          <button class="btn-ghost px-3 py-1.5 text-sm" onclick={() => inbox.markProcessed(it.id)}>
            ✓ erledigt
          </button>
          <button class="btn-ghost px-3 py-1.5 text-sm text-ink-faint" onclick={() => inbox.remove(it.id)}>
            verwerfen
          </button>
        </div>
      </div>
    {/each}
  {/if}
</div>
