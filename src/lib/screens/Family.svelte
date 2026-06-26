<script lang="ts">
  import MessageBoard from "$lib/components/MessageBoard.svelte";
  import Polls from "$lib/components/Polls.svelte";
  import MentalLoad from "$lib/components/MentalLoad.svelte";
  import AppreciationFeed from "$lib/components/AppreciationFeed.svelte";
  import PauseProtocol from "$lib/components/PauseProtocol.svelte";
  import WeeklySync from "$lib/components/WeeklySync.svelte";
  import Reframe from "$lib/components/Reframe.svelte";
  import { polls } from "$lib/stores/polls";

  type Tab = "board" | "polls" | "load" | "wins" | "pause" | "sync" | "reframe";
  let tab = $state<Tab>("board");

  const openPolls = $derived($polls.filter((p) => p.status === "open").length);
  const tabs: { id: Tab; label: string; badge?: number }[] = $derived([
    { id: "board", label: "Board" },
    { id: "polls", label: "Abstimmungen", badge: openPolls },
    { id: "load", label: "Lasten" },
    { id: "wins", label: "Wertschätzung" },
    { id: "pause", label: "Pause" },
    { id: "sync", label: "Wochen-Sync" },
    { id: "reframe", label: "Reframe" },
  ]);
</script>

<div class="flex flex-col gap-4">
  <div class="flex gap-1 overflow-x-auto rounded-2xl bg-surface-1 p-1">
    {#each tabs as t (t.id)}
      <button
        class="relative whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors
          {tab === t.id ? 'bg-calm text-surface-0' : 'text-ink-soft'}"
        onclick={() => (tab = t.id)}
      >
        {t.label}
        {#if t.badge}
          <span class="ml-1 rounded-full bg-joy px-1.5 text-xs text-surface-0">{t.badge}</span>
        {/if}
      </button>
    {/each}
  </div>

  {#if tab === "board"}
    <MessageBoard />
  {:else if tab === "polls"}
    <Polls />
  {:else if tab === "load"}
    <MentalLoad />
  {:else if tab === "wins"}
    <AppreciationFeed />
  {:else if tab === "pause"}
    <PauseProtocol />
  {:else if tab === "sync"}
    <WeeklySync />
  {:else if tab === "reframe"}
    <Reframe />
  {/if}
</div>
