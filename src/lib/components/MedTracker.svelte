<script lang="ts">
  // Medikation: Einnahme, nächste Dosis, Rebound-Fenster + Beschaffungs-Management (Bestand,
  // Rezept-Vorlauf-Warner, geteiltes Apotheken-Log gegen doppelte Telefonate).
  import { medications, nextDoseText, reboundText, takenTodayCount, lastTaken, daysLeft, refillDue } from "$lib/stores/medications";
  import { pharmacy } from "$lib/stores/pharmacy";
  import { settings } from "$lib/stores/settings";
  import { successCue } from "$lib/feedback";
  import { hhmm, relativeWhen } from "$lib/date";

  let showAdd = $state(false);
  let name = $state("");
  let icon = $state("💊");
  let timesStr = $state("07:30");
  let reboundH = $state<number | "">("");
  let stock = $state<number | "">("");
  let dailyDose = $state<number | "">("");
  let isBtm = $state(false);
  let peakH = $state<number | "">("");

  let phName = $state("");
  let phText = $state("");

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
      stockCount: stock === "" ? null : Math.round(Number(stock)),
      dailyDose: dailyDose === "" ? undefined : Math.round(Number(dailyDose)),
      isBtm,
      peakDurationMin: peakH === "" ? null : Math.round(Number(peakH) * 60),
    });
    name = ""; icon = "💊"; timesStr = "07:30"; reboundH = ""; stock = ""; dailyDose = ""; isBtm = false; peakH = "";
    showAdd = false;
  }

  async function take(id: string) {
    await medications.take(id);
    successCue();
  }

  async function setStock(id: string) {
    const v = prompt("Aktueller Bestand (Tabletten)?");
    if (v != null && v.trim()) await medications.setStock(id, Number(v));
  }

  async function addPharmacy() {
    if (!phText.trim()) return;
    await pharmacy.add(phName, phText);
    phName = ""; phText = "";
  }
</script>

<section class="card">
  <h2 class="mb-1 text-lg font-bold">💊 Medikation</h2>
  <p class="mb-3 text-sm text-ink-faint">
    Einnahme, nächste Dosis, Rebound-Fenster — plus Rezept-Vorlauf und Apotheken-Log. Sensibel:
    bleibt im eigenen Bereich.
  </p>

  <div class="flex flex-col gap-2">
    {#each mine as m (m.id)}
      {@const last = lastTaken(m)}
      {@const dl = daysLeft(m)}
      <div class="rounded-2xl bg-surface-2 p-3">
        <div class="flex items-center gap-3">
          <span class="text-2xl">{m.icon}</span>
          <div class="flex-1">
            <p class="font-bold">{m.name} {#if m.isBtm}<span class="chip text-xs">BTM</span>{/if}</p>
            <p class="text-xs text-ink-faint">
              {#if nextDoseText(m)}nächste: {nextDoseText(m)}{/if}
              {#if takenTodayCount(m) > 0} · heute {takenTodayCount(m)}×{/if}
            </p>
            {#if last}
              <p class="text-xs text-ink-faint">zuletzt {hhmm(last)} Uhr{#if reboundText(m)} · {reboundText(m)}{/if}</p>
            {/if}
            {#if dl != null}
              <button class="mt-1 text-xs {refillDue(m) ? 'font-semibold text-gentle' : 'text-ink-faint'}" onclick={() => setStock(m.id)}>
                Bestand: ~{dl} Tage{refillDue(m) ? " · 📋 Rezept besorgen!" : ""} (tippen zum Setzen)
              </button>
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
        <input class="flex-1 rounded-xl bg-surface-2 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Name (z. B. Elvanse 30 mg)" bind:value={name} />
      </div>
      <label class="text-sm text-ink-soft">Zeiten (HH:MM, mit Komma)
        <input class="mt-1 w-full rounded-xl bg-surface-2 px-3 py-2 focus:outline-none" bind:value={timesStr} placeholder="07:30, 12:00" />
      </label>
      <div class="flex gap-2">
        <label class="flex-1 text-sm text-ink-soft">Bestand (Stück)
          <input type="number" min="0" class="mt-1 w-full rounded-xl bg-surface-2 px-3 py-2 focus:outline-none" bind:value={stock} placeholder="z. B. 30" />
        </label>
        <label class="flex-1 text-sm text-ink-soft">Pro Tag
          <input type="number" min="1" class="mt-1 w-full rounded-xl bg-surface-2 px-3 py-2 focus:outline-none" bind:value={dailyDose} placeholder="1" />
        </label>
        <label class="flex-1 text-sm text-ink-soft">Rebound (h)
          <input type="number" min="0" step="0.5" class="mt-1 w-full rounded-xl bg-surface-2 px-3 py-2 focus:outline-none" bind:value={reboundH} placeholder="8" />
        </label>
      </div>
      <label class="text-sm text-ink-soft">Wirkdauer für Fokus-Fenster (h, optional — zeigt auf der Startseite „gute Fokus-Zeit" an)
        <input type="number" min="0" step="0.5" class="mt-1 w-full rounded-xl bg-surface-2 px-3 py-2 focus:outline-none" bind:value={peakH} placeholder="z. B. 4" />
      </label>
      <label class="flex items-center justify-between py-1 text-sm">
        <span>BTM-Rezept (30-Tage-Regel, früh kümmern)</span>
        <input type="checkbox" class="h-5 w-5 accent-calm" bind:checked={isBtm} />
      </label>
      <div class="flex gap-2">
        <button class="btn-ghost flex-1" onclick={() => (showAdd = false)}>Abbrechen</button>
        <button class="btn-primary flex-1" onclick={add}>Speichern</button>
      </div>
    </div>
  {:else}
    <button class="btn-soft mt-3 w-full" onclick={() => (showAdd = true)}>+ Medikament</button>
  {/if}

  <!-- Apotheken-Log (geteilt) -->
  <div class="mt-4 border-t border-surface-3 pt-3">
    <p class="mb-1 text-sm font-bold">🏥 Apotheken-Log <span class="font-normal text-ink-faint">(geteilt — keine doppelten Anrufe)</span></p>
    {#each $pharmacy.slice(0, 5) as n (n.id)}
      <div class="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-1.5 text-sm">
        <span class="flex-1">{#if n.medName}<strong>{n.medName}:</strong> {/if}{n.text}</span>
        <span class="text-xs text-ink-faint">{relativeWhen(n.createdAt)}</span>
        <button class="btn-ghost px-2 py-0 text-xs text-ink-faint" onclick={() => pharmacy.remove(n.id)}>✕</button>
      </div>
    {/each}
    <div class="mt-2 flex gap-2">
      <input class="w-28 rounded-xl bg-surface-2 px-2 py-2 text-sm focus:outline-none" placeholder="Medikament" bind:value={phName} />
      <input class="flex-1 rounded-xl bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-calm" placeholder="z. B. Apotheke am Markt: 30 mg vorrätig" bind:value={phText} onkeydown={(e) => e.key === 'Enter' && addPharmacy()} />
      <button class="btn-soft px-3" onclick={addPharmacy}>+</button>
    </div>
  </div>
</section>
