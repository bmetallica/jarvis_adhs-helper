# ADHS-Helper — Roadmap v2 (Erweiterungsmodule)

**Status:** ✅ **alle Module umgesetzt** (2026-06-26) · ergänzt [`ROADMAP.md`](ROADMAP.md). Diese v2
sammelte Module, die für ADHS-Familien noch fehlten. Jedes ist auf den bestehenden Stack
heruntergebrochen (Svelte 5 · IndexedDB-Stores · `jarvis/*` · `datasync.ts` · `serve.js`-Proxy).

> Umgesetzt: 1 Medikations-Bürokratie/Lieferengpass-Warner · 2 Übergabe-Modus (Druck/PDF) ·
> 3 SOS-Overwhelm · 4 Doom-Box · 5 Safe-Food-Joker · 6 Such-Gedächtnis · Querschnitt: lokales
> Sprach-Nudging (Web Speech API) + Pink Noise. Plus: Timer-Audio lauter + Endlos-Alarm, Timer-Reiter.

Legende: Aufwand **S** (≤ ½ Tag) · **M** (1–2 Tage) · **L** (> 2 Tage) · ⬜ offen.

---

## 1. Medikations-Bürokratie & „Lieferengpass-Warner"  ⬜  · Aufwand M

**Warum:** Exekutive Dysfunktion trifft auf BTM-Bürokratie (30-Tage-Rezepte) und chronische
Lieferengpässe (Elvanse, Medikinet). Das Beschaffungs-Management ist die eigentliche Krisenquelle —
nicht das tägliche Einnehmen.

**Was bauen (konkret):**
- `types.Medication` erweitern: `packSize` (Tabletten/Packung), `dailyDose` (Stück/Tag),
  `stockCount` (aktueller Bestand), `refillLeadDays` (Default 21), `prescriptionType` ("BTM"|"normal").
- `medications.ts`: bei jeder Einnahme `stockCount--`; Helfer `daysLeft(med)` und
  `refillDueAt(med) = jetzt + (daysLeft − refillLeadDays)`.
