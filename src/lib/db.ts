// IndexedDB-Persistenzschicht — die lokale Quelle der Wahrheit (offline-first).
// Dünner Wrapper um `idb`. Object-Stores werden je Feature in den nächsten Schritten ergänzt.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface AdhsDB extends DBSchema {
  /** Schlüssel/Wert für App-Einstellungen & einzelne JSON-Objekte. */
  kv: {
    key: string;
    value: unknown;
  };
  profiles: {
    key: string;
    value: import("./types").Profile;
  };
  timers: {
    key: string;
    value: import("./types").TimerItem;
  };
  tasks: {
    key: string;
    value: import("./types").Task;
  };
  routines: {
    key: string;
    value: import("./types").Routine;
  };
  inbox: {
    key: string;
    value: import("./types").InboxItem;
  };
  checkins: {
    key: string;
    value: import("./types").Checkin;
  };
  appointments: {
    key: string;
    value: import("./types").Appointment;
  };
  deadlines: {
    key: string;
    value: import("./types").Deadline;
  };
  shopping: {
    key: string;
    value: import("./types").ShoppingItem;
  };
  meals: {
    key: string;
    value: import("./types").MealEntry;
  };
  habits: {
    key: string;
    value: import("./types").Habit;
  };
  rewards: {
    key: string;
    value: import("./types").Reward;
  };
  responsibilities: {
    key: string;
    value: import("./types").Responsibility;
  };
  appreciations: {
    key: string;
    value: import("./types").Appreciation;
  };
  messages: {
    key: string;
    value: import("./types").Message;
  };
  medications: {
    key: string;
    value: import("./types").Medication;
  };
  outbox: {
    key: string;
    value: import("./types").OutboxNote;
  };
  diary: {
    key: string;
    value: import("./types").DiaryEntry;
  };
  polls: {
    key: string;
    value: import("./types").Poll;
  };
  locations: {
    key: string;
    value: import("./types").LocationNote;
  };
  safefoods: {
    key: string;
    value: import("./types").SafeFood;
  };
  pharmacy: {
    key: string;
    value: import("./types").PharmacyNote;
  };
}

const DB_NAME = "adhs-helper";
const DB_VERSION = 11;

let _db: Promise<IDBPDatabase<AdhsDB>> | null = null;

export function db(): Promise<IDBPDatabase<AdhsDB>> {
  if (!_db) {
    _db = openDB<AdhsDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        // v1: kv + profiles. Spätere Versionen migrieren additiv.
        if (oldVersion < 1) {
          database.createObjectStore("kv");
          database.createObjectStore("profiles", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          database.createObjectStore("timers", { keyPath: "id" });
        }
        if (oldVersion < 3) {
          database.createObjectStore("tasks", { keyPath: "id" });
          database.createObjectStore("routines", { keyPath: "id" });
          database.createObjectStore("inbox", { keyPath: "id" });
          database.createObjectStore("checkins", { keyPath: "id" });
        }
        if (oldVersion < 4) {
          database.createObjectStore("appointments", { keyPath: "id" });
          database.createObjectStore("deadlines", { keyPath: "id" });
          database.createObjectStore("shopping", { keyPath: "id" });
          database.createObjectStore("meals", { keyPath: "id" });
          database.createObjectStore("habits", { keyPath: "id" });
        }
        if (oldVersion < 5) {
          database.createObjectStore("rewards", { keyPath: "id" });
        }
        if (oldVersion < 6) {
          database.createObjectStore("responsibilities", { keyPath: "id" });
          database.createObjectStore("appreciations", { keyPath: "id" });
        }
        if (oldVersion < 7) {
          database.createObjectStore("messages", { keyPath: "id" });
        }
        if (oldVersion < 8) {
          database.createObjectStore("medications", { keyPath: "id" });
        }
        if (oldVersion < 9) {
          database.createObjectStore("outbox", { keyPath: "id" });
          database.createObjectStore("diary", { keyPath: "id" });
        }
        if (oldVersion < 10) {
          database.createObjectStore("polls", { keyPath: "id" });
        }
        if (oldVersion < 11) {
          database.createObjectStore("locations", { keyPath: "id" });
          database.createObjectStore("safefoods", { keyPath: "id" });
          database.createObjectStore("pharmacy", { keyPath: "id" });
        }
      },
    });
  }
  return _db;
}

// --- KV-Helfer (für Settings & einfache Objekte) ---

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get("kv", key)) as T | undefined;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await (await db()).put("kv", value as unknown, key);
}

export async function kvDel(key: string): Promise<void> {
  await (await db()).delete("kv", key);
}
