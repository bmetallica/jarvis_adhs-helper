<script lang="ts">
  import { route, type RouteName } from "$lib/router";
  import { polls } from "$lib/stores/polls";
  import { inbox } from "$lib/stores/inbox";
  import { settings } from "$lib/stores/settings";

  const items: { name: RouteName; icon: string; label: string }[] = [
    { name: "home", icon: "🏠", label: "Jetzt" },
    { name: "plan", icon: "🗓️", label: "Plan" },
    { name: "timer", icon: "⏳", label: "Timer" },
    { name: "diary", icon: "📔", label: "Tagebuch" },
    { name: "pet", icon: "🐣", label: "Tier" },
    { name: "family", icon: "💞", label: "Familie" },
    { name: "me", icon: "🙂", label: "Ich" },
  ];

  // Badges für aktionsbedürftige Dinge.
  const meId = $derived($settings.activeProfileId);
  const familyBadge = $derived(
    $polls.filter(
      (p) =>
        p.status === "open" &&
        (p.voterIds.length === 0 || (meId != null && p.voterIds.includes(meId))) &&
        !(meId != null && (p.votes[meId]?.length ?? 0) > 0),
    ).length,
  );
  const planBadge = $derived($inbox.filter((i) => !i.processed).length);
  function badgeFor(name: RouteName): number {
    if (name === "family") return familyBadge;
    if (name === "plan") return planBadge;
    return 0;
  }
</script>

<nav
  class="fixed inset-x-0 bottom-0 z-30 border-t border-surface-2 bg-surface-1/95 backdrop-blur
    pb-[env(safe-area-inset-bottom)]"
>
  <ul class="mx-auto flex max-w-xl items-stretch justify-between px-1">
    {#each items as it (it.name)}
      <li class="flex-1">
        <button
          class="relative flex w-full flex-col items-center gap-0.5 py-2 transition-colors
            {$route === it.name ? 'text-calm' : 'text-ink-faint'}"
          aria-current={$route === it.name ? "page" : undefined}
          onclick={() => route.go(it.name)}
        >
          <span class="relative text-xl leading-none" aria-hidden="true">
            {it.icon}
            {#if badgeFor(it.name) > 0}
              <span class="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-joy px-1 text-[10px] font-bold text-surface-0">
                {badgeFor(it.name)}
              </span>
            {/if}
          </span>
          <span class="whitespace-nowrap text-[10px] font-medium">{it.label}</span>
        </button>
      </li>
    {/each}
  </ul>
</nav>
