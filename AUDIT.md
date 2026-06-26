# Funktions-Audit — ADHS-Eignung & Lücken

**Datum:** 2026-06-26 · Durchgang durch alle Funktionen mit Blick auf: in sich logisch? ADHS-gerecht?
fehlende Verzahnung? Legende: ✅ ok · 🔧 in diesem Durchgang verbessert · ⬜ offener Folgepunkt.

## Befund je Funktion

| Funktion | Verdikt | Anmerkung |
|---|---|---|
| Visuelle Timer | ✅ | Zeitblindheit gut adressiert; driftfrei; sanftes Ende. ⬜ Hintergrund-Timer (App zu) erst mit Web-Push. |
| Routinen / Ein-Schritt-Fokus | ✅ | Überforderungsschutz stark. ⬜ optionale **geplante Routine-Erinnerung** (z. B. Morgenroutine 7:00). |
| Now-Next / Tasks | ✅ | Klar, ADHS-gerecht. |
| Brain-Dump (Text/Sprache) | 🔧 | Mikrofon braucht HTTPS → jetzt **klarer Hinweis statt stillem Fehlschlag**. |
| Check-in (Stimmung/Energie/Fokus) | ✅ | Zero-Text; speist Tagebuch. |
| Termine (Vorlauf/Losgehen) | ✅ | Kernstück gegen Zeitblindheit. |
| Fristen (Wall of Awful) | ✅ | Zerlegung + sanfte Sprache. |
| Einkauf / Essensplan | ✅ lokal | 🔧 Einkauf jetzt als „geteilt" gedacht; ⬜ echte Geräte-Sync folgt (local-first-Stufe). |
| Gewohnheiten (Garten) | ✅ | Ohne Streak-Scham. |
| **Medikation** | 🔧 **NEU** | War die größte Lücke ggü. Konzept. Einnahme festhalten, nächste Dosis, **Rebound-Fenster**, Erinnerungen. |
| Familien-Tier | 🔧 | Optik je Stufe **deutlich stärker differenziert** (Ei→Leuchtwesen, Arme/Flügel/Glow). |
| Tier-Accessoires | 🔧 **NEU** | Shop: Blume/Schleife/Ballon/Brille/Schal/Zylinder/Krone, kaufen & anlegen, im Canvas gerendert. |
| Belohnungs-Laden | 🔧 | **Einlösen benachrichtigt jetzt die Eltern** (Board + WS + JARVIS-notify). |
| Mental-Load / Fair-Share | ✅ | Rebalancing-Ton, kein Aufrechnen. |
| Wertschätzung | 🔧 | Landet jetzt zusätzlich **im Board**, erreicht die Person geräteübergreifend. |
| Pause-Protokoll / Atem | ✅ | Co-Regulation. |
| Wochen-Sync | ✅ | Geführt, zeitbegrenzt. |
| RSD-Reframe | ✅ | Vorschlag, nie Automatik. |
| **Nachrichtenboard** | 🔧 **NEU** | Familien-Chat für alle; auch Ziel für System-Hinweise (Belohnung/Wertschätzung). |
| Coach (KI) | ✅ | ⬜ könnte Tagebuch-Kontext (RAG) einbeziehen für persönlichere Tipps. |
| Vision (OCR/Med/Aufräum) | ✅ | File-Input, funktioniert auch über HTTP. |
| Ruhe-Ecke (Atem/Fidget) | ✅ | Sensorische Selbstregulation. |
| Accounts (JARVIS-Nutzer) | ✅ | Roster zentral, Login auf jedem Gerät. Profil-Rolle jetzt editierbar. |

## In diesem Durchgang umgesetzt
- 🔧 **Medikations-Tracker** (Einnahme, nächste Dosis, Rebound-Fenster, Erinnerungen) — DB v8.
- 🔧 **Familien-Nachrichtenboard** (lokal-first + Shared-Storage + WS) — DB v7.
- 🔧 **Belohnung eingelöst → Eltern-Benachrichtigung** (Board + WS-Event + JARVIS-notify an Eltern).
- 🔧 **Tier-Optik** je Stufe deutlich stärker differenziert + **Accessoire-Shop**.
- 🔧 **Wertschätzung** landet zusätzlich im Board.
- 🔧 **Mikrofon-Hinweis** (HTTPS nötig) statt stillem Fehlschlag.

## Nachtrag 2026-06-26 (zweite Audit-Runde, Userfeedback)
- 🔧 **Reframe** repariert (lief ins Leere) — jetzt über Streaming + Timeout, brauchbarer Offline-Fallback.
- 🔧 **Tier-Accessoires** gefixt (Brille saß nicht auf den Augen, Krone/Zylinder unsichtbar) — korrekte
  Anker, Kopf-Freiraum; mehrere gleichzeitig.
- 🔧 **Reset**: „Tier & Münzen zurücksetzen" (Eltern) + **Voll-Reset „alles auf 0"** nur für
  JARVIS-Admin-Accounts (Scope-Erkennung) mit Tipp-Bestätigung; löscht lokal + serverseitig.
- 🔧 **Hyperfokus-Helfer** (NEU): Fokusfenster, 15-min-Hinweis, 5-min **harte Unterbrechung** mit
  Stand-Notiz → **Outbox nach Obsidian** (offline gepuffert, bei Verbindung nachgesendet).
- 🔧 **Tagebuch** (NEU, eigener Hauptpunkt 📔): schreiben + lesen/suchen, Stimmung, Hyperfokus-Notizen,
  RAG-Mustersuche; pro Account synchronisiert.
- 🔧 **Hauptquartier/Kiosk** neu: großer **Wochenkalender** (Termine + geplante Essen), „Jetzt dran",
  **Familienchat** aufs Dashboard, **Tier klein unten rechts**.

## Offene Folgepunkte (bewusst, local-first/schrittweise)
- ✅ **Cross-Device-Sync persönlicher Daten** — umgesetzt (`datasync.ts`): Tasks/Routinen/Termine/
  Fristen/Gewohnheiten/Check-ins/Medikation pro Account (scope=user), Einkauf/Essensplan/Mental-Load
  geteilt (scope=shared). Snapshot je Collection mit Revision (collection-level LWW), Account-Wechsel-
  Handling, WS-Refresh, Connect/Focus-Pull. Hinweis: bei echten gleichzeitigen Mehrgerät-Edits
  derselben Collection gewinnt der letzte Push (LWW) — für den Familien-LAN-Fall ausreichend.
- ⬜ **Geplante Routine-Erinnerungen** (Routine an Uhrzeit koppeln).
- ⬜ **Coach mit Tagebuch-Kontext** (RAG-Auszug in den Prompt).
- ⬜ **Web-Push** für Hintergrund-Erinnerungen (nach gültigem Zertifikat/Reverse-Proxy).
- ⬜ **Optionaler PIN** pro Account für sensible Bereiche (Eltern-Schutz).
