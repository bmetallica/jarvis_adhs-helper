/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{svelte,ts,js}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Ruhige, ADHS-gerechte Palette (Dark-Mode-first, kein aggressives Rot).
        ink: {
          DEFAULT: "#e8ecf1",
          soft: "#aab4c2",
          faint: "#6b7686",
        },
        surface: {
          0: "#0e1116",
          1: "#161b22",
          2: "#1f2630",
          3: "#2a323d",
        },
        // Primär: warmes Teal/Grün = ruhig, ermutigend.
        calm: {
          DEFAULT: "#4fd1c5",
          soft: "#2c7a73",
          deep: "#1d4e49",
        },
        // Akzent für Belohnung/Erfolg (warm, sanft – nie grell).
        joy: {
          DEFAULT: "#ffb86b",
          soft: "#c98a4b",
        },
        // "Achtung" bewusst als sanftes Bernstein statt Rot (RSD-Schutz).
        gentle: {
          DEFAULT: "#f6c177",
          soft: "#b8915a",
        },
      },
      borderRadius: {
        xl2: "1.25rem",
        "3xl": "1.75rem",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
