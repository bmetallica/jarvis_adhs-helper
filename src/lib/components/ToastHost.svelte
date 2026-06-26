<script lang="ts">
  // Zeigt sanfte In-App-Erinnerungen (Fallback/Ergänzung zur System-Notification).
  import { toasts, dismissToast } from "$lib/notify";
</script>

<div
  class="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3
    pt-[max(0.75rem,env(safe-area-inset-top))]"
>
  {#each $toasts as t (t.id)}
    <div
      class="pointer-events-auto w-full max-w-md rounded-2xl border border-surface-3 bg-surface-2
        p-4 shadow-xl shadow-black/40"
      role="status"
    >
      <div class="flex items-start gap-3">
        <div class="flex-1">
          <p class="font-semibold">{t.title}</p>
          {#if t.body}<p class="mt-0.5 text-sm text-ink-soft">{t.body}</p>{/if}
        </div>
        <button
          class="btn-ghost px-2 py-0.5 text-sm"
          aria-label="Schließen"
          onclick={() => dismissToast(t.id)}>✕</button
        >
      </div>
    </div>
  {/each}
</div>
