<script lang="ts">
  // „Wo ist …?" — Such-Gedächtnis. Merken (Satz sprechen/tippen) + Finden (Frage → letzter passender Satz).
  import { locations } from "$lib/stores/locations";
  import { transcribe } from "$lib/ai";
  import { relativeWhen } from "$lib/date";
  import { pushToast } from "$lib/notify";

  interface Props {
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  let mode = $state<"find" | "remember">("find");
  let rememberText = $state("");
  let query = $state("");
  let recording = $state(false);
  let rec: MediaRecorder | null = null;
  let chunks: Blob[] = [];

  const micPossible = typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;
  const results = $derived(query.trim() ? locations.search(query) : []);

  async function save() {
    if (!rememberText.trim()) return;
    await locations.remember(rememberText);
    pushToast("Gemerkt ✓", "Du findest es jederzeit unter „Wo ist …?“.");
    rememberText = "";
    mode = "find";
  }

  async function toggleVoice() {
    if (recording) {
      rec?.stop();
      return;
    }
    if (!micPossible) {
      pushToast("Mikrofon braucht HTTPS", "Bitte tippen.");
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
        const text = await transcribe(new Blob(chunks, { type: rec?.mimeType || "audio/webm" }));
        if (text) rememberText = rememberText ? `${rememberText} ${text}` : text;
        else pushToast("Transkription nicht möglich", "Keine JARVIS-Verbindung?");
      };
      rec.start();
      recording = true;
    } catch {
      recording = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
  <button class="absolute inset-0" aria-label="Schließen" onclick={onclose}></button>
  <div class="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-surface-1 p-5 sm:rounded-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold">🔎 Wo ist …?</h2>
      <button class="btn-ghost px-2 py-1" onclick={onclose} aria-label="Schließen">✕</button>
    </div>

    <div class="mb-4 flex gap-1 rounded-2xl bg-surface-2 p-1">
      <button class="flex-1 rounded-xl px-3 py-2 text-sm font-semibold {mode === 'find' ? 'bg-calm text-surface-0' : 'text-ink-soft'}" onclick={() => (mode = 'find')}>Finden</button>
      <button class="flex-1 rounded-xl px-3 py-2 text-sm font-semibold {mode === 'remember' ? 'bg-calm text-surface-0' : 'text-ink-soft'}" onclick={() => (mode = 'remember')}>Merken</button>
    </div>

    {#if mode === "find"}
      <input
        class="w-full rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
        placeholder="Was suchst du? (z. B. Zeugnis, Schlüssel, Rezept)"
        bind:value={query}
      />
      <div class="mt-3 flex flex-col gap-2">
        {#each results as n (n.id)}
          <div class="card flex items-start gap-3 py-3">
            <span class="text-lg">📍</span>
            <div class="flex-1">
              <p class="text-ink">{n.text}</p>
              <p class="mt-1 text-xs text-ink-faint">{relativeWhen(n.createdAt)}</p>
            </div>
            <button class="btn-ghost px-2 py-1 text-xs text-ink-faint" onclick={() => locations.forget(n.id)}>nicht mehr dort</button>
          </div>
        {/each}
        {#if query.trim() && results.length === 0}
          <p class="text-center text-sm text-ink-faint">Dazu ist nichts gemerkt. Leg es unter „Merken" ab.</p>
        {/if}
      </div>
    {:else}
      <p class="mb-2 text-sm text-ink-faint">Sag/tippe einen ganzen Satz — so wie du ihn dir später fragen würdest.</p>
      <textarea
        rows="3"
        class="w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
        placeholder="z. B. Lukas’ Zeugnis liegt im obersten Fach im Kleiderschrank."
        bind:value={rememberText}
      ></textarea>
      <div class="mt-2 flex gap-2">
        <button class="btn-soft flex-1 {recording ? 'bg-gentle text-surface-0' : ''}" onclick={toggleVoice}>{recording ? "⏹ Stopp" : "🎤 Sprechen"}</button>
        <button class="btn-primary flex-1" onclick={save} disabled={!rememberText.trim()}>Merken</button>
      </div>
    {/if}
  </div>
</div>
