<script lang="ts">
  // Familien-Board: gemeinsamer Chat. Chat-Nachrichten + System-Hinweise (Belohnung/Wertschätzung).
  import { messages } from "$lib/stores/messages";
  import { settings } from "$lib/stores/settings";
  import { relativeWhen } from "$lib/date";

  let text = $state("");

  async function send() {
    if (!text.trim()) return;
    await messages.post(text, "chat");
    text = "";
  }

  function mine(fromId: string | null) {
    return fromId && fromId === $settings.activeProfileId;
  }
</script>

<div class="flex h-[70vh] flex-col gap-3">
  <div class="flex-1 overflow-y-auto rounded-2xl bg-surface-1 p-3">
    {#if $messages.length === 0}
      <p class="py-8 text-center text-sm text-ink-faint">
        Noch keine Nachrichten. Schreibt der Familie etwas Nettes. 💬
      </p>
    {/if}
    <div class="flex flex-col gap-2">
      {#each $messages as m (m.id)}
        {#if m.kind !== "chat"}
          <!-- System-/Hinweis-Eintrag -->
          <div class="mx-auto rounded-full bg-surface-2 px-3 py-1 text-center text-xs text-ink-soft">
            {m.fromAvatar} {m.text}
          </div>
        {:else}
          <div class="flex {mine(m.fromId) ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[80%]">
              {#if !mine(m.fromId)}
                <p class="mb-0.5 ml-1 text-xs text-ink-faint">{m.fromAvatar} {m.fromName}</p>
              {/if}
              <div class="rounded-2xl px-3 py-2 {mine(m.fromId) ? 'bg-calm text-surface-0' : 'bg-surface-2 text-ink'}">
                {m.text}
              </div>
              <p class="mt-0.5 text-right text-[10px] text-ink-faint">{relativeWhen(m.createdAt)}</p>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </div>

  <div class="flex items-end gap-2">
    <textarea
      rows="1"
      bind:value={text}
      placeholder="Nachricht an die Familie …"
      class="flex-1 resize-none rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm"
      onkeydown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      }}
    ></textarea>
    <button class="btn-primary" onclick={send} disabled={!text.trim()}>↑</button>
  </div>
</div>
