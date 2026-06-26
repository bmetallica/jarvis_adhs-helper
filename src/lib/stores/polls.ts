// Abstimmungen/Umfragen für die Familie. Termin-Vorschlag = Spezialfall (kind="appointment"):
// bei Zustimmung aller Eingeladenen wird der Termin automatisch angelegt.
// Geteilt (Sync via datasync, scope=shared). Benachrichtigungen via Board + JARVIS-notify + WS.
import { writable, get } from "svelte/store";
import type { Poll, PollOption } from "../types";
import { db } from "../db";
import { uid } from "../util";
import { settings } from "./settings";
import { profiles } from "./profiles";
import { appointments } from "./appointments";
import { messages } from "./messages";
import { jarvis, isConfigured } from "../jarvis/client";
import { publish } from "../jarvis/events";
import { pushToast } from "../notify";
import { dateShort, hhmm } from "../date";

const POLL_TOPIC = "jarvis/plugin/adhs/poll/update";

function me() {
  const p = get(profiles).find((x) => x.id === get(settings).activeProfileId);
  return { id: p?.id ?? null, name: p?.name ?? "Jemand" };
}

/** Termin-Konflikte im Familienkalender für ein Zeitfenster. */
export function conflictsFor(startsAt: number, durationMin: number): { title: string; startsAt: number }[] {
  const end = startsAt + durationMin * 60000;
  return get(appointments)
    .filter((a) => {
      const aEnd = a.startsAt + 60 * 60000; // Annahme: 60 min, falls keine Dauer hinterlegt
      return a.startsAt < end && aEnd > startsAt;
    })
    .map((a) => ({ title: a.title, startsAt: a.startsAt }));
}

/** Eingeladene per JARVIS benachrichtigen (push), plus Board-Eintrag. */
async function announce(poll: Poll, boardText: string, notifyIds: string[]) {
  await messages.post(boardText, "system", { name: poll.createdByName, avatar: "🗳️" });
  publish(POLL_TOPIC, { id: poll.id });
  if (!isConfigured()) return;
  const targets = get(profiles).filter((p) => notifyIds.includes(p.id) && p.jarvisUser);
  for (const t of targets) {
    try {
      await jarvis.notify({ user: t.jarvisUser!, text: boardText, kind: "poll", speak: false });
    } catch {
      /* offline */
    }
  }
}

function createPolls() {
  const { subscribe, set } = writable<Poll[]>([]);

  async function load() {
    const all = await (await db()).getAll("polls");
    all.sort((a, b) => b.createdAt - a.createdAt);
    set(all);
  }

  async function save(p: Poll) {
    await (await db()).put("polls", { ...p, updatedAt: Date.now() });
    await load();
  }

  /** Allgemeine Umfrage erstellen. */
  async function createPoll(question: string, optionTexts: string[], allowMulti = false, voterIds: string[] = []) {
    const opts: PollOption[] = optionTexts.filter((t) => t.trim()).map((t) => ({ id: uid("opt"), text: t.trim() }));
    if (!question.trim() || opts.length < 2) return null;
    const author = me();
    const poll: Poll = {
      id: uid("poll"),
      kind: "poll",
      question: question.trim(),
      options: opts,
      createdById: author.id,
      createdByName: author.name,
      allowMulti,
      voterIds,
      votes: {},
      status: "open",
      appointment: null,
      note: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await save(poll);
    const who = voterIds.length ? voterIds : get(profiles).map((p) => p.id);
    await announce(poll, `🗳️ ${author.name} fragt: „${poll.question}"`, who);
    return poll;
  }

  /** Termin-Vorschlag als Abstimmung (Ja/Nein) an die Eingeladenen. */
  async function createAppointmentPoll(draft: {
    title: string;
    icon: string;
    startsAt: number;
    durationMin: number;
    travelMin: number;
    inviteeIds: string[];
    note?: string;
  }) {
    const author = me();
    const poll: Poll = {
      id: uid("poll"),
      kind: "appointment",
      question: `Termin: ${draft.title}`,
      options: [
        { id: "yes", text: "Passt" },
        { id: "no", text: "Passt nicht" },
      ],
      createdById: author.id,
      createdByName: author.name,
      allowMulti: false,
      voterIds: draft.inviteeIds,
      votes: {},
      status: "open",
      appointment: {
        title: draft.title,
        icon: draft.icon || "🗓️",
        startsAt: draft.startsAt,
        durationMin: draft.durationMin,
        travelMin: draft.travelMin,
      },
      note: draft.note ?? "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await save(poll);
    const when = `${dateShort(draft.startsAt)} ${hhmm(draft.startsAt)} Uhr`;
    await announce(poll, `📅 ${author.name} fragt: „${draft.title}" am ${when} — passt das?`, draft.inviteeIds);
    return poll;
  }

  /** Abstimmen. */
  async function vote(pollId: string, optionIds: string[]) {
    const voterId = get(settings).activeProfileId;
    if (!voterId) return;
    const p = get({ subscribe }).find((x) => x.id === pollId);
    if (!p || p.status !== "open") return;
    const votes = { ...p.votes, [voterId]: optionIds };
    const updated: Poll = { ...p, votes };

    if (p.kind === "appointment") {
      const required = p.voterIds.length ? p.voterIds : Object.keys(votes);
      const said = (id: string, opt: string) => votes[id]?.includes(opt);
      if (required.some((id) => said(id, "no"))) {
        updated.status = "declined";
        await save(updated);
        await announce(updated, `🙁 „${p.appointment?.title}" wurde abgelehnt.`, p.createdById ? [p.createdById] : []);
        return;
      }
      if (required.every((id) => said(id, "yes"))) {
        updated.status = "confirmed";
        await save(updated);
        // Termin automatisch anlegen (Familienkalender).
        if (p.appointment) {
          await appointments.add({
            title: p.appointment.title,
            icon: p.appointment.icon,
            startsAt: p.appointment.startsAt,
            travelMin: p.appointment.travelMin,
            bufferMin: 10,
            companionId: null,
            prep: [],
            reminderOffsetsMin: [1440, 120],
            recurrence: "none",
            notes: p.note,
            profileId: p.createdById,
          });
        }
        const all = [...new Set([...(p.createdById ? [p.createdById] : []), ...p.voterIds])];
        await announce(updated, `✅ Termin bestätigt: „${p.appointment?.title}" — im Kalender eingetragen.`, all);
        return;
      }
    }
    await save(updated);
    // Ersteller über die Stimme informieren.
    await announce(updated, `🗳️ ${me().name} hat abgestimmt: „${p.question}"`, p.createdById ? [p.createdById] : []);
  }

  async function close(pollId: string) {
    const p = get({ subscribe }).find((x) => x.id === pollId);
    if (p) await save({ ...p, status: "closed" });
  }

  async function remove(pollId: string) {
    await (await db()).delete("polls", pollId);
    await load();
  }

  return { subscribe, load, createPoll, createAppointmentPoll, vote, close, remove };
}

export const polls = createPolls();

/** Stimmen je Option zählen. */
export function tally(p: Poll): Record<string, number> {
  const out: Record<string, number> = {};
  for (const opt of p.options) out[opt.id] = 0;
  for (const ids of Object.values(p.votes)) for (const id of ids) if (id in out) out[id] += 1;
  return out;
}
