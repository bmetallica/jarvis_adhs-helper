<script lang="ts">
  interface Props {
    icon: string;
    title: string;
    step: string;
    children?: import("svelte").Snippet;
  }
  let { icon, title, step, children }: Props = $props();
</script>

<div class="card flex flex-col items-center gap-3 py-10 text-center">
  <div class="text-5xl" aria-hidden="true">{icon}</div>
  <h2 class="text-xl font-bold">{title}</h2>
  <p class="chip">{step}</p>
  {#if children}
    <div class="mt-2 max-w-sm text-sm text-ink-soft">{@render children()}</div>
  {/if}
</div>
