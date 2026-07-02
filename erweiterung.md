# Erweiterung & Verbesserung — Ideensammlung (Stand: Juli 2026)

> **Status: ✅ vollständig umgesetzt (Juli 2026).** Alle Punkte A1–A11, B1–B11 und C1–C4 sind
> implementiert (B8 in Stufe 1: geteilter Fokus-Status mit Anfeuern; die synchrone
> Live-Fokus-Session über WebSocket bleibt als mögliche Stufe 2 offen).
> Details siehe ROADMAP.md (Changelog) und DEPLOY.md (Web-Push, ICS, Docker).

Ergebnis eines kompletten Projekt-Reviews (KONZEPT.md, ROADMAP.md, ROADMAP_V2.md, AUDIT.md, Quellcode).
Gegliedert in: **A** Härtung des Bestehenden, **B** neue ADHS-Module, **C** Infrastruktur, **D** Priorisierung.

Jeder Vorschlag nennt das ADHS-Problem dahinter (**Warum**), den Anknüpfungspunkt im Code und eine grobe Aufwandsschätzung (S/M/L).

---

## A. Verbesserungen am Bestehenden

### A1. Echtes Web-Push (Erinnerungen bei geschlossener App) — **wichtigste Lücke** (L)
**Warum:** Erinnerungen sind für ADHS nur wertvoll, wenn sie *ankommen*. Aktuell nutzt `notify.ts` die
Notification-API — die funktioniert nur, solange die App/der Tab offen ist. Genau der Mensch, der die
Erinnerung braucht, hat die App aber gerade nicht offen.
**Wie:** Push-API + VAPID. Der Node-Server (`server/serve.js`) kann VAPID-JWTs mit `node:crypto` (ES256)
selbst signieren — bleibt zero-dependency. Subscriptions pro Account speichern, `reminderWatcher`-Logik
serverseitig spiegeln (Termine/Deadlines/Medikation sind ohnehin im Sync-Snapshot). TLS ist durch den
Reverse-Proxy bereits vorhanden.
**Teilschritt mit sofortigem Nutzen:** JARVIS `notify` (Telegram-Kanal) als Fallback für kritische
Erinnerungen (Medikation, Termin-Vorlauf) — der Client (`jarvis/client.ts`) hat `notify()` schon.

### A2. Alarm-Lautstärke & -Dauer konfigurierbar (S)
**Warum:** Reizempfindlichkeit ist bei ADHS sehr individuell — für den einen ist der neue laute Alarm
perfekt, für den anderen ein Overwhelm-Trigger.
**Wie:** Slider „Alarm-Lautstärke" + Auswahl „Alarmton" (2–3 Klangprofile) in „Ich" → `settings`,
in `feedback.ts` (`tone`, `startAlarm`) auswerten. War bereits angeboten, noch offen.

### A3. Wake Lock bei laufendem Timer/Routine (S)
**Warum:** Der visuelle Timer externalisiert Zeit — aber nur, wenn der Bildschirm anbleibt. Geht das
Display aus, ist die Zeit wieder „unsichtbar".
**Wie:** `navigator.wakeLock.request("screen")` in `FullscreenTimer.svelte` und `RoutineRunner.svelte`,
Release bei Ende/Verlassen. Zwei Dutzend Zeilen.

### A4. App-Icon-Badge für „braucht Aufmerksamkeit" (S)
**Warum:** Der Aufmerksamkeits-Indikator auf der Startseite wirkt erst *nach* dem Öffnen. Out of sight,
out of mind — der Badge holt die Info aufs Homescreen-Icon.
**Wie:** Badging-API (`navigator.setAppBadge(n)`) mit derselben Zählung, die der Home-Indikator nutzt.

### A5. PWA-Shortcuts (Homescreen-Schnellaktionen) (S)
**Warum:** Jeder Zwischenschritt kostet bei ADHS Anlauf-Energie. Lange drücken → „SOS", „Timer",
„Brain-Dump" spart die kritischen 3 Sekunden, in denen der Gedanke sonst weg ist.
**Wie:** `shortcuts` im `manifest.webmanifest` + Query-Param-Routing in `router.ts`
(z. B. `/?open=sos|braindump|timer`).

