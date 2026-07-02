// Bildschirm-Wach-Halten (Screen Wake Lock API) für laufende Timer/Routinen.
// Der visuelle Timer externalisiert Zeit nur, solange das Display an ist.
// Best effort: ohne API-Unterstützung passiert einfach nichts.

type WakeLockSentinel = { release: () => Promise<void>; addEventListener: (t: string, f: () => void) => void };

/** Wake Lock anfordern; gibt eine Release-Funktion zurück. Re-acquire nach Tab-Wechsel. */
export function acquireWakeLock(): () => void {
  let sentinel: WakeLockSentinel | null = null;
  let released = false;

  const request = async () => {
    try {
      const wl = (navigator as { wakeLock?: { request: (t: string) => Promise<WakeLockSentinel> } }).wakeLock;
      if (!wl || released) return;
      sentinel = await wl.request("screen");
    } catch {
      sentinel = null; // z. B. Energiesparmodus — okay
    }
  };

  const onVisible = () => {
    if (!released && document.visibilityState === "visible") void request();
  };

  void request();
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    released = true;
    document.removeEventListener("visibilitychange", onVisible);
    void sentinel?.release().catch(() => {});
    sentinel = null;
  };
}
