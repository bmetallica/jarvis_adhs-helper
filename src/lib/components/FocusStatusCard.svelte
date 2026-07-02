<script lang="ts">
  // Body-Doubling Stufe 1: „X fokussiert gerade an Y (noch Z min)". Alleine arbeiten fühlt
  // sich weniger alleine an, wenn die Familie es sieht — und anfeuern kann (👍).
  import { focusstatus, isActiveFocus } from "$lib/stores/focusstatus";
  import { profiles } from "$lib/stores/profiles";
  import { settings } from "$lib/stores/settings";
  import { now } from "$lib/stores/clock";
  import { successCue } from "$lib/feedback";

  const me = $derived($profiles.find((p) => p.id === $settings.activeProfileId) ?? null);
  const myStatus = $derived($focusstatus.find((s) => s.id === me?.id && isActiveFocus(s, $now)) ?? null);
  const others = $derived($focusstatus.filter((s) => s.id !== me?.id && isActiveFocus(s, $now)));

  let text = $state("");
  let minutes = $state(25);
  let editing = $state(false);

  async function start() {
    if (!me || !text.trim()) return;
    await focusstatus.setStatus(me.id, me.name, me.avatar, text, Date.now() + minutes * 60000);
    text = "";
    editing = false;
    successCue();
  }
  async function stop() {
    if (me) await focusstatus.clearStatus(me.id);
  }
  function remaining(until: number): number {
    return Math.max(0, Math.round((until - $now) / 60000));
  }
</script>

{#if me}
  <section class="card">
    <p class="chip mb-2">🔨 Gerade im Fokus</p>
    <ul class="flex flex-col gap-1.5">
      {#each others as s (s.id)}
        <li class="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
          <span class="text-lg">{s.avatar}</span>
          <span class="flex-1 text-sm"><strong>{s.name}</strong>: {s.text} <span class="text-ink-faint">(noch {remaining(s.until)} min)</span></span>
          <button class="btn-ghost px-2 py-1" aria-label="Anfeuern" onclick={() => focusstatus.cheer(s.id)}>
            👍{s.cheers > 0 ? ` ${s.cheers}` : ""}
          </button>
        </li>
      {/each}
      {#if myStatus}
        <li class="flex items-center gap-3 rounded-xl border border-calm/40 bg-surface-2 px-3 py-2">
          <span class="text-lg">{myStatus.avatar}</span>
          <span class="flex-1 text-sm">Du: {myStatus.text} <span class="text-ink-faint">(noch {remaining(myStatus.until)} min{myStatus.cheers ? ` · 👍 ${myStatus.cheers}` : ""})</span></span>
          <button class="btn-ghost px-2 py-1 text-xs" onclick={stop}>fertig</button>
        </li>
      {/if}
    </ul>
    {#if editing && !myStatus}
      <div class="mt-2 flex flex-col gap-2">
        <input
          class="rounded-2xl bg-surface-2 px-4 py-2.5 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-calm"
          placeholder="Woran arbeitest du?"
          bind:value={text}
          onkeydown={(e) => e.key === "Enter" && start()}
        />
        <div class="flex gap-2">
          {#each [25, 50] as m (m)}
            <button class="chip {minutes === m ? 'bg-calm text-surface-0' : ''}" onclick={() => (minutes = m)}>{m} min</button>
          {/each}
          <button class="btn-primary flex-1 py-1.5 text-sm" onclick={start} disabled={!text.trim()}>Teilen</button>
        </div>
      </div>
    {:else if !myStatus}
      <button class="btn-ghost mt-2 w-full text-sm" onclick={() => (editing = true)}>+ Ich fokussiere gerade an …</button>
    {/if}
  </section>
{/if}
