export type ThemeId = "led" | "mountains" | "fissure" | "ember";

export interface BloomConfig {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  width: string;
  height: string;
  color: string;
  opacity: string;
  blur: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  subtitle: string;
  icon: string;
  previewColors: [string, string, string];
  bgBase: string;
  bgType: "canvas-led" | "canvas-mountain" | "image";
  bgImage?: string;
  imageOpacity?: number;
  glowStart: string;
  glowMid: string;
  glowBright: string;
  glowEnd: string;
  glowShadow: string;
  accent: string;
  accentHover: string;
  blooms: BloomConfig[];
}

export const themes: Record<ThemeId, ThemeConfig> = {
  led: {
    id: "led",
    name: "LED Dot Matrix",
    subtitle: "Quantised fluid LED field",
    icon: "✨",
    previewColors: ["#19e8e0", "#f01cc0", "#ffdc1e"],
    bgBase: "#07030f",
    bgType: "canvas-led",
    glowStart: "rgba(25, 232, 224, 0.2)",
    glowMid: "#19e8e0",
    glowBright: "#ffffff",
    glowEnd: "rgba(240, 28, 192, 0.2)",
    glowShadow: "rgba(25, 232, 224, 0.55)",
    accent: "#19e8e0",
    accentHover: "#5eead4",
    blooms: [
      {
        top: "8%",
        left: "15%",
        width: "550px",
        height: "380px",
        color: "rgba(25, 232, 224, 0.12)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "35%",
        right: "10%",
        width: "600px",
        height: "420px",
        color: "rgba(240, 28, 192, 0.12)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "65%",
        left: "12%",
        width: "520px",
        height: "390px",
        color: "rgba(118, 44, 240, 0.13)",
        opacity: "1",
        blur: "140px",
      },
      {
        bottom: "5%",
        right: "18%",
        width: "500px",
        height: "360px",
        color: "rgba(255, 220, 30, 0.10)",
        opacity: "1",
        blur: "130px",
      },
    ],
  },
  mountains: {
    id: "mountains",
    name: "Neon Mountains",
    subtitle: "Synthwave peaks & laser sky",
    icon: "🏔️",
    previewColors: ["#ff4f9f", "#9a52e6", "#4a6cf0"],
    bgBase: "#07030f",
    bgType: "canvas-mountain",
    glowStart: "rgba(255, 79, 159, 0.2)",
    glowMid: "#ff4f9f",
    glowBright: "#ffffff",
    glowEnd: "rgba(74, 108, 240, 0.2)",
    glowShadow: "rgba(255, 79, 159, 0.55)",
    accent: "#ff4f9f",
    accentHover: "#f472b6",
    blooms: [
      {
        top: "6%",
        right: "15%",
        width: "580px",
        height: "420px",
        color: "rgba(255, 79, 159, 0.14)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "32%",
        left: "10%",
        width: "540px",
        height: "390px",
        color: "rgba(154, 82, 230, 0.14)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "60%",
        right: "12%",
        width: "560px",
        height: "400px",
        color: "rgba(74, 108, 240, 0.12)",
        opacity: "1",
        blur: "140px",
      },
      {
        bottom: "6%",
        left: "16%",
        width: "500px",
        height: "360px",
        color: "rgba(255, 106, 160, 0.10)",
        opacity: "1",
        blur: "130px",
      },
    ],
  },
  fissure: {
    id: "fissure",
    name: "Neon Fissure",
    subtitle: "Laser fissures on obsidian",
    icon: "⚡",
    previewColors: ["#00f0ff", "#ff0055", "#a855f7"],
    bgBase: "#020204",
    bgType: "image",
    bgImage: "/backgrounds/fissure.webp",
    imageOpacity: 0.65,
    glowStart: "rgba(0, 240, 255, 0.2)",
    glowMid: "#00f0ff",
    glowBright: "#ffffff",
    glowEnd: "rgba(168, 85, 247, 0.2)",
    glowShadow: "rgba(0, 240, 255, 0.6)",
    accent: "#00f0ff",
    accentHover: "#38bdf8",
    blooms: [
      {
        top: "8%",
        left: "18%",
        width: "580px",
        height: "380px",
        color: "rgba(0, 240, 255, 0.14)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "35%",
        right: "10%",
        width: "620px",
        height: "420px",
        color: "rgba(255, 0, 85, 0.12)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "65%",
        left: "12%",
        width: "540px",
        height: "400px",
        color: "rgba(168, 85, 247, 0.13)",
        opacity: "1",
        blur: "140px",
      },
      {
        bottom: "4%",
        right: "18%",
        width: "520px",
        height: "360px",
        color: "rgba(0, 255, 128, 0.09)",
        opacity: "1",
        blur: "130px",
      },
    ],
  },
  ember: {
    id: "ember",
    name: "Golden Ember",
    subtitle: "Sunset flame & molten gold",
    icon: "🌅",
    previewColors: ["#ef4444", "#f59e0b", "#fbbf24"],
    bgBase: "#040302",
    bgType: "image",
    bgImage: "/backgrounds/ember.webp",
    imageOpacity: 0.62,
    glowStart: "rgba(239, 68, 68, 0.2)",
    glowMid: "#f59e0b",
    glowBright: "#fffbeb",
    glowEnd: "rgba(251, 191, 36, 0.2)",
    glowShadow: "rgba(245, 158, 11, 0.65)",
    accent: "#f59e0b",
    accentHover: "#fbbf24",
    blooms: [
      {
        top: "6%",
        left: "15%",
        width: "620px",
        height: "430px",
        color: "rgba(245, 158, 11, 0.16)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "35%",
        right: "10%",
        width: "560px",
        height: "390px",
        color: "rgba(249, 115, 22, 0.14)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "65%",
        left: "12%",
        width: "540px",
        height: "400px",
        color: "rgba(239, 68, 68, 0.12)",
        opacity: "1",
        blur: "140px",
      },
      {
        bottom: "5%",
        right: "18%",
        width: "520px",
        height: "360px",
        color: "rgba(251, 191, 36, 0.13)",
        opacity: "1",
        blur: "130px",
      },
    ],
  },
};

export const defaultThemeId: ThemeId = "led";
