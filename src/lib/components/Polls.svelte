<script lang="ts">
  // Allgemeine Familien-Abstimmungen + Liste (inkl. Termin-Abstimmungen zum Beantworten).
  import { polls } from "$lib/stores/polls";
  import PollCard from "./PollCard.svelte";

  let showNew = $state(false);
  let question = $state("");
  let opts = $state<string[]>(["", ""]);
  let multi = $state(false);

  function addOpt() {
    opts = [...opts, ""];
  }
  function setOpt(i: number, v: string) {
    opts[i] = v;
    opts = [...opts];
  }
  function removeOpt(i: number) {
    if (opts.length > 2) opts = opts.filter((_, j) => j !== i);
  }
  async function create() {
    const r = await polls.createPoll(question, opts, multi);
    if (r) {
      question = "";
      opts = ["", ""];
      multi = false;
      showNew = false;
    }
  }

  const open = $derived($polls.filter((p) => p.status === "open"));
  const done = $derived($polls.filter((p) => p.status !== "open"));
</script>

<div class="flex flex-col gap-3">
  <button class="btn-primary w-full" onclick={() => (showNew = !showNew)}>+ Neue Abstimmung</button>

  {#if showNew}
    <div class="card flex flex-col gap-2">
      <input class="rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Frage (z. B. Was essen wir Sonntag?)" bind:value={question} />
      <p class="text-sm text-ink-soft">Optionen</p>
      {#each opts as o, i (i)}
        <div class="flex gap-2">
          <input class="flex-1 rounded-xl bg-surface-2 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-calm" placeholder={"Option " + (i + 1)} value={o} oninput={(e) => setOpt(i, e.currentTarget.value)} />
          {#if opts.length > 2}
            <button class="btn-ghost px-2 text-sm text-ink-faint" onclick={() => removeOpt(i)} aria-label="Option entfernen">✕</button>
          {/if}
        </div>
      {/each}
      <button class="btn-soft" onclick={addOpt}>+ Option</button>
      <label class="flex items-center justify-between py-1 text-sm">
        <span>Mehrfachauswahl erlauben</span>
        <input type="checkbox" class="h-5 w-5 accent-calm" bind:checked={multi} />
      </label>
      <button class="btn-primary" onclick={create}>Abstimmung starten</button>
    </div>
  {/if}

  {#each open as p (p.id)}
    <PollCard poll={p} />
  {/each}

  {#if done.length}
    <p class="px-1 pt-2 text-sm font-bold text-ink-faint">Abgeschlossen</p>
    {#each done as p (p.id)}
      <PollCard poll={p} />
    {/each}
  {/if}

  {#if $polls.length === 0 && !showNew}
    <div class="card text-center text-ink-soft">Noch keine Abstimmungen. Frag die Familie etwas. 🗳️</div>
  {/if}
</div>
