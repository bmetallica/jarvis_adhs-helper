<script lang="ts">
  // Medikations-Fokus-Fenster: Stimulanzien haben ein Wirkfenster — schwere Aufgaben in den
  // Peak zu legen ist ein großer Alltagshebel. REINE ANZEIGE aus den eigenen Einnahme-Logs,
  // kein medizinischer Rat. Erscheint nur, wenn beim Medikament eine Wirkdauer gepflegt ist.
  import { medications } from "$lib/stores/medications";
  import { tasks } from "$lib/stores/tasks";
  import { settings } from "$lib/stores/settings";
  import { now } from "$lib/stores/clock";
  import { hhmm } from "$lib/date";

  interface Win {
    medName: string;
    from: number;
    to: number;
  }
  const window_ = $derived(
    (() => {
      const meId = $settings.activeProfileId;
      let best: Win | null = null;
      for (const m of $medications) {
        if (m.profileId !== meId && m.profileId !== null) continue;
        const dur = m.peakDurationMin ?? 0;
        if (!dur) continue;
        const onset = (m.peakOnsetMin ?? 30) * 60000;
        const today = new Date($now).setHours(0, 0, 0, 0);
        const lastIntake = [...m.log].reverse().find((t) => t >= today);
        if (!lastIntake) continue;
        const from = lastIntake + onset;
        const to = from + dur * 60000;
        if ($now < to && (!best || to > best.to)) best = { medName: m.name, from, to };
      }
      return best;
    })(),
  );
  const active = $derived(window_ != null && $now >= window_.from);
  const minsLeft = $derived(window_ ? Math.max(0, Math.round((window_.to - $now) / 60000)) : 0);
  const minsUntil = $derived(window_ ? Math.max(0, Math.round((window_.from - $now) / 60000)) : 0);
  const hardestTask = $derived($tasks.filter((t) => t.today && !t.done).sort((a, b) => a.order - b.order)[0] ?? null);
</script>

{#if window_}
  <section class="card border border-calm/40">
    {#if active}
      <p class="font-bold">🟢 Fokus-Fenster — noch ~{minsLeft} min (bis {hhmm(window_.to)} Uhr)</p>
      {#if hardestTask}
        <p class="mt-1 text-sm text-ink-soft">
          Gute Zeit für das Schwerste: {hardestTask.icon || "🎯"} <strong>{hardestTask.title}</strong>
        </p>
      {:else}
        <p class="mt-1 text-sm text-ink-soft">Gute Zeit für die schwerste Sache des Tages.</p>
      {/if}
    {:else}
      <p class="font-bold">🕑 Fokus-Fenster beginnt in ~{minsUntil} min</p>
      <p class="mt-1 text-sm text-ink-soft">Bis dahin: etwas Leichtes — das Schwere hat gleich bessere Karten.</p>
    {/if}
  </section>
{/if}
