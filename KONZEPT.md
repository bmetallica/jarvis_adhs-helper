# ADHS-Helper — Vollständiges Anwendungskonzept (PWA)

**Status:** Konzept v1 · **Datum:** 2026-06-25 · **Sprache:** Deutsch
**Rolle im Ökosystem:** Externes Plugin (Typ A) für JARVIS, angebunden über das
Gateway `/api/v1/*` (siehe `material/pluginsystem.md`).
**Leitsatz:** *Die App ist das externe Arbeitsgedächtnis und der neutrale Dritte einer
neurodiversen Familie — nie der Antreiber, nie der Richter.*

---

## 0. Wie dieses Dokument zu lesen ist

Jedes Feature ist gegen ein **konkretes ADHS-Problem** begründet (Abschnitt 1). Wo ein
Feature JARVIS braucht, ist der Gateway-Endpunkt genannt; alles andere läuft **rein lokal in
der PWA** und funktioniert auch offline / bei ausgelastetem KI-Server. Das ist Absicht
(Abschnitt 7 „Lastschonung").

Reihenfolge: erst das *Warum* (ADHS in Familie & Beziehung), dann das *Was* (Module &
Features), dann das *Wie* (Technik, JARVIS-Anbindung, Host/Zertifikat, Datenschutz, UX,
Roadmap).

---

## 1. Designgrundlage: ADHS in Familie & Beziehung

Diese App ist kein Produktivitäts-Tool mit ADHS-Aufkleber. Sie ist um die spezifische
Neurobiologie herum gebaut. Die folgenden Phänomene sind die **Anforderungsquelle** für alles
Weitere.

### 1.1 Die individuellen Kernprobleme

| Phänomen | Was es bedeutet | Konsequenz fürs Design |
|---|---|---|
| **Zeitblindheit** (Time Blindness, Barkley) | Zeit wird nicht „gefühlt". „Gleich" und „in 2 Stunden" fühlen sich identisch an. | Zeit muss **visuell und konkret** werden (schrumpfende Scheibe), nie nur als Uhrzeit. |
| **Arbeitsgedächtnis-Defizit** | Aufgaben verdampfen mitten im Tun. „Aus den Augen = aus dem Sinn" (Objektpermanenz). | App ist **externer Speicher**: sichtbar, persistent, an die Oberfläche gepusht. |
| **Task-Initiierung / „Wall of Awful"** (Mahan) | Wissen, was zu tun ist, aber nicht starten können. Lähmung, nicht Faulheit. | **Atomisierung** (ein Mini-Schritt), „nur 2 Minuten"-Einstieg, sanfte Aktivierung statt Druck. |
| **Rejection Sensitivity Dysphoria (RSD)** (Dodson) | Wahrgenommene Kritik/Versagen löst körperlichen Schmerz aus. | **Kein Rot, kein „Fehlgeschlagen", keine zerbrechenden Streaks, kein Ranking.** „Vergebungsmodus". |
| **Variable Kompetenz** | Heute perfekt, morgen unmöglich — bei gleicher Aufgabe. | Nie Konsistenz unterstellen. Kein „aber gestern ging es doch!". |
| **Dopamin-Defizit / Reizhunger** | Belohnung muss **sofort, neu, spürbar** sein. Aufgeschobene Belohnung wirkt nicht. | Sofort-Feedback, Variabilität, Haptik/Sound, Gamification. |
| **Emotionale Dysregulation** | Große Emotionen, schnelle Eskalation (v. a. Kinder). | De-Eskalations- und Co-Regulations-Werkzeuge, „Pause"-Mechanik. |
| **Übergänge (Transitions)** | Wechsel zwischen Aktivitäten ist überproportional schwer. | Übergangs-Vorwarnung, Countdown, Übergangs-Rituale. |
| **Hyperfokus** | Tiefe Versenkung — produktiv oder familien-vergessend. | Sanfte „Auftauch"-Erinnerungen, kein abruptes Abreißen. |
| **Demand Avoidance (PDA-Spektrum)** | Direkte Aufforderung triggert Verweigerung. | Wahl-Framing, indirekte/spielerische Prompts, Autonomie wahren. |
| **Schlafdysregulation** | Verzögerte Schlafphase, „Revenge Bedtime Procrastination". | Sanfte Wind-down-Routinen, kein moralischer Zeigefinger. |

### 1.2 Die Beziehungs- und Familiendynamik (oft unterschätzt)

ADHS ist kein Einzelproblem — es prägt das **System Familie**. Die App adressiert ausdrücklich
diese Muster (Grundlage u. a. M. Orlov, *The ADHD Effect on Marriage*; Hallowell/Barkley):

1. **Eltern-Kind-Falle in der Partnerschaft.** Der weniger betroffene Partner rutscht in die
   Rolle des „Managers/Elternteils", der erinnert, kontrolliert, nachhält. Der ADHS-Partner
   fühlt sich kontrolliert/beschämt → zieht sich zurück. Das tötet Augenhöhe und Romantik.
   → **Lösung: die App übernimmt das Erinnern/Nachhalten (der „neutrale Nörgler"),** damit kein
   Mensch nörgeln muss.

2. **Der Nörgel-Rückzug-Zyklus.** Erinnerung wird als Vorwurf gehört (RSD) → Rückzug →
   Partner fühlt sich allein gelassen → Frust → Eskalation. → **Lösung: neutrale, nicht-wertende
   Erinnerungen + RSD-bewusste Kommunikations-Reframes.**

3. **Unsichtbare „Mental Load"-Schieflage.** Termine, Essensplanung, Bedürfnisse der Kinder im
   Kopf behalten ist unsichtbare Arbeit. Bei ADHS landet sie oft ungewollt einseitig.
   → **Lösung: Mental-Load-Sichtbarmachung (Fair-Share), gemeinsame Übernahme durch JARVIS.**

4. **Symptom vs. Charakter.** Eine vergessene Aufgabe wird als Respektlosigkeit gelesen, ist
   aber ein Symptom. → **Lösung: aktive „Symptom-nicht-Absicht"-Reframes, Wins-Feed gegen
   Negativitäts-Bias.**

5. **Geschwister-Dynamik.** Das ADHS-Kind bindet Aufmerksamkeit/Ausnahmen → Geschwister fühlen
   sich übersehen. → **Lösung: kooperatives Familien-Haustier (kein Einzel-Wettbewerb), jedes
   Mitglied zahlt sichtbar ein.**

6. **Co-Betroffene Eltern.** Ein ADHS-Elternteil managt die Aufgaben des Kindes und vergisst die
   eigenen. → **Lösung: die App trägt das Arbeitsgedächtnis für *beide Generationen* parallel.**

### 1.3 Die acht Designgesetze (verbindlich für alle Features)

1. **Vergebung statt Versagen.** Nichts „stirbt", nichts wird rot, nichts beschämt. Inaktivität
   → sanfter Neustart, nicht Strafe.
2. **Zeit wird sichtbar.** Jede Wartezeit/Dauer hat eine konkrete visuelle Form.
3. **Atomisieren.** Große Dinge zerfallen immer in einen nächsten Mini-Schritt.
4. **Sofort belohnen.** Feedback ist unmittelbar, spürbar (Animation/Haptik/Sound), variabel.
5. **Externalisieren.** Die App erinnert; der Mensch muss nichts im Kopf behalten.
6. **Neutral erinnern.** Die App nörgelt, nicht der Partner. Ton immer auf Augenhöhe.
7. **Autonomie wahren.** Wahlmöglichkeiten statt Befehle; Spiel statt Druck (Demand Avoidance).
8. **Offline zuerst.** Kernfunktionen (Timer, Routinen, Pet) laufen ohne Netz und ohne KI.

---

## 2. Personas & Nutzungskontext

- **Vater (selbst ADHS).** Braucht Mental-Load-Entlastung, Fokus-Pläne, Brain-Dump,
  Medikations-/Rebound-Tracking, neutrale Erinnerungen ohne Beschämung.
- **Mutter (nicht/leicht betroffen).** Will raus aus der Manager-Rolle, faire Lastverteilung,
  weniger nörgeln, mehr Wertschätzung.
- **Lukas (Kind, ADHS).** Braucht Morgen-/Abendroutine, visuelle Timer, sofortige Belohnung,
  Übergangshilfen, Autonomie-wahrende Aufforderungen.
- **Geschwisterkind.** Will gesehen werden, gleichberechtigt einzahlen.
- **Profile sind Rollen, keine harten Accounts:** Ein Gerät (Familien-Tablet, Eltern-Handy) kann
  schnell zwischen Profilen wechseln (großer Avatar-Umschalter, kein Passwort-Zwang im Alltag).
  Jeder Profil-Wechsel mappt auf einen JARVIS-Nutzer (`X-JARVIS-User`), damit RAG/Storage pro
  Person getrennt bleiben.

---

## 3. App-Landkarte (Informationsarchitektur)

Bewusst flach (ADHS: wenig Navigationslast). Eine **Bottom-Bar mit max. 5 großen, symbolischen
Zielen**, plus ein zentraler „Jetzt"-Screen als Startpunkt.

```
┌─────────────────────────────────────────────────────────────┐
│  JETZT  (Home)                                               │
│  · Now/Next-Karte · großer Aktiv-Timer · 1-Tap Brain-Dump    │
│  · Familien-Haustier (Mini) · „Was als Nächstes?"-Button     │
├──────────┬──────────┬──────────┬──────────┬──────────────────┤
│  Plan    │  Timer   │   Pet/HQ │  Familie │   Ich            │
│ Termine· │ & Fokus  │ Gamific. │ & Paar   │  (Profil/Health) │
│ Routinen·│          │          │          │                  │
│ Tasks    │          │          │          │                  │
└──────────┴──────────┴──────────┴──────────┴──────────────────┘
   Brain-Dump-Knopf ist global (schwebend), immer 1 Tap entfernt.
   Coach (KI) ist global per Mikrofon-/Chat-Knopf erreichbar.
   Einstellungen/Admin separat (selten genutzt) über „Ich".
```

Module im Überblick:

- **Jetzt (Home):** der einzige Screen, den man im Stress braucht.
- **Plan:** Terminmanagement/Kalender, Routine-Builder, Tagesplan, Now-Next, Checklisten,
  Besorgungen/Einkauf, Essensplan, Fristen, Gewohnheiten.
- **Timer & Fokus:** visuelle Timer, Body-Doubling, Übergänge.
- **Pet/HQ:** kooperatives Tamagotchi/Hauptquartier, XP, Belohnungen.
- **Familie & Paar:** Mental-Load/Fair-Share, neutrale Erinnerungen, Wins-Feed, Pause-Protokoll,
  Wochen-Sync, Kommunikations-Reframes.
- **Ich:** Profil, Stimmung/Energie-Check-in, Medikation/Gesundheit, Tagebuch, Sensorik/Calm.
- **Coach (global):** empathischer KI-Chat + Sprachnotiz.
- **Einstellungen/Admin:** JARVIS-Verbindung (Host/Zertifikat/Key), Profile↔Nutzer-Mapping,
  Benachrichtigungen, Datenschutz.

---

## 4. Nicht-KI-Kernfunktionen (das Fundament)

> Diese laufen **vollständig lokal** (IndexedDB + Canvas + Web-APIs). Kein Server, kein GPU.
> Sie sind die Existenzberechtigung der App auch bei totalem JARVIS-Ausfall.

### 4.1 Visueller Timer („Schrumpfscheibe") — das Herzstück gegen Zeitblindheit
- **Time-Timer-Prinzip:** ein farbiger Kreissektor, der sichtbar schrumpft. Man *sieht*
  verrinnende Zeit, ohne lesen/rechnen zu müssen.
- **Mehrere Darstellungen wählbar:** Scheibe · Balken · verblassende Punkte · „schmelzender"
  Block · Sanduhr. (Novelty + persönliche Passung.)
- **Vollbildmodus** (Kioskartig, für Wand-Tablet/Kinderzimmer), Querformat, große Ablesbarkeit.
- **Übergangs-Vorwarnung:** konfigurierbare Marken (z. B. „noch 5/2/1 min") mit visuellem
  Farbwechsel (sanft, **nie aggressives Rot/Blinken**), optional Vibration (Web Vibration API),
  optional Ton/Sprachausgabe.
- **Keine Strafe bei Ablauf:** Timer endet ruhig („Zeit ist um — alles gut"), kein Alarm-Stress.
- **Mehrere parallele Timer** (Eier kochen + Zähneputzen + Hausaufgaben) mit Mini-Kacheln.
- **Schnellstart-Presets** (2/5/10/20 min) als große Buttons, plus „letzte Timer".
- **Läuft im Hintergrund robust:** Endzeit wird als Zeitstempel gespeichert → korrekt auch nach
  App-Schließen/Reload (kein driftender JS-Intervall als „Wahrheit").

### 4.2 Routinen & atomare Checklisten
- **Routine-Builder:** Routine = geordnete Liste atomarer Schritte, je Schritt optional eine
  Dauer (→ eigener Mini-Timer pro Schritt).
- **Ein-Schritt-Fokus-Modus:** zeigt nur den *aktuellen* Schritt groß (Rest ausgeblendet) — gegen
  Überforderung. „Erledigt"-Tap → nächster Schritt mit Belohnungs-Mikroanimation.
- **Vorlagen:** Morgen-, Schul-, Abend-, Hausaufgaben-, Aufräum-, Wind-down-Routine.
- **Bild-/Symbol-Schritte** (Zero-Text-Entry): Schritte können reine Icons/Fotos sein (Kinder,
  Nicht-Leser, hohe kognitive Last).
- **Zielzeit-Anker:** „Um 7:45 am Bus" → Routine rechnet rückwärts, zeigt „du liegst gut/knapp"
  (visuell, ohne Beschämung).
- **Wiederherstellbar:** Routine abgebrochen? „Sanfter Neustart"-Button, kein Fortschrittsverlust
  als Drama.

### 4.3 Now-Next-Board (visueller Tagesplan)
- **„Jetzt → Als Nächstes"** als zwei große Karten — das stärkste Anti-Überforderungs-Pattern für
  ADHS/Autismus. Optional erweiterbar auf Tages-Streifen.
- **Drag-&-Drop**-Umsortieren, Foto-/Symbolkarten.
- **Übergangs-Ritual:** Beim Wechsel kurze Animation + optionaler 60-Sekunden-Übergangstimer
  („wir machen gleich X fertig, dann kommt Y").

### 4.4 Brain-Dump / Quick-Capture (gegen Arbeitsgedächtnis-Verlust)
- **Global, 1 Tap, null Reibung:** schwebender Knopf → sofort Texteingabe **oder** Sprachnotiz.
  Gedanke ist gesichert, bevor er verdampft. Keine Pflichtfelder, keine Kategorien.
- **Posteingang („Mind-Sweep"):** alles landet in einem Eingang; Sortieren/Aufräumen ist
  *optional* und später (Trennung von Erfassen und Verarbeiten).
- **Offline-fähig:** Sprachnotiz wird lokal gepuffert, Transkription (KI) erfolgt opportunistisch,
  wenn JARVIS verfügbar ist (Abschnitt 7).
- **1-Tap-Aktionen** auf einen Eintrag: → Aufgabe, → Timer, → Tagebuch, → Erinnerung, → verwerfen.

### 4.5 Stimmungs-, Energie- & Fokus-Check-in (Zero-Text)
- **Drei Schieber/Emoji-Reihen:** Stimmung · Energie · Fokus. 3 Taps, fertig.
- **Tageskurve** als ruhige Visualisierung (für sich selbst, nie als Bewertung).
- Speist (mit Einwilligung) das Tagebuch/RAG → spätere Mustererkennung (z. B. „Fokus-Crash 15
  Uhr" wie in der Idee).

### 4.6 Body-Doubling- & Fokus-Sessions
- **„Gemeinsam arbeiten"-Modus:** flexibler Pomodoro (Dauer frei, Pausen optional, **kein** starres
  Schema — ADHS-Realität). Sichtbarer Timer + sanftes Ambient-Geräusch wählbar.
- **„Erster Schritt"-Knopf:** verpflichtet nur zu 2 Minuten („Wall of Awful" überwinden). Danach
  freiwillig weiter — meist bleibt man dran.
- **Optionales soziales Body-Doubling:** ein Familienmitglied startet eine Session, andere können
  per Event (WS) „mitmachen" (gemeinsamer Fokus, gegenseitige Aktivierung).

### 4.7 Sensorik & Co-Regulation („Ruhe-Ecke")
- **Atem-Guides** (visuell expandierender Kreis: 4-7-8 / Box-Breathing).
- **Beruhigende Canvas-Spielereien** (Fluid/Partikel/„Fidget"-Flächen) als digitaler Stim-/
  Runterkomm-Ort.
- **Reizarmer Modus:** ein Tap dimmt UI, entfernt Animationen, reduziert auf das Nötigste
  (für Overload-Momente).

### 4.8 Token-/Belohnungs-Ökonomie (Kinder, aber auch Erwachsene)
- **Selbst definierte Belohnungs-Menüs** („Belohnungs-Laden"): erspielte XP/Token gegen reale
  Belohnungen (Bildschirmzeit, Ausflug, Wunsch) eintauschbar.
- **Sofort-Token** bei erledigtem Schritt (Dopamin jetzt), Sammelziel sichtbar als Fortschritt.
- **Variable Belohnung** (gelegentliches „Überraschungs-Plus") — neurobiologisch wirksamer als
  fixe Beträge.

---

### 4.9 Terminmanagement / Familienkalender (gegen Zeitblindheit & Mental Load)

> Eigenes, ADHS-gerechtes Termin-Subsystem — **nicht** ein klassischer überladener Kalender.
> Lokal-first; optional Spiegelung in JARVIS-Storage (geteilt) und Erinnerungen über
> `channels/notify`. KI nur zum *Erfassen* (Sprache/Freitext → Termin, 7.1).

- **Zeitblindheits-gerechte Darstellung:** Termine werden primär als **„in X Schlafen / in Y
  Stunden"** und als **Countdown** gezeigt, nicht nur als Datum. Ein Termin „nächsten Dienstag"
  ist für ein ADHS-Gehirn sonst gleich weit weg wie „irgendwann".
- **Vorlauf statt nur Startzeit (der wichtigste Unterschied):** Jeder Termin kennt
  **Losgeh-/Vorbereitungszeit + Pufferzeit**. Die App erinnert an „**Jetzt losmachen**" (inkl.
  geschätzter Fahrt-/Fertigmach-Zeit), nicht erst an die Startuhrzeit. Das adressiert
  Time-Blindness und das „zu spät, weil ich die Vorlaufzeit nicht gefühlt habe"-Problem direkt.
- **Vorbereitungs-Checkliste pro Termin:** Ein Termin kann eine angehängte atomare Checkliste
  haben (z. B. Arzttermin → „Versichertenkarte, Überweisung, Impfpass, Fragenliste"). Verknüpft mit
  Routinen (4.2) und Besorgungen (4.10).
- **Mehrstufige, sanfte Erinnerungen:** konfigurierbare Vorwarnstufen (z. B. Tag vorher · 2 h ·
  „losgehen jetzt"). Eskalations-sanft, kanal-bewusst (PWA-Push/Telegram/Satellit), wiederholend
  bis **visuell bestätigt** (Objektpermanenz-Lösung aus der Idee).
- **Geteilter Familienkalender + Sichtbarkeit der Last:** Wer hat welchen Termin, **wer bringt/
  begleitet** (z. B. „wer fährt Lukas zur Logopädie?"). Speist die Mental-Load-Sicht (6.1) — Termine
  sind ein Hauptteil unsichtbarer Last.
- **Wiederkehrende Termine & Serien** (Therapie wöchentlich, Medikamenten-Rezept monatlich) inkl.
  **Rezept-/Nachschub-Erinnerung** (Verzahnung mit Medikation 1.1/Health).
- **Ruhige Kalender-Ansicht:** Standard ist **Heute/Morgen/Diese Woche** als Liste großer Karten
  (kein überladenes Monatsraster). Monatsraster nur optional/aufklappbar.
- **Übergang Termin → Tag:** anstehende Termine erscheinen automatisch auf dem **Now-Next-Board**
  (4.3) und als aktiver Countdown auf **Jetzt** (Home), sobald der Vorlauf beginnt.
- **Robust offline:** alle Termine + Erinnerungs-Zeitstempel lokal (IndexedDB). Erinnerungen
  feuern lokal (Notification/Alarm bei offener App / via SW-Push wenn verfügbar) **und** werden bei
  Verbindung zusätzlich über JARVIS-Kanäle ausgespielt (Doppel-Sicherung gegen Vergessen).
- **Optionale externe Kalender:** Falls JARVIS Kalender-Tools bereitstellt, Anbindung über die
  Tools-Bridge (`tools/{name}/invoke`) — sonst eigenständig.

### 4.10 Besorgungen & Einkauf (gemeinsame Listen, sofort erfassbar)
- **Geteilte Einkaufs-/Besorgungslisten** (Familien-Pool, `?scope=shared`), live-synchron über alle
  Geräte (WS) — „Milch ist alle" einmal getippt, alle sehen es.
- **1-Tap / Sprach-Hinzufügen** (Zero-Friction, Brain-Dump-Verwandt): kein Vergessen mehr im Laden.
- **Abhaken mit Sofort-Feedback**; erledigte Besorgungen zahlen optional XP ins Tier ein.
- **Verknüpfung mit Terminen/Essensplan:** Termin-Vorbereitung oder Rezept kann Artikel auf die
  Liste schieben.

### 4.11 Essensplanung (entlastet eine klassische ADHS-Mental-Load-Quelle)
- **Wochen-Essensplan** als ruhige Karten (Frühstück/Mittag/Abend optional). Reduziert die tägliche
  „Was kochen wir?"-Entscheidungslast (Decision Fatigue).
- **Rezept-/Favoriten-Pool** mit „auf Plan ziehen"; Zutaten → automatisch auf Einkaufsliste (4.10).
- **Niedrigschwellig:** auch nur „heute: Nudeln" ist erlaubt — kein Pflicht-Vollplan.

### 4.12 Fristen, Rechnungen & Behörden-Mental-Load
- **Fristen-Tracker** für die typisch ADHS-gefährdeten Dinge: Rechnungen, Steuerbelege,
  Behördenpost, Anträge, Verträge/Kündigungen. Mit **Countdown + Vorlauf** wie bei Terminen (4.9).
- **„Wall of Awful"-Modus** für gefürchtete Aufgaben: zerlegt eine angstbesetzte Aufgabe (Steuer)
  in Mini-Schritte (4.2) + „nur 2 Minuten"-Einstieg (4.6), statt sie als einen Block zu zeigen.
- **Beleg-Foto/OCR** (7.7) hängt Belege direkt an eine Frist/Kategorie (entlastet die Steuer-Mappe).
- **Sanfte, wiederholte Erinnerung** ohne Beschämung; nichts wird je „rot überfällig".

### 4.13 Gewohnheiten & sanftes Tracking (ohne Streak-Scham)
- **Gewohnheits-Anker** (Wasser trinken, Bewegung, Schlaffenster, Medikation) als ruhige,
  **ketten-frei** gestaltete Tracker — **kein „Streak gebrochen"** (RSD-Schutz).
- **Visualisierung als Sammlung/Garten**, nicht als lückenlose Kette: jeder Tag ist additiv positiv,
  Aussetzer hinterlassen keine Lücke/Schuld.
- Speist (optional) das Tier (5) und das Tagebuch/Muster (7.5).

## 5. Gamification: Das kooperative Familien-Haustier / Hauptquartier

(Aus der Idee übernommen und ausgebaut. **Reine Client-Logik**; JARVIS speichert nur Zustand im
geteilten Storage-Namespace `?scope=shared`.)

- **Ein gemeinsames Wesen/HQ**, kein Wettbewerb. Kinder (Zähneputzen) und Eltern (Steuerbeleg,
  pünktliche Medikation) zahlen in **denselben Dopamin-Pool**.
- **Kann nie sterben** (RSD-Schutz). Bei Inaktivität geht es „auf Entdeckungsreise" und bringt bei
  Rückkehr kleine Geschenke mit → Wiedereinstieg fühlt sich *belohnend* statt beschämend an.
- **Wachsendes Tier (festgelegt):** ein Tier, das **mit den Anwendern mitwächst** — vom Ei/Baby über
  Stufen zu größeren, sich verändernden Formen, freigeschaltet durch gemeinsame XP. Optisches
  Wachstum + neue Fähigkeiten/Animationen/Deko als Langfrist-Motivation **ohne Verlustangst** (es
  schrumpft/stirbt nie; Inaktivität = „Entdeckungsreise", nicht Rückschritt). Ein wachsendes
  Familien-Hauptquartier ist eine spätere optionale Erweiterung um das Tier herum.
- **Sichtbarer Beitrag jedes Mitglieds** (gegen Geschwister-Neid): „Lukas hat das Tier heute satt
  gemacht, Papa hat ihm ein neues Spielzeug besorgt."
- **Live-Sync über alle Geräte** (WS `jarvis/plugin/adhs/gamification/xp`): Wenn irgendwo ein Task
  erledigt wird (auch per Smart-Schalter via JARVIS-Core-Event), reagiert das Tier sofort auf allen
  Displays (Handy, Wand-Tablet, Desktop).
- **Canvas/HTML5-Animation**, performant, läuft offline mit lokalem Zustand und reconciled bei
  Reconnect.

---

## 6. Familie & Paar — das Beziehungsmodul (Kern-Differenzierung)

> Adressiert direkt Abschnitt 1.2. Dieses Modul macht aus einer ADHS-App eine *Familien*-App.

### 6.1 Mental-Load / Fair-Share-Sicht
- **Sichtbarmachung unsichtbarer Arbeit:** wer hält gerade welche „offenen Schleifen" (Aufgaben,
  Termine, Erinnerungen, Verantwortungsbereiche)?
- **Ton: Rebalancing, nicht Aufrechnen.** Keine Punkte-Konkurrenz zwischen Partnern, keine
  Schuld-Visualisierung. Ziel ist Gespräch, nicht Beweisführung.
- **„Verantwortungsbereiche"** statt nur Einzeltasks (z. B. „Arzttermine Kinder", „Müll/Recycling")
  — sichtbar einem Träger zugeordnet, leicht übergebbar.

### 6.2 Der „neutrale Nörgler" (Beziehungs-Schutz Nr. 1)
- **Erinnerungen kommen von der App/JARVIS, nicht vom Partner.** Das durchbricht die
  Eltern-Kind-Falle: niemand muss kontrollieren, niemand fühlt sich kontrolliert.
- Erinnerungen sind **eskalations-sanft** (Idee: „elastische Deadlines"): verschobene Aufgabe blinkt
  nicht rot, sondern wird still verschoben + „sanfter Neustart" angeboten.
- **Kanal-bewusst** über `channels/notify`: landet dort, wo die Person gerade aktiv ist (PWA-Push,
  Telegram, Raum-Satellit als Sprachhinweis).

### 6.3 Wertschätzungs-/Wins-Feed (gegen Negativitäts-Bias & RSD)
- **Tägliche kleine Wertschätzung** zwischen Partnern (1 Tap: „Danke, dass du heute X gemacht
  hast"). ADHS-Beziehungen leiden an Kritik-Überhang; bewusste Positiv-Signale wirken stark.
- **Erfolgs-Feed der Familie:** erledigte Dinge erscheinen als ruhige Positiv-Liste (kein
  To-do-Friedhof). „Erledigt" wird gefeiert, „offen" nie angeprangert.

### 6.4 Pause-/De-Eskalations-Protokoll (Co-Regulation für Paare *und* Kinder)
- **Gemeinsamer „Wir brauchen eine Pause"-Knopf:** Eine Person signalisiert Dysregulation; beide
  bekommen einen ruhigen Pausen-Timer + eine sanfte Wieder-Annäherungs-Frage danach.
- Verhindert RSD-getriebene Eskalation im Affekt. **Nicht-wertend**: Pause = Selbstfürsorge, nicht
  Rückzug/Bestrafung.
- **Kinder-Variante:** „Ampel-/Vulkan"-Visualisierung der eigenen Anspannung + Calm-Ecke (4.7) als
  Co-Regulations-Angebot statt Time-out-Strafe.

### 6.5 RSD-bewusste Kommunikations-Reframes (KI-gestützt, optional)
- **„Sag es so, dass es ankommt":** Eine Bitte/Nachricht wird optional umformuliert, sodass sie
  RSD nicht triggert (Vorwurf raus, Wertschätzung/Konkretheit rein). Nutzt den Coach-LLM
  (`inference/chat`), bleibt aber **Vorschlag**, nie Automatik.
- **„Symptom, nicht Absicht"-Reframe:** Bei einer vergessenen Sache bietet die App proaktiv die
  Lesart „das ist ein Arbeitsgedächtnis-Symptom" an — entschärft die Charakter-Zuschreibung.

### 6.6 Wöchentlicher Paar-/Familien-Sync („Board Meeting")
- **Strukturierter, niedrigschwelliger Wochen-Check-in** (bekanntes ADHS-Paar-Werkzeug): kurze
  Agenda-Vorlage (Wins der Woche · was lief schwer · kommende Woche · eine Bitte je Person).
- **Geführt & zeitbegrenzt** (eigener visueller Timer, damit es nicht ausufert/eskaliert).
- Ergebnisse fließen in Aufgaben/Verantwortungsbereiche & Tagebuch.

---

## 7. KI-gestützte Funktionen (über JARVIS-Gateway)

> Alle KI-Funktionen sind **Veredelung**, nicht Voraussetzung. Sie respektieren die
> Ressourcengrenzen des KI-Servers (siehe 7.6 Lastschonung). Endpunkte gemäß
> `pluginsystem.md` Anhang A.

### 7.1 Micro-Task-Parser → `POST /api/v1/inference/structure`
Freitext/Sprache → striktes JSON. Zwei Schemata: (a) **Routine** aus atomaren Schritten mit Dauern
und Zielzeit (Kern für 4.2); (b) **Termin** aus Freitext („Lukas Logopädie nächsten Di 15 Uhr,
30 min Fahrt") → Datum/Zeit/Vorlauf/Begleitung/Vorbereitung (Kern für 4.9). Schema fix;
Validierungs-/Repair-Schleife serverseitig.
*Fallback ohne KI:* lokaler Heuristik-Splitter (Satz-/Zeilen-Zerlegung, Default-Dauern) bzw.
einfaches Datums-Parsing; Nutzer kann manuell verfeinern.

### 7.2 Empathischer Eltern-/Alltags-Coach → `POST /api/v1/inference/chat` (SSE)
- Eigener System-Prompt: deeskalierend, ADHS-/RSD-bewusst, lösungsorientiert, deutsch.
- Anwendungsfälle: „Kind verweigert Socken", „ich krieg gerade nichts auf die Reihe", „wie sage
  ich das meinem Partner ohne Streit".
- **Streaming (satzweise)** für sofortiges Erscheinen am Handy.
*Fallback ohne KI:* kuratierte De-Eskalations-Skripte/Karten (lokal), keine leere Hülle.

### 7.3 Sprachnotiz → Text → `POST /api/v1/audio/stt`
Brain-Dump (4.4) und Tagebuch (7.5) per Stimme. Aufnahme lokal gepuffert, Transkription
opportunistisch. Eltern können „formlos loggen", wie in der Idee.

### 7.4 Sprachausgabe / Vorlesen → `POST /api/v1/audio/tts` (+ `deliver=announce`)
- Schritt-Ansagen, sanfte Erinnerungen, Vorlesen für Nicht-Leser/Kinder.
- **Kanal-bewusst:** direkt auf Raum-Satellit/Browser ausspielen statt Bytes zu laden
  (`?deliver=announce&session_id=…`). Kein Doppel-TTS (Designgesetz der Spec).

### 7.5 RAG-Tagebuch & Mustererkennung → `rag/insert` + `rag/query`
- **Formloses Logbuch** pro Familienmitglied (eigener Namespace `u<uid>`): „Lukas heute unruhig",
  „Fokus-Crash 15 Uhr", „Rebound 16:15".
- **Muster-Abfragen** (vom Nutzer angestoßen *oder* nächtlich geplant, 7.6): „Wie liefen Nachmittage
  mit früher Medikation?" → relevante Schnipsel → LLM-Auswertung → ruhige Einsicht/Empfehlung.
- **Hochsensible Daten** → strikt pro Nutzer isoliert, lokal, kein Cloud-Egress (Spec Kap. 11).

### 7.6 „Lass JARVIS es erledigen" → `inference/agent` + `tools/{name}/invoke`
- Für „mach mir die Morgenroutine als Aufgaben + stell Timer": Agenten-Tool-Loop bzw. gezielter
  Tool-Aufruf (`set_timer`, `add_todo`, Kalender, Smarthome via MCP) — ohne Nachbau in der PWA.

### 7.7 Vision → `vision/analyze` · `vision/ocr` · `vision/classify`
- **Medikationsschachtel scannen** (Dosierung vorlesen), **Belege/Dokumente OCR** (Steuer-Mental-
  Load), **„Zimmer aufgeräumt?"-Klassifikation** als spielerischer Aufräum-Check, **Hausaufgaben-
  Foto** als Coach-Kontext. Bilder als base64/Upload (GPU-Server ohne Internet).

---

## 8. Lastschonung & Resilienz (für den ressourcenbegrenzten KI-Server)

> Direkt auf deine Hardware-Realität gemünzt (begrenzte Modelle/Slots, 1 Slot je Modell). Die App
> ist so gebaut, dass sie den Server **nie überrennt oder blockiert** — und ohne ihn weiter nutzbar
> bleibt.

1. **Offline-/Local-First als Grundhaltung.** Alle Kap.-4/5/6-Funktionen ohne Serverkontakt. KI
   ist additiv. Fällt JARVIS/GPU aus, bleibt die App voll bedienbar (mit Fallbacks 7.1/7.2).
2. **Client-seitige Anfrage-Queue mit Single-Flight & Debounce.** KI-Calls laufen über eine
   Warteschlange; identische gleichzeitige Anfragen werden dedupliziert; Tipp-getriebene Calls
   debounced. Kein Sturm paralleler Requests.
3. **Prioritätsklassen.**
   - *Interaktiv/hoch:* Coach-Chat, STT einer aktiven Sprachnotiz, akuter Strukturieren-Aufruf.
   - *Hintergrund/niedrig:* Tagebuch-Mustersuche, Vision-Batch, Vorab-Strukturierung → **deferbar**.
   Niedrigprio-Jobs werden bei Last zurückgestellt oder in Off-Peak verschoben.
4. **Off-Peak per Scheduler.** Schwere/nicht-dringende Analysen (RAG-Muster, Wochen-Insights) als
   geplanter Job (`POST /api/v1/scheduler/jobs`, z. B. nachts) statt in Echtzeit → nutzt freie
   GPU-Zeit, blockiert nie den Familienalltag.
5. **Caching.** Strukturieren-Ergebnisse, Coach-Antworten und wiederkehrende Routinen-Parsings
   werden lokal gecacht (gleiche Eingabe → kein erneuter Call).
6. **Graceful Degradation bei 429/502** (`rate_limited`/`upstream_unavailable` aus der Spec):
   Statt Blockade ruhige Statusanzeige („JARVIS ist gerade beschäftigt — ich versuch's gleich
   nochmal") + automatischer Backoff-Retry. **Nie** ein hängendes UI.
7. **Optimistic UI.** Lokale Aktion zeigt sofort Wirkung (Task angelegt, XP gutgeschrieben),
   Server-Reconciliation passiert asynchron. Latenz des Servers ist für den Nutzer unsichtbar.
8. **Sparsame Modelle/Modi.** `think:false` als Default wo möglich, knappe `max_tokens`,
   Streaming für gefühlte Schnelligkeit. Kleine/lokale Modelle (`model:"local-default"`) bevorzugen.
9. **Ein Live-Kanal statt Polling.** Echtzeit ausschließlich über den **einen** WS
   (`/api/v1/ws`), kein HTTP-Polling-Hammer.

---

## 9. Technische Architektur der PWA

### 9.1 Empfohlener Stack
- **Svelte 5 + Vite + TypeScript.** Begründung: winzige Runtime → **Sofort-Start** (für ADHS
  kritisch), exzellente Reaktivität für Timer/Animationen, einfaches mentales Modell, gut für eine
  schlanke, schnell ladende PWA. *Alternative, falls maximale Abhängigkeitsfreiheit gewünscht:*
  Vanilla + Web Components (Lit). Reine UI-Logik, wie die Spec es beschreibt.
- **Tailwind CSS** für ein konsistentes, token-basiertes Designsystem (Dark-Mode-first).
- **HTML5 Canvas** für Tamagotchi/HQ und die Timer-Scheiben (eigenständige Render-Layer).
- **IndexedDB** (Wrapper `idb`) als lokale Quelle der Wahrheit; **localStorage** nur für
  Verbindungs-/Settings.
- **Service Worker** (Workbox oder handgerollt): Offline-Cache (App-Shell + Assets), Hintergrund-
  Sync für gepufferte Aktionen, später Web-Push (siehe 10).

### 9.2 Schichten
```
┌───────────────────────────────────────────────┐
│ UI (Svelte-Komponenten, Tailwind)              │
│  · Home/Now-Next · Timer · Routinen · Pet ·    │
│    Familie/Paar · Coach · Settings             │
├───────────────────────────────────────────────┤
│ Zustand (Stores): Profile, Tasks, Routinen,    │
│  Timer, Pet/XP, Familie, Inbox, Settings       │
├───────────────────────────────────────────────┤
│ Domänen-Services (framework-agnostisch):       │
│  TimerEngine · RoutineEngine · GamificationEngine│
│  CaptureService · SyncService · NotifyService  │
├───────────────────────────────────────────────┤
│ Persistenz: IndexedDB (lokal, Source of Truth) │
├───────────────────────────────────────────────┤
│ jarvis-client.ts  (dünnes SDK um /api/v1)      │
│  · Auth-Header · Queue · Backoff · Cache · WS  │
└───────────────────────────────────────────────┘
```

### 9.3 `jarvis-client.ts` (das einzige Tor zu JARVIS)
- Kapselt Base-URL, Bearer-Key, `X-JARVIS-User`, Versions-Header.
- Enthält die Queue/Prioritäten/Backoff/Cache-Logik aus Abschnitt 8 — **kein** UI-Code ruft
  `fetch` direkt.
- Methoden spiegeln die Spec: `chat()`, `structure()`, `agent()`, `stt()`, `tts()`, `rag.insert/
  query/ingest`, `storage.get/put/patch/del/list`, `notify()`, `tools.list/invoke()`,
  `scheduler.create/list/del()`, `me()`, `users()`, `connectWS()`.
- Aufbauend auf dem Beispiel-Client in `pluginsystem.md` Kap. 8.2.

### 9.4 Daten- & Sync-Modell
- **Lokal first, JARVIS als verteilter Speicher/Sync.** Geteilte Familienzustände
  (Tamagotchi/XP/Familien-Tasks) liegen im Plugin-KV `?scope=shared`; persönliche Dinge
  (Tagebuch, private Tasks) pro Nutzer (`scope=user` / RAG-Namespace `u<uid>`).
- **Sync-Strategie:** Optimistic Write lokal → asynchroner Push an JARVIS-Storage → bei WS-Event
  eingehende Änderungen anderer Geräte mergen. Konfliktregel simpel & ADHS-gerecht:
  *last-writer-wins* für Skalare; für XP/Token **atomares `$inc`** (Spec 5.7) statt Überschreiben,
  damit parallele Beiträge nicht verloren gehen.
- **Quelle der Timer-Wahrheit:** absolute Endzeit-Zeitstempel (kein Drift), lokal + im Shared-
  Storage für geräteübergreifende Synchron-Timer (`timer/tick`-Event).

### 9.5 Mehrere Geräte / Render-Kontexte
- Gleiche PWA auf Eltern-Handy, Familien-Tablet (Wand), Desktop. **Wand-Tablet** = Kiosk-/Vollbild-
  Modus mit Pet + aktivem Timer + Now-Next (großflächig, ablesbar aus der Distanz).

---

## 10. Konfiguration, Host & Zertifikate (dein Upgrade-Pfad)

> Umsetzung exakt wie gewünscht: Host/Domain in einem **Admin-UI der App** einstellbar, Start mit
> IP + selbstsigniertem Zertifikat, später Reverse-Proxy mit gültigem Zertifikat **ohne Code-
> Änderung**.

### 10.1 Verbindungs-Setup (in „Ich → Einstellungen → JARVIS-Verbindung")
- **Felder:** Basis-URL (`https://HOST:8088` — IP *oder* später Domain), Plugin-API-Key
  (`jvp_…`, aus JARVIS-Admin-UI), Standard-Profil↔Nutzer-Mapping.
- **Ein-Feld-Abstraktion:** Die gesamte App spricht nur die konfigurierte Basis-URL an. Wechsel von
  `https://192.168.1.224:8088` auf `https://adhs.familie.haus` ist **eine Einstellungsänderung** —
  kein Rebuild, kein Code.
- **First-Run-Assistent:** URL eingeben → Key einfügen → „Verbindung testen" (`GET /api/v1/me`) →
  Scopes/Profil anzeigen → fertig.

### 10.2 Selbstsigniertes Zertifikat (Phase 1, IP)
- **Realität ehrlich benannt:** Ein Browser-`fetch` aus der PWA kann ein nicht vertrautes Zertifikat
  **nicht** stillschweigend akzeptieren. Daher:
  - Der Assistent erkennt einen Zertifikatsfehler beim Verbindungstest und zeigt eine **klare
    Anleitung**: „Öffne einmalig `https://HOST:8088` im selben Browser und akzeptiere das
    Zertifikat" (bzw. JARVIS-CA aufs Gerät importieren — Anleitung je iOS/Android/Desktop).
  - Optionaler „Zertifikat öffnen"-Deep-Link zur HOST-Wurzel.
- **Folge für PWA-Features bei IP + self-signed (bewusst eingeplant):**
  - **Installierbarkeit & Web-Push sind eingeschränkt** (Browser verlangen i. d. R. einen
    *vertrauenswürdigen* sicheren Kontext; iOS ist hier besonders streng).
  - **Phase-1-Fallback:** Live-Updates über den **WebSocket** solange die App offen ist + lokale
    In-App-Hinweise/`announce` über JARVIS-Kanäle (Telegram/Satellit) für „Objektpermanenz", wenn
    die App geschlossen ist. So funktioniert das Erinnern auch ohne echten Push.

### 10.3 Reverse-Proxy mit gültigem Zertifikat (Phase 2, Domain)
- Sobald ein Reverse-Proxy (z. B. Caddy/Traefik/nginx) mit echtem Zertifikat (Let's Encrypt o. ä.)
  vor JARVIS hängt, trägt man die **Domain** ins selbe Settings-Feld ein.
- **Erst dann** voll: Homescreen-Installation (Standalone via `manifest.json`), **Web-Push**
  (inkl. iOS ≥ 16.4) für Hintergrund-Erinnerungen, voller PWA-Charakter.
- Die App ist dafür **bereits vorbereitet** (Service Worker + Push-Logik vorhanden, nur durch
  vertrauenswürdigen Kontext freigeschaltet) — der Wechsel ist reine Konfiguration.

### 10.4 Weitere Einstellungen im App-Admin
- Profile↔JARVIS-Nutzer, Benachrichtigungskanäle pro Person (PWA-Push/Telegram/Satellit),
  Ruhezeiten/„Nicht stören", Timer-Stil-Defaults, Reizarm-/Dark-Mode, Datenschutz (was darf ins
  RAG-Tagebuch), Sprach-/Stimmen-Auswahl (`edge|piper|kokoro`).

---

## 11. Datenschutz & Sicherheit

- **Hochsensible Domäne** (Medikation, Verhaltensmuster, Beziehungskonflikte). Grundsatz:
  **lokal & im LAN**, kein Cloud-Egress (der GPU-Server hat ohnehin kein Internet, Spec Kap. 11).
- **Pro-Nutzer-Isolation** (RAG-Namespace `u<uid>`, Storage `scope=user`): Vater/Mutter/Kinder
  sehen die privaten Logs der anderen nicht; nur explizit Geteiltes (Tamagotchi, Familien-Tasks)
  ist gemeinsam.
- **Key-Hygiene:** Plugin-Key nur im Gerätespeicher, LAN-Allowlist am Key (Spec 4.1), Rotation/
  Revoke über JARVIS-Admin. Kinder-Geräte ggf. eigener Key mit engeren Scopes.
- **Kinder-Schutz:** Kinderprofile ohne Zugriff auf Beziehungs-/Medikationsmodule; eltern-
  geschützter Bereich (PIN) für sensible Einstellungen.
- **Transparenz:** sichtbar machen, *was* ins Tagebuch/RAG geht; jederzeit löschbar
  (`DELETE /api/v1/rag/source`).

---

## 12. UX-/UI-Designsystem (ADHS-spezifisch)

- **Zero-Text-Entry-Prinzip:** große, haptisch reagierende Buttons (Vibration API), Symbole statt
  Textwüsten, Sprache als gleichwertige Eingabe. Minimale kognitive Eintrittsbarriere.
- **Eine Sache pro Screen** im Stress (Ein-Schritt-Fokus, Now-Next). Progressive Offenlegung von
  Komplexität.
- **Farbe & Motion:** Dark-Mode-first, ruhige Paletten; **kein aggressives Rot/Blinken** (RSD).
  Erfolg = warme, sanfte Mikroanimation + optional Haptik/Sound. Bewegungsreduktion respektieren
  (`prefers-reduced-motion`) + manueller Reizarm-Modus.
- **Sprache des UI:** ermutigend, nicht-wertend, auf Augenhöhe. „Alles gut", „sanfter Neustart",
  „erledigt 🎉" — nie „verpasst", „überfällig", „Fehler".
- **Barrierefreiheit:** große Touch-Ziele, hoher Kontrast wählbar, dyslexie-freundliche Schrift
  optional, Vorlese-Funktion (TTS), bedienbar mit einer Hand.
- **Schnelligkeit als Feature:** Sofort-Start, optimistic UI, nie ein Spinner ohne lokalen
  Fortschritt. Wartezeit = Vertrauensbruch beim ADHS-Gehirn.

---

## 13. Roadmap (App-Seite; JARVIS-Gateway ist bereits live)

**Phase A — Lokales Fundament (kein JARVIS nötig)**
PWA-Gerüst (Svelte/Vite/TS/Tailwind), Settings + Verbindungs-Setup (10.1/10.2), IndexedDB-
Persistenz, **visueller Timer (4.1)**, Routinen/Checklisten (4.2), Now-Next (4.3), Brain-Dump
lokal (4.4), kooperatives Tamagotchi mit lokalem Zustand (5). → **Sofort im Alltag nutzbar.**

**Phase B — JARVIS-Veredelung**
`jarvis-client.ts` mit Queue/Backoff/Cache (9.3, 8), Micro-Task-Parser (7.1), Coach-Chat (7.2),
STT-Brain-Dump (7.3), RAG-Tagebuch (7.5), `channels/notify` als neutraler Nörgler (6.2), Shared-
Storage-Sync für Tamagotchi/XP (9.4).

**Phase C — Echtzeit & Familie**
WebSocket-Live-Sync (Timer-Ticks, XP über alle Geräte), Beziehungsmodul vollständig (6),
Mental-Load/Fair-Share (6.1), Wins-Feed (6.3), Pause-Protokoll (6.4), Wochen-Sync (6.6),
Scheduler-Off-Peak-Analysen (8.4).

**Phase D — Tiefe & Komfort**
Vision-Features (7.7), Kommunikations-Reframes (6.5), Agenten-„Erledige es" (7.6), Sensorik/Calm
(4.7), Token-Ökonomie (4.8), Body-Doubling sozial (4.6), Reverse-Proxy/Domain + voller Web-Push
(10.3), Wand-Tablet-Kioskmodus (9.5).

---

## 14. Offene Entscheidungen (für dich)

1. **Stack-Bestätigung:** Svelte 5 (empfohlen) oder strikt Vanilla/Web Components?
2. **Verzeichnis:** App als eigenes Repo/Ordner neben JARVIS, oder hier unter `/opt/adhs-helper/`
   (z. B. `web/`)? Manifest `plugin.json` (Spec Kap. 7) lege ich passend an.
3. **Profile-Granularität Phase A:** reiner Avatar-Schnellumschalter (kein Login) ausreichend, oder
   gleich PIN-Schutz für Elternbereich?
4. **Tamagotchi-Ästhetik:** Tier vs. wachsendes Hauptquartier als erste Ausbaustufe — Vorliebe?
5. **Erste lauffähige Scheibe:** Soll ich nach deinem Go mit **Phase A** starten (Gerüst +
   visueller Timer + Routinen + Settings/Verbindung), damit du sofort etwas Bedienbares hast?

---

*Dieses Konzept ist gegen `material/pluginsystem.md` (verbindliche Gateway-Spec) und die
ursprüngliche `material/idee.txt` abgestimmt. Nicht-KI-Funktionen sind bewusst als tragendes
Fundament gebaut; KI ist additive Veredelung, die deinen KI-Server schont und ihn nie zur
Voraussetzung macht.*
