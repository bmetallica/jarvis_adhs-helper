<script lang="ts">
  // Hausaufgaben per Foto: Der Zettel/Hefteintrag ist die klassische Verlustschnittstelle
  // Schule↔Zuhause. Foto → JARVIS (OCR + Struktur) → Fristen mit Fach und Abgabedatum.
  import { parseHomeworkPhoto, aiAvailable, type ParsedHomework } from "$lib/ai";
  import { deadlines } from "$lib/stores/deadlines";
  import { settings } from "$lib/stores/settings";
  import { pushToast } from "$lib/notify";
  import { successCue } from "$lib/feedback";
  import { dateShort } from "$lib/date";

  let fileInput = $state<HTMLInputElement | null>(null);
  let busy = $state(false);
  let error = $state("");
  let found = $state<(ParsedHomework & { include: boolean })[]>([]);

  function onFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    (e.currentTarget as HTMLInputElement).value = "";
    if (!file) return;
    error = "";
    found = [];
    const reader = new FileReader();
    reader.onload = async () => {
      busy = true;
      const items = await parseHomeworkPhoto(String(reader.result ?? ""));
      busy = false;
      if (items === null) {
        error = "JARVIS nicht erreichbar — später nochmal versuchen.";
      } else if (items.length === 0) {
        error = "Keine Aufgaben erkannt. Näher ran und gut ausleuchten hilft.";
      } else {
        found = items.map((i) => ({ ...i, include: true }));
      }
    };
    reader.readAsDataURL(file);
  }

  function defaultDue(): number {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(18, 0, 0, 0);
    return d.getTime();
  }

  async function saveAll() {
    const chosen = found.filter((f) => f.include);
    for (const f of chosen) {
      await deadlines.add({
        title: `${f.subject}: ${f.task}`,
        category: "Schule",
        dueAt: f.dueAt ?? defaultDue(),
        steps: [],
        reminderOffsetsMin: [1440, 120],
        profileId: $settings.activeProfileId,
      });
    }
    found = [];
    successCue();
    pushToast(`${chosen.length} Hausaufgabe(n) übernommen 📚`, "Mit Erinnerung am Vortag.");
  }
</script>

<section class="card">
  <h2 class="mb-1 text-lg font-bold">📚 Hausaufgaben per Foto</h2>
  {#if !aiAvailable()}
    <p class="text-sm text-ink-faint">Braucht die JARVIS-Verbindung (Ich → Verbindung).</p>
  {:else}
    <p class="mb-3 text-sm text-ink-faint">
      Hausaufgabenheft oder Zettel fotografieren — Fach, Aufgabe und Abgabedatum landen als
      Fristen mit Erinnerung.
    </p>
    <button class="btn-primary w-full" onclick={() => fileInput?.click()} disabled={busy}>
      {busy ? "analysiere …" : "📷 Zettel fotografieren"}
    </button>
    <input type="file" accept="image/*" capture="environment" class="hidden" bind:this={fileInput} onchange={onFile} />

    {#if error}<p class="mt-2 text-sm text-gentle">{error}</p>{/if}

    {#if found.length}
      <ul class="mt-3 flex flex-col gap-1.5">
        {#each found as f, i (i)}
          <li class="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <input type="checkbox" class="h-5 w-5 accent-calm" bind:checked={f.include} />
            <span class="flex-1"><strong>{f.subject}</strong>: {f.task}</span>
            <span class="text-xs text-ink-faint">{f.dueAt ? dateShort(f.dueAt) : "+2 Tage"}</span>
          </li>
        {/each}
      </ul>
      <button class="btn-primary mt-2 w-full" onclick={saveAll} disabled={!found.some((f) => f.include)}>
        Als Fristen übernehmen
      </button>
    {/if}
  {/if}
</section>
