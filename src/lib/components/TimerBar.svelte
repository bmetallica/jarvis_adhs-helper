<script lang="ts">
  import { formatDuration } from "$lib/util";

  interface Props {
    remaining: number;
    total: number;
    color?: string;
    label?: string;
    paused?: boolean;
  }
  let { remaining, total, color = "#4fd1c5", label = "", paused = false }: Props = $props();

  const frac = $derived(total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0);
  const shownColor = $derived(frac <= 0.2 ? "#f6c177" : color);
</script>

<div class="w-full">
  <div class="mb-2 flex items-baseline justify-between">
    <span class="font-mono text-3xl font-bold tabular-nums" style="color:{shownColor}">
      {formatDuration(remaining)}
    </span>
    {#if paused}<span class="chip">pausiert</span>{/if}
  </div>
  <div class="h-8 w-full overflow-hidden rounded-full bg-surface-2">
    <div
      class="h-full rounded-full transition-[width,background-color] duration-700 ease-soft"
      style="width:{frac * 100}%;background-color:{shownColor}"
    ></div>
  </div>
  {#if label}<p class="mt-2 truncate text-sm text-ink-soft">{label}</p>{/if}
</div>
