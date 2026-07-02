// Zentrale Datentypen des ADHS-Helpers. Lokal-first; spiegeln später JARVIS-Storage.

export type ID = string;

export type ProfileRole = "parent" | "child" | "other";

export interface Profile {
  id: ID;
  name: string;
  /** Emoji-Avatar (Zero-Text, schnell erkennbar). */
  avatar: string;
  /** Farbakzent (Tailwind-Farbwert/Hex) zur schnellen visuellen Zuordnung. */
  color: string;
  role: ProfileRole;
  /** Optionaler JARVIS-Nutzername für X-JARVIS-User-Mapping (Schritt 5). */
  jarvisUser?: string;
  createdAt: number;
}

// --- Timer ---

export type TimerStatus = "running" | "paused" | "done";
export type TimerStyle = "disc" | "bar" | "dots";

export interface TimerItem {
  id: ID;
  label: string;
  /** Gesamtdauer in Sekunden (für Skala/Reset). */
  durationSec: number;
  /** Absolute Endzeit (ms seit Epoch) — die *Quelle der Wahrheit*, driftfrei über Reloads. */
  endsAt: number;
  /** Bei Pause: verbleibende Sekunden eingefroren. */
  remainingWhenPaused: number | null;
  status: TimerStatus;
  style: TimerStyle;
  /** Farbe (Hex) — meist vom aktiven Profil. */
  color: string;
  /** Vorwarn-Marken in Sekunden vor Ende (z. B. [300,120,60]). */
  warnAtSec: number[];
  /** Welche Marken schon ausgelöst wurden (damit sie nur einmal feuern). */
  firedWarnings: number[];
  createdAt: number;
  /** Optionaler Profilbezug. */
  profileId: ID | null;
}

// --- Tasks (atomare Aufgaben, Now-Next-Board) ---

export interface Task {
  id: ID;
  title: string;
  /** Optionales Symbol/Emoji (Zero-Text-Entry). */
  icon: string;
  done: boolean;
  /** Auf dem heutigen Now-Next-Board sichtbar. */
  today: boolean;
  /** Sortierreihenfolge auf dem Board (kleiner = weiter „jetzt"). */
  order: number;
  profileId: ID | null;
  createdAt: number;
  completedAt: number | null;
  /** Zeitschätzungs-Trainer: geschätzte Dauer in Minuten (optional). */
  estimateMin?: number | null;
  /** Zeitschätzungs-Trainer: gefühlte/gemessene Ist-Dauer in Minuten (optional). */
  actualMin?: number | null;
}

// --- Routinen (geordnete Listen atomarer Schritte) ---

export interface RoutineStep {
  id: ID;
  title: string;
  icon: string;
  /** Optionale Dauer in Sekunden → eigener Mini-Timer pro Schritt. */
  durationSec: number | null;
  /** Zeitschätzungs-Trainer: gemessene Ist-Dauern in Sekunden (letzte ~10). */
  measuredSec?: number[];
}

export interface Routine {
  id: ID;
  title: string;
  icon: string;
  steps: RoutineStep[];
  profileId: ID | null;
  createdAt: number;
  /** Doom-Box: zuletzt benutzt / eingeschläfert. */
  lastTouchedAt?: number;
  archived?: boolean;
}

// --- Brain-Dump / Quick-Capture (Posteingang) ---

export interface InboxItem {
  id: ID;
  text: string;
  /** "text" oder "voice" (Sprachnotiz, Transkription folgt mit JARVIS in Schritt 6). */
  kind: "text" | "voice";
  /** Bei Sprachnotiz: lokal gepufferte Audiodaten (Blob) bis zur Transkription. */
  audio?: Blob | null;
  processed: boolean;
  profileId: ID | null;
  createdAt: number;
}

// --- Stimmungs-/Energie-/Fokus-Check-in ---

export interface Checkin {
  id: ID;
  profileId: ID | null;
  /** Jeweils 1–5. */
  mood: number;
  energy: number;
  focus: number;
  createdAt: number;
}

