<script lang="ts">
  // RSD-bewusste Kommunikations-Reframes: „Sag es so, dass es ankommt." Bleibt Vorschlag, nie Automatik.
  import { reframeMessage, aiAvailable } from "$lib/ai";

  let input = $state("");
  let output = $state("");
  let busy = $state(false);
  let usedAi = $state(false);

  async function run() {
    if (!input.trim() || busy) return;
    busy = true;
    const r = await reframeMessage(input);
    output = r.text;
    usedAi = r.usedAi;
    busy = false;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      /* ignore */
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="card">
    <h2 class="mb-1 text-lg font-bold">Sag es so, dass es ankommt</h2>
    <p class="mb-3 text-sm text-ink-faint">
      Formuliert eine Bitte/Nachricht so um, dass sie nicht als Vorwurf landet (RSD). Ein Vorschlag —
      du entscheidest. {aiAvailable() ? "(JARVIS)" : "(offline-Schablone)"}
    </p>
    <textarea
      rows="3"
      bind:value={input}
      placeholder="Was möchtest du sagen? (auch wenn es gerade vorwurfsvoll klingt)"
      class="w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
    ></textarea>
    <button class="btn-primary mt-3 w-full" onclick={run} disabled={busy || !input.trim()}>
      {busy ? "… formuliere um" : "Umformulieren"}
    </button>
  </div>

  {#if output}
    <div class="card border border-calm/30">
      <p class="mb-1 text-xs text-ink-faint">{usedAi ? "Vorschlag" : "Schablone (offline)"}</p>
      <p class="text-ink">{output}</p>
      <button class="btn-soft mt-3 text-sm" onclick={copy}>📋 Kopieren</button>
    </div>
  {/if}

  <div class="card">
    <p class="font-semibold">💡 Symptom, nicht Absicht</p>
    <p class="mt-1 text-sm text-ink-soft">
      Vergisst dein Gegenüber etwas, ist das fast immer ein Arbeitsgedächtnis-Symptom — keine
      Respektlosigkeit. Diese Lesart entschärft viele Konflikte, bevor sie entstehen.
    </p>
  </div>
</div>
