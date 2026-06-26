// WebSocket-Transport zum JARVIS-Plugin-Event-Bus (/api/v1/ws). Reine Transport-Schicht:
// Verbindungs-Lebenszyklus, Reconnect mit Backoff, Subscribe/Publish, Nachrichten-Callback.
// App-Logik (Pet-Sync etc.) liegt in sync.ts. Funktioniert nur online; offline einfach inaktiv.
import { writable } from "svelte/store";
import { connectEvents, isConfigured } from "./client";

export interface PluginEvent {
  topic: string;
  payload: Record<string, unknown>;
}

export const wsConnected = writable(false);

type Handler = (ev: PluginEvent) => void;
const handlers = new Set<Handler>();
let ws: WebSocket | null = null;
let reconnectAttempt = 0;
let subscriptions: string[] = ["jarvis/plugin/adhs/#", "jarvis/core/timer_elapsed"];
let stopped = false;

export function onPluginEvent(h: Handler): () => void {
  handlers.add(h);
  return () => handlers.delete(h);
}

export function setSubscriptions(topics: string[]) {
  subscriptions = topics;
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ op: "subscribe", topics }));
  }
}

export function publish(topic: string, payload: Record<string, unknown>) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ op: "publish", topic, payload }));
  }
}

export function connect() {
  if (!isConfigured() || stopped) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  try {
    ws = connectEvents();
  } catch {
    scheduleReconnect();
    return;
  }
  if (!ws) return;

  ws.onopen = () => {
    reconnectAttempt = 0;
    wsConnected.set(true);
    ws?.send(JSON.stringify({ op: "subscribe", topics: subscriptions }));
  };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.op === "event" && msg.topic) {
        const ev: PluginEvent = { topic: msg.topic, payload: msg.payload ?? {} };
        handlers.forEach((h) => h(ev));
      }
    } catch {
      /* ignore */
    }
  };
  ws.onclose = () => {
    wsConnected.set(false);
    scheduleReconnect();
  };
  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect() {
  if (stopped || !isConfigured()) return;
  const wait = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt));
  reconnectAttempt++;
  setTimeout(connect, wait + Math.random() * 500);
}

export function startEvents() {
  stopped = false;
  connect();
}

export function stopEvents() {
  stopped = true;
  ws?.close();
  ws = null;
  wsConnected.set(false);
}
