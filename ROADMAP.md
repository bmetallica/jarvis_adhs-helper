# ADHS-Helper — Bau-Roadmap

**Lebendes Dokument.** Wird bei **jedem** Schritt aktualisiert. Quelle der Wahrheit für den
Implementierungsfortschritt. Konzept: [`KONZEPT.md`](KONZEPT.md) · Gateway-Spec:
[`material/pluginsystem.md`](material/pluginsystem.md).

Legende: ✅ fertig · 🔄 in Arbeit · ⬜ offen

**Stack (festgelegt):** Svelte 5 (Runes) · Vite 6 · TypeScript · Tailwind v3 · IndexedDB (`idb`) ·
offline-first PWA. Verzeichnis: `/opt/adhs-helper` (Root). Tier: wächst mit den Anwendern.

---

## Schritt 0 — Projekt-Fundament  ✅
- ✅ Svelte 5 + Vite 6 + TS + Tailwind v3 Scaffold, Build grün, `svelte-check` 0 Fehler
- ✅ PWA-Grundlagen (`manifest.webmanifest`, Service-Worker offline-Shell, Icons 192/512/maskable)
- ✅ IndexedDB-Persistenzschicht (`lib/db.ts` + KV-Helfer)
- ✅ App-Shell: Bottom-Nav (6 Ziele), Hash-Router, Design-Tokens, Dark-Mode-first, Reizarm-Modus
- ✅ Profil-/Avatar-Schnellumschalter (lokal, kein Login) + Profilverwaltung in „Ich"
- ✅ Verifiziert: Dev-Server liefert App/Manifest/SW/Icons (HTTP 200)

## Schritt 1 — Visueller Timer & Fokus  ✅
- ✅ TimerEngine (absolute Endzeit, driftfrei, IndexedDB-persistent; Pause/Resume/Restart/+min)
- ✅ Schrumpfscheibe (SVG) + Balken- + Punkte-Variante; Stil live umschaltbar; Vollbild-/Kioskmodus
- ✅ Presets (2–45 min) + Slider, mehrere parallele Timer, zentrale Uhr (ein Ticker)
- ✅ Sanfte Vorwarn-Marken (Farbwechsel zu Bernstein, weicher Ton + Haptik), ruhiges Ende (kein Alarm)
- ✅ „Erster Schritt — nur 2 Minuten"-Fokus-Session (Wall of Awful); laufende Timer auch auf Home
- ✅ Build + svelte-check grün

