export type ThemeId = "fissure" | "synthwave" | "ember" | "aurora";

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
  bgImage: string;
  imageOpacity: number;
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
  fissure: {
    id: "fissure",
    name: "Neon Fissure",
    subtitle: "Laser fissures on obsidian",
    icon: "⚡",
    previewColors: ["#00f0ff", "#ff0055", "#a855f7"],
    bgBase: "#020204",
    bgImage: "/backgrounds/fissure.webp",
    imageOpacity: 0.48,
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
        color: "rgba(0, 240, 255, 0.15)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "35%",
        right: "10%",
        width: "620px",
        height: "420px",
        color: "rgba(255, 0, 85, 0.14)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "65%",
        left: "12%",
        width: "540px",
        height: "400px",
        color: "rgba(168, 85, 247, 0.14)",
        opacity: "1",
        blur: "140px",
      },
      {
        bottom: "4%",
        right: "18%",
        width: "520px",
        height: "360px",
        color: "rgba(0, 255, 128, 0.10)",
        opacity: "1",
        blur: "130px",
      },
    ],
  },
  synthwave: {
    id: "synthwave",
    name: "Synthwave Dusk",
    subtitle: "Sunset neon & magenta haze",
    icon: "🌆",
    previewColors: ["#ec4899", "#8b5cf6", "#06b6d4"],
    bgBase: "#030206",
    bgImage: "/backgrounds/synthwave.webp",
    imageOpacity: 0.45,
    glowStart: "rgba(236, 72, 153, 0.2)",
    glowMid: "#ec4899",
    glowBright: "#ffffff",
    glowEnd: "rgba(6, 182, 212, 0.2)",
    glowShadow: "rgba(236, 72, 153, 0.6)",
    accent: "#ec4899",
    accentHover: "#f472b6",
    blooms: [
      {
        top: "6%",
        right: "15%",
        width: "600px",
        height: "420px",
        color: "rgba(236, 72, 153, 0.16)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "32%",
        left: "10%",
        width: "540px",
        height: "390px",
        color: "rgba(139, 92, 246, 0.14)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "60%",
        right: "12%",
        width: "580px",
        height: "410px",
        color: "rgba(249, 115, 22, 0.12)",
        opacity: "1",
        blur: "140px",
      },
      {
        bottom: "6%",
        left: "16%",
        width: "500px",
        height: "360px",
        color: "rgba(6, 182, 212, 0.13)",
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
    bgImage: "/backgrounds/ember.webp",
    imageOpacity: 0.44,
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
        color: "rgba(245, 158, 11, 0.18)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "35%",
        right: "10%",
        width: "560px",
        height: "390px",
        color: "rgba(249, 115, 22, 0.15)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "65%",
        left: "12%",
        width: "540px",
        height: "400px",
        color: "rgba(239, 68, 68, 0.13)",
        opacity: "1",
        blur: "140px",
      },
      {
        bottom: "5%",
        right: "18%",
        width: "520px",
        height: "360px",
        color: "rgba(251, 191, 36, 0.14)",
        opacity: "1",
        blur: "130px",
      },
    ],
  },
  aurora: {
    id: "aurora",
    name: "Aurora Prism",
    subtitle: "Atmospheric cosmic prism",
    icon: "🌌",
    previewColors: ["#06b6d4", "#e11d48", "#9333ea"],
    bgBase: "#030306",
    bgImage: "/backgrounds/aurora.webp",
    imageOpacity: 0.38,
    glowStart: "rgba(6, 182, 212, 0.2)",
    glowMid: "#e11d48",
    glowBright: "#ffffff",
    glowEnd: "rgba(147, 51, 234, 0.2)",
    glowShadow: "rgba(6, 182, 212, 0.55)",
    accent: "#06b6d4",
    accentHover: "#22d3ee",
    blooms: [
      {
        top: "6%",
        right: "14%",
        width: "580px",
        height: "410px",
        color: "rgba(225, 29, 72, 0.15)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "34%",
        left: "12%",
        width: "540px",
        height: "390px",
        color: "rgba(6, 182, 212, 0.15)",
        opacity: "1",
        blur: "140px",
      },
      {
        top: "65%",
        right: "10%",
        width: "600px",
        height: "430px",
        color: "rgba(147, 51, 234, 0.15)",
        opacity: "1",
        blur: "140px",
      },
      {
        bottom: "5%",
        left: "16%",
        width: "520px",
        height: "370px",
        color: "rgba(245, 158, 11, 0.12)",
        opacity: "1",
        blur: "130px",
      },
    ],
  },
};

export const defaultThemeId: ThemeId = "fissure";