// --- Termine / Kalender ---

export interface ChecklistItem {
  id: ID;
  text: string;
  done: boolean;
}

export type Recurrence = "none" | "daily" | "weekly";

export interface Appointment {
  id: ID;
  title: string;
  icon: string;
  /** Startzeitpunkt (ms seit Epoch). */
  startsAt: number;
  /** Fahrt-/Fertigmach-Zeit in Minuten (Vorlauf). */
  travelMin: number;
  /** Zusätzliche Pufferzeit in Minuten. */
  bufferMin: number;
  /** Wer begleitet/bringt (Profil-ID), für Mental-Load-Sichtbarkeit. */
  companionId: ID | null;
  /** Vorbereitungs-Checkliste (z. B. Versichertenkarte). */
  prep: ChecklistItem[];
  /** Erinnerungsstufen in Minuten vor Start (z. B. [1440, 120]). */
  reminderOffsetsMin: number[];
  /** Welche Offsets bereits ausgelöst wurden. */
  firedReminders: number[];
  /** „Jetzt losgehen"-Erinnerung (zur Losgeh-Zeit) bereits ausgelöst? */
  leaveFired: boolean;
  /** Losgeh-Rechner: Anzieh-/Packzeit in Minuten (vor der Wegzeit). */
  prepMin?: number;
  /** „Gleich losmachen"-Vorwarnung (10 min vor Losgeh-Zeit) bereits ausgelöst? */
  leaveSoonFired?: boolean;
  recurrence: Recurrence;
  notes: string;
  profileId: ID | null;
  createdAt: number;
}

// --- Fristen / Rechnungen / Behörden ---

export interface Deadline {
  id: ID;
  title: string;
  category: string;
  /** Fälligkeitszeitpunkt (ms). */
  dueAt: number;
  /** „Wall of Awful"-Zerlegung in Mini-Schritte. */
  steps: ChecklistItem[];
  reminderOffsetsMin: number[];
  firedReminders: number[];
  done: boolean;
  profileId: ID | null;
  createdAt: number;
}

// --- Einkauf / Besorgungen ---

export interface ShoppingItem {
  id: ID;
  text: string;
  done: boolean;
  /** Wer hinzugefügt hat (Profil-ID). */
  addedBy: ID | null;
  createdAt: number;
  /** Doom-Box: zuletzt angefasst / eingeschläfert. */
  lastTouchedAt?: number;
  archived?: boolean;
}

// --- Essensplan ---

export type MealSlot = "fruh" | "mittag" | "abend";

export interface MealEntry {
  id: ID;
  /** Datum als YYYY-MM-DD (lokal). */
  date: string;
  slot: MealSlot;
  text: string;
}

// --- Gewohnheiten (ohne Streak-Scham) ---

export interface Habit {
  id: ID;
  title: string;
  icon: string;
  profileId: ID | null;
  createdAt: number;
  /** Erledigte Tage als YYYY-MM-DD (additiv, keine „Kette"). */
  doneDates: string[];
}

// --- Belohnungs-Laden (Token-Ökonomie) ---

export interface Reward {
  id: ID;
  title: string;
  icon: string;
  /** Kosten in Münzen. */
  cost: number;
  createdAt: number;
  /** Wie oft schon eingelöst (für Anzeige). */
  redeemed: number;
}

// --- Familie & Paar ---

export interface Responsibility {
  id: ID;
  title: string;
  icon: string;
  /** Wer trägt diesen Bereich (Profil-ID). */
  ownerId: ID | null;
  createdAt: number;
}

export interface Appreciation {
  id: ID;
  fromId: ID | null;
  toId: ID | null;
  text: string;
  createdAt: number;
}

// --- Medikation (ADHS-zentral: Einnahme + Rebound-Fenster) ---