- **Rezept-Vorlauf-Warner** in `reminderWatcher.ts`: 3 Wochen vor Bestands-Ende sanft erinnern
  („Bald Rezept besorgen für Elvanse — Termine/Vorbereitung dauern oft Tage"). Stufe wie bei Fristen.
- **Apotheken-Log (geteilt):** Feld/Notiz im Med-Tracker („Apotheke am Markt: 30 mg vorrätig, Stand
  heute"). Ablage im **Familien-RAG** (`ai.diaryLog` → Collection `pharmacy`) **und** im Board, damit
  der Partner nicht doppelt telefoniert. Abfragbar via `ai.diaryQuery("Welche Apotheke hatte 30mg?")`.

**JARVIS-Bezug:** `rag/insert` + `rag/query` (Apotheken-Log), `channels/notify` (Rezept-Erinnerung
auch auf Telegram/Satellit). Alles mit lokalem Fallback (Bestandsrechnung + lokale Notification).

**Schwachstelle/Hinweis:** Bestand stimmt nur, wenn Einnahmen konsequent abgehakt werden →
zusätzlich ein manuelles „Bestand korrigieren"-Feld. Vorlaufzeit pro Arzt konfigurierbar machen.

---

## 2. „Oma-, Babysitter- & Schul-Modus" (Übergabe & Delegation)  ⬜  · Aufwand M–L

**Warum:** ADHS-Kinder brauchen Struktur-Konsistenz. Externe Betreuer kennen Routinen, Trigger und
Medikationszeiten nicht → System bricht zusammen, Eltern müssen alles neu erklären (Mental Load).

**Was bauen (konkret):**
- **Übergabe-Ansicht** „Spezialanleitung für heute": aggregiert pro Kind die **Abendroutine in
  Bildern/Symbolen** (aus `routines`), die **Medikationszeiten** (aus `medications`) und **3
  De-Eskalations-Sätze** (kuratiert aus `ai.LOCAL_COACH_CARDS` + frei editierbar).
- **Zwei Ausgabewege:**
  1. **Sauberes PDF/Druck** — eine reduzierte, ADHS-freundliche Print-Ansicht (`window.print()` +
     `@media print`-Layout). Komplett offline, kein Server nötig.
  2. **Temporäre, schreibgeschützte Web-Ansicht** — `serve.js` liefert unter `/share/<token>` eine
     read-only Seite; Token zeitlich begrenzt (z. B. 24 h), kein Login nötig, **aber** nur die
     Übergabe-Daten (keine App/kein `/api`-Zugriff). Token serverseitig signiert (wie das Session-
     Cookie). So kann die Oma den Link öffnen, ohne Account.

**JARVIS-Bezug:** keiner zwingend (lokal generierbar). Optional TTS-Vorlesen der Schritte.

**Schwachstelle/Hinweis:** Die Web-Ansicht ist die heiklere Variante (Datenschutz) — Token kurz
halten, nur explizit freigegebene Kinder/Daten, „Link widerrufen"-Knopf. Start mit der PDF-Variante
(risikoarm), Web-Ansicht als zweite Stufe.

---

## 3. „SOS-Overwhelm-Modul" (Akut-Co-Regulation für Eltern)  ⬜  · Aufwand S–M

**Warum:** Beim Meltdown des Kindes blockiert das Eltern-Gehirn (Cortisol) ebenfalls. Man *weiß*, wie
man deeskaliert, vergisst es aber im Affekt → es braucht eine geführte, gedächtnislose Hilfe.

**Was bauen (konkret):**
- **Unübersehbarer „🆘 SOS – Meltdown"-Button** auf dem Jetzt-Screen (Home, prominent, eigene Farbe).
- Öffnet ein **Vollbild-Overlay** (neue Komponente, nahe `PauseProtocol`/`CalmCorner`), das:
  1. sofort in den **extrem reizarmen Modus** schaltet (`settings.calmMode` + reduce-motion erzwingen,
     UI auf das Nötigste),
  2. das Elternteil **Schritt für Schritt im Sekundentakt** führt: Atem-Guide (4-7-8, aus
     `CalmCorner`), „Geh auf Augenhöhe", „Sprich leise", ein vorformulierter Satz
     („Ich bin bei dir, wir schaffen das zusammen."),
  3. danach eine sanfte „Wie geht es jetzt?"-Frage.
- **Optional Pink Noise:** lokales Audio-Asset (siehe Querschnitt unten) **oder** über JARVIS auf
  einem Raum-Satelliten (`channels/notify` mit `speak`/TTS-Override bzw. ein `play_sound`-Tool).

**JARVIS-Bezug:** optional (Pink Noise/Satellit). Kernfunktion 100 % offline.

**Schwachstelle/Hinweis:** Im Akutfall zählt jede Sekunde → Button muss **mit einem Tap** ohne
Profilwahl funktionieren; großzügige Touch-Fläche; keine Bestätigungsdialoge.

---

## 4. Digitales „Doom-Box"-Management (Archivierung ohne Scham)  ⬜  · Aufwand M

**Warum:** Hyperfokus startet Projekte/Listen, die nach 2 Wochen vergessen werden. „Überfällige
Leichen" triggern Scham (RSD) → die App wird gar nicht mehr geöffnet. Lösung: stilles Einschläfern
statt Anprangern.

**Was bauen (konkret):**
- Querschnitts-Konzept „schlafend": pro betroffenem Item ein `dormantAt`/`archived`-Flag (kein Löschen).
- **Auto-Einschläferung:** ein täglicher Check (in `reminderWatcher` oder ein eigener `archiver.ts`),
  der Einkaufslisten-Einträge, Abstimmungen, Routinen, Aufgaben **ohne Aktivität seit 14 Tagen** in die
  **Doom Box (Archiv)** verschiebt — nie als „überfällig" markiert.
- **UX-Ton:** „Diese Liste schläft jetzt friedlich im Keller. Du kannst sie jederzeit aufwecken — oder
  einfach vergessen." Archiv-Ansicht je Modul mit **„aufwecken"**-Knopf.
- Betrifft: `shopping`, `polls`, `routines`, `tasks`, ggf. `habits` (für Habits eher „pausiert").

**JARVIS-Bezug:** keiner (rein lokal/`datasync`).

**Schwachstelle/Hinweis:** „Aktivität" sauber definieren (zuletzt angefasst ≠ erstellt) → ein
`lastTouchedAt` einführen, das bei jeder Interaktion gesetzt wird. Schwelle pro Modul konfigurierbar.

---

## 5. „Safe-Food-Joker" im Wochen-Essensplan  ⬜  · Aufwand S–M

**Warum:** Sensorische Phasen (heute Ekel vor dem Lieblingsessen von gestern) + „Was essen wir?" als
größte tägliche Entscheidungs-/Mental-Load-Falle.

**Was bauen (konkret):**
- **Sensorik-Tags** an Mahlzeiten/Rezepten: `texture` (knusprig/weich/Suppe/…) und Flag **`safeFood`**.
  `types.MealEntry` bzw. ein neuer kleiner `recipes`-Pool erweitern.
- **Safe-Food-Joker-Button** in `MealPlan.svelte`: wirft mit einem Klick die 3 als `safeFood`
  markierten „funktioniert immer"-Mahlzeiten in die offenen Slots (z. B. Nudeln mit Butter, Toast) —
  **ohne Diskussion**, sofort, ruhig.
- Optional: pro Familienmitglied eigene Safe-Foods (Schnittmenge bilden → „passt allen").

**JARVIS-Bezug:** optional (KI-Vorschlag „mach mir 3 Safe-Food-Tage" via `inference/structure`).

**Schwachstelle/Hinweis:** Safe-Food-Liste muss leicht pflegbar bleiben; Joker nie automatisch, immer
auf bewussten Tap (Autonomie).

---

## 6. Kollektives „Such-Gedächtnis" via RAG (Objektpermanenz für Gegenstände)  ⬜  · Aufwand S

**Warum:** „Aus den Augen, aus dem Sinn" → Schlüssel, Schulranzen, BTM-Rezepte verschwinden täglich.
Stressige Morgensuche sprengt das Zeitbudget. Perfekte Auslagerung der fehlenden Objektpermanenz.

**Was bauen (konkret):**
- **„Wo-ist-was"-Modus im Brain-Dump:** ein Ort-Eintrag per Sprache/Text — „Lukas' Zeugnis liegt im
  obersten Fach im Kleiderschrank." → wird als Standort-Log gespeichert: lokal **und** im geteilten
  **Familien-RAG** (`ai.diaryLog`/`rag/insert`, Collection `locations`, `scope=shared`).
- **Abfrage:** „Wo ist das Zeugnis?" → `ai.diaryQuery`/`rag/query` über `locations` → sofortige
  Antwort (optional vorgelesen via TTS). Eigene kleine UI „🔎 Wo ist …?" (Home-Schnellaktion).
- **Lokaler Fallback:** ohne JARVIS einfache lokale Volltextsuche über die zuletzt erfassten
  Standort-Notizen (IndexedDB).

**JARVIS-Bezug:** `rag/insert` + `rag/query` (geteilt, damit beide Eltern profitieren), optional STT/TTS.

**Schwachstelle/Hinweis:** Standort-Logs „veralten" schnell (Gegenstand wurde bewegt) → jüngsten
Eintrag bevorzugen + „nicht mehr dort?"-Feedback, das den alten Eintrag entwertet.

---

## Querschnitt: Lokale TTS-Audio-Pufferung (Offline-Nudging)  ⬜  · Aufwand S

**Warum (Stack-Tweak):** Im Wand-Tablet-Kiosk und bei LAN-/JARVIS-Ausfall (Modell lädt neu, Netz
kurz weg) muss das **akustische Nudging barrierefrei bleiben**. KI-TTS darf keine Voraussetzung sein.

**Was bauen (konkret):**
- Standardisierte **lokale Audio-Assets** in `public/audio/` (kurze, neutrale Ansagen): „Zeit für den
  nächsten Schritt", „Die Zeit ist um", „Bald losgehen", „Zeit für die Medikation".
- **Service-Worker** cacht diese Assets in die App-Shell (offline garantiert verfügbar).
- `feedback.ts`/`announce`-Pfad: **TTS-Strategie** — wenn JARVIS verfügbar → optional KI-TTS auf
  Satellit; sonst → **lokales Audio-Asset** abspielen. Auswahl respektiert `settings.sound`.
- Greift in Timer-Ende (`timerWatcher`), Erinnerungen (`reminderWatcher`), Routinen-Schritte.

**Hinweis:** Assets bewusst kurz/generisch halten (kein personalisierter Text) → wenige Dateien
decken die wichtigsten Floskeln ab.

---

## Vorgeschlagene Phasen (Priorität × Aufwand)

**Phase A — schneller, hoher Alltagswert (überwiegend lokal):**
1. SOS-Overwhelm-Modul (3) — größter Akut-Nutzen, klein.
2. Such-Gedächtnis (6) — klein, hoher täglicher Nutzen.
3. Lokale TTS-Audio-Pufferung (Querschnitt) — entlastet alle Nudges.
4. Safe-Food-Joker (5).

**Phase B — Bürokratie- & Konsistenz-Entlastung:**
5. Medikations-Bürokratie & Lieferengpass-Warner (1).
6. Doom-Box-Archivierung (4) — braucht `lastTouchedAt` querschnittlich.

**Phase C — Delegation (mit Datenschutz-Sorgfalt):**
7. Übergabe-Modus (2) — zuerst PDF, dann temporäre Web-Ansicht über `serve.js`.

---

## Datenmodell-Notiz (DB-Migration v11+)

Die meisten Module sind additiv. Geplante Schema-Erweiterungen:
- `medications`: + `packSize/dailyDose/stockCount/refillLeadDays/prescriptionType`, Collection `pharmacy` (RAG).
- Querschnitt `lastTouchedAt` auf den „einschläferbaren" Typen (`shopping/polls/routines/tasks`) + `archived`-Flag.
- `meals`/`recipes`: + `texture`, `safeFood`.
- neue RAG-Collection `locations` (geteilt) fürs Such-Gedächtnis.
- ggf. `outbox`-Muster wiederverwenden, falls Übergabe-Links serverseitig verwaltet werden.

Alle synchronisierbaren Erweiterungen laufen über die bestehende `datasync.ts` (scope user/shared) und
bleiben **offline-first**.
