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
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Geist", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        shell: "0 24px 48px -24px rgba(11, 28, 48, 0.18)",
        panel: "0 18px 36px -24px rgba(11, 28, 48, 0.22)",
        accent: "0 18px 40px -28px rgba(0, 53, 39, 0.55)",
      },
      maxWidth: {
        shell: "1600px",
      },
      colors: {
        day: {
          background: "#f5f7fc",
          text: "#0b1c30",
          muted: "#5d687c",
          surface: "#ffffff",
          panel: "#eef3fb",
          panelStrong: "#dde7f7",
          border: "#d6dde8",
          dashboard: "#eef3fb",
          primary: {
            light: "#d9efe5",
            DEFAULT: "#003527",
            dark: "#064e3b",
          },
          secondary: {
            light: "#dae2fd",
            DEFAULT: "#5c647a",
            dark: "#3f465c",
          },
          accent: {
            light: "#ffdad6",
            DEFAULT: "#8d4b41",
            dark: "#6b342d",
          },
        },
        night: {
          background: "#0f1722",
          text: "#eaf1ff",
          muted: "#9baac0",
          surface: "#182230",
          panel: "#1e2a39",
          panelStrong: "#273648",
          border: "#314253",
          dashboard: "#101b2a",
          primary: {
            light: "#b0f0d6",
            DEFAULT: "#95d3ba",
            dark: "#5aa184",
          },
          secondary: {
            light: "#dae2fd",
            DEFAULT: "#bec6e0",
            dark: "#8993ad",
          },
          accent: {
            light: "#ffdad5",
            DEFAULT: "#ffb4a9",
            dark: "#c78176",
          },
        },
      },
    },
  },
  plugins: [],
};
