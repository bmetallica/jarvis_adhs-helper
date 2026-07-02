<script lang="ts">
  // Daten sichern & wiederherstellen (JSON-Datei). Import nur mit Vorschau + Bestätigung.
  import { downloadBackup, previewBackup, restoreBackup, type BackupFile, type BackupPreview } from "$lib/backup";
  import { pushToast } from "$lib/notify";
  import { dateShort } from "$lib/date";

  let fileInput = $state<HTMLInputElement | null>(null);
  let pending = $state<{ data: BackupFile; preview: BackupPreview } | null>(null);
  let error = $state("");
  let busy = $state(false);

  const STORE_LABEL: Record<string, string> = {
    profiles: "Profile", timers: "Timer", tasks: "Aufgaben", routines: "Routinen",
    inbox: "Posteingang", checkins: "Check-ins", appointments: "Termine", deadlines: "Fristen",
    shopping: "Einkauf", meals: "Essensplan", habits: "Gewohnheiten", rewards: "Belohnungen",
    responsibilities: "Zuständigkeiten", appreciations: "Wertschätzungen", messages: "Board",
    medications: "Medikation", outbox: "Notiz-Ausgang", diary: "Tagebuch", polls: "Abstimmungen",
    locations: "Wo-ist-was", safefoods: "Safe-Foods", pharmacy: "Apotheke", wishes: "Wünsche",
    dopamine: "Dopamin-Menü", quests: "Quests", repairs: "Reparatur-Karten", focusstatus: "Fokus-Status",
  };

  async function doExport() {
    busy = true;
    try {
      await downloadBackup();
      pushToast("Backup erstellt", "Die Datei liegt in deinen Downloads.");
    } finally {
      busy = false;
    }
  }

  function onFile(e: Event) {
    error = "";
    pending = null;
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = previewBackup(String(reader.result ?? ""));
      if (res.ok) pending = { data: res.data, preview: res.preview };
      else error = res.error;
    };
    reader.readAsText(f);
  }

  async function doRestore() {
    if (!pending) return;
    busy = true;
    try {
      await restoreBackup(pending.data);
      pushToast("Backup eingespielt", "Die App lädt neu …");
      setTimeout(() => location.reload(), 800);
    } catch {
      error = "Einspielen fehlgeschlagen.";
      busy = false;
    }
  }
</script>

<section class="card">
  <h2 class="mb-1 text-lg font-bold">💾 Daten sichern</h2>
  <p class="mb-3 text-sm text-ink-faint">
    Alle lokalen Daten als Datei exportieren (Sicherheitsnetz neben dem Konto-Sync) oder ein
    früheres Backup wiederherstellen.
  </p>
  <div class="flex gap-2">
    <button class="btn-primary flex-1" onclick={doExport} disabled={busy}>⬇️ Backup exportieren</button>
    <button class="btn-soft flex-1" onclick={() => fileInput?.click()} disabled={busy}>⬆️ Backup laden</button>
  </div>
  <input type="file" accept="application/json,.json" class="hidden" bind:this={fileInput} onchange={onFile} />

  {#if error}
    <p class="mt-3 rounded-xl bg-gentle/10 p-3 text-sm text-gentle">{error}</p>
  {/if}

  {#if pending}
    <div class="mt-3 rounded-2xl border border-joy/40 p-3">
      <p class="font-semibold">Backup vom {dateShort(pending.preview.exportedAt)} · {pending.preview.total} Einträge</p>
      <p class="mt-1 text-xs text-ink-faint">
        {pending.preview.counts.map((c) => `${STORE_LABEL[c.store] ?? c.store}: ${c.n}`).join(" · ")}
      </p>
      <p class="mt-2 text-sm text-ink-soft">
        Achtung: Einspielen <strong>ersetzt</strong> die aktuellen lokalen Daten.
      </p>
      <div class="mt-2 flex gap-2">
        <button class="btn-ghost flex-1" onclick={() => (pending = null)}>Abbrechen</button>
        <button class="btn-primary flex-1" onclick={doRestore} disabled={busy}>Jetzt einspielen</button>
      </div>
    </div>
  {/if}
</section>