export interface Medication {
  id: ID;
  profileId: ID | null;
  name: string;
  icon: string;
  /** Geplante Einnahmezeiten (HH:MM). */
  times: string[];
  /** Minuten bis zum typischen Rebound (z. B. 480 = ~8 h). Null = kein Hinweis. */
  reboundMin: number | null;
  /** Einnahme-Zeitstempel (zuletzt ~60). */
  log: number[];
  /** Beschaffungs-Management (optional). */
  stockCount?: number | null; // aktueller Bestand (Tabletten)
  dailyDose?: number; // Tabletten pro Tag
  refillLeadDays?: number; // Vorlauf für Rezept (Default 21)
  isBtm?: boolean; // BTM (30-Tage-Regel, oft Lieferengpässe)
  /** Fokus-Fenster: Minuten von Einnahme bis Wirkbeginn (Default 30). Reine Anzeige, kein Rat. */
  peakOnsetMin?: number;
  /** Fokus-Fenster: Wirkdauer in Minuten ab Wirkbeginn. Null/0 = Anzeige aus. */
  peakDurationMin?: number | null;
  createdAt: number;
}

// --- Such-Gedächtnis: Standort-Notizen (Objektpermanenz für Gegenstände) ---

export interface LocationNote {
  id: ID;
  /** Voller Satz, z. B. „Lukas' Zeugnis liegt im obersten Fach im Kleiderschrank." */
  text: string;
  profileId: ID | null;
  createdAt: number;
}

// --- Safe-Food (Essensplan-Joker) ---

export interface SafeFood {
  id: ID;
  text: string;
  /** Textur/Sensorik-Tag (knusprig/weich/Suppe/…). */
  texture: string;
  createdAt: number;
}

// --- Apotheken-/Beschaffungs-Log (Medikation) ---

export interface PharmacyNote {
  id: ID;
  medName: string;
  text: string;
  profileId: ID | null;
  createdAt: number;
}

// --- Abstimmungen / Umfragen (Familie); Termin-Vorschlag = Spezialfall ---

export type PollKind = "poll" | "appointment";

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: ID;
  kind: PollKind;
  question: string;
  options: PollOption[];
  createdById: ID | null;
  createdByName: string;
  allowMulti: boolean;
  /** Profile-IDs, die abstimmen sollen (leer = alle Familienmitglieder). */
  voterIds: ID[];
  /** Stimmen: profileId → optionId[]. */
  votes: Record<string, string[]>;
  status: "open" | "closed" | "confirmed" | "declined";
  /** Nur für kind="appointment": der Termin-Entwurf. */
  appointment: {
    title: string;
    icon: string;
    startsAt: number;
    durationMin: number;
    travelMin: number;
  } | null;
  /** Notiz / Konflikt-Hinweis. */
  note: string;
  createdAt: number;
  updatedAt: number;
}

// --- Notiz-Outbox (Weiterleitung nach Obsidian via JARVIS; offline puffern) ---

export interface OutboxNote {
  id: ID;
  text: string;
  /** Herkunft, z. B. "hyperfokus". */
  source: string;
  meta: Record<string, unknown>;
  sent: boolean;
  createdAt: number;
}

// --- Tagebuch ---

