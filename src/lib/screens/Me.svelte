<script lang="ts">
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { notifyPermission, requestNotifyPermission } from "$lib/notify";
  import { connection } from "$lib/stores/connection";
  import { pushRosterMeta } from "$lib/stores/accounts";
  import { resetPetAndCoins, resetEverything } from "$lib/reset";
  import { pushToast } from "$lib/notify";
  import { route } from "$lib/router";
  import { auth } from "$lib/stores/auth";
  import ConnectionSettings from "$lib/components/ConnectionSettings.svelte";
  import VisionTool from "$lib/components/VisionTool.svelte";
  import MedTracker from "$lib/components/MedTracker.svelte";
  import DoomBox from "$lib/components/DoomBox.svelte";
  import WishPark from "$lib/components/WishPark.svelte";
  import DataBackup from "$lib/components/DataBackup.svelte";
  import PinGate from "$lib/components/PinGate.svelte";
  import Handover from "$lib/components/Handover.svelte";
  import AvatarPicker from "$lib/components/AvatarPicker.svelte";

  import { playAlarmSample } from "$lib/feedback";
  import { pushAvailable, getPushSubscription, subscribePush, unsubscribePush, sendTestPush } from "$lib/push";

  let showHandover = $state(false);
  import type { AlarmSound, Profile, ProfileRole } from "$lib/types";

  // Verbindungstest beim Öffnen, falls konfiguriert.
  $effect(() => {
    void connection.test();
  });

  async function setJarvisUser(p: Profile, val: string) {
    await profiles.update({ ...p, jarvisUser: val.trim() || undefined });
  }

  let newName = $state("");
  let newRole = $state<ProfileRole>("parent");
  let newAvatar = $state("🦊");
  let perm = $state(notifyPermission());

  // Profil-Bearbeitung (Avatar, Name, Rolle)
  let editingId = $state<string | null>(null);
  let eName = $state("");
  let eAvatar = $state("");
  let eRole = $state<ProfileRole>("parent");

  function startEdit(p: Profile) {
    editingId = p.id;
    eName = p.name;
    eAvatar = p.avatar;
    eRole = p.role;
  }
  async function saveEdit(p: Profile) {
    await profiles.update({ ...p, name: eName.trim() || p.name, avatar: eAvatar || p.avatar, role: eRole });
    await pushRosterMeta(); // Änderung geräteübergreifend teilen (JARVIS-Accounts)
    editingId = null;
  }

  async function askNotify() {
    perm = await requestNotifyPermission();
  }

  // Web-Push-Status dieses Geräts.
  let pushOffered = $state(false);
  let pushSubscribed = $state(false);
  let pushBusy = $state(false);
  let pushError = $state("");
  $effect(() => {
    void pushAvailable().then((ok) => (pushOffered = ok));
    void getPushSubscription().then((s) => (pushSubscribed = s != null));
  });
  async function doSubscribe() {
    pushBusy = true;
    pushError = "";
    const res = await subscribePush();
    pushBusy = false;
    if (res.ok) {
      pushSubscribed = true;
      pushToast("Push aktiviert 🔔", "Erinnerungen kommen jetzt auch bei geschlossener App.");
    } else {
      pushError = res.reason ?? "Aktivierung fehlgeschlagen.";
    }
  }
  async function doUnsubscribe() {
    await unsubscribePush();
    pushSubscribed = false;
    pushToast("Push deaktiviert");
  }
  async function doTestPush() {
    const ok = await sendTestPush();
    pushToast(ok ? "Test unterwegs 🔔" : "Test fehlgeschlagen", ok ? "Kommt gleich als Benachrichtigung an." : "");
  }

  // Reset
  const activeRole = $derived($profiles.find((p) => p.id === $settings.activeProfileId)?.role ?? null);
  let confirmFull = $state("");
  let resetting = $state(false);

  async function doPetReset() {
    resetting = true;
    await resetPetAndCoins();
    resetting = false;
    pushToast("Tier & Münzen zurückgesetzt");
  }
  async function doFullReset() {
    if (confirmFull !== "RESET") return;
    resetting = true;
    await resetEverything();
  }

  async function addProfile() {
    if (!newName.trim()) return;
    await profiles.add(newName, newRole, newAvatar);
    newName = "";
    newAvatar = "🦊";
  }

  const roleLabel: Record<ProfileRole, string> = {
    parent: "Elternteil",
    child: "Kind",
    other: "Weitere/r",
  };

  // Eltern-PIN verwalten
  let pinDraft = $state("");
  async function savePin() {
    if (pinDraft.length < 4) return;
    await settings.patch({ parentPin: pinDraft });
    pinDraft = "";
    pushToast("Eltern-PIN gespeichert", "Sensible Bereiche sind jetzt geschützt.");
  }
  async function removePin() {
    await settings.patch({ parentPin: "" });
    pushToast("Eltern-PIN entfernt");
  }
