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
        // Purple-dark palette
        bg: "#0f0a1f",
        panel: "#1a132b",
        panelSidebar: "#1a132b",
        panelEditor: "#0b0716",
        ring: "#2a2340",
        muted: "#a89cc0",
        accent: "#a78bfa", // folder/title purple
        accent2: "#c084fc", // link-hover purple
        accent3: "#22d3ee", // cyan accent
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