export interface DiaryEntry {
  id: ID;
  profileId: ID | null;
  text: string;
  /** Optionale Stimmung 1–5. */
  mood: number | null;
  /** Optionale Tags. */
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// --- Familien-Nachrichtenboard ---

export type MessageKind = "chat" | "system" | "reward" | "appreciation";

export interface Message {
  id: ID;
  fromId: ID | null;
  fromName: string;
  fromAvatar: string;
  text: string;
  kind: MessageKind;
  createdAt: number;
}

// --- Impulskauf-Parkplatz (Aufschub mit Würdigung statt Verbot) ---

export interface WishItem {
  id: ID;
  text: string;
  /** Optionaler Preis als Text (z. B. "89 €"). */
  priceText: string;
  profileId: ID | null;
  /** Reifezeit in Tagen; danach neutrale Nachfrage. */
  matureDays: number;
  /** Entscheidung nach der Reifezeit. */
  decision: "keep" | "drop" | null;
  decidedAt: number | null;
  createdAt: number;
}

// --- Dopamin-Menü (vorbereitete schnelle Belohnungen/Pausen) ---

export type DopamineCourse = "starter" | "main" | "side";

export interface DopamineItem {
  id: ID;
  text: string;
  /** starter = ~2 min, main = ~20 min, side = nebenbei. */
  course: DopamineCourse;
  /** Grobe Dauer in Minuten (für den Warte-Modus). */
  minutes: number;
  profileId: ID | null;
  createdAt: number;
}

// --- Familien-Quests (gemeinsames Ziel statt Ermahnung) ---

export interface Quest {
  id: ID;
  title: string;
  icon: string;
  /** Ziel in Familien-XP. */
  goalXp: number;
  progressXp: number;
  /** Die gemeinsame Belohnung (z. B. "Pizza-Abend"). */
  reward: string;
  status: "open" | "done" | "redeemed";
  createdAt: number;
  updatedAt: number;
}

// --- Reparatur-Ritual (das „Danach" von Konflikten; RSD-schonend) ---

export interface RepairCard {
  id: ID;
  fromId: ID | null;
  fromName: string;
  toId: ID | null;
  toName: string;
  /** Was war los bei mir. */
  whatHappened: string;
  /** Was tut mir leid. */
  sorryFor: string;
  /** Was wünsche ich mir. */
  wishFor: string;
  /** Profile, die die Karte angenommen haben. */
  acknowledgedBy: ID[];
  createdAt: number;
}

// --- Body-Doubling: geteilter Fokus-Status ---

export interface FocusStatus {
  /** = Profil-ID (ein Status pro Person). */
  id: ID;
  name: string;
  avatar: string;
  /** Woran gearbeitet wird. */
  text: string;
  /** Bis wann (ms seit Epoch); danach gilt der Status als beendet. */
  until: number;
  /** Anfeuerungen (👍) von anderen. */
  cheers: number;
  updatedAt: number;
}

export type AlarmSound = "triad" | "bell" | "soft";

export interface Settings {
  /** Aktives Profil. */
  activeProfileId: ID | null;
  /** Reizarm-Modus: dimmt UI, reduziert Animationen. */
  calmMode: boolean;
  /** Bewegungsreduktion erzwingen (zusätzlich zu prefers-reduced-motion). */
  reduceMotion: boolean;
  /** Haptik (Vibration API) erlauben. */
  haptics: boolean;
  /** Sound-Feedback erlauben. */
  sound: boolean;
  /** Gesprochene Erinnerungen (lokales TTS, offline). */
  voiceNudges: boolean;
  /** Größere Schrift (Barrierefreiheit). */
  largeText: boolean;
  /** Gut lesbare, dyslexie-freundlichere Schrift. */
  readableFont: boolean;
  /** Alarm-Lautstärke 0..1 (0.5 = bisheriger Pegel). Reizempfindlichkeit ist individuell. */
  alarmVolume: number;
  /** Klangprofil des Endlos-Alarms. */
  alarmSound: AlarmSound;
  /** Alarm nach N Minuten selbst beenden (0 = bis manuell gestoppt). */
  alarmAutoStopMin: number;
  /** Eltern-PIN (4-stellig) vor sensiblen Bereichen; leer = aus. */
  parentPin: string;
  /** Wind-down-Beginn ("HH:MM"); leer = Abend-Modul aus. */
  windDownStart: string;
  /** JARVIS-Verbindung (Schritt 5) — hier nur Platzhalter, Detailfelder folgen. */
  jarvisBaseUrl: string;
  jarvisKey: string;
}

export const DEFAULT_SETTINGS: Settings = {
  activeProfileId: null,
  calmMode: false,
  reduceMotion: false,
  haptics: true,
  sound: true,
  voiceNudges: false,
  largeText: false,
  readableFont: false,
  alarmVolume: 0.5,
  alarmSound: "triad",
  alarmAutoStopMin: 0,
  parentPin: "",
  windDownStart: "",
  jarvisBaseUrl: "",
  jarvisKey: "",
};
