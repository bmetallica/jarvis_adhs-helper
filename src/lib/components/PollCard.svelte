<script lang="ts">
  import type { Poll } from "$lib/types";
  import { polls, tally } from "$lib/stores/polls";
  import { settings } from "$lib/stores/settings";
  import { profiles } from "$lib/stores/profiles";
  import { dateShort, hhmm } from "$lib/date";

  interface Props {
    poll: Poll;
  }
  let { poll }: Props = $props();

  const meId = $derived($settings.activeProfileId);
  const canVote = $derived(poll.status === "open" && (poll.voterIds.length === 0 || (meId != null && poll.voterIds.includes(meId))));
  const myVote = $derived(meId ? (poll.votes[meId] ?? []) : []);
  const counts = $derived(tally(poll));
  const totalVotes = $derived(Object.values(counts).reduce((a, b) => a + b, 0));
  const isCreator = $derived(poll.createdById === meId);

  function nameOf(id: string) {
    return $profiles.find((p) => p.id === id)?.name ?? "?";
  }

  function pick(optId: string) {
    if (!canVote) return;
    if (poll.allowMulti) {
      const set = new Set(myVote);
      set.has(optId) ? set.delete(optId) : set.add(optId);
      polls.vote(poll.id, [...set]);
    } else {
      polls.vote(poll.id, [optId]);
    }
  }

  const statusLabel: Record<Poll["status"], string> = {
    open: "offen",
    closed: "geschlossen",
    confirmed: "bestätigt ✅",
    declined: "abgelehnt",
  };
</script>

<div class="card">
  <div class="mb-1 flex items-start justify-between gap-2">
    <p class="font-bold">{poll.kind === "appointment" ? "📅" : "🗳️"} {poll.question}</p>
    <span class="chip {poll.status === 'confirmed' ? 'text-calm' : poll.status === 'declined' ? 'text-gentle' : ''}">{statusLabel[poll.status]}</span>
  </div>
  <p class="mb-2 text-xs text-ink-faint">von {poll.createdByName}</p>

  {#if poll.kind === "appointment" && poll.appointment}
    <p class="mb-1 text-sm">🕒 {dateShort(poll.appointment.startsAt)} · {hhmm(poll.appointment.startsAt)} Uhr</p>
    {#if poll.note}
      <p class="mb-2 rounded-xl bg-gentle/10 px-3 py-2 text-sm text-gentle">⚠️ {poll.note}</p>
    {/if}
  {/if}

  <!-- Optionen -->
  <div class="flex flex-col gap-1.5">
    {#each poll.options as opt (opt.id)}
      {@const c = counts[opt.id] ?? 0}
      {@const pct = totalVotes ? Math.round((c / totalVotes) * 100) : 0}
      <button
        class="relative overflow-hidden rounded-xl px-3 py-2 text-left transition-colors
          {myVote.includes(opt.id) ? 'ring-2 ring-calm' : ''} {canVote ? 'bg-surface-2 hover:bg-surface-3' : 'bg-surface-2'}"
        disabled={!canVote}
        onclick={() => pick(opt.id)}
      >
        <div class="absolute inset-y-0 left-0 bg-calm/15" style="width:{pct}%"></div>
        <div class="relative flex justify-between">
          <span>{myVote.includes(opt.id) ? "● " : ""}{opt.text}</span>
          <span class="text-sm text-ink-faint">{c}{totalVotes ? ` · ${pct}%` : ""}</span>
        </div>
      </button>
    {/each}
  </div>

  <!-- Wer fehlt noch -->
  {#if poll.status === "open" && poll.voterIds.length}
    {@const pending = poll.voterIds.filter((id) => !(poll.votes[id]?.length))}
    {#if pending.length}
      <p class="mt-2 text-xs text-ink-faint">wartet auf: {pending.map(nameOf).join(", ")}</p>
    {/if}
  {/if}

  {#if isCreator && poll.status === "open"}
    <div class="mt-3 flex gap-2">
      {#if poll.kind === "poll"}
        <button class="btn-ghost px-3 py-1 text-sm" onclick={() => polls.close(poll.id)}>schließen</button>
      {/if}
      <button class="btn-ghost px-3 py-1 text-sm text-ink-faint" onclick={() => polls.remove(poll.id)}>löschen</button>
    </div>
  {:else if isCreator}
    <button class="btn-ghost mt-2 px-3 py-1 text-sm text-ink-faint" onclick={() => polls.remove(poll.id)}>entfernen</button>
  {/if}
</div>
