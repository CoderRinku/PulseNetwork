/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ff3b5c",
        "primary-glow": "rgba(255, 59, 92, 0.35)",
        secondary: "#10b981",
        "secondary-glow": "rgba(16, 185, 129, 0.25)",
        "bg-main": "#030303",
        "bg-surface": "#0b0b0f",
        "bg-card": "rgba(11, 11, 15, 0.85)",
        "text-muted": "#8e939e",
      },
      fontFamily: {
        main: ["Outfit", "sans-serif"],
      },
    },
  },
  plugins: [],
}
