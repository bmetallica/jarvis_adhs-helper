<script lang="ts">
  // JARVIS-Verbindung: Host/Domain + Plugin-Key, „Verbindung testen", Zertifikats-Hilfe.
  // Die ganze App spricht nur diese eine Basis-URL an → Wechsel IP→Domain ist reine Einstellung.
  import { settings } from "$lib/stores/settings";
  import { connection } from "$lib/stores/connection";
  import { jarvis, isProxyMode } from "$lib/jarvis/client";
  import { initSync } from "$lib/sync";
  import { syncRoster } from "$lib/stores/accounts";
  import { initDataSync } from "$lib/datasync";

  const proxied = isProxyMode();
  let baseUrl = $state($settings.jarvisBaseUrl);
  let key = $state($settings.jarvisKey);

  async function saveAndTest() {
    await settings.patch({ jarvisBaseUrl: baseUrl.trim(), jarvisKey: key.trim() });
    jarvis.clearCache();
    await connection.test();
    initSync(); // Echtzeit-Sync nach erfolgreicher Konfiguration starten
    void syncRoster();
    initDataSync(); // Per-Account-Datensynchronisation starten
  }

  const certHost = $derived(() => {
    try {
      return new URL(baseUrl).host;
    } catch {
      return baseUrl;
    }
  });
</script>

<section class="card">
  <h2 class="mb-1 text-lg font-bold">JARVIS-Verbindung</h2>
  <p class="mb-4 text-sm text-ink-faint">
    Verbindet die App mit deinem JARVIS-Gateway für KI, Sprache, Tagebuch und Erinnerungen. Ohne
    Verbindung läuft alles weiter lokal — die KI ist nur ein Bonus.
  </p>

  {#if proxied}
    <div class="rounded-2xl bg-surface-2 p-3 text-sm text-ink-soft">
      🔗 Zentral über den Server konfiguriert. Host und Schlüssel liegen sicher auf dem ADHS-Server
      (<code>/etc/adhs-helper.env</code>) — nicht in diesem Browser. Nichts pro Gerät einzustellen.
    </div>
    <div class="mt-3 flex gap-2">
      <button class="btn-soft flex-1" onclick={() => connection.test()}>Verbindung testen</button>
      <button class="btn-soft flex-1" onclick={() => syncRoster()}>Familie neu laden</button>
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      <label class="text-sm text-ink-soft">
        Basis-URL (IP jetzt, Domain später — kein Neuaufbau nötig)
        <input
          class="mt-1 w-full rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm"
          placeholder="https://192.168.1.224:8088"
          bind:value={baseUrl}
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />
      </label>
      <label class="text-sm text-ink-soft">
        Plugin-API-Key (jvp_… aus dem JARVIS-Admin-UI)
        <input
          type="password"
          class="mt-1 w-full rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm"
          placeholder="jvp_adhs_…"
          bind:value={key}
          autocomplete="off"
        />
      </label>
      <button class="btn-primary" onclick={saveAndTest}>Speichern & Verbindung testen</button>
    </div>
  {/if}

  <!-- Status -->
  <div class="mt-4">
    {#if $connection.status === "testing"}
      <p class="chip">⏳ teste …</p>
    {:else if $connection.status === "connected"}
      <div class="rounded-2xl bg-calm/10 p-3">
        <p class="font-semibold text-calm">✓ Verbunden</p>
        <p class="mt-1 text-sm text-ink-soft">
          Nutzer: {$connection.info?.user ?? "—"} · Plugin: {$connection.info?.plugin ?? "—"}
        </p>
        {#if $connection.info?.scopes?.length}
          <div class="mt-2 flex flex-wrap gap-1">
            {#each $connection.info.scopes as sc (sc)}<span class="chip text-xs">{sc}</span>{/each}
          </div>
        {/if}
      </div>
    {:else if $connection.status === "error"}
      <div class="rounded-2xl bg-gentle/10 p-3">
        <p class="font-semibold text-gentle">Verbindung fehlgeschlagen</p>
        <p class="mt-1 text-sm text-ink-soft">{$connection.error}</p>
        {#if $connection.certHint}
          <div class="mt-3 space-y-3 text-sm text-ink-soft">
            <p class="text-ink">Der Browser blockiert den Zugriff. Zwei häufige Ursachen:</p>

            <div class="rounded-xl bg-surface-2 p-3">
              <p class="font-semibold">1. CORS (am wahrscheinlichsten, wenn JARVIS im Browser erreichbar ist)</p>
              <p class="mt-1">
                Das JARVIS-Gateway muss Zugriffe von dieser App-Adresse erlauben. In JARVIS
                (FastAPI) eine CORS-Middleware aktivieren, die diesen Origin zulässt:
              </p>
              <code class="mt-1 block break-all rounded-lg bg-surface-0 p-2 text-xs text-ink">
                allow_origins = ["{typeof window !== 'undefined' ? window.location.origin : ''}"]
              </code>
            </div>

            <div class="rounded-xl bg-surface-2 p-3">
              <p class="font-semibold">2. Zertifikat (falls noch nicht akzeptiert)</p>
              <p class="mt-1">
                Öffne einmalig
                <a class="text-calm underline" href={baseUrl} target="_blank" rel="noreferrer">{certHost()}</a>
                im selben Browser und bestätige die Ausnahme.
              </p>
            </div>

            <p class="text-xs text-ink-faint">
              Schnelltest auf dem JARVIS-Host (umgeht CORS): <br />
              <code class="break-all">curl -k -H "Authorization: Bearer DEIN_KEY" {baseUrl}/api/v1/me</code><br />
              Klappt curl, scheitert aber der Browser → es ist CORS.
            </p>
          </div>
        {/if}
      </div>
    {:else}
      <p class="chip">Status: lokal (offline-first)</p>
    {/if}
  </div>
</section>
