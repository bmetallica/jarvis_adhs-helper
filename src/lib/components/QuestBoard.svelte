<script lang="ts">
  // Familien-Quests: gemeinsames XP-Ziel → gemeinsame Belohnung. Jede Pet-XP jedes Mitglieds
  // zahlt ein. Kooperation statt Ermahnung; die Eltern müssen nicht antreiben.
  import { quests } from "$lib/stores/quests";
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { pushToast } from "$lib/notify";
  import { doneCue } from "$lib/feedback";

  const isParent = $derived(
    ($profiles.find((p) => p.id === $settings.activeProfileId)?.role ?? "parent") === "parent",
  );

  let title = $state("");
  let reward = $state("");
  let goalXp = $state(300);
  let showForm = $state(false);

  const open = $derived($quests.filter((q) => q.status === "open"));
  const done = $derived($quests.filter((q) => q.status === "done"));
  const redeemed = $derived($quests.filter((q) => q.status === "redeemed"));

  async function add() {
    if (!title.trim() || goalXp <= 0) return;
    await quests.add(title, "🏆", goalXp, reward);
    title = "";
    reward = "";
    showForm = false;
    pushToast("Familien-Quest gestartet 🏆", "Alle Punkte der Familie zahlen jetzt ein.");
  }

  async function redeem(id: string) {
    await quests.redeem(id);
    doneCue();
    pushToast("Quest eingelöst! 🎉", "Zeit für die gemeinsame Belohnung.");
  }
</script>

<div class="flex flex-col gap-4">
  <section class="card">
    <h2 class="mb-1 text-lg font-bold">🏆 Familien-Quests</h2>
    <p class="mb-3 text-sm text-ink-faint">
      Ein gemeinsames Ziel — alle Punkte (Aufgaben, Routinen, Timer) zahlen ein. Geschafft =
      gemeinsame Belohnung.
    </p>

    {#each open as q (q.id)}
      <div class="mb-3 rounded-2xl bg-surface-2 p-3">
        <div class="flex items-center justify-between">
          <p class="font-semibold">{q.icon} {q.title}</p>
          <span class="text-sm text-ink-faint">{q.progressXp}/{q.goalXp} XP</span>
        </div>
        <div class="mt-2 h-3 overflow-hidden rounded-full bg-surface-3">
          <div class="h-full rounded-full bg-calm transition-all" style="width:{Math.min(100, (q.progressXp / q.goalXp) * 100)}%"></div>
        </div>
        {#if q.reward}<p class="mt-1.5 text-xs text-ink-faint">Belohnung: {q.reward}</p>{/if}
      </div>
    {/each}

    {#each done as q (q.id)}
      <div class="mb-3 rounded-2xl border-2 border-joy/50 bg-surface-2 p-3">
        <p class="font-semibold">🎉 {q.title} — geschafft!</p>
        {#if q.reward}<p class="mt-1 text-sm">Belohnung: <strong>{q.reward}</strong></p>{/if}
        <button class="btn-primary mt-2 w-full" onclick={() => redeem(q.id)}>Einlösen 🎉</button>
      </div>
    {/each}

    {#if open.length === 0 && done.length === 0}
      <p class="mb-3 rounded-2xl border border-dashed border-surface-3 px-3 py-4 text-center text-sm text-ink-faint">
        Keine aktive Quest. Startet eine — z. B. „500 XP zusammen → Pizza-Abend".
      </p>
    {/if}

    {#if isParent}
      {#if showForm}
        <div class="flex flex-col gap-2">
          <input class="rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Quest-Titel (z. B. Gemeinsam stark)" bind:value={title} />
          <input class="rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Belohnung (z. B. Pizza-Abend)" bind:value={reward} />
          <div class="flex gap-2">
            {#each [150, 300, 500, 1000] as g (g)}
              <button class="chip flex-1 {goalXp === g ? 'bg-calm text-surface-0' : ''}" onclick={() => (goalXp = g)}>{g} XP</button>
            {/each}
          </div>
          <div class="flex gap-2">
            <button class="btn-ghost flex-1" onclick={() => (showForm = false)}>Abbrechen</button>
            <button class="btn-primary flex-1" onclick={add} disabled={!title.trim()}>Quest starten</button>
          </div>
        </div>
      {:else}
        <button class="btn-soft w-full" onclick={() => (showForm = true)}>+ Neue Quest</button>
      {/if}
    {/if}
  </section>

  {#if redeemed.length}
    <section class="card">
      <p class="chip mb-2">Geschafft & gefeiert</p>
      <ul class="flex flex-col gap-1">
        {#each redeemed as q (q.id)}
          <li class="flex items-center gap-2 text-sm text-ink-soft">
            <span>✅</span><span class="flex-1">{q.title}{q.reward ? ` → ${q.reward}` : ""}</span>
            {#if isParent}<button class="btn-ghost px-2 py-0.5 text-xs" onclick={() => quests.remove(q.id)}>✕</button>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