### A6. Daten-Export/Import als Datei (M)
**Warum:** Sicherheitsnetz. Der Account-Sync (JARVIS-Storage) ist gut, aber ein manuell erzeugtes
JSON-Backup schützt vor Server-Verlust, Migrationsfehlern und gibt Datensouveränität (Tagebuch!).
**Wie:** In „Ich" → „Daten": alle IndexedDB-Stores (`db.ts`, v11) als eine JSON-Datei exportieren,
Import mit Vorschau („X Einträge, Stand …") und ausdrücklicher Bestätigung.

### A7. Eltern-PIN für sensible Bereiche (M)
**Warum:** Der freie Profilwechsel ist gewollt und bleibt. Aber Medikations-Bestände, Vorrats-Zahlen
(BtM!), Diary-Insights und Server-Einstellungen sollten Kinder nicht ändern können.
**Wie:** Optionale 4-stellige PIN in `settings`; Gate als kleine Overlay-Komponente vor
Medikations-Verwaltung, Verbindungs-/Servereinstellungen und Löschaktionen. Bewusst *nicht* vor
Alltagsfunktionen — Autonomie-Prinzip (§1.3 KONZEPT.md) bleibt gewahrt.

### A8. Update-Hinweis des Service Workers (S)
**Warum:** PWAs hängen gern auf alten Versionen fest; Nutzer sehen Fixes nicht und melden „Fehler",
die längst behoben sind.
**Wie:** `registration.onupdatefound` → sanfter Toast „Neue Version — jetzt neu laden" (ToastHost
existiert schon).

### A9. Sync-Robustheit: Konflikte sichtbar machen (M)
**Warum:** `datasync.ts` macht Last-Writer-Wins auf Collection-Ebene. Wenn zwei Elternteile offline
gleichzeitig ändern, verliert einer *still* seine Änderungen — für ADHS besonders toxisch, weil es
sich wie „Ich habe es doch eingetragen?!" anfühlt (Selbstzweifel, RSD).
**Wie (pragmatisch, kein CRDT):** Merge auf Datensatz-Ebene per `updatedAt` je Item statt pro
Collection; wo das nicht geht, Konflikt-Toast („Einkaufsliste wurde parallel geändert — bitte kurz
prüfen") statt stillem Überschreiben.

### A10. Sicherheits-Header & Session-Übersicht am Server (S–M)
**Warum:** Die App ist internetexponiert; Master-Auth und Rate-Limit existieren, aber Standard-Header fehlen.
**Wie:** In `server/serve.js` `Content-Security-Policy`, `X-Content-Type-Options`,
`Referrer-Policy`, `Strict-Transport-Security` (hinter TLS) setzen; `/healthz`-Endpoint für
Uptime-Monitoring; optional „Alle Geräte abmelden" (Session-Secret-Rotation per Admin-Aktion).

### A11. Tests für die kritischen Pfade (M)
**Warum:** Das Projekt ist auf ~70 Quelldateien gewachsen, alles ungetestet. Regressionsgefahr am
höchsten bei: Timer-Mathematik (`endsAt`, Pause/Resume), Sync-Merge, Server-Auth.
**Wie:** Vitest für `timers`-Logik, `datasync`-Merge und Token-Signierung (`makeToken`/`verifyToken`
als reines Modul extrahieren). Kein UI-Test-Theater — nur die drei Stellen, wo Fehler wehtun.

---

## B. Neue ADHS-Module

### B1. Losgeh-Rechner (Rückwärtsplanung für Übergänge) (M) — **fachlich stärkster Neuzugang**
**Warum:** Zeitblindheit trifft am härtesten beim *Losgehen*: Termin 15:00 fühlt sich bis 14:55 wie
„ewig hin" an. Übergänge (Transitions) sind der häufigste Eskalationspunkt in ADHS-Familien.
**Wie:** An Terminen (`appointments`) optionale Kette: Wegzeit + Anziehen/Packen + Puffer →
errechneter „Losmach-Zeitpunkt" mit gestaffelten Vorwarnungen (nutzt `reminderWatcher` + `warnAtSec`-
Muster der Timer). Anzeige auf der Startseite: „🚪 14:25 losmachen für Pfadfinder".

