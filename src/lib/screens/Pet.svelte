<script lang="ts">
  import { pet } from "$lib/stores/pet";
  import { profiles } from "$lib/stores/profiles";
  import { stageFor, nextStage, stageProgress, XP } from "$lib/pet";
  import PetCanvas from "$lib/components/PetCanvas.svelte";
  import RewardShop from "$lib/components/RewardShop.svelte";
  import AccessoryShop from "$lib/components/AccessoryShop.svelte";

  let tab = $state<"pet" | "accessories" | "shop">("pet");
  let editingName = $state(false);
  let nameInput = $state("");

  const stage = $derived(stageFor($pet.xp));
  const next = $derived(nextStage($pet.xp));
  const progress = $derived(stageProgress($pet.xp));

  // Beiträge je Profil (sichtbar gegen Geschwister-Neid).
  const contribList = $derived(
    Object.entries($pet.contributions)
      .map(([pid, xp]) => ({
        profile: $profiles.find((p) => p.id === pid) ?? null,
        pid,
        xp,
      }))
      .filter((c) => c.xp > 0)
      .sort((a, b) => b.xp - a.xp),
  );
  const totalContrib = $derived(contribList.reduce((s, c) => s + c.xp, 0) || 1);

  function startRename() {
    nameInput = $pet.name;
    editingName = true;
  }
  async function saveName() {
    await pet.rename(nameInput);
    editingName = false;
  }
</script>

<div class="flex flex-col gap-4">
  <!-- Umschalter -->
  <div class="flex gap-1 rounded-2xl bg-surface-1 p-1">
    <button class="flex-1 rounded-xl px-2 py-2 text-sm font-semibold {tab === 'pet' ? 'bg-calm text-surface-0' : 'text-ink-soft'}" onclick={() => (tab = 'pet')}>🐣 Tier</button>
    <button class="flex-1 rounded-xl px-2 py-2 text-sm font-semibold {tab === 'accessories' ? 'bg-calm text-surface-0' : 'text-ink-soft'}" onclick={() => (tab = 'accessories')}>🎀 Shop</button>
    <button class="flex-1 rounded-xl px-2 py-2 text-sm font-semibold {tab === 'shop' ? 'bg-calm text-surface-0' : 'text-ink-soft'}" onclick={() => (tab = 'shop')}>🎁 Belohnungen</button>
  </div>

  {#if tab === "pet"}
    <!-- Geschenk von der Reise -->
    {#if $pet.pendingGift}
      <section class="card border-2 border-joy text-center">
        <p class="text-lg font-bold">🎁 {$pet.name} hat etwas mitgebracht!</p>
        <p class="mt-1 text-ink-soft">{$pet.pendingGift}</p>
        <button class="btn-primary mt-3" onclick={() => pet.collectGift()}>Annehmen ✨</button>
      </section>
    {/if}

    <section class="card flex flex-col items-center gap-3">
      <PetCanvas pet={$pet} size={240} />

      {#if editingName}
        <div class="flex gap-2">
          <input class="rounded-2xl bg-surface-2 px-4 py-2 text-center focus:outline-none focus:ring-2 focus:ring-calm" bind:value={nameInput} maxlength="20" />
          <button class="btn-primary px-4" onclick={saveName}>✓</button>
        </div>
      {:else}
        <button class="text-2xl font-bold" onclick={startRename}>{$pet.name} ✏️</button>
      {/if}

      <p class="chip">Stufe: {stage.title}</p>

      <!-- Wachstums-Fortschritt -->
      <div class="w-full">
        <div class="mb-1 flex justify-between text-sm text-ink-faint">
          <span>{$pet.xp} XP</span>
          {#if next}<span>nächste Stufe: {next.title} ({next.minXp})</span>{:else}<span>höchste Stufe ✨</span>{/if}
        </div>
        <div class="h-3 w-full overflow-hidden rounded-full bg-surface-2">
          <div class="h-full rounded-full bg-calm transition-[width] duration-700 ease-soft" style="width:{progress * 100}%"></div>
        </div>
      </div>

      <div class="flex gap-4 text-sm">
        <span class="chip">🪙 {$pet.coins} Münzen</span>
      </div>
    </section>

    <!-- So wächst das Tier -->
    <section class="card">
      <p class="mb-2 font-bold">So wächst {$pet.name}</p>
      <p class="text-sm text-ink-soft">
        Jede erledigte Sache der ganzen Familie zahlt ein — Aufgaben (+{XP.task}), Routinen-Schritte
        (+{XP.routineStep}), Timer (+{XP.timer}), Gewohnheiten (+{XP.habit}), Einkäufe (+{XP.shopping}).
        Kein Wettbewerb, ein gemeinsames Tier. Es schrumpft nie und stirbt nie. 🌿
      </p>
    </section>

    <!-- Beiträge je Mitglied -->
    {#if contribList.length}
      <section class="card">
        <p class="mb-3 font-bold">Wer mitgeholfen hat</p>
        <div class="flex flex-col gap-2">
          {#each contribList as c (c.pid)}
            <div class="flex items-center gap-3">
              <span class="grid h-8 w-8 place-items-center rounded-full text-lg" style="background:{(c.profile?.color ?? '#2a323d')}22">
                {c.profile?.avatar ?? "👤"}
              </span>
              <span class="w-24 truncate text-sm">{c.profile?.name ?? "Jemand"}</span>
              <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div class="h-full rounded-full" style="width:{(c.xp / totalContrib) * 100}%;background-color:{c.profile?.color ?? '#4fd1c5'}"></div>
              </div>
              <span class="w-12 text-right text-sm text-ink-faint">{c.xp}</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {:else if tab === "accessories"}
    <AccessoryShop />
  {:else}
    <RewardShop />
  {/if}
</div>
