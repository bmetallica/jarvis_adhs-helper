<script lang="ts">
  // Mental-Load sichtbar machen: Verantwortungsbereiche + wer sie trägt. Ton: Rebalancing, nicht
  // Aufrechnen. Keine Schuld-Visualisierung — Gespräch, nicht Beweisführung.
  import { responsibilities, RESP_SUGGESTIONS } from "$lib/stores/family";
  import { profiles } from "$lib/stores/profiles";

  let title = $state("");
  let icon = $state("📦");

  // Verteilung je Profil (nur Anzahl Bereiche, bewusst schlicht).
  const counts = $derived(() => {
    const map = new Map<string, number>();
    for (const r of $responsibilities) {
      const k = r.ownerId ?? "_";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  });
  const unassigned = $derived($responsibilities.filter((r) => !r.ownerId).length);

  async function add() {
    if (!title.trim()) return;
    await responsibilities.add(title, icon, null);
    title = "";
    icon = "📦";
  }
</script>

<div class="flex flex-col gap-4">
  <div class="card">
    <h2 class="mb-1 text-lg font-bold">Wer trägt was?</h2>
    <p class="mb-3 text-sm text-ink-faint">
      Unsichtbare Arbeit sichtbar machen — nicht um aufzurechnen, sondern um fair neu zu verteilen.
    </p>

    <!-- Verteilungsübersicht -->
    <div class="mb-3 flex flex-wrap gap-2">
      {#each $profiles as p (p.id)}
        <span class="chip" style="background:{p.color}22">
          {p.avatar} {p.name}: {counts().get(p.id) ?? 0}
        </span>
      {/each}
      {#if unassigned > 0}
        <span class="chip text-gentle">offen: {unassigned}</span>
      {/if}
    </div>
  </div>

  <!-- Bereiche -->
  <div class="flex flex-col gap-2">
    {#each $responsibilities as r (r.id)}
      <div class="card flex items-center gap-3">
        <span class="text-2xl">{r.icon}</span>
        <span class="flex-1 font-semibold">{r.title}</span>
        <select
          class="rounded-xl bg-surface-2 px-3 py-2 text-sm focus:outline-none"
          value={r.ownerId ?? ""}
          onchange={(e) => responsibilities.setOwner(r.id, e.currentTarget.value || null)}
        >
          <option value="">— offen —</option>
          {#each $profiles as p (p.id)}
            <option value={p.id}>{p.avatar} {p.name}</option>
          {/each}
        </select>
        <button class="btn-ghost px-2 py-1 text-sm text-ink-faint" aria-label="löschen" onclick={() => responsibilities.remove(r.id)}>✕</button>
      </div>
    {/each}
  </div>

  <!-- Hinzufügen -->
  <div class="card flex flex-col gap-2">
    <div class="flex gap-2">
      <input class="w-16 rounded-2xl bg-surface-2 px-3 py-3 text-center text-2xl focus:outline-none" bind:value={icon} maxlength="2" aria-label="Symbol" />
      <input class="flex-1 rounded-2xl bg-surface-2 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-calm" placeholder="Bereich (z. B. Arzttermine Kinder)" bind:value={title} onkeydown={(e) => e.key === 'Enter' && add()} />
      <button class="btn-primary" onclick={add}>+</button>
    </div>
    {#if $responsibilities.length === 0}
      <div class="flex flex-wrap gap-1 pt-1">
        {#each RESP_SUGGESTIONS as s (s.title)}
          <button class="chip" onclick={() => responsibilities.add(s.title, s.icon, null)}>{s.icon} {s.title}</button>
        {/each}
      </div>
    {/if}
  </div>
</div>
