<script lang="ts">
  // Medikation: Einnahme festhalten, nächste Dosis + Rebound-Fenster sehen. Pro Profil.
  import { medications, nextDoseText, reboundText, takenTodayCount, lastTaken } from "$lib/stores/medications";
  import { settings } from "$lib/stores/settings";
  import { successCue } from "$lib/feedback";
  import { hhmm } from "$lib/date";

  let showAdd = $state(false);
  let name = $state("");
  let icon = $state("💊");
  let timesStr = $state("07:30");
  let reboundH = $state<number | "">("");

  const mine = $derived($medications.filter((m) => m.profileId === $settings.activeProfileId || m.profileId === null));

  async function add() {
    if (!name.trim()) return;
    const times = timesStr.split(",").map((t) => t.trim()).filter(Boolean);
    await medications.add({
      profileId: $settings.activeProfileId,
      name: name.trim(),
      icon: icon || "💊",
      times,
      reboundMin: reboundH === "" ? null : Math.round(Number(reboundH) * 60),
    });
    name = "";
    icon = "💊";
    timesStr = "07:30";
    reboundH = "";
    showAdd = false;
  }

  async function take(id: string) {
    await medications.take(id);
    successCue();
  }
</script>

<section class="card">
  <h2 class="mb-1 text-lg font-bold">💊 Medikation</h2>
  <p class="mb-3 text-sm text-ink-faint">
    Einnahme festhalten, nächste Dosis und Rebound-Fenster im Blick. Bleibt privat auf dem Gerät bzw.
    im eigenen Bereich.
  </p>

  <div class="flex flex-col gap-2">
    {#each mine as m (m.id)}
      {@const last = lastTaken(m)}
      <div class="rounded-2xl bg-surface-2 p-3">
        <div class="flex items-center gap-3">
          <span class="text-2xl">{m.icon}</span>
          <div class="flex-1">
            <p class="font-bold">{m.name}</p>
            <p class="text-xs text-ink-faint">
              {#if nextDoseText(m)}nächste: {nextDoseText(m)}{/if}
              {#if takenTodayCount(m) > 0} · heute {takenTodayCount(m)}×{/if}
            </p>
            {#if last}
              <p class="text-xs text-ink-faint">
                zuletzt {hhmm(last)} Uhr{#if reboundText(m)} · {reboundText(m)}{/if}
              </p>
            {/if}
          </div>
          <button class="btn-primary px-4 py-2" onclick={() => take(m.id)}>genommen ✓</button>
          <button class="btn-ghost px-2 py-1 text-sm text-ink-faint" aria-label="löschen" onclick={() => medications.remove(m.id)}>✕</button>
        </div>
      </div>
    {/each}
    {#if mine.length === 0 && !showAdd}
      <p class="text-sm text-ink-faint">Noch keine Medikation hinterlegt.</p>
    {/if}
  </div>

  {#if showAdd}
    <div class="mt-3 flex flex-col gap-2 border-t border-surface-3 pt-3">
      <div class="flex gap-2">
        <input class="w-16 rounded-xl bg-surface-2 px-2 py-2 text-center text-2xl focus:outline-none" bind:value={icon} maxlength="2" aria-label="Symbol" />
        <input class="flex-1 rounded-xl bg-surface-2 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Name (z. B. Methylphenidat 10 mg)" bind:value={name} />
      </div>
      <label class="text-sm text-ink-soft">
        Zeiten (HH:MM, mit Komma)
        <input class="mt-1 w-full rounded-xl bg-surface-2 px-3 py-2 focus:outline-none" bind:value={timesStr} placeholder="07:30, 12:00" />
      </label>
      <label class="text-sm text-ink-soft">
        Rebound nach (Stunden, optional)
        <input type="number" min="0" step="0.5" class="mt-1 w-full rounded-xl bg-surface-2 px-3 py-2 focus:outline-none" bind:value={reboundH} placeholder="z. B. 8" />
      </label>
      <div class="flex gap-2">
        <button class="btn-ghost flex-1" onclick={() => (showAdd = false)}>Abbrechen</button>
        <button class="btn-primary flex-1" onclick={add}>Speichern</button>
      </div>
    </div>
  {:else}
    <button class="btn-soft mt-3 w-full" onclick={() => (showAdd = true)}>+ Medikament</button>
  {/if}
</section>
