<script lang="ts">
  // Profilbild aus einer Reihe auswählen. (Emoji-Avatare — funktionieren offline & überall gleich.)
  interface Props {
    value: string;
    onpick: (avatar: string) => void;
    color?: string;
  }
  let { value, onpick, color = "#4fd1c5" }: Props = $props();

  export const AVATAR_CHOICES = [
    "🦊", "🐻", "🐼", "🐬", "🦉", "🐢", "🦄", "🐧",
    "🐱", "🐶", "🐰", "🦁", "🐸", "🐵", "🐯", "🐨",
    "🦋", "🐙", "🦕", "🦖", "🐝", "🌟", "🚀", "🎩",
    "🧚", "🦸", "🧙", "🤖", "👾", "🐲", "🦔", "🐳",
  ];
</script>

<div class="grid grid-cols-8 gap-1.5">
  {#each AVATAR_CHOICES as a (a)}
    <button
      class="grid aspect-square place-items-center rounded-xl text-xl transition-all
        {value === a ? 'ring-2 ring-calm scale-105' : 'bg-surface-2'}"
      style={value === a ? `background:${color}22` : ""}
      aria-label="Avatar {a}"
      aria-pressed={value === a}
      onclick={() => onpick(a)}
    >
      {a}
    </button>
  {/each}
</div>
