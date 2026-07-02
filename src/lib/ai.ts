// KI-Veredelung über JARVIS — IMMER mit lokalem Fallback (KONFIG §8: KI ist Bonus, nie Pflicht).
// Diese Schicht kapselt die fachlichen KI-Aufgaben und entscheidet pro Aufruf: JARVIS oder lokal.
import { jarvis, isConfigured } from "./jarvis/client";
import { fromLocalInput } from "./date";

export function aiAvailable(): boolean {
  return isConfigured();
}

// --- Micro-Task-Parser: Freitext → Routine-Schritte ---

export interface ParsedStep {
  task: string;
  durationSec: number | null;
}

const ROUTINE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: { task: { type: "string" }, duration_minutes: { type: "integer" } },
      },
    },
  },
};

export async function parseRoutine(
  text: string,
): Promise<{ title: string; steps: ParsedStep[]; usedAi: boolean }> {
  if (aiAvailable()) {
    try {
      const r = await jarvis.structure<{ title?: string; steps?: { task: string; duration_minutes?: number }[] }>(
        `Zerlege diese Routine in atomare Schritte mit Minuten: ${text}`,
        ROUTINE_SCHEMA,
        { priority: "normal" },
      );
      const steps = (r.steps ?? []).map((s) => ({
        task: s.task,
        durationSec: s.duration_minutes ? s.duration_minutes * 60 : null,
      }));
      if (steps.length) return { title: r.title || text.slice(0, 30), steps, usedAi: true };
    } catch {
      /* Fallback unten */
    }
  }
  return { title: text.split("\n")[0].slice(0, 30) || "Routine", steps: localSplit(text), usedAi: false };
}

/** Lokaler Heuristik-Splitter: Zeilen/Sätze → Schritte (Default-Dauern). */
function localSplit(text: string): ParsedStep[] {
  const parts = text
    .split(/\n|[.;]|\bdann\b|\bund danach\b|,/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);
  return parts.map((task) => ({ task, durationSec: null }));
}

// --- Termin-Parser: Freitext → Termin ---

const APPT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    datetime: { type: "string" }, // ISO 8601
    travel_minutes: { type: "integer" },
    prep: { type: "array", items: { type: "string" } },
  },
};

export interface ParsedAppointment {
  title: string;
  startsAt: number | null;
  travelMin: number;
  prep: string[];
  usedAi: boolean;
}

export async function parseAppointment(text: string): Promise<ParsedAppointment> {
  if (aiAvailable()) {
    try {
      const r = await jarvis.structure<{
        title?: string;
        datetime?: string;
        travel_minutes?: number;
        prep?: string[];
      }>(
        `Heute ist ${new Date().toISOString()}. Extrahiere den Termin aus: ${text}`,
        APPT_SCHEMA,
        { priority: "normal" },
      );
      const ts = r.datetime ? Date.parse(r.datetime) : NaN;
      return {
        title: r.title || text.slice(0, 40),
        startsAt: Number.isFinite(ts) ? ts : null,
        travelMin: r.travel_minutes ?? 15,
        prep: r.prep ?? [],
        usedAi: true,
      };
    } catch {
      /* Fallback */
    }
  }
  return { title: text.slice(0, 40), startsAt: null, travelMin: 15, prep: [], usedAi: false };
}

// --- Empathischer Coach (Streaming) mit lokalem Fallback ---

export const COACH_SYSTEM_PROMPT =
  "Du bist ein warmherziger, deeskalierender Familien-Coach mit tiefem ADHS-Wissen. " +
  "Du kennst Rejection Sensitivity Dysphoria, Zeitblindheit, die Wall of Awful und die Eltern-Kind-" +
  "Falle in Partnerschaften. Antworte auf Deutsch, kurz, konkret, ohne Schuldzuweisung, mit einem " +
  "ersten Mini-Schritt. Nie moralisieren, nie 'reiß dich zusammen'. Validiere zuerst das Gefühl.";

/** Lokale De-Eskalations-Karten, wenn keine KI verfügbar ist (statt leerer Hülle). */
export const LOCAL_COACH_CARDS: { trigger: string; title: string; text: string }[] = [
  {
    trigger: "verweiger",
    title: "Wenn ein Kind verweigert",
    text: "Erst verbinden, dann lenken. Geh auf Augenhöhe, benenne das Gefühl ('Du willst gerade gar nicht'). Biete zwei kleine Wahlmöglichkeiten statt eines Befehls ('Zähne zuerst oder Schlafanzug zuerst?').",
  },
  {
    trigger: "nichts auf die reihe",
    title: "Wenn nichts geht (Wall of Awful)",
    text: "Das ist Lähmung, nicht Faulheit. Wähle EINE winzige Sache und mach nur 2 Minuten davon (Timer → Fokus-Session). Mehr nicht. Danach darfst du aufhören — meist bleibst du dran.",
  },
  {
    trigger: "streit",
    title: "Vor dem Streit (RSD)",
    text: "Eine kurze Pause ist keine Flucht. Nutzt den Pause-Knopf. Formuliere später eine Bitte statt eines Vorwurfs: 'Ich wünsche mir X', nicht 'Nie machst du Y'.",
  },
];

