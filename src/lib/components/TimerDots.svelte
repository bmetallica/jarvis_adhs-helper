<script lang="ts">
  // Verblassende Punkte: jeder Punkt = ein Zeitabschnitt, verbrauchte verblassen.
  import { formatDuration } from "$lib/util";

  interface Props {
    remaining: number;
    total: number;
    color?: string;
    label?: string;
    paused?: boolean;
    count?: number;
  }
  let {
    remaining,
    total,
    color = "#4fd1c5",
    label = "",
    paused = false,
    count = 12,
  }: Props = $props();

  const frac = $derived(total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0);
  const shownColor = $derived(frac <= 0.2 ? "#f6c177" : color);
  const active = $derived(Math.ceil(frac * count));
</script>

<div class="flex flex-col items-center gap-3">
  <span class="font-mono text-3xl font-bold tabular-nums" style="color:{shownColor}">
    {formatDuration(remaining)}
  </span>
  <div class="grid grid-cols-6 gap-2">
    {#each Array(count) as _, i (i)}
      <span
        class="h-5 w-5 rounded-full transition-opacity duration-500"
        style="background-color:{shownColor};opacity:{i < active ? 1 : 0.12}"
      ></span>
    {/each}
  </div>
  {#if paused}<span class="chip">pausiert</span>{/if}
  {#if label}<p class="truncate text-sm text-ink-soft">{label}</p>{/if}
</div>
