// Wachstums-Logik des kooperativen Familien-Tiers.
//
// Designgesetze (KONZEPT §1.3, §5):
//  - Das Tier KANN NIE STERBEN und SCHRUMPFT NIE (RSD-Schutz). Wachstum kommt aus *kumulativer*
//    XP, die nie sinkt. Belohnungen werden mit einer separaten Münz-Währung „gekauft", die das
//    Wachstum nicht antastet.
//  - Bei Inaktivität geht das Tier auf „Entdeckungsreise" und bringt bei Rückkehr ein Geschenk —
//    Wiedereinstieg fühlt sich belohnend an, nicht beschämend.

export interface PetState {
  /** Name des Tiers (von der Familie vergeben). */
  name: string;
  /** Kumulative XP — treibt das Wachstum, sinkt NIE. */
  xp: number;
  /** Ausgebbare Münzen für den Belohnungs-Laden (sinkt beim Einlösen, Tier bleibt unberührt). */
  coins: number;
  /** Visueller Zufalls-Seed (Farbton/Form-Variation). */
  seed: number;
  /** Letzter Beitrag (ms) — für die Entdeckungsreise-Logik. */
  lastActiveTs: number;
  /** Ist das Tier gerade auf Reise? */
  onJourney: boolean;
  /** Mitgebrachtes Geschenk (Text), wartet auf Abholung. */
  pendingGift: string | null;
  /** Beitrag je Profil-ID (kumulativ) — macht jeden Beitrag sichtbar (gegen Geschwister-Neid). */
  contributions: Record<string, number>;
  /** Gekaufte Accessoire-IDs. */
  accessories: string[];
  /** Angelegte Accessoire-IDs (Teilmenge von accessories). */
  equipped: string[];
}

export function defaultPet(): PetState {
  return {
    name: "Pixel",
    xp: 0,
    coins: 0,
    seed: Math.floor(Math.random() * 360),
    lastActiveTs: Date.now(),
    onJourney: false,
    pendingGift: null,
    contributions: {},
    accessories: [],
    equipped: [],
  };
}

/** Accessoire-Katalog fürs Tier (mit Münzen kaufbar; im Canvas gerendert). */
export interface Accessory {
  id: string;
  name: string;
  icon: string;
  cost: number;
}

export const ACCESSORIES: Accessory[] = [
  { id: "flower", name: "Blume", icon: "🌸", cost: 25 },
  { id: "bow", name: "Schleife", icon: "🎀", cost: 40 },
  { id: "balloon", name: "Luftballon", icon: "🎈", cost: 50 },
  { id: "glasses", name: "Sonnenbrille", icon: "🕶️", cost: 70 },
  { id: "scarf", name: "Schal", icon: "🧣", cost: 90 },
  { id: "hat", name: "Zylinder", icon: "🎩", cost: 120 },
  { id: "crown", name: "Krone", icon: "👑", cost: 250 },
];

export interface Stage {
  index: number;
  title: string;
  /** Ab dieser kumulativen XP erreicht. */
  minXp: number;
  /** Relative Darstellungsgröße 0..1 (fürs Canvas). */
  size: number;
}

// Wachstumsstufen — „wächst mit den Anwendern" (festgelegt mit dem Nutzer).
export const STAGES: Stage[] = [
  { index: 0, title: "Ei", minXp: 0, size: 0.34 },
  { index: 1, title: "Schlüpfling", minXp: 60, size: 0.46 },
  { index: 2, title: "Baby", minXp: 180, size: 0.6 },
  { index: 3, title: "Kind", minXp: 400, size: 0.74 },
  { index: 4, title: "Jugend", minXp: 750, size: 0.88 },
  { index: 5, title: "Erwachsen", minXp: 1300, size: 1.0 },
  { index: 6, title: "Leuchtwesen", minXp: 2200, size: 1.12 },
];

export function stageFor(xp: number): Stage {
  let s = STAGES[0];
  for (const st of STAGES) if (xp >= st.minXp) s = st;
  return s;
}

/** Nächste Stufe (oder null, wenn höchste erreicht). */
export function nextStage(xp: number): Stage | null {
  return STAGES.find((s) => s.minXp > xp) ?? null;
}

/** Fortschritt 0..1 innerhalb der aktuellen Stufe Richtung nächste. */
export function stageProgress(xp: number): number {
  const cur = stageFor(xp);
  const nxt = nextStage(xp);
  if (!nxt) return 1;
  return Math.max(0, Math.min(1, (xp - cur.minXp) / (nxt.minXp - cur.minXp)));
}

/** Standard-XP-Werte je Aktion (sofortiges, spürbares Dopamin). */
export const XP = {
  task: 10,
  routineStep: 8,
  routineComplete: 25,
  timer: 12,
  habit: 6,
  shopping: 4,
  prep: 5,
  checkin: 5,
} as const;

export const GIFTS = [
  "🪨 einen glitzernden Stein",
  "🌸 eine seltene Blume",
  "🐚 eine bunte Muschel",
  "⭐ ein Sternenstück",
  "🍄 einen Glückspilz",
  "🪶 eine leuchtende Feder",
  "🧩 ein Puzzleteil fürs Hauptquartier",
];

/** Tage seit letzter Aktivität (Kalender-grob). */
export function idleDays(lastActiveTs: number, now = Date.now()): number {
  return Math.floor((now - lastActiveTs) / 86_400_000);
}
