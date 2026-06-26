<script lang="ts">
  // Schrumpfscheibe (Time-Timer-Prinzip): ein farbiger Sektor, der sichtbar kleiner wird.
  // Macht verrinnende Zeit *sichtbar*, ohne lesen/rechnen zu müssen.
  import { formatDuration } from "$lib/util";

  interface Props {
    remaining: number; // Sekunden
    total: number; // Sekunden
    color?: string;
    size?: number; // px
    label?: string;
    paused?: boolean;
  }
  let { remaining, total, color = "#4fd1c5", size = 220, label = "", paused = false }: Props =
    $props();

  const frac = $derived(total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0);

  // Farbwechsel sanft: ab <20% gehen wir zu warmem Bernstein (nie aggressives Rot).
  const shownColor = $derived(frac <= 0.2 ? "#f6c177" : color);

  const R = 50;
  const C = 2 * Math.PI * R;

  // SVG-Sektor (Pie) für den verbleibenden Anteil. Wir zeichnen ihn als Kreis-Pfad.
  function sectorPath(fraction: number): string {
    if (fraction <= 0) return "";
    if (fraction >= 1) {
      // Voller Kreis (zwei Bögen, da ein einzelner 360°-Arc nicht zeichnet).
      return `M 60 60 L 60 10 A 50 50 0 1 1 59.99 10 Z`;
    }
    const angle = fraction * 2 * Math.PI;
    // Start oben (12 Uhr), im Uhrzeigersinn.
    const x = 60 + R * Math.sin(angle);
    const y = 60 - R * Math.cos(angle);
    const large = fraction > 0.5 ? 1 : 0;
    return `M 60 60 L 60 10 A 50 50 0 ${large} 1 ${x.toFixed(3)} ${y.toFixed(3)} Z`;
  }

  const path = $derived(sectorPath(frac));
</script>

<div class="relative grid place-items-center" style="width:{size}px;height:{size}px">
  <svg viewBox="0 0 120 120" class="h-full w-full -rotate-0">
    <!-- Hintergrundscheibe -->
    <circle cx="60" cy="60" r={R} fill="#1f2630" />
    <!-- Verbleibender Sektor -->
    {#if path}
      <path d={path} fill={shownColor} class="transition-[fill] duration-700 ease-soft" />
    {/if}
    <!-- Rand -->
    <circle cx="60" cy="60" r={R} fill="none" stroke="#2a323d" stroke-width="2" />
    <!-- dezenter Außenring als Ticks -->
    <circle
      cx="60"
      cy="60"
      r={R}
      fill="none"
      stroke={shownColor}
      stroke-width="1.5"
      stroke-dasharray="0.6 {C / 12 - 0.6}"
      opacity="0.25"
    />
  </svg>
  <div class="absolute flex flex-col items-center">
    <span class="font-mono text-3xl font-bold tabular-nums" style="color:{shownColor}">
      {formatDuration(remaining)}
    </span>
    {#if label}
      <span class="mt-0.5 max-w-[80%] truncate text-sm text-ink-soft">{label}</span>
    {/if}
    {#if paused}
      <span class="mt-1 chip">pausiert</span>
    {/if}
  </div>
</div>
