<script lang="ts">
  // Foto aufnehmen/wählen → JARVIS-Vision. Beleg-OCR, Medikation vorlesen, Aufräum-Check.
  import { visionAnalyze, aiAvailable, type VisionMode } from "$lib/ai";

  let dataUrl = $state<string | null>(null);
  let mode = $state<VisionMode>("ocr");
  let busy = $state(false);
  let result = $state<string | null>(null);

  const modes: { id: VisionMode; label: string; icon: string }[] = [
    { id: "ocr", label: "Beleg/Text lesen", icon: "🧾" },
    { id: "medication", label: "Medikament", icon: "💊" },
    { id: "tidy", label: "Aufgeräumt?", icon: "🧹" },
    { id: "describe", label: "Beschreiben", icon: "👁️" },
  ];

  function onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      dataUrl = reader.result as string;
      result = null;
    };
    reader.readAsDataURL(file);
  }

  async function run() {
    if (!dataUrl || busy) return;
    busy = true;
    const r = await visionAnalyze(dataUrl, mode);
    result = r?.text ?? "Konnte das Bild nicht analysieren (keine JARVIS-Verbindung?).";
    busy = false;
  }
</script>

<section class="card">
  <h2 class="mb-1 text-lg font-bold">📷 Foto-Helfer</h2>
  {#if !aiAvailable()}
    <p class="text-sm text-ink-faint">
      Braucht JARVIS-Verbindung. Damit kannst du Belege auslesen (Steuer-Mental-Load), die
      Dosierung einer Medikamentenschachtel vorlesen lassen oder spielerisch prüfen, ob ein Zimmer
      aufgeräumt ist.
    </p>
  {:else}
    <div class="mb-3 grid grid-cols-2 gap-2">
      {#each modes as m (m.id)}
        <button
          class="rounded-2xl px-3 py-2 text-sm font-medium transition-colors {mode === m.id ? 'bg-calm text-surface-0' : 'bg-surface-2 text-ink-soft'}"
          onclick={() => (mode = m.id)}
        >
          {m.icon} {m.label}
        </button>
      {/each}
    </div>

    <label class="btn-soft mb-3 block cursor-pointer text-center">
      {dataUrl ? "Anderes Foto" : "📸 Foto aufnehmen/wählen"}
      <input type="file" accept="image/*" capture="environment" class="hidden" onchange={onFile} />
    </label>

    {#if dataUrl}
      <img src={dataUrl} alt="Vorschau" class="mb-3 max-h-48 w-full rounded-2xl object-contain" />
      <button class="btn-primary w-full" onclick={run} disabled={busy}>
        {busy ? "… analysiere" : "Analysieren"}
      </button>
    {/if}

    {#if result}
      <div class="mt-3 rounded-2xl bg-surface-2 p-3 text-ink">{result}</div>
    {/if}
  {/if}
</section>
