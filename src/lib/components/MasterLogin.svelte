<script lang="ts">
  // Master-Login: blockiert die App, bis das Familien-Masterpasswort eingegeben ist.
  // (Nur aktiv, wenn der Server APP_PASSWORD gesetzt hat — für Internet-Exposition.)
  import { auth } from "$lib/stores/auth";

  let password = $state("");
  let error = $state(false);
  let busy = $state(false);

  async function submit() {
    if (!password || busy) return;
    busy = true;
    error = false;
    const ok = await auth.login(password);
    busy = false;
    if (ok) {
      // Sauberer Neustart mit gesetztem Session-Cookie (alle Subsysteme initialisieren frisch).
      location.reload();
    } else {
      error = true;
      password = "";
    }
  }
</script>

<div class="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 bg-surface-0 p-6">
  <div class="text-center">
    <div class="text-5xl">🔒</div>
    <h1 class="mt-3 text-2xl font-bold">ADHS-Helper</h1>
    <p class="mt-1 text-sm text-ink-soft">Bitte das Familien-Passwort eingeben.</p>
  </div>

  <div class="w-full max-w-xs">
    <input
      type="password"
      bind:value={password}
      placeholder="Masterpasswort"
      autocomplete="current-password"
      class="w-full rounded-2xl bg-surface-2 px-4 py-3 text-center focus:outline-none focus:ring-2
        {error ? 'ring-2 ring-gentle' : 'focus:ring-calm'}"
      onkeydown={(e) => e.key === 'Enter' && submit()}
    />
    {#if error}
      <p class="mt-2 text-center text-sm text-gentle">Falsches Passwort.</p>
    {/if}
    <button class="btn-primary mt-3 w-full" onclick={submit} disabled={busy || !password}>
      {busy ? "…" : "Anmelden"}
    </button>
  </div>

  <p class="max-w-xs text-center text-xs text-ink-faint">
    Danach kannst du in der App frei zwischen den Familien-Profilen wechseln.
  </p>
</div>