### B2. Zeitschätzungs-Trainer (M)
**Warum:** Zeitblindheit ist kalibrierbar. Wer schwarz auf weiß sieht „Du schätzt Duschen auf 10 min,
real sind es im Schnitt 22", plant realistischer — ohne Moralkeule.
**Wie:** Bei Tasks/Routine-Schritten optional „geschätzt" erfassen, gemessene Dauer steht schon in den
Timern. Auswertung neutral in DiaryInsights („Deine Duschen-Realzeit: Ø 22 min"); der Losgeh-Rechner
(B1) nutzt die gelernten Realwerte als Vorschlag.

### B3. Dopamin-Menü (S–M)
**Warum:** Etabliertes ADHS-Selbsthilfe-Konzept: Im Moment der Unterstimulation fällt einem *nichts*
ein — eine vorbereitete Karte mit schnellen Belohnungen/Pausen löst das. Passt perfekt zwischen
Pausen-Protokoll und Reward-Shop.
**Wie:** Pro Profil gepflegte Liste in Kategorien („Vorspeise" 2 min / „Hauptgang" 20 min /
„Beilage" nebenbei). Einstiegspunkte: Pausen-Protokoll, Warte-Modus (B4), Home. Neuer synced Store
`dopamine`, UI analog Safe-Food-Joker.

### B4. Warte-Modus („Waiting Mode"-Hilfe) (M)
**Warum:** Bekanntes Phänomen: Vor einem Termin um 15:00 ist der ganze Tag ab 12:00 blockiert
(„ich kann jetzt nichts mehr anfangen"). Kostet Familien massiv Kapazität.
**Wie:** Erkennen „nächster Termin in X min" → Vorschläge passender Größe aus Now-Next-Tasks,
Routine-Schritten und Dopamin-Menü: „Noch 40 min — genug für: 🍽️ Spüler ausräumen (10) oder
🧺 Wäsche umladen (5)". Rein lokal, keine KI nötig.

### B5. Hausaufgaben per Foto (M)
**Warum:** Der Zettel-/Hefteintrag ist die klassische Verlustschnittstelle Schule↔Zuhause.
**Wie:** Vorhandene Bausteine kombinieren: Foto → JARVIS `vision` + `structure` → Deadline-Einträge
(`deadlines`-Store) mit Fach und Abgabedatum, atomisiert in erste Schritte. Offline: Foto landet als
Inbox-Item in der Queue (Outbox-Muster existiert).

### B6. Impulskauf-Parkplatz (S)
**Warum:** Impulskäufe sind ein zentrales ADHS-Geldproblem. Der Trick ist nicht Verbot, sondern
*Aufschub mit Würdigung*: „Ist notiert!" beruhigt das Dopamin-System.
**Wie:** Wunschliste mit 14/30-Tage-Reifezeit; danach neutrale Frage „Willst du das noch?" —
Doom-Box-Philosophie (`doombox.ts`) für Geld. Ein-Tipp-Erfassung vom Brain-Dump aus.

### B7. Reparatur-Ritual nach Konflikten (M)
**Warum:** RSD + Impulsivität ⇒ Eskalationen passieren. Entscheidend für die Beziehung ist die
*Reparatur* danach — und genau dafür fehlen im Affekt die Worte. Ergänzt Reframe (vorher) und
SOS (währenddessen) um das *danach*.
**Wie:** Geführtes Kurz-Skript (3 Schritte: Was war los bei mir / Was tut mir leid / Was wünsche ich
mir), optional KI-formuliert (Reframe-Pipeline mit `chatStream` existiert), als „Reparatur-Karte" ans
Familienboard. Beide bestätigen → kleiner gemeinsamer Pet-XP-Bonus.

### B8. Body-Doubling / „Ich arbeite gerade an…" (M–L)
**Warum:** Body-Doubling ist eine der wirksamsten nicht-medikamentösen ADHS-Strategien. In einer
Familien-App liegt der Partner dafür schon vor.
**Wie:** Stufe 1 (M): Status „🔨 Daniel fokussiert gerade: Steuer (noch 18 min)" über den vorhandenen
Sync sichtbar machen; andere können ein 👍 senden (`notifyReward`-Muster). Stufe 2 (L): gemeinsame
Fokus-Session mit synchronem Timer über den WebSocket-Kanal.

### B9. Abend-Modul: Wind-down gegen Revenge Bedtime Procrastination (M)
**Warum:** Schlafmangel verschärft *alle* ADHS-Symptome; das abendliche „Endlich-meine-Zeit"-Aufschieben
ist der häufigste Auslöser. Abendroutinen existieren, aber nichts zieht sanft *in* sie hinein.
**Wie:** Konfigurierbares Schlaffenster pro Profil; ab Wind-down-Zeit: App dimmt ins Calm-Theme,
neutrale Erinnerung („Dein Morgen-Ich freut sich über 7 h"), Ein-Tipp-Start der Abendroutine.
Auswertung Schlaffenster × Stimmung (Check-ins) in DiaryInsights.

### B10. Medikations-Peak-Fenster nutzen (S–M)
**Warum:** Stimulanzien haben ein Wirkfenster (~30 min bis ~4 h nach Einnahme). Schwere Aufgaben in
den Peak zu legen ist einer der größten Hebel im Alltag — kaum eine App macht das.
**Wie:** Aus `MedTracker`-Einnahmezeitpunkten ein „Fokus-Fenster" ableiten (Dauer pro Medikament
konfigurierbar, keine medizinischen Ratschläge — nur Anzeige). Home zeigt „🟢 Fokus-Fenster noch
~2 h" und schlägt die schwerste Now-Aufgabe vor.

### B11. Familien-Quests (M)
**Warum:** Das Pet belohnt Einzelne; ein *gemeinsames* Ziel („500 XP zusammen → Pizza-Abend") koppelt
Kooperation an Belohnung statt an Ermahnung — und entlastet die Eltern-als-Antreiber-Rolle.
**Wie:** Shared-Store `quests` (Muster: `polls.ts`), Fortschrittsbalken auf dem Familienboard,
alle Pet-XP-Quellen zahlen ein, Einlösung als gemeinsames Reward-Shop-Item.

---

## C. Infrastruktur & Integration

### C1. ICS-Kalender-Feed vom Server (M)
**Warum:** Termine leben nie nur in einer App. Ein Abo-Feed bringt die Familientermine in native
Kalender (Handy-Sperrbildschirm!) — und Schul-/Vereinskalender per ICS-Import in die App.
**Wie:** `server/serve.js` liefert `/calendar.ics` (Token-geschützt, read-only) aus dem
Termine-Snapshot; Import-Seite parst ICS-Dateien/URLs in `appointments`. ICS ist Plaintext —
zero-dependency machbar.

### C2. Docker-Deployment als Alternative (S)
**Warum:** systemd-Setup ist dokumentiert und läuft; für andere GitHub-Nutzer ist `docker compose up`
die niedrigste Einstiegshürde.
**Wie:** Ein schlankes `Dockerfile` (Build-Stage + `node server/serve.js`), `compose.yaml` mit
Env-Beispielen, Abschnitt in DEPLOY.md.

### C3. Kiosk-/Wandtablet-Ausbau (M)
**Warum:** Ein Tablet an der Küchenwand ist die beste Externalisierung: niemand muss daran denken,
die App zu öffnen. Der Kiosk-Screen existiert, ist aber statisch.
**Wie:** Rotierende Karten (Jetzt/Gleich, heutige Termine mit Losgeh-Zeit aus B1, Familienboard,
Abstimmungen), Auto-Refresh über den Sync, Tag-/Nacht-Dimmen, Touch = kurz Vollansicht.

### C4. Wöchentlicher KI-Familienrückblick (Off-Peak) (M)
**Warum:** DiaryInsights blickt aufs Individuum; ein sanfter Wochenrückblick („3 gemeinsame Erfolge,
1 wiederkehrender Stressor: Mittwoch-Morgen") macht Muster sichtbar, die im Alltag untergehen.
**Wie:** JARVIS `schedulerCreate` (existiert im Client) nachts/Off-Peak — passt zur
Lastschonungs-Anforderung; Ergebnis als Karte im Weekly-Sync-Ritual. Strikt stärkenorientiert
formulieren (RSD-Schutz), niemals Vergleiche zwischen Personen.

---

## D. Priorisierung (Empfehlung)

**Stufe 1 — Quick Wins (je < 1 Tag):**
A2 Alarm-Slider · A3 Wake Lock · A4 Icon-Badge · A5 PWA-Shortcuts · A8 Update-Hinweis · A10 Security-Header · B6 Impulskauf-Parkplatz

**Stufe 2 — größter Alltagsnutzen:**
A1 Web-Push (Kern-Lücke!) · B1 Losgeh-Rechner · A6 Export/Import · B3 Dopamin-Menü · B4 Warte-Modus · A7 Eltern-PIN

**Stufe 3 — Vertiefung:**
B2 Zeitschätzungs-Trainer · B5 Hausaufgaben-Foto · B9 Abend-Modul · B10 Peak-Fenster · C1 ICS-Feed · A9 Sync-Konflikte · A11 Tests

**Stufe 4 — größere Vorhaben:**
B7 Reparatur-Ritual · B8 Body-Doubling · B11 Familien-Quests · C3 Kiosk-Ausbau · C4 KI-Wochenrückblick · C2 Docker

**Roter Faden:** Erst zustellsicher machen (A1 — die beste Erinnerung nützt nichts, wenn sie nicht
ankommt), dann Übergänge entschärfen (B1/B4 — der häufigste Familien-Reibungspunkt), dann vertiefen.