export function localCoachReply(userText: string): string {
  const t = userText.toLowerCase();
  const card = LOCAL_COACH_CARDS.find((c) => t.includes(c.trigger));
  if (card) return `${card.title}: ${card.text}`;
  return (
    "Ich bin gerade offline (keine KI-Verbindung), aber das Wichtigste: Atme einmal aus. " +
    "Wähle eine einzige kleine Sache und nimm dir nur 2 Minuten dafür. Du musst nicht alles auf einmal."
  );
}

export async function coachStream(
  history: { role: string; content: string }[],
  onSentence: (s: string) => void,
): Promise<{ text: string; usedAi: boolean }> {
  if (aiAvailable()) {
    try {
      const text = await jarvis.chatStream(
        { system_prompt: COACH_SYSTEM_PROMPT, messages: history, think: false, max_tokens: 400 },
        onSentence,
        { priority: "high" },
      );
      if (text) return { text, usedAi: true };
    } catch {
      /* Fallback */
    }
  }
  const last = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const reply = localCoachReply(last);
  onSentence(reply);
  return { text: reply, usedAi: false };
}

// --- Vision: Foto analysieren / OCR / klassifizieren ---

export type VisionMode = "describe" | "ocr" | "medication" | "tidy";

export async function visionAnalyze(
  dataUrl: string,
  mode: VisionMode,
): Promise<{ text: string; usedAi: boolean } | null> {
  if (!aiAvailable()) return null;
  try {
    if (mode === "ocr") {
      const r = await jarvis.visionOcr(dataUrl);
      const text = "text" in r ? r.text : (r as { answer: string }).answer;
      return { text, usedAi: true };
    }
    if (mode === "tidy") {
      const r = await jarvis.visionClassify(dataUrl, ["aufgeräumt", "unaufgeräumt"]);
      return { text: r.label === "aufgeräumt" ? "🎉 Sieht aufgeräumt aus!" : "Noch ein bisschen was zu tun — ein Schritt genügt.", usedAi: true };
    }
    const q =
      mode === "medication"
        ? "Welches Medikament ist das? Lies Name und Dosierung vor."
        : "Beschreibe kurz, was auf dem Bild zu sehen ist.";
    const r = await jarvis.visionAnalyze(dataUrl, q);
    return { text: r.answer, usedAi: true };
  } catch {
    return null;
  }
}

// --- Hausaufgaben per Foto: Zettel/Hefteintrag → strukturierte Fristen ---

const HOMEWORK_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          subject: { type: "string" }, // Fach
          task: { type: "string" }, // Aufgabe
          due_date: { type: "string" }, // ISO-Datum, wenn erkennbar
        },
      },
    },
  },
};

export interface ParsedHomework {
  subject: string;
  task: string;
  /** Fälligkeit (ms) oder null, wenn nicht erkennbar. */
  dueAt: number | null;
}

/** Foto vom Hausaufgabenheft/Zettel → Liste strukturierter Aufgaben (via Vision + Structure). */
export async function parseHomeworkPhoto(dataUrl: string): Promise<ParsedHomework[] | null> {
  if (!aiAvailable()) return null;
  try {
    const ocr = await jarvis.visionOcr(dataUrl);
    const text = ("text" in ocr ? ocr.text : (ocr as { answer: string }).answer) ?? "";
    if (!text.trim()) return [];
    const r = await jarvis.structure<{ items?: { subject?: string; task?: string; due_date?: string }[] }>(
      `Heute ist ${new Date().toISOString().slice(0, 10)}. Extrahiere Hausaufgaben (Fach, Aufgabe, Abgabedatum) aus diesem Heft-/Zetteltext: ${text}`,
      HOMEWORK_SCHEMA,
      { priority: "normal" },
    );
    return (r.items ?? [])
      .filter((i) => i.task?.trim())
      .map((i) => {
        const ts = i.due_date ? Date.parse(i.due_date) : NaN;
        return {
          subject: i.subject?.trim() || "Schule",
          task: i.task!.trim(),
          dueAt: Number.isFinite(ts) ? new Date(ts).setHours(18, 0, 0, 0) : null,
        };
      });
  } catch {
    return null;
  }
}

