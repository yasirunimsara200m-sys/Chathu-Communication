/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070b14", // Deep obsidian dark slate
          900: "#0f172a", // Premium slate-900 surface for cards/panels
          800: "#1e293b", // Slate-800 for elevated surfaces, rows, inputs
          700: "#334155", // Slate-700 borders/dividers
        },
        paper: {
          50: "#ffffff",  // Crisp bright white
          100: "#f1f5f9", // Clean light slate text
          200: "#94a3b8", // Muted slate text
        },
        brass: {
          300: "#93c5fd", // Soft blue
          400: "#38bdf8", // Electric sky/cyan 400 for highlights, active borders, prices
          500: "#0ea5e9", // Luminous sky-500 for primary action buttons with dark text
          600: "#0284c7", // Deep sky-600
        },
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
