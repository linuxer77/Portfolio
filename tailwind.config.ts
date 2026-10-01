import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        retro: ["var(--font-press-start)", "monospace"],
        retroSans: ["var(--font-pixel)", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "#f3e5c8",
        panel: "#fbf4e2",
        panelSidebar: "#ead3a8",
        panelEditor: "#fbf4e2",
        ring: "#221d1a",
        muted: "#7e684e",
        accent: "#d9251b",
        accent2: "#2f3f73",
        accent3: "#a4671c",
      },
      boxShadow: {
        glass: "0 12px 40px rgba(0,0,0,0.35)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        paper: {
          "0%, 100%": { transform: "translateY(0) scaleY(1)" },
          "50%": { transform: "translateY(-10px) scaleY(0.98)" },
        },
        fadein: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        paper: "paper 2.2s ease-in-out infinite",
        "fade-in": "fadein 300ms ease-out both",
      },
    },
  },
  plugins: [typography],
};
export default config;