// --- RSD-bewusste Kommunikations-Reframes ---

const REFRAME_PROMPT =
  "Formuliere die folgende Aussage so um, dass sie bei einem Menschen mit Rejection Sensitivity " +
  "Dysphoria NICHT als Vorwurf/Kritik ankommt: Vorwurf raus, konkrete Bitte rein, Wertschätzung " +
  "wo möglich, Ich-Botschaft statt Du-Botschaft. Antworte auf Deutsch NUR mit der umformulierten " +
  "Aussage, ohne Vorrede.";

export async function reframeMessage(text: string): Promise<{ text: string; usedAi: boolean }> {
  if (aiAvailable()) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 25000);
    try {
      // Streaming nutzen (zuverlässiger — non-stream-Chat hängt, wenn das Gateway SSE liefert).
      let acc = "";
      await jarvis.chatStream(
        { system_prompt: REFRAME_PROMPT, messages: [{ role: "user", content: text }], think: false, max_tokens: 220 },
        (s) => (acc += (acc ? " " : "") + s),
        { priority: "normal", signal: ctrl.signal },
      );
      clearTimeout(to);
      if (acc.trim()) return { text: acc.trim(), usedAi: true };
    } catch {
      clearTimeout(to);
      /* Fallback */
    }
  }
  // Lokaler Fallback: brauchbare Ich-Botschaft aus der Eingabe ableiten.
  const wish = text.trim().replace(/^(immer|nie|du)\s+/i, "").replace(/[.!?]+$/, "");
  return {
    text: `Versuch es als Ich-Botschaft: „Mir ist wichtig, dass ${wish || "wir das gemeinsam hinbekommen"}. Können wir schauen, wie das für uns beide klappt?"`,
    usedAi: false,
  };
}

// --- STT: Sprachnotiz → Text ---

export async function transcribe(audio: Blob): Promise<string | null> {
  if (!aiAvailable()) return null;
  try {
    const r = await jarvis.stt(audio, "de");
    return r.text || null;
  } catch {
    return null;
  }
}

// --- RAG-Tagebuch ---

const DIARY_COLLECTION = "adhs_family_logs";

export async function diaryLog(content: string, metadata: Record<string, unknown> = {}): Promise<boolean> {
  if (!aiAvailable()) return false;
  try {
    await jarvis.ragInsert(DIARY_COLLECTION, content, { ...metadata, ts: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

export async function diaryQuery(
  query: string,
): Promise<{ content: string; score: number; metadata?: Record<string, unknown> }[] | null> {
  if (!aiAvailable()) return null;
  try {
    const r = await jarvis.ragQuery(DIARY_COLLECTION, query, 6);
    return r.results ?? [];
  } catch {
    return null;
  }
}

// --- KI-Wochenrückblick (stärkenorientiert, RSD-schonend) ---

const WEEKLY_PROMPT =
  "Du bist ein warmherziger Familien-Coach mit ADHS-Wissen. Erstelle aus den folgenden nüchternen " +
  "Wochendaten einer Familie einen kurzen, STÄRKENORIENTIERTEN Wochenrückblick auf Deutsch: " +
  "1) zwei bis drei gemeinsame Erfolge würdigen, 2) höchstens EIN wiederkehrendes Stress-Muster " +
  "sanft benennen (ohne Schuld, ohne Personen zu vergleichen), 3) ein kleiner, konkreter Vorschlag " +
  "für nächste Woche. Maximal 120 Wörter, keine Aufzählungsfloskeln, direkt ansprechen mit 'ihr'.";

export async function weeklyReview(facts: string, onSentence: (s: string) => void): Promise<boolean> {
  if (!aiAvailable()) return false;
  try {
    const text = await jarvis.chatStream(
      { system_prompt: WEEKLY_PROMPT, messages: [{ role: "user", content: facts }], think: false, max_tokens: 300 },
      onSentence,
      { priority: "low" }, // Rückblick ist nie eilig — schont den KI-Server
    );
    return Boolean(text);
  } catch {
    return false;
  }
}

/** Nächtliche Off-Peak-Mustersuche als geplanter Job (schont den KI-Server tagsüber). */
export async function scheduleNightlyInsight(): Promise<boolean> {
  if (!aiAvailable()) return false;
  try {
    await jarvis.schedulerCreate({
      title: "ADHS-Helper: nächtliche Muster-Analyse",
      schedule: { daily: "03:30" },
      action: { type: "event", event: "adhs.nightly_insight" },
    });
    return true;
  } catch {
    return false;
  }
}

export { fromLocalInput };
