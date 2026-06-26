<script lang="ts">
  // Empathischer Coach. Streaming-Antwort (SSE) über JARVIS; offline kuratierte De-Eskalations-Karten.
  import { coachStream, aiAvailable, LOCAL_COACH_CARDS } from "$lib/ai";

  interface Props {
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  interface Msg {
    role: "user" | "assistant";
    content: string;
  }
  let messages = $state<Msg[]>([]);
  let input = $state("");
  let busy = $state(false);

  const suggestions = ["Mein Kind verweigert gerade alles.", "Ich krieg nichts auf die Reihe.", "Wie sage ich es ohne Streit?"];

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    input = "";
    messages = [...messages, { role: "user", content }];
    busy = true;

    // Platzhalter-Antwort, die per Stream gefüllt wird.
    let acc = "";
    messages = [...messages, { role: "assistant", content: "…" }];
    const idx = messages.length - 1;

    const history = messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
    await coachStream(history, (s) => {
      acc += (acc ? " " : "") + s;
      messages[idx] = { role: "assistant", content: acc };
    });
    if (!acc) messages[idx] = { role: "assistant", content: "…" };
    busy = false;
  }
</script>

<div class="fixed inset-0 z-50 flex flex-col bg-surface-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
  <header class="flex items-center justify-between border-b border-surface-2 px-4 py-3">
    <div>
      <h2 class="text-lg font-bold">💬 Coach</h2>
      <p class="text-xs text-ink-faint">{aiAvailable() ? "ruhig, ADHS-bewusst" : "offline — kuratierte Tipps"}</p>
    </div>
    <button class="btn-ghost px-2 py-1" onclick={onclose} aria-label="Schließen">✕</button>
  </header>

  <div class="flex-1 overflow-y-auto px-4 py-4">
    {#if messages.length === 0}
      <div class="flex flex-col gap-3">
        <p class="text-ink-soft">Wobei kann ich helfen? Schreib einfach drauflos.</p>
        {#if !aiAvailable()}
          <div class="card text-sm text-ink-faint">
            Keine JARVIS-Verbindung — ich antworte mit kuratierten De-Eskalations-Tipps. Volle
            Gespräche gibt es, sobald die Verbindung steht (Ich → JARVIS-Verbindung).
          </div>
        {/if}
        <div class="flex flex-col gap-2">
          {#each suggestions as s (s)}
            <button class="btn-soft text-left" onclick={() => send(s)}>{s}</button>
          {/each}
        </div>
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#each messages as m (m)}
          <div class="flex {m.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div
              class="max-w-[85%] rounded-2xl px-4 py-2.5 {m.role === 'user' ? 'bg-calm text-surface-0' : 'bg-surface-2 text-ink'}"
            >
              {m.content}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="border-t border-surface-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
    <div class="flex items-end gap-2">
      <textarea
        rows="1"
        bind:value={input}
        placeholder="Schreiben …"
        class="flex-1 resize-none rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm"
        onkeydown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(input);
          }
        }}
      ></textarea>
      <button class="btn-primary" disabled={busy || !input.trim()} onclick={() => send(input)}>
        {busy ? "…" : "↑"}
      </button>
    </div>
  </div>
</div>
