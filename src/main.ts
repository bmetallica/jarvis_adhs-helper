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
import { locations } from "$lib/stores/locations";
import { safefoods } from "$lib/stores/safefoods";
import { pharmacy } from "$lib/stores/pharmacy";
import { wishes } from "$lib/stores/wishes";
import { dopamine } from "$lib/stores/dopamine";
import { quests } from "$lib/stores/quests";
import { repairs } from "$lib/stores/repairs";
import { focusstatus } from "$lib/stores/focusstatus";
import { initAppBadge } from "$lib/attention";
import { initPushPlanSync } from "$lib/push";
import { initIcsSync } from "$lib/ics";
import { openBrainDump, openSos } from "$lib/stores/ui";
import { pushToast } from "$lib/notify";
import { runDoomBoxDaily } from "$lib/doombox";
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
  registerSynced({ name: "wishes", scope: "user", store: wishes });
  registerSynced({ name: "dopamine", scope: "user", store: dopamine });
  // Familien-geteilt:
  registerSynced({ name: "shopping", scope: "shared", store: shopping });
  registerSynced({ name: "meals", scope: "shared", store: meals });
  registerSynced({ name: "responsibilities", scope: "shared", store: responsibilities });
  registerSynced({ name: "polls", scope: "shared", store: polls });
  registerSynced({ name: "locations", scope: "shared", store: locations });
  registerSynced({ name: "safefoods", scope: "shared", store: safefoods });
  registerSynced({ name: "pharmacy", scope: "shared", store: pharmacy });
  registerSynced({ name: "quests", scope: "shared", store: quests });
  registerSynced({ name: "repairs", scope: "shared", store: repairs });
  registerSynced({ name: "focusstatus", scope: "shared", store: focusstatus });
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
    locations.load(),
    safefoods.load(),
    pharmacy.load(),
    wishes.load(),
    dopamine.load(),
    quests.load(),
    repairs.load(),
    focusstatus.load(),
  ]);

  mount(App, { target: document.getElementById("app")! });

  // App-Icon-Badge an „braucht Aufmerksamkeit" koppeln (Badging-API, best effort).
  initAppBadge();

  // PWA-Shortcuts (Homescreen-Schnellaktionen): ?open=sos|braindump öffnet das Overlay direkt.
  const open = new URLSearchParams(location.search).get("open");
  if (open === "sos") openSos();
  else if (open === "braindump") openBrainDump();

  // Geräteübergreifende Sync starten (nur wenn JARVIS konfiguriert; sonst still).
  initSync();

  // Familien-Roster aus JARVIS laden (Accounts erscheinen auf jedem Gerät). Best effort.
  void syncRoster();

  // Per-Account-Datensynchronisation (Daten folgen dem Login).
  registerSyncCollections();
  initDataSync();

  // Doom-Box: einmal täglich stilles Einschläfern alter, unangetasteter Dinge.
  void runDoomBoxDaily();

  // Web-Push: Erinnerungs-Plan aktuell halten (nur wenn dieses Gerät abonniert hat).
  initPushPlanSync();

  // ICS-Feed: Termine für das Kalender-Abo aktuell halten (best effort).
  initIcsSync();

  // Service Worker registrieren (Offline-Shell). Fehler bewusst still — App läuft auch ohne
  // (z. B. unsicherer Kontext bei IP + selbstsigniertem Zertifikat).
  // Bei neuer Version: sanfter Hinweis mit „Neu laden" (PWAs hängen sonst auf altem Stand fest).
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.addEventListener("updatefound", () => {
            const w = reg.installing;
            if (!w) return;
            w.addEventListener("statechange", () => {
              if (w.state === "installed" && navigator.serviceWorker.controller) {
                pushToast("Neue Version verfügbar", "Einmal neu laden, dann bist du aktuell.", {
                  sticky: true,
                  action: { label: "Neu laden", run: () => location.reload() },
                });
              }
            });
          });
        })
        .catch(() => {});
    });
  }
}

void init();
