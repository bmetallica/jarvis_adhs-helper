<script lang="ts">
  // Wertschätzungs-Feed gegen Negativitäts-Bias & RSD. Bewusste Positiv-Signale wirken stark.
  import { appreciations } from "$lib/stores/family";
  import { messages } from "$lib/stores/messages";
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { successCue } from "$lib/feedback";
  import { relativeWhen } from "$lib/date";

  let toId = $state<string | null>(null);
  let text = $state("");

  const others = $derived($profiles.filter((p) => p.id !== $settings.activeProfileId));

  const prompts = ["Danke, dass du heute …", "Schön war, dass du …", "Ich hab gesehen, dass du …"];

  function nameOf(id: string | null) {
    return $profiles.find((p) => p.id === id)?.name ?? "jemand";
  }
  function avatarOf(id: string | null) {
    return $profiles.find((p) => p.id === id)?.avatar ?? "💛";
  }

  async function send() {
    if (!text.trim()) return;
    await appreciations.add($settings.activeProfileId, toId, text);
    // Aufs Familien-Board, damit es die Person auch erreicht (geräteübergreifend).
    const toName = toId ? nameOf(toId) : null;
    await messages.post(`💛 ${toName ? `An ${toName}: ` : ""}${text.trim()}`, "appreciation", {
      name: nameOf($settings.activeProfileId),
      avatar: avatarOf($settings.activeProfileId),
    });
    successCue();
    text = "";
  }
</script>

<div class="flex flex-col gap-4">
  <div class="card">
    <h2 class="mb-1 text-lg font-bold">Wertschätzung 💛</h2>
    <p class="mb-3 text-sm text-ink-faint">Ein kleines Danke pro Tag verändert viel.</p>

    {#if others.length}
      <div class="mb-2 flex flex-wrap gap-2">
        <span class="text-sm text-ink-soft">an:</span>
        {#each others as p (p.id)}
          <button
            class="chip {toId === p.id ? 'bg-calm text-surface-0' : ''}"
            onclick={() => (toId = toId === p.id ? null : p.id)}
          >
            {p.avatar} {p.name}
          </button>
        {/each}
      </div>
    {/if}

    <textarea
      rows="2"
      bind:value={text}
      placeholder={prompts[0]}
      class="w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
    ></textarea>
    <div class="mt-2 flex flex-wrap gap-1">
      {#each prompts as p (p)}
        <button class="chip" onclick={() => (text = p)}>{p}</button>
      {/each}
    </div>
    <button class="btn-primary mt-3 w-full" onclick={send} disabled={!text.trim()}>Senden</button>
  </div>

  <!-- Feed -->
  <div class="flex flex-col gap-2">
    {#each $appreciations as a (a.id)}
      <div class="card">
        <p class="text-ink">{a.text}</p>
        <p class="mt-1 text-xs text-ink-faint">
          {avatarOf(a.fromId)} {nameOf(a.fromId)}
          {#if a.toId}→ {avatarOf(a.toId)} {nameOf(a.toId)}{/if}
          · {relativeWhen(a.createdAt)}
        </p>
      </div>
    {/each}
    {#if $appreciations.length === 0}
      <div class="card text-center text-ink-soft">Noch nichts. Der erste Dank fällt am schwersten — und wirkt am meisten. 🌿</div>
    {/if}
  </div>
</div>
