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
}

// --- Routinen (geordnete Listen atomarer Schritte) ---

export interface RoutineStep {
  id: ID;
  title: string;
  icon: string;
  /** Optionale Dauer in Sekunden → eigener Mini-Timer pro Schritt. */
  durationSec: number | null;
}

export interface Routine {
  id: ID;
  title: string;
  icon: string;
  steps: RoutineStep[];
  profileId: ID | null;
  createdAt: number;
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
  /** Größere Schrift (Barrierefreiheit). */
  largeText: boolean;
  /** Gut lesbare, dyslexie-freundlichere Schrift. */
  readableFont: boolean;
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
  largeText: false,
  readableFont: false,
  jarvisBaseUrl: "",
  jarvisKey: "",
};
