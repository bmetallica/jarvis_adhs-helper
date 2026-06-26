import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";
import { settings } from "$lib/stores/settings";
import { profiles } from "$lib/stores/profiles";
import { timers } from "$lib/stores/timers";
import { tasks } from "$lib/stores/tasks";
import { routines } from "$lib/stores/routines";
import { inbox } from "$lib/stores/inbox";
import { checkins } from "$lib/stores/checkins";
import { appointments } from "$lib/stores/appointments";
import { deadlines } from "$lib/stores/deadlines";
import { shopping } from "$lib/stores/shopping";
import { meals } from "$lib/stores/meals";
import { habits } from "$lib/stores/habits";
import { pet, rewards } from "$lib/stores/pet";
import { responsibilities, appreciations } from "$lib/stores/family";
import { messages } from "$lib/stores/messages";
import { medications } from "$lib/stores/medications";
import { outbox } from "$lib/stores/outbox";
import { diary } from "$lib/stores/diary";
import { polls } from "$lib/stores/polls";
import { initSync } from "$lib/sync";
import { loadAppConfig, setUnauthorizedHandler } from "$lib/jarvis/client";
import { syncRoster } from "$lib/stores/accounts";
import { auth } from "$lib/stores/auth";
import { registerSynced, initDataSync } from "$lib/datasync";

// Welche Collections wie synchronisiert werden (persönlich = pro Account, Familie = geteilt).
function registerSyncCollections() {
  registerSynced({ name: "tasks", scope: "user", store: tasks });
  registerSynced({ name: "routines", scope: "user", store: routines });
  registerSynced({ name: "appointments", scope: "user", store: appointments });
  registerSynced({ name: "deadlines", scope: "user", store: deadlines });
  registerSynced({ name: "habits", scope: "user", store: habits });
  registerSynced({ name: "checkins", scope: "user", store: checkins });
  registerSynced({ name: "medications", scope: "user", store: medications });
  registerSynced({ name: "diary", scope: "user", store: diary });
  // Familien-geteilt:
  registerSynced({ name: "shopping", scope: "shared", store: shopping });
  registerSynced({ name: "meals", scope: "shared", store: meals });
  registerSynced({ name: "responsibilities", scope: "shared", store: responsibilities });
  registerSynced({ name: "polls", scope: "shared", store: polls });
}

async function init() {
  // Server-Konfiguration laden (entscheidet zentraler Proxy vs. direkte Verbindung).
  await loadAppConfig();

  // Master-Auth-Status prüfen; bei 401 später erneut prüfen (Session abgelaufen).
  setUnauthorizedHandler(() => auth.onUnauthorized());
  await auth.check();

  // Stores aus IndexedDB vorladen, bevor die App rendert.
  await settings.load();
  await profiles.load();
  await timers.load();
  await Promise.all([
    tasks.load(),
    routines.load(),
    inbox.load(),
    checkins.load(),
    appointments.load(),
    deadlines.load(),
    shopping.load(),
    meals.load(),
    habits.load(),
    pet.load(),
    rewards.load(),
    responsibilities.load(),
    appreciations.load(),
    messages.load(),
    medications.load(),
    outbox.load(),
    diary.load(),
    polls.load(),
  ]);

  mount(App, { target: document.getElementById("app")! });

  // Geräteübergreifende Sync starten (nur wenn JARVIS konfiguriert; sonst still).
  initSync();

  // Familien-Roster aus JARVIS laden (Accounts erscheinen auf jedem Gerät). Best effort.
  void syncRoster();

  // Per-Account-Datensynchronisation (Daten folgen dem Login).
  registerSyncCollections();
  initDataSync();

  // Service Worker registrieren (Offline-Shell). Fehler bewusst still — App läuft auch ohne
  // (z. B. unsicherer Kontext bei IP + selbstsigniertem Zertifikat).
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}

void init();
