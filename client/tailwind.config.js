/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    // güvene almak için explicit eklemeler (özellikle yeni klasörler):
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/views/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    // day/night + primary/secondary/accent + (light|DEFAULT|dark) için bg/text/border
    {
      pattern:
        /(bg|text|border)-(day|night)-(primary|secondary|accent)(-light|-dark)?/,
    },
    // day/night temel yüzey renkleri
    {
      pattern: /(bg|text|border)-(day|night)-(background|surface|text|border)/,
    },
  ],
  theme: {
    extend: {
      colors: {
        day: {
          background: "#f8fafc", // kırık beyaz
          text: "#111827", // koyu gri
          surface: "#ffffff", // kart/alan arka planı
          border: "#e5e7eb",
          dashboard: "#f4ede4",
          primary: {
            light: "#9a7dff", // açık mor
            DEFAULT: "#6B4DE6", // canlı mor
            dark: "#4a34b5", // koyu mor
          },
          secondary: {
            light: "#66aaff", // açık mavi
            DEFAULT: "#3A8DFF", // parlak mavi
            dark: "#1e64cc", // koyu mavi
          },
          accent: {
            light: "#ff9b73", // açık turuncu
            DEFAULT: "#FF7B54", // turuncu (kontrast)
            dark: "#cc4f2a", // koyu turuncu
          },
        },
        night: {
          background: "#121212", // siyah yerine koyu gri-siyah
          text: "#eaeaea", // beyaz yerine açık gri
          surface: "#1e1e1e", // kart arka planı
          border: "#2a2a2a",
          dashboard: "#0f172a",
          primary: {
            light: "#33e6b0", // açık yeşil
            DEFAULT: "#00C896", // canlı yeşil
            dark: "#009e74", // koyu yeşil
          },
          secondary: {
            light: "#33ebff", // açık turkuaz
            DEFAULT: "#00E0FF", // parlak turkuaz
            dark: "#00b2cc", // koyu turkuaz
          },
          accent: {
            light: "#d1a6ff", // açık mor
            DEFAULT: "#BB86FC", // mor accent
            dark: "#8856c9", // koyu mor
          },
        },
      },
    },
  },
  plugins: [],
};
