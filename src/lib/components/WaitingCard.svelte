<script lang="ts">
  // Warte-Modus: Vor einem Termin ist der Tag oft blockiert („ich kann jetzt nichts mehr
  // anfangen"). Diese Karte zeigt, was in die Restzeit bis zur Losgeh-Zeit WIRKLICH passt —
  // kleine Aufgaben und Dopamin-Häppchen. Rein lokal, keine KI.
  import { appointments } from "$lib/stores/appointments";
  import { tasks } from "$lib/stores/tasks";
  import { dopamine } from "$lib/stores/dopamine";
  import { now } from "$lib/stores/clock";
  import { leaveTime, hhmm } from "$lib/date";
  import { openDopamine } from "$lib/stores/ui";
  import { route } from "$lib/router";

  const nextAppt = $derived(
    [...$appointments].filter((a) => a.startsAt > $now).sort((a, b) => a.startsAt - b.startsAt)[0] ?? null,
  );
  const leaveAt = $derived(
    nextAppt ? leaveTime(nextAppt.startsAt, nextAppt.travelMin + (nextAppt.prepMin ?? 0), nextAppt.bufferMin) : 0,
  );
  /** Minuten bis zur Losgeh-Zeit. */
  const waitMin = $derived(nextAppt ? Math.floor((leaveAt - $now) / 60000) : 0);
  /** Warte-Modus aktiv: 15–120 min vor der Losgeh-Zeit. */
  const active = $derived(nextAppt != null && waitMin >= 15 && waitMin <= 120);

  interface Suggestion {
    icon: string;
    text: string;
    hint: string;
  }
  const suggestions = $derived(
    (() => {
      if (!active) return [] as Suggestion[];
      const budget = waitMin - 10; // Sicherheitsabstand zur Losgeh-Zeit
      const out: Suggestion[] = [];
      // Passende offene Aufgaben (geschätzte Dauer im Budget; ohne Schätzung = klein annehmen).
      for (const t of $tasks.filter((t) => t.today && !t.done)) {
        const est = t.estimateMin ?? 15;
        if (est <= budget) out.push({ icon: t.icon || "✅", text: t.title, hint: `~${est} min` });
        if (out.length >= 2) break;
      }
      // Ein Dopamin-Häppchen, das reinpasst.
      const treats = $dopamine.filter((d) => d.course !== "side" && (d.minutes || 2) <= budget);
      if (treats.length) {
        const d = treats[Math.floor(Math.random() * treats.length)];
        out.push({ icon: "🍭", text: d.text, hint: `~${d.minutes || 2} min` });
      }
      return out.slice(0, 3);
    })(),
  );
</script>

{#if active && nextAppt}
  <section class="card border border-calm/40">
    <p class="mb-1 font-bold">⏳ Noch {waitMin} min bis losmachen ({hhmm(leaveAt)} Uhr)</p>
    <p class="mb-2 text-sm text-ink-faint">
      Genug Zeit für etwas Kleines — die App erinnert dich rechtzeitig an {nextAppt.title}.
    </p>
    {#if suggestions.length}
      <ul class="flex flex-col gap-1.5">
        {#each suggestions as s (s.icon + s.text)}
          <li class="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
            <span class="text-lg">{s.icon}</span>
            <span class="flex-1 text-sm">{s.text}</span>
            <span class="text-xs text-ink-faint">{s.hint}</span>
          </li>
        {/each}
      </ul>
    {/if}
    <div class="mt-2 flex gap-2">
      <button class="btn-soft flex-1 text-sm" onclick={() => route.go("plan")}>Plan öffnen</button>
      <button class="btn-soft flex-1 text-sm" onclick={openDopamine}>🍭 Dopamin-Menü</button>
    </div>
  </section>
{/if}
