/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
      },
      colors: {
        git: {
          add: "#22c55e",
          delete: "#ef4444",
          modify: "#f59e0b",
          rename: "#8b5cf6",
          conflict: "#f97316",
        },
      },
    },
  },
  plugins: [],
};