</script>

<div class="flex flex-col gap-5">
  <!-- Profile -->
  <section class="card">
    <h2 class="mb-3 text-lg font-bold">Profile</h2>
    <p class="mb-4 text-sm text-ink-faint">
      Jedes Familienmitglied bekommt ein Profil. Im Alltag wechselst du oben rechts mit einem Tipp —
      kein Login nötig.
    </p>

    <ul class="flex flex-col gap-2">
      {#each $profiles as p (p.id)}
        <li class="rounded-2xl bg-surface-2 px-3 py-2">
          <div class="flex items-center gap-3">
            <span
              class="grid h-9 w-9 place-items-center rounded-full text-lg"
              style="background:{p.color}22">{p.avatar}</span
            >
            <div class="flex-1">
              <p class="font-semibold">{p.name}</p>
              <p class="text-xs text-ink-faint">{roleLabel[p.role]}</p>
            </div>
            {#if p.id === $settings.activeProfileId}
              <span class="chip text-calm">aktiv</span>
            {:else}
              <button class="btn-ghost px-3 py-1 text-sm" onclick={() => profiles.setActive(p.id)}>
                wählen
              </button>
            {/if}
            <button
              class="btn-ghost px-2 py-1 text-sm"
              aria-label="Profil bearbeiten"
              onclick={() => (editingId === p.id ? (editingId = null) : startEdit(p))}>✏️</button
            >
            <button
              class="btn-ghost px-2 py-1 text-sm text-ink-faint"
              aria-label="Profil entfernen"
              onclick={() => profiles.remove(p.id)}>✕</button
            >
          </div>

          {#if editingId === p.id}
            <div class="mt-3 flex flex-col gap-3 border-t border-surface-3 pt-3">
              <input
                class="rounded-xl bg-surface-3 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-calm"
                bind:value={eName}
                placeholder="Name"
              />
              <div>
                <p class="mb-1 text-xs text-ink-faint">Profilbild</p>
                <AvatarPicker value={eAvatar} color={p.color} onpick={(a) => (eAvatar = a)} />
              </div>
              <div>
                <p class="mb-1 text-xs text-ink-faint">Rolle</p>
                <div class="flex gap-2">
                  {#each ["parent", "child", "other"] as r (r)}
                    <button
                      class="flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors
                        {eRole === r ? 'bg-calm text-surface-0' : 'bg-surface-3 text-ink-soft'}"
                      onclick={() => (eRole = r as ProfileRole)}
                    >
                      {roleLabel[r as ProfileRole]}
                    </button>
                  {/each}
                </div>
              </div>
              <div class="flex gap-2">
                <button class="btn-ghost flex-1" onclick={() => (editingId = null)}>Abbrechen</button>
                <button class="btn-primary flex-1" onclick={() => saveEdit(p)}>Speichern</button>
              </div>
            </div>
          {/if}
          {#if $settings.jarvisBaseUrl}
            <label class="mt-2 flex items-center gap-2 pl-12 text-xs text-ink-faint">
              JARVIS-Nutzer:
              <input
                class="flex-1 rounded-lg bg-surface-3 px-2 py-1 text-ink focus:outline-none"
                placeholder={p.name}
                value={p.jarvisUser ?? ""}
                onchange={(e) => setJarvisUser(p, e.currentTarget.value)}
              />
            </label>
          {/if}
        </li>
      {/each}
      {#if $profiles.length === 0}
        <li class="rounded-2xl border border-dashed border-surface-3 px-3 py-4 text-center
          text-sm text-ink-faint">
          Noch keine Profile. Lege unten das erste an.
        </li>
      {/if}
    </ul>

    <div class="mt-4 flex flex-col gap-2">
      <input
        class="rounded-2xl bg-surface-2 px-4 py-3 text-ink placeholder:text-ink-faint
          focus:outline-none focus:ring-2 focus:ring-calm"
        placeholder="Name (z. B. Lukas)"
        bind:value={newName}
        onkeydown={(e) => e.key === "Enter" && addProfile()}
      />
      <div class="flex gap-2">
        {#each ["parent", "child", "other"] as r (r)}
          <button
            class="flex-1 rounded-2xl px-3 py-2 text-sm font-medium transition-colors
              {newRole === r ? 'bg-calm text-surface-0' : 'bg-surface-2 text-ink-soft'}"
            onclick={() => (newRole = r as ProfileRole)}
          >
            {roleLabel[r as ProfileRole]}
          </button>
        {/each}
      </div>
      <div>
        <p class="mb-1 text-xs text-ink-faint">Profilbild wählen</p>
        <AvatarPicker value={newAvatar} onpick={(a) => (newAvatar = a)} />
      </div>
      <button class="btn-primary" onclick={addProfile}>+ Profil hinzufügen</button>
    </div>
  </section>

  <!-- Komfort / Reize -->
  <section class="card">
    <h2 class="mb-3 text-lg font-bold">Ruhe & Reize</h2>
    <div class="flex flex-col divide-y divide-surface-2">
      <label class="flex items-center justify-between py-3">
        <span>Reizarm-Modus <span class="text-ink-faint">(dimmt, beruhigt)</span></span>
        <input
          type="checkbox"
          class="h-6 w-6 accent-calm"
          checked={$settings.calmMode}
          onchange={(e) => settings.patch({ calmMode: e.currentTarget.checked })}
        />
      </label>
      <label class="flex items-center justify-between py-3">
        <span>Bewegung reduzieren</span>
        <input
          type="checkbox"
          class="h-6 w-6 accent-calm"
          checked={$settings.reduceMotion}
          onchange={(e) => settings.patch({ reduceMotion: e.currentTarget.checked })}
        />
      </label>
      <label class="flex items-center justify-between py-3">
        <span>Vibration (Haptik)</span>
        <input
          type="checkbox"
          class="h-6 w-6 accent-calm"
          checked={$settings.haptics}
          onchange={(e) => settings.patch({ haptics: e.currentTarget.checked })}
        />
      </label>
      <label class="flex items-center justify-between py-3">
        <span>Sound-Feedback</span>
        <input
          type="checkbox"
          class="h-6 w-6 accent-calm"
          checked={$settings.sound}
          onchange={(e) => settings.patch({ sound: e.currentTarget.checked })}
        />
      </label>
      <div class="py-3">
        <div class="mb-2 flex items-center justify-between">
          <span>Alarm-Lautstärke</span>
          <button class="btn-ghost px-3 py-1 text-sm" onclick={() => playAlarmSample()}>🔊 Probe</button>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          class="w-full accent-calm"
          value={$settings.alarmVolume}
          onchange={(e) => settings.patch({ alarmVolume: Number(e.currentTarget.value) })}
        />
        <p class="mb-2 mt-3 text-sm">Alarm-Klang</p>
        <div class="flex gap-2">
          {#each [["triad", "Dreiklang"], ["bell", "Glocke"], ["soft", "Sanft"]] as [id, label] (id)}
            <button
              class="flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors
                {($settings.alarmSound ?? 'triad') === id ? 'bg-calm text-surface-0' : 'bg-surface-2 text-ink-soft'}"
              onclick={() => {
                void settings.patch({ alarmSound: id as AlarmSound });
                setTimeout(() => playAlarmSample(), 60);
              }}>{label}</button
            >
          {/each}
        </div>
        <p class="mb-1 mt-3 text-sm">Alarm stoppt von selbst nach</p>
        <div class="flex gap-2">
          {#each [[0, "nie (manuell)"], [1, "1 min"], [3, "3 min"], [10, "10 min"]] as [min, label] (min)}
            <button
              class="flex-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors
                {($settings.alarmAutoStopMin ?? 0) === min ? 'bg-calm text-surface-0' : 'bg-surface-2 text-ink-soft'}"
              onclick={() => settings.patch({ alarmAutoStopMin: Number(min) })}>{label}</button
            >
          {/each}
        </div>
      </div>
      <label class="flex items-center justify-between py-3">
        <span>Gesprochene Erinnerungen <span class="text-ink-faint">(offline)</span></span>
        <input
          type="checkbox"
          class="h-6 w-6 accent-calm"
          checked={$settings.voiceNudges}
          onchange={(e) => settings.patch({ voiceNudges: e.currentTarget.checked })}
        />
      </label>
      <label class="flex items-center justify-between py-3">
        <span>Größere Schrift</span>
        <input
          type="checkbox"
          class="h-6 w-6 accent-calm"
          checked={$settings.largeText}
          onchange={(e) => settings.patch({ largeText: e.currentTarget.checked })}
        />
      </label>
      <label class="flex items-center justify-between py-3">
        <span>Gut lesbare Schrift</span>
        <input
          type="checkbox"
          class="h-6 w-6 accent-calm"
          checked={$settings.readableFont}
          onchange={(e) => settings.patch({ readableFont: e.currentTarget.checked })}
        />
      </label>
      <div class="flex items-center justify-between py-3">
        <span>🌙 Wind-down ab <span class="text-ink-faint">(dimmt abends, erinnert sanft)</span></span>
        <div class="flex items-center gap-2">
          <input
            type="time"
            class="rounded-xl bg-surface-2 px-3 py-1.5 focus:outline-none"
            value={$settings.windDownStart}
            onchange={(e) => settings.patch({ windDownStart: e.currentTarget.value })}
          />
          {#if $settings.windDownStart}
            <button class="btn-ghost px-2 py-1 text-xs" onclick={() => settings.patch({ windDownStart: "" })}>aus</button>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <!-- Erinnerungen -->
  <section class="card">
    <h2 class="mb-1 text-lg font-bold">Erinnerungen</h2>
    <p class="mb-3 text-sm text-ink-faint">
      Für Termin- und Frist-Erinnerungen, auch wenn die App im Hintergrund ist. Sanft, nie nervös.
    </p>
    {#if perm === "granted"}
      <p class="chip text-calm">✓ erlaubt</p>
    {:else if perm === "denied"}
      <p class="chip text-gentle">blockiert — bitte in den Browser-Einstellungen erlauben</p>
    {:else}
      <button class="btn-primary" onclick={askNotify}>Erinnerungen erlauben</button>
    {/if}

    <!-- Web-Push: Zustellung auch bei GESCHLOSSENER App (über den eigenen App-Server). -->
    <div class="mt-4 border-t border-surface-2 pt-3">
      <p class="mb-1 font-semibold">Auch bei geschlossener App (Push)</p>
      {#if pushSubscribed}
        <p class="chip mb-2 text-calm">✓ aktiv auf diesem Gerät</p>
        <div class="flex gap-2">
          <button class="btn-soft flex-1 text-sm" onclick={doTestPush}>🔔 Test senden</button>
          <button class="btn-ghost flex-1 text-sm" onclick={doUnsubscribe}>Push aus</button>
        </div>
      {:else if pushOffered}
        <p class="mb-2 text-sm text-ink-faint">
          Termine, Fristen und Medikation werden dann zugestellt, auch wenn die App zu ist.
        </p>
        <button class="btn-primary w-full" onclick={doSubscribe} disabled={pushBusy}>
          Push auf diesem Gerät aktivieren
        </button>
        {#if pushError}<p class="mt-2 text-sm text-gentle">{pushError}</p>{/if}
      {:else}
        <p class="text-xs text-ink-faint">
          Push braucht den App-Server (serve.js) und HTTPS. Solange die App offen ist,
          funktionieren Erinnerungen immer.
        </p>
      {/if}
    </div>
  </section>

  <!-- Medikation (PIN-geschützt, falls PIN gesetzt: Bestände/BTM sind Elternsache) -->
  <PinGate label="Medikation">
    <MedTracker />
  </PinGate>

  <!-- Übergabe-Modus -->
  <section class="card">
    <h2 class="mb-1 text-lg font-bold">🤝 Übergabe für Betreuer</h2>
    <p class="mb-3 text-sm text-ink-faint">
      Eine saubere „Spezialanleitung" (Routine, Medikationszeiten, De-Eskalations-Sätze) für Oma,
      Babysitter oder die Betreuung — zum Ausdrucken oder als PDF. Kein Neuerklären mehr.
    </p>
    <button class="btn-soft w-full" onclick={() => (showHandover = true)}>Anleitung erstellen</button>
  </section>

  <!-- Impulskauf-Parkplatz -->
  <WishPark />

  <!-- Doom Box (Archiv) -->
  <DoomBox />

  <!-- Foto-Helfer (Vision) -->
  <VisionTool />

  <!-- Wand-Tablet / Kiosk -->
  <section class="card">
    <h2 class="mb-1 text-lg font-bold">Wand-Tablet-Modus</h2>
    <p class="mb-3 text-sm text-ink-faint">
      Großflächige Ansicht für ein Familien-Tablet an der Wand: Tier, laufende Timer und „Jetzt dran".
    </p>
    <button class="btn-soft w-full" onclick={() => route.go("kiosk")}>🖥️ Hauptquartier öffnen</button>
  </section>

  <!-- JARVIS-Verbindung (PIN-geschützt) -->
  <PinGate label="Verbindung & Server">
    <ConnectionSettings />
  </PinGate>

  <!-- Datensicherung (PIN-geschützt: Import ersetzt Daten) -->
  <PinGate label="Daten sichern">
    <DataBackup />
  </PinGate>

  <!-- Eltern-PIN verwalten (Änderung erfordert die aktuelle PIN) -->
  <PinGate label="Eltern-PIN">
    <section class="card">
      <h2 class="mb-1 text-lg font-bold">🔒 Eltern-PIN</h2>
      <p class="mb-3 text-sm text-ink-faint">
        Schützt Medikation, Server-Einstellungen, Datensicherung und Löschaktionen. Alltag
        (Timer, Aufgaben, Routinen) bleibt für alle frei — Autonomie zählt.
      </p>
      <div class="flex gap-2">
        <input
          class="flex-1 rounded-2xl bg-surface-2 px-4 py-3 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-calm"
          type="password"
          inputmode="numeric"
          maxlength="8"
          placeholder={$settings.parentPin ? "Neue PIN" : "PIN festlegen (z. B. 4-stellig)"}
          bind:value={pinDraft}
        />
        <button class="btn-primary" onclick={savePin} disabled={pinDraft.length < 4}>Speichern</button>
      </div>
      {#if $settings.parentPin}
        <button class="btn-ghost mt-2 w-full text-sm" onclick={removePin}>PIN entfernen (Schutz aus)</button>
      {/if}
    </section>
  </PinGate>

  <!-- Zurücksetzen (PIN-geschützt) -->
  <PinGate label="Zurücksetzen">
  <section class="card">
    <h2 class="mb-1 text-lg font-bold">Zurücksetzen</h2>

    {#if activeRole === "parent" || activeRole === null}
      <p class="mb-2 text-sm text-ink-faint">Setzt nur das Tierwesen, die Münzen und Accessoires zurück.</p>
      <button class="btn-soft w-full" onclick={doPetReset} disabled={resetting}>🐣 Tier & Münzen zurücksetzen</button>
    {/if}

    {#if $connection.isAdmin}
      <div class="mt-4 rounded-2xl border border-gentle/40 p-3">
        <p class="font-semibold text-gentle">⚠️ Alles auf 0 (Voll-Reset)</p>
        <p class="mt-1 text-sm text-ink-soft">
          Löscht <strong>alle</strong> Familien-Daten (Aufgaben, Termine, Tagebuch, Medikation, Board …)
          lokal und auf dem Server. Verbindung & Accounts bleiben. Nicht umkehrbar.
        </p>
        <p class="mt-2 text-xs text-ink-faint">Zum Bestätigen „RESET" eintippen:</p>
        <input
          class="mt-1 w-full rounded-xl bg-surface-2 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gentle"
          bind:value={confirmFull}
          placeholder="RESET"
        />
        <button
          class="btn mt-2 w-full bg-gentle text-surface-0 {confirmFull === 'RESET' ? '' : 'opacity-50'}"
          disabled={confirmFull !== "RESET" || resetting}
          onclick={doFullReset}
        >
          Alles unwiderruflich löschen
        </button>
      </div>
    {:else}
      <p class="mt-3 text-xs text-ink-faint">
        Ein vollständiger Reset („alles auf 0") ist nur mit einem JARVIS-Admin-Account möglich.
      </p>
    {/if}
  </section>
  </PinGate>

  {#if $auth.required}
    <section class="card">
      <h2 class="mb-2 text-lg font-bold">Sitzung</h2>
      <p class="mb-3 text-sm text-ink-faint">
        Beim Abmelden wird das Familien-Passwort beim nächsten Öffnen wieder verlangt.
      </p>
      <button class="btn-soft w-full" onclick={() => auth.logout().then(() => location.reload())}>
        🔒 Abmelden
      </button>
    </section>
  {/if}
</div>

{#if showHandover}
  <Handover onclose={() => (showHandover = false)} />
{/if}
