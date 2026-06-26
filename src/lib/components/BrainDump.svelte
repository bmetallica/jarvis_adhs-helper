<script lang="ts">
  // Brain-Dump: 1-Tap-Erfassung. Gedanke sichern, bevor er verdampft. Null Reibung.
  import { inbox } from "$lib/stores/inbox";
  import { settings } from "$lib/stores/settings";
  import { successCue } from "$lib/feedback";
  import { pushToast } from "$lib/notify";

  interface Props {
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  let text = $state("");
  let recording = $state(false);
  let saved = $state(false);
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let textarea = $state<HTMLTextAreaElement | null>(null);

  // Mikrofon braucht einen sicheren Kontext (HTTPS oder localhost). Über http://IP blockiert
  // der Browser getUserMedia → Sprachnotiz nicht möglich.
  const micPossible =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    (typeof window === "undefined" || window.isSecureContext);

  $effect(() => {
    textarea?.focus();
  });

  async function saveText() {
    if (!text.trim()) return;
    await inbox.capture({ text, kind: "text", profileId: $settings.activeProfileId });
    successCue();
    flashSaved();
    text = "";
  }

  function flashSaved() {
    saved = true;
    setTimeout(() => {
      saved = false;
      onclose();
    }, 700);
  }

  async function toggleVoice() {
    if (recording) {
      mediaRecorder?.stop();
      return;
    }
    if (!micPossible) {
      pushToast("Mikrofon braucht HTTPS", "Über http://IP sperrt der Browser das Mikro. Tippe einfach – oder den Server mit Zertifikat starten (HTTPS).");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || "audio/webm" });
        await inbox.capture({
          text: "🎤 Sprachnotiz (Transkription folgt)",
          kind: "voice",
          audio: blob,
          profileId: $settings.activeProfileId,
        });
        recording = false;
        successCue();
        flashSaved();
      };
      mediaRecorder.start();
      recording = true;
    } catch {
      recording = false;
      // Kein Mikrofon/Erlaubnis — still bleiben, Text-Eingabe genügt.
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
  <button class="absolute inset-0" aria-label="Schließen" onclick={onclose}></button>
  <div
    class="relative w-full max-w-xl rounded-t-3xl bg-surface-1 p-5 shadow-2xl sm:rounded-3xl
      pb-[max(1.25rem,env(safe-area-inset-bottom))]"
  >
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-lg font-bold">💡 Schnell festhalten</h2>
      <button class="btn-ghost px-2 py-1" onclick={onclose} aria-label="Schließen">✕</button>
    </div>

    {#if saved}
      <p class="py-8 text-center text-lg font-semibold text-joy">Gesichert ✓</p>
    {:else}
      <textarea
        bind:this={textarea}
        bind:value={text}
        rows="3"
        placeholder="Was geht dir durch den Kopf? (kein Sortieren nötig)"
        class="w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 text-ink
          placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
        onkeydown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && saveText()}
      ></textarea>

      <div class="mt-3 flex items-center gap-2">
        <button
          class="btn-soft flex-1 {recording ? 'bg-gentle text-surface-0' : ''} {micPossible ? '' : 'opacity-50'}"
          onclick={toggleVoice}
        >
          {recording ? "⏹ Aufnahme stoppen" : "🎤 Sprechen"}
        </button>
        <button class="btn-primary flex-1" onclick={saveText} disabled={!text.trim()}>
          Sichern
        </button>
      </div>
      {#if recording}
        <p class="mt-2 animate-pulse text-center text-sm text-gentle">● nimmt auf …</p>
      {:else if !micPossible}
        <p class="mt-2 text-center text-xs text-ink-faint">🎤 Sprachnotiz braucht HTTPS (siehe DEPLOY.md). Tippen geht immer.</p>
      {/if}
    {/if}
  </div>
</div>