## Schritt 2 — Routinen, Tasks, Now-Next, Brain-Dump  ✅
- ✅ Routinen-Store + Builder, **Ein-Schritt-Fokus-Runner** (nur aktueller Schritt, Belohnungs-
  Animation, Schritt-Timer, „Nochmal"/Überspringen), 3 Vorlagen, Symbol-Schritte
- ✅ Now-Next-Board (Jetzt→Als Nächstes große Karten, Reihenfolge per ↑, „später heute")
- ✅ Tasks-Store; **globaler Brain-Dump** (schwebender 💡-Knopf, Text + Sprachnotiz via MediaRecorder,
  lokal gepuffert) + Posteingang mit 1-Tap-Aktionen (→ Aufgabe / erledigt / anhören / verwerfen)
- ✅ Zero-Text Check-in (Stimmung/Energie/Fokus, Emoji-Skalen)
- ✅ Home zeigt echte Jetzt/Als-Nächstes-Aufgaben; DB-Migration v3; Build + svelte-check grün (0/0)

## Schritt 3 — Terminmanagement & Planungs-Suite  ✅
- ✅ Termin-Modell mit **Vorlauf/Puffer → Losgeh-Zeit**, Begleitung, Vorbereitungs-Checkliste,
  Wiederholung (täglich/wöchentlich); Countdown „in X Schlafen / morgen / in N min" (`date.ts`)
- ✅ Mehrstufige sanfte Erinnerungen + automatische **„Jetzt losgehen"-Erinnerung** (`reminderWatcher`),
  lokale Zustellung (Notification-API + In-App-Toasts via `notify.ts`/`ToastHost`)
- ✅ Ruhige Kalender-Ansicht Heute/Morgen/Diese Woche/Später; Termin-Formular + -Karte
- ✅ Fristen mit Countdown + **„Wall of Awful"-Zerlegung** (nie rot überfällig)
- ✅ Einkaufsliste, Wochen-Essensplan, Gewohnheiten als **„Garten" ohne Streak-Scham**
- ✅ Home zeigt nächsten Termin + Losgeh-Hinweis; „Ich" bietet Erinnerungs-Erlaubnis
- ✅ Plan-Screen mit 7 Haupt-Tabs + inneren Umschaltern; DB v4; Build + svelte-check grün (0/0)

## Schritt 4 — Gamification: wachsendes Tier  ✅
- ✅ Pet-Engine (`pet.ts` + Store): kumulative XP (sinkt nie) treibt 7 Wachstumsstufen Ei→Leuchtwesen;
  separate Münz-Währung fürs Einlösen (Tier schrumpft nie) → RSD-Schutz
- ✅ **Canvas-Tier** das sichtbar mitwächst (Größe/Ohren/Aura je Stufe), sanfte Idle-Animation
  (Wippen/Blinzeln, respektiert reduce-motion); **Entdeckungsreise statt Tod** bei Inaktivität + Geschenk
- ✅ XP-Vergabe zentral in Stores/Watchern: Aufgaben/Routinen-Schritte/Routine fertig/Timer/
  Gewohnheiten/Einkauf/Check-in zahlen in **einen** Familien-Pool ein (kein Wettbewerb)
- ✅ Belohnungs-Laden (Token-Ökonomie, 4 Vorlagen + eigene), **sichtbarer Beitrag je Mitglied**
  (gegen Geschwister-Neid); Stufenaufstieg/Geschenk als Toast; Tier kompakt auf Home
- ✅ DB v5 (rewards) + pet im KV; Build + svelte-check grün (0/0)

## Schritt 5 — JARVIS-Anbindung & Verbindungs-Setup  ✅
- ✅ `jarvis/client.ts` (einziges Tor): Auth (Bearer + `X-JARVIS-User` + API-Version), Prioritäts-
  Queue (`queue.ts`, max 2 parallel), Single-Flight + Kurzzeit-Cache, Backoff bei 429/502/503,
  Fehler-Normalisierung (`JarvisError`). Methoden: me/chat/chatStream(SSE)/structure/stt/tts/
  ragInsert/ragQuery/storage*/notify/schedulerCreate + `connectEvents()` (WS)
- ✅ Verbindungs-Store + Settings-UI in „Ich": Basis-URL (IP→Domain, ein Feld), Plugin-Key,
  „Speichern & testen" (`/me`), Scope-Anzeige, **Zertifikats-Hinweis** bei Netzfehler (HTTPS+self-signed)
- ✅ Profil↔JARVIS-Nutzer-Mapping (`X-JARVIS-User`), `plugin.json`-Manifest (Spec Kap. 7)
- ✅ Build + svelte-check grün (0/0). KI bleibt optional; ohne Verbindung läuft alles offline weiter.

## Schritt 6 — KI-Veredelung (lastschonend)  ✅
- ✅ `ai.ts`-Schicht: jede KI-Aufgabe mit **lokalem Fallback** (KI nie Pflicht)
- ✅ Micro-Task-Parser (Routine aus Freitext) + Termin-Parser (Sprache/Text → Datum/Vorlauf/Prep)
  über `inference/structure`; lokale Heuristik-Splitter als Fallback
- ✅ Empathischer **Coach-Chat** (SSE-Streaming, ADHS/RSD-System-Prompt) + kuratierte
  De-Eskalations-Karten offline; global per „💬 Coach"
- ✅ STT-Transkription der Sprachnotizen im Posteingang (`audio/stt`)
- ✅ RAG-Tagebuch: Check-ins/Notizen → `rag/insert` (pro Nutzer), Muster-Suche `rag/query`,
  **nächtliche Off-Peak-Analyse** via Scheduler
- ✅ Build + svelte-check grün (0/0)

## Schritt 7 — Familie & Paar  ✅
- ✅ Mental-Load/Fair-Share: Verantwortungsbereiche mit Träger-Zuordnung + Verteilungsübersicht
  (Ton: Rebalancing, kein Aufrechnen); Vorschlagsliste häufiger Mental-Load-Quellen
- ✅ Wertschätzungs-/Wins-Feed (gegen Negativitäts-Bias & RSD), gerichtetes Danke
- ✅ Pause-/De-Eskalations-Protokoll mit Atem-Guide (4-4-6) + sanfter Wieder-Annäherungsfrage
- ✅ Wochen-Sync („Board Meeting", geführte Agenda, zeitbegrenzt, Notiz→Aufgabe)
- ✅ RSD-Kommunikations-Reframe (KI optional, Offline-Schablone) + „Symptom statt Absicht"
- ✅ Stores responsibilities/appreciations (DB v6); Build + svelte-check grün (0/0)

## Schritt 8 — Echtzeit & Multi-Device  ✅
- ✅ WebSocket-Transport (`jarvis/events.ts`): Connect/Reconnect-Backoff, Subscribe/Publish, Status
- ✅ Geräteübergreifende **Tier-XP-Sync** (`sync.ts`): Mirror in JARVIS-Shared-Storage (debounced) +
  XP-Event; eingehend → Pull + konvergenter Merge (XP wächst nur, kein Import-Zyklus via Publisher-Hook)
- ✅ Timer-Broadcast (andere Geräte bekommen Hinweis), Core-`timer_elapsed`-Toasts
- ✅ **Wand-Tablet-Kioskmodus** (`#/kiosk`): großes Tier + laufende Timer + „Jetzt dran", WS-Status,
  Wake-Lock; eigene Route ohne Header/Nav
- ✅ Offline-first bleibt: ohne Verbindung alles still & lokal. Build + svelte-check grün (0/0)

## Schritt 9 — Vision, Sensorik, Politur, Push  ✅
- ✅ Vision-Werkzeug (Beleg/Text-OCR, Medikament vorlesen, Aufräum-Check, Beschreiben) über
  `vision/*`; Foto per Kamera/Upload als data-URL; lokal kein Crash (Hinweis ohne Verbindung)
- ✅ Ruhe-Ecke (global): Atem-Guide (Box & 4-7-8) + Fidget-Canvas (Partikel folgen dem Finger);
  respektiert reduce-motion; Reizarm-Modus bereits vorhanden
- ✅ Barrierefreiheit: „Größere Schrift" + „Gut lesbare Schrift" (dyslexie-freundlich) als Schalter
- ✅ Web-Push im Service-Worker vorbereitet (push/notificationclick-Handler) — wirksam erst mit
  vertrauenswürdigem Kontext/gültigem Zert (Reverse-Proxy, siehe DEPLOY.md); lokale Erinnerungen
  funktionieren schon (Notification-API + Toasts, Schritt 3)
- ✅ Build + svelte-check grün (0/0)

## Infrastruktur — Debian-Dienst (systemd)  ✅
- ✅ Abhängigkeitsfreier Produktions-Server `server/serve.js` (SPA-Fallback, MIME, no-cache für
  Shell/SW, immutable Assets, Pfad-Schutz, optional TLS) — verifiziert (HTTP + HTTPS, Header)
- ✅ systemd-Unit `deploy/adhs-helper.service` (gehärtet), `EnvironmentFile=/etc/adhs-helper.env`
- ✅ `deploy/install.sh` (idempotent: User, build, Rechte, Unit), `deploy/gen-cert.sh` (self-signed
  mit SAN), `deploy/adhs-helper.env.example`
- ✅ Doku `DEPLOY.md` (Install, Konfiguration, TLS-Phasen IP→Reverse-Proxy, Update, Deinstallation)

---

## Nachträgliche Architektur-Änderung (Userwunsch)

### Zentrale Konfiguration & Accounts  ✅
- ✅ **Server-Proxy** in `server/serve.js`: `JARVIS_UPSTREAM`/`JARVIS_KEY`/`JARVIS_INSECURE`; leitet
  `/api/*` + WS `/api/v1/ws` an JARVIS weiter, Key serverseitig injiziert. `GET /app-config.json`.
  → zentrale Konfig, kein Key im Browser, **kein CORS/Zert-Problem** (same-origin). Getestet (Fake-Upstream).
- ✅ Client proxy-bewusst (`loadAppConfig`, `isProxyMode`): same-origin, kein Authorization-Header,
  WS same-origin; Settings-UI blendet Host/Key im Proxy-Modus aus.
- ✅ **Accounts = JARVIS-Nutzer**: `jarvis.users()` + `accounts.syncRoster()` → Roster auf jedem Gerät
  gleich (Profil-ID = Nutzername), Avatar/Farbe im geteilten Storage; `LoginGate` (Account-Auswahl).
- ✅ Folge umgesetzt: **Per-Account-Datensynchronisation** (`datasync.ts`) — persönliche Collections
  pro Account (scope=user) + Familien-Listen (Einkauf/Essensplan/Mental-Load, scope=shared) spiegeln
  als Snapshot+Revision in JARVIS-Storage; Account-Wechsel/WS/Focus-Pull. Transport getestet (Fake-KV).

## Erweiterungen nach Audit (Userwunsch)
- ✅ **Tier-Optik** je Stufe stark differenziert (Ei→Leuchtwesen) + **Accessoire-Shop** (kaufen/anlegen, im Canvas).
- ✅ **Belohnung eingelöst → Eltern-Benachrichtigung** (Board + WS + JARVIS-notify).
- ✅ **Familien-Nachrichtenboard** (Chat, lokal-first + Shared-Storage + WS) — DB v7.
- ✅ **Medikations-Tracker** (Einnahme/nächste Dosis/Rebound/Erinnerungen) — DB v8.
- ✅ **Mikrofon-Hinweis** bei unsicherem Kontext (HTTPS nötig für getUserMedia/STT).
- ✅ Funktions-Audit dokumentiert in `AUDIT.md`.

## Internet-Exposition (sicher)
- ✅ **Server-Proxy** macht JARVIS-Zugriff nur intern (JARVIS bleibt LAN-only; adhs-helper ist einziges
  Internet-Tor). Reverse-Proxy zeigt nur auf den adhs-helper. Doku in `DEPLOY.md`.
- ✅ **Master-Authentifizierung serverseitig** (`serve.js`): `APP_PASSWORD` → signiertes Session-Cookie,
  gated **/api/* und WebSocket** (Brute-Force-Limit). Client: `MasterLogin`-Overlay + 401-Handling +
  „Abmelden". Profil-Wechsel in der App bleibt frei. Getestet (401 ohne Login, Cookie-Flow).
- ✅ **Profilbild-Auswähler** (`AvatarPicker`): Avatar aus einer Bildreihe wählen (Anlegen + Bearbeiten).

## Familien-Koordination (Userwünsche)
- ✅ **Tagebuch-Tagesansicht**: Tag-für-Tag-Navigation; Tagesrückblick bündelt erledigte Aufgaben,
  Gewohnheiten, Medikation, Check-ins, Termine, Fokus-Notizen + eigene Einträge (volles Tagesbild).
- ✅ **Allgemeine Abstimmungen** (Familie → „Abstimmungen") + **Termin-Vorschlag als Abstimmung**:
  Home-Button „Termin anlegen" (manuell/Sprache), **Konfliktcheck Familienkalender**, Ja/Nein an
  Eingeladene; bei Zustimmung aller wird der Termin **automatisch angelegt**. Geteilt synchronisiert,
  Benachrichtigung via Board + JARVIS-notify + WS. (Optionaler JARVIS-Kalendercheck offen.)

## Änderungslog
- 2026-06-25: Roadmap erstellt; Konzept um Terminmanagement + Planungs-Suite (4.9–4.13) ergänzt;
  Tier-Entscheidung (wachsend) und Stack (Svelte 5) festgelegt. Schritt 0 begonnen.
- 2026-06-25: **Schritt 0 abgeschlossen** — Scaffold, PWA-Shell, IndexedDB, App-Shell mit 6-Ziel-
  Bottom-Nav, Profile + Reizarm-Einstellungen. Build + svelte-check grün, Dev-Server verifiziert.
  `@sveltejs/vite-plugin-svelte` auf v5 (Vite-6-kompatibel), `@types/node` ergänzt, Init ohne
  Top-Level-await. Nächster Schritt: visueller Timer (Schritt 1).
- 2026-06-25: **Schritt 1 abgeschlossen** — driftfreie TimerEngine (absolute Endzeit, persistent),
  drei visuelle Stile (Scheibe/Balken/Punkte) mit Vollbildmodus, Presets + parallele Timer, sanfte
  Vorwarnungen (Ton/Haptik/Farbwechsel) + ruhiges Ende, „Erster-Schritt"-Fokus. Zentrale Uhr +
  globaler Timer-Wächter. DB-Migration auf v2. Build + svelte-check grün. Nächster: Routinen/Tasks/
  Now-Next/Brain-Dump (Schritt 2).
- 2026-06-25: **Debian-Dienst gebaut & dokumentiert** (auf Wunsch vorgezogen) — `server/serve.js`,
  systemd-Unit, install/gen-cert-Skripte, `DEPLOY.md`. Server live getestet (HTTP+HTTPS, Header,
  SPA-Fallback, Pfad-Schutz). TLS-Test-Zertifikate wieder entfernt; `*.key/*.crt` ge-gitignored.
- 2026-06-25: **EADDRINUSE-Härtung** — `serve.js` fängt belegten Port sauber ab; Unit mit
  `StartLimitBurst`; Default-Port der Beispiel-Env auf 8096; Troubleshooting in `DEPLOY.md`.
- 2026-06-25: **Schritt 2 abgeschlossen** — Routinen (Builder + Ein-Schritt-Fokus-Runner + Vorlagen),
  Now-Next-Board, Tasks, globaler Brain-Dump (Text/Sprache) + Posteingang, Zero-Text-Check-in.
  Stores: tasks/routines/inbox/checkins (DB v3), UI-Store für Overlays. Build + svelte-check grün.
  Nächster: Terminmanagement & Planungs-Suite (Schritt 3).
- 2026-06-25: **Schritt 3 abgeschlossen** — Terminmanagement mit Vorlauf-/Losgeh-Zeit, Vorbereitungs-
  Checklisten, mehrstufigen Erinnerungen + „Jetzt losgehen"-Wächter, Kalender-Ansicht; Fristen mit
  Wall-of-Awful-Zerlegung; Einkauf, Essensplan, Gewohnheiten (Garten ohne Streak). `date.ts`,
  `notify.ts`/Toasts, `reminderWatcher`. Stores appointments/deadlines/shopping/meals/habits (DB v4).
  Build + svelte-check grün. Nächster: Gamification — wachsendes Tier (Schritt 4).
- 2026-06-25: **Schritt 4 abgeschlossen** — kooperatives Familien-Tier: Canvas-Wesen das mit der
  kumulativen XP wächst (7 Stufen, nie Tod/Schrumpfen), Entdeckungsreise + Geschenk, Münz-Belohnungs-
  Laden, sichtbarer Beitrag je Mitglied. XP-Hooks in tasks/habits/shopping/timer/routine/checkin
  (zentral, ein Feedback). `pet.ts`, stores/pet (DB v5). Build + svelte-check grün.
  Nächster: JARVIS-Anbindung & Verbindungs-Setup (Schritt 5).
- 2026-06-25: **Schritt 5 abgeschlossen** — `jarvis/client.ts` als einziges Gateway-Tor (Auth,
  Prioritäts-Queue, Single-Flight, Cache, Backoff, alle v1-Methoden + SSE + WS), Verbindungs-Store
  + Settings-UI (Host/Key/Test/Zert-Hinweis), Profil↔Nutzer-Mapping, `plugin.json`. Build + check grün.
  Nächster: KI-Veredelung (Schritt 6) — nutzt den Client lastschonend.
- 2026-06-25: **CORS-Diagnose** — Verbindungs-Fehler beim User war CORS (nicht Zertifikat). App zeigt
  jetzt beide Ursachen + curl-Test; JARVIS braucht CORSMiddleware (Memory `jarvis-cors-requirement`).
- 2026-06-25: **Schritt 6 abgeschlossen** — `ai.ts` mit Fallbacks: Routine-/Termin-Parser (structure),
  Coach-Chat (SSE) + Offline-Karten, STT-Transkription, RAG-Tagebuch + Muster-Suche + Off-Peak-Job.
  Build + svelte-check grün. Nächster: Familie & Paar (Schritt 7).
- 2026-06-25: **Schritt 7 abgeschlossen** — Beziehungsmodul: Mental-Load/Fair-Share, Wertschätzungs-
  Feed, Pause-Protokoll mit Atem-Guide, Wochen-Sync, RSD-Reframe. Store family (DB v6). Build grün.
  Nächster: Echtzeit & Multi-Device (Schritt 8).
- 2026-06-25: **Schritt 8 abgeschlossen** — WS-Transport (`events.ts`), Tier-XP-Sync über Shared-
  Storage + Events (`sync.ts`, Publisher-Hook gegen Zyklen), Timer-Broadcast, Kioskmodus (`#/kiosk`).
  Build + svelte-check grün. Nächster: Vision, Sensorik, Politur, Push (Schritt 9).
- 2026-06-25: **Schritt 9 abgeschlossen** — Vision-Werkzeug (OCR/Medikation/Aufräum-Check), Ruhe-Ecke
  (Atem + Fidget), Barrierefreiheit-Schalter (Schrift), Web-Push-Vorbereitung im SW.
  **Alle 10 Roadmap-Schritte (0–9) + Debian-Dienst abgeschlossen.** App offline-first, Build grün.
- 2026-06-25: **Zentrale Konfig + Accounts** (Userwunsch) — Server-Proxy (`serve.js`) leitet `/api/*`
  + WS an JARVIS weiter (Key serverseitig), Client proxy-bewusst, Accounts = JARVIS-Nutzer mit Roster
  auf jedem Gerät + `LoginGate`. Proxy mit Fake-Upstream getestet, Build + svelte-check grün.
  Behebt nebenbei das CORS-/Zertifikatsproblem (same-origin).
- 2026-06-26: **Profil-Bearbeitung** — Avatar/Name/**Rolle** (Elternteil/Kind/Weitere) pro Profil in
  „Ich" editierbar; Änderung wird via `pushRosterMeta` im geteilten Storage geteilt (alle Geräte).
  Build + svelte-check grün.
- 2026-06-26: **Audit-Erweiterungen** — Nachrichtenboard, Belohnungs-Benachrichtigung an Eltern,
  Medikations-Tracker, Tier-Optik+Accessoires, Mikrofon/HTTPS-Hinweis, `AUDIT.md`. Build + check grün.
  Erkenntnis: Mikrofon/STT braucht HTTPS (secure context) — App-Server mit TLS starten (DEPLOY.md).
- 2026-06-26: **Per-Account-Datensynchronisation** (`datasync.ts`) — persönliche Daten folgen dem
  Login über alle Geräte (scope=user), Familien-Listen geteilt (scope=shared); Snapshot+Revision,
  Account-Wechsel-/WS-/Focus-Pull, Abo-basiert ohne Store-Umbau. Transport via Fake-KV getestet,
  Build + svelte-check grün.
- 2026-06-26: **Audit-Runde 2** — Reframe-Fix (Streaming+Timeout), Accessoire-Rendering-Fix, Reset-
  Buttons (Tier/Münzen + admin-gated Voll-Reset), **Hyperfokus-Helfer** mit harter Unterbrechung +
  Notiz-Outbox nach Obsidian, **Tagebuch** als 📔-Hauptpunkt (schreiben/lesen/Muster), **Kiosk neu**
  (Wochenkalender + Essen, Familienchat, Tier klein unten rechts). DB v9, 7-Ziel-Nav. Build+check grün.
- 2026-06-26: **Internet-Sicherheit** — serverseitige Master-Auth (Cookie, gated /api/* + WS, Rate-Limit),
  `MasterLogin`-Overlay, Abmelden; Reverse-Proxy/JARVIS-LAN-only in `DEPLOY.md`. **Profilbild-Picker**
  aus Bildreihe. Server-Auth + gebauter Stand getestet (401/Cookie/Shell). Build + svelte-check grün.
- 2026-06-26: **Tagebuch-Tagesansicht** (Tagesrückblick aller Aktivitäten) + **Abstimmungen** (allgemein
  + Termin-Vorschlag mit Konfliktcheck & Auto-Anlage). Stores polls (DB v10), in Shared-Sync. Build grün.
- 2026-06-26: **„Braucht deine Aufmerksamkeit"** auf Home (offene Abstimmungen/Termin-Anfragen, fällige
  Medikation, Tier-Geschenk, Posteingang) + Badges an der Bottom-Nav (Familie/Plan). Build + check grün.
