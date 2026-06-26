// Ein einziger, zentraler Ticker für die ganze App. Spart Ressourcen (kein Timer pro Komponente)
// und liefert eine gemeinsame "jetzt"-Zeit. Läuft nur, solange jemand ihn nutzt.
import { readable } from "svelte/store";

export const now = readable<number>(Date.now(), (set) => {
  set(Date.now());
  // 250 ms reicht für flüssige Sekunden-Anzeige, ist aber sparsam.
  const id = setInterval(() => set(Date.now()), 250);
  // Bei Sichtbarkeitswechsel sofort aktualisieren (Hintergrund-Drift abfangen).
  const onVis = () => set(Date.now());
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVis);
  return () => {
    clearInterval(id);
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVis);
  };
});
