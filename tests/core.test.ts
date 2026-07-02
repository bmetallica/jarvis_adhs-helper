// Tests für die kritischen, puren Kernfunktionen: Losgeh-Rechner, Wind-down-Fenster,
// Zeitschätzungs-Statistik, ICS-Parser und Server-Session-Tokens.
import { describe, it, expect } from "vitest";
import { leaveTime, nextOccurrence } from "../src/lib/date";
import { windDownActive } from "../src/lib/winddown";
import { summarize, summaryText } from "../src/lib/timetrainer";
import { parseIcs } from "../src/lib/ics";
import { buildReminderPlan } from "../src/lib/push";
import { makeToken, verifyToken } from "../server/authtoken.js";

describe("Losgeh-Rechner (leaveTime)", () => {
  it("rechnet Vorlauf und Puffer rückwärts vom Start", () => {
    const start = new Date("2026-07-02T15:00:00").getTime();
    // 20 min Weg + 10 min Anziehen + 5 min Puffer → 14:25
    expect(leaveTime(start, 20 + 10, 5)).toBe(new Date("2026-07-02T14:25:00").getTime());
  });
  it("ohne Vorlauf = Startzeit", () => {
    expect(leaveTime(1000_000, 0, 0)).toBe(1000_000);
  });
});

describe("Wiederholung (nextOccurrence)", () => {
  it("weekly springt 7 Tage weiter (über jetzt hinaus)", () => {
    const past = Date.now() - 3 * 86_400_000;
    const next = nextOccurrence(past, "weekly");
    expect(next).toBeGreaterThan(Date.now());
    expect((next - past) % (7 * 86_400_000)).toBe(0);
  });
});

describe("Wind-down-Fenster", () => {
  const at = (h: number, m = 0) => new Date(2026, 6, 2, h, m).getTime();
  it("aktiv nach Startzeit am Abend", () => {
    expect(windDownActive(at(21, 30), "21:00")).toBe(true);
  });
  it("aktiv nach Mitternacht (übergreifend bis 04:00)", () => {
    expect(windDownActive(at(1, 0), "21:00")).toBe(true);
    expect(windDownActive(at(5, 0), "21:00")).toBe(false);
  });
  it("inaktiv tagsüber und bei leerer/ungültiger Einstellung", () => {
    expect(windDownActive(at(15, 0), "21:00")).toBe(false);
    expect(windDownActive(at(23, 0), "")).toBe(false);
    expect(windDownActive(at(23, 0), "quatsch")).toBe(false);
  });
});

describe("Zeitschätzungs-Trainer (summarize)", () => {
  it("liefert null bei zu wenigen Messungen", () => {
    expect(summarize([{ e: 10, a: 20, ts: 1 }])).toBeNull();
  });
  it("berechnet den Median-Faktor", () => {
    const s = summarize([
      { e: 10, a: 20, ts: 1 },
      { e: 10, a: 22, ts: 2 },
      { e: 30, a: 60, ts: 3 },
    ]);
    expect(s?.factor).toBe(2);
    expect(s?.n).toBe(3);
    expect(summaryText(s!)).toContain("×2");
  });
});

describe("ICS-Parser", () => {
  it("parst VEVENTs inkl. gefalteter Zeilen und Escapes", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:Elternabend\\, Klasse 3b",
      "DTSTART:20260812T180000",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "SUMMARY:Sommerfest mit sehr langem Tite",
      " l der gefaltet wurde",
      "DTSTART;VALUE=DATE:20260901",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const evs = parseIcs(ics);
    expect(evs).toHaveLength(2);
    expect(evs[0].title).toBe("Elternabend, Klasse 3b");
    expect(evs[0].startsAt).toBe(new Date(2026, 7, 12, 18, 0, 0).getTime());
    expect(evs[1].title).toContain("langem Titel der gefaltet");
  });
  it("UTC-Zeiten (Z) werden als UTC gelesen", () => {
    const evs = parseIcs("BEGIN:VEVENT\nSUMMARY:X\nDTSTART:20260812T160000Z\nEND:VEVENT");
    expect(evs[0].startsAt).toBe(Date.UTC(2026, 7, 12, 16, 0, 0));
  });
});

describe("Push-Plan", () => {
  it("liefert eine sortierte, leere-Stores-sichere Liste", () => {
    // Stores sind in Tests leer geladen → Plan ist leer, aber der Aufruf darf nicht werfen.
    const plan = buildReminderPlan(Date.now());
    expect(Array.isArray(plan)).toBe(true);
  });
});

describe("Server-Session-Tokens", () => {
  const SECRET = "test-secret";
  it("gültiges Token verifiziert", () => {
    const tok = makeToken(SECRET, 60_000);
    expect(verifyToken(SECRET, tok)).toBe(true);
  });
  it("abgelaufenes Token wird abgelehnt", () => {
    const tok = makeToken(SECRET, -1000);
    expect(verifyToken(SECRET, tok)).toBe(false);
  });
  it("falsches Secret/manipulierte Signatur wird abgelehnt", () => {
    const tok = makeToken(SECRET, 60_000);
    expect(verifyToken("anderes-secret", tok)).toBe(false);
    const [p] = tok.split(".");
    expect(verifyToken(SECRET, `${p}.AAAA`)).toBe(false);
    expect(verifyToken(SECRET, "unfug")).toBe(false);
    expect(verifyToken(SECRET, "")).toBe(false);
  });
});
