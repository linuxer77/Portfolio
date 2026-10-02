export type ThemeId =
  | "prism"
  | "cyberpunk"
  | "sunset"
  | "synthwave"
  | "emerald"
  | "ocean"
  | "amethyst"
  | "stealth";

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
  bgRGB: [number, number, number];
  palette: [number, number, number][];
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
  prism: {
    id: "prism",
    name: "Prism Spectrum",
    subtitle: "Rainbow fluid LED matrix",
    icon: "🌈",
    previewColors: ["#19e8e0", "#f01cc0", "#ffdc1e"],
    bgBase: "#06030e",
    bgRGB: [6, 3, 14],
    palette: [
      [25, 232, 224], // cyan
      [42, 70, 240],  // blue
      [118, 44, 240], // violet
      [240, 28, 192], // magenta
      [255, 47, 85],  // crimson
      [255, 138, 26], // orange
      [255, 220, 30], // yellow
    ],
    glowStart: "rgba(25, 232, 224, 0.2)",
    glowMid: "#19e8e0",
    glowBright: "#ffffff",
    glowEnd: "rgba(240, 28, 192, 0.2)",
    glowShadow: "rgba(25, 232, 224, 0.55)",
    accent: "#19e8e0",
    accentHover: "#5eead4",
    blooms: [
      { top: "8%", left: "15%", width: "550px", height: "380px", color: "rgba(25, 232, 224, 0.12)", opacity: "1", blur: "140px" },
      { top: "35%", right: "10%", width: "600px", height: "420px", color: "rgba(240, 28, 192, 0.12)", opacity: "1", blur: "140px" },
      { top: "65%", left: "12%", width: "520px", height: "390px", color: "rgba(118, 44, 240, 0.13)", opacity: "1", blur: "140px" },
      { bottom: "5%", right: "18%", width: "500px", height: "360px", color: "rgba(255, 220, 30, 0.10)", opacity: "1", blur: "130px" },
    ],
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    subtitle: "Electric cyan, mint & hot pink",
    icon: "⚡",
    previewColors: ["#00f0ff", "#00ffb4", "#ff0082"],
    bgBase: "#03060c",
    bgRGB: [3, 6, 12],
    palette: [
      [16, 24, 80],   // indigo
      [0, 110, 255],  // blue
      [0, 240, 255],  // cyan
      [0, 255, 180],  // mint
      [130, 255, 40], // lime
      [255, 0, 130],  // hot pink
      [180, 0, 255],  // ultraviolet
    ],
    glowStart: "rgba(0, 240, 255, 0.2)",
    glowMid: "#00f0ff",
    glowBright: "#ffffff",
    glowEnd: "rgba(255, 0, 130, 0.2)",
    glowShadow: "rgba(0, 240, 255, 0.55)",
    accent: "#00f0ff",
    accentHover: "#38bdf8",
    blooms: [
      { top: "8%", left: "18%", width: "580px", height: "380px", color: "rgba(0, 240, 255, 0.14)", opacity: "1", blur: "140px" },
      { top: "35%", right: "10%", width: "620px", height: "420px", color: "rgba(255, 0, 130, 0.12)", opacity: "1", blur: "140px" },
      { top: "65%", left: "12%", width: "540px", height: "400px", color: "rgba(0, 255, 180, 0.12)", opacity: "1", blur: "140px" },
      { bottom: "4%", right: "18%", width: "520px", height: "360px", color: "rgba(180, 0, 255, 0.10)", opacity: "1", blur: "130px" },
    ],
  },
  sunset: {
    id: "sunset",
    name: "Sunset Ember",
    subtitle: "Crimson flame & molten gold",
    icon: "🌅",
    previewColors: ["#c3141e", "#ff780a", "#ffeb3c"],
    bgBase: "#0c0403",
    bgRGB: [12, 4, 3],
    palette: [
      [70, 10, 15],   // maroon
      [195, 20, 30],  // crimson
      [240, 65, 15],  // orange
      [255, 120, 10], // amber
      [255, 185, 20], // gold
      [255, 235, 60], // bright yellow
      [255, 250, 200],// warm light
    ],
    glowStart: "rgba(195, 20, 30, 0.2)",
    glowMid: "#ff780a",
    glowBright: "#fffbeb",
    glowEnd: "rgba(255, 235, 60, 0.2)",
    glowShadow: "rgba(255, 120, 10, 0.6)",
    accent: "#ff780a",
    accentHover: "#fb923c",
    blooms: [
      { top: "6%", left: "15%", width: "620px", height: "430px", color: "rgba(255, 120, 10, 0.16)", opacity: "1", blur: "140px" },
      { top: "35%", right: "10%", width: "560px", height: "390px", color: "rgba(240, 65, 15, 0.14)", opacity: "1", blur: "140px" },
      { top: "65%", left: "12%", width: "540px", height: "400px", color: "rgba(195, 20, 30, 0.12)", opacity: "1", blur: "140px" },
      { bottom: "5%", right: "18%", width: "520px", height: "360px", color: "rgba(255, 235, 60, 0.12)", opacity: "1", blur: "130px" },
    ],
  },
  synthwave: {
    id: "synthwave",
    name: "Synthwave Dusk",
    subtitle: "Hot magenta & electric violet",
    icon: "🌆",
    previewColors: ["#e619aa", "#8214dc", "#28dcff"],
    bgBase: "#08030e",
    bgRGB: [8, 3, 14],
    palette: [
      [30, 10, 60],   // purple
      [130, 20, 220], // violet
      [230, 25, 170], // magenta
      [255, 60, 180], // pink
      [255, 130, 150],// peach
      [40, 220, 255], // cyan
      [240, 220, 255],// lavender
    ],
    glowStart: "rgba(230, 25, 170, 0.2)",
    glowMid: "#e619aa",
    glowBright: "#ffffff",
    glowEnd: "rgba(40, 220, 255, 0.2)",
    glowShadow: "rgba(230, 25, 170, 0.55)",
    accent: "#e619aa",
    accentHover: "#f472b6",
    blooms: [
      { top: "6%", right: "15%", width: "580px", height: "420px", color: "rgba(230, 25, 170, 0.14)", opacity: "1", blur: "140px" },
      { top: "32%", left: "10%", width: "540px", height: "390px", color: "rgba(130, 20, 220, 0.14)", opacity: "1", blur: "140px" },
      { top: "60%", right: "12%", width: "560px", height: "400px", color: "rgba(40, 220, 255, 0.12)", opacity: "1", blur: "140px" },
      { bottom: "6%", left: "16%", width: "500px", height: "360px", color: "rgba(255, 60, 180, 0.10)", opacity: "1", blur: "130px" },
    ],
  },
  emerald: {
    id: "emerald",
    name: "Emerald Matrix",
    subtitle: "Terminal green & cyber mint",
    icon: "💚",
    previewColors: ["#1eb446", "#00e65a", "#aaff32"],
    bgBase: "#020a05",
    bgRGB: [2, 10, 5],
    palette: [
      [10, 45, 20],   // forest
      [15, 95, 40],   // dark green
      [30, 180, 70],  // terminal green
      [0, 230, 90],   // vivid emerald
      [40, 255, 170], // cyber mint
      [170, 255, 50], // electric lime
      [220, 255, 230],// bright mint
    ],
    glowStart: "rgba(30, 180, 70, 0.2)",
    glowMid: "#00e65a",
    glowBright: "#ffffff",
    glowEnd: "rgba(40, 255, 170, 0.2)",
    glowShadow: "rgba(0, 230, 90, 0.55)",
    accent: "#00e65a",
    accentHover: "#4ade80",
    blooms: [
      { top: "8%", left: "16%", width: "580px", height: "400px", color: "rgba(0, 230, 90, 0.14)", opacity: "1", blur: "140px" },
      { top: "35%", right: "12%", width: "540px", height: "380px", color: "rgba(40, 255, 170, 0.13)", opacity: "1", blur: "140px" },
      { top: "65%", left: "10%", width: "560px", height: "410px", color: "rgba(30, 180, 70, 0.12)", opacity: "1", blur: "140px" },
      { bottom: "5%", right: "15%", width: "500px", height: "350px", color: "rgba(170, 255, 50, 0.10)", opacity: "1", blur: "130px" },
    ],
  },
  ocean: {
    id: "ocean",
    name: "Abyssal Ocean",
    subtitle: "Deep azure, cobalt & ice cyan",
    icon: "🌊",
    previewColors: ["#146ee1", "#00aaff", "#8cf5ff"],
    bgBase: "#02060e",
    bgRGB: [2, 6, 14],
    palette: [
      [10, 25, 70],   // abyssal navy
      [15, 60, 160],  // cobalt
      [20, 110, 225], // deep azure
      [0, 170, 255],  // electric blue
      [20, 225, 220], // glacial teal
      [140, 245, 255],// ice cyan
      [230, 250, 255],// diamond white
    ],
    glowStart: "rgba(20, 110, 225, 0.2)",
    glowMid: "#00aaff",
    glowBright: "#ffffff",
    glowEnd: "rgba(140, 245, 255, 0.2)",
    glowShadow: "rgba(0, 170, 255, 0.55)",
    accent: "#00aaff",
    accentHover: "#38bdf8",
    blooms: [
      { top: "8%", left: "15%", width: "580px", height: "390px", color: "rgba(0, 170, 255, 0.14)", opacity: "1", blur: "140px" },
      { top: "35%", right: "10%", width: "550px", height: "400px", color: "rgba(20, 225, 220, 0.13)", opacity: "1", blur: "140px" },
      { top: "65%", left: "12%", width: "530px", height: "380px", color: "rgba(20, 110, 225, 0.13)", opacity: "1", blur: "140px" },
      { bottom: "5%", right: "18%", width: "500px", height: "360px", color: "rgba(140, 245, 255, 0.10)", opacity: "1", blur: "130px" },
    ],
  },
  amethyst: {
    id: "amethyst",
    name: "Amethyst Gold",
    subtitle: "Royal violet & solar gold",
    icon: "👑",
    previewColors: ["#781982", "#be2daa", "#ffd73c"],
    bgBase: "#08030a",
    bgRGB: [8, 3, 10],
    palette: [
      [40, 10, 45],   // plum
      [120, 25, 130], // amethyst
      [190, 45, 170], // orchid
      [235, 60, 90],  // crimson
      [245, 165, 30], // honey
      [255, 215, 60], // solar gold
      [255, 250, 210],// sunflare
    ],
    glowStart: "rgba(190, 45, 170, 0.2)",
    glowMid: "#ffd73c",
    glowBright: "#ffffff",
    glowEnd: "rgba(120, 25, 130, 0.2)",
    glowShadow: "rgba(255, 215, 60, 0.6)",
    accent: "#ffd73c",
    accentHover: "#fde047",
    blooms: [
      { top: "6%", left: "15%", width: "580px", height: "410px", color: "rgba(190, 45, 170, 0.14)", opacity: "1", blur: "140px" },
      { top: "35%", right: "12%", width: "560px", height: "390px", color: "rgba(255, 215, 60, 0.14)", opacity: "1", blur: "140px" },
      { top: "65%", left: "10%", width: "540px", height: "400px", color: "rgba(120, 25, 130, 0.13)", opacity: "1", blur: "140px" },
      { bottom: "5%", right: "16%", width: "500px", height: "360px", color: "rgba(245, 165, 30, 0.11)", opacity: "1", blur: "130px" },
    ],
  },
  stealth: {
    id: "stealth",
    name: "Monochrome Stealth",
    subtitle: "Gunmetal, silver & pure white",
    icon: "🤍",
    previewColors: ["#373a46", "#a0a5b4", "#ffffff"],
    bgBase: "#060608",
    bgRGB: [6, 6, 8],
    palette: [
      [25, 26, 32],   // deep slate
      [55, 58, 70],   // gunmetal
      [100, 105, 120],// steel grey
      [160, 165, 180],// silver
      [210, 215, 225],// platinum
      [255, 255, 255],// pure white
      [255, 255, 255],// highlight
    ],
    glowStart: "rgba(160, 165, 180, 0.2)",
    glowMid: "#ffffff",
    glowBright: "#ffffff",
    glowEnd: "rgba(100, 105, 120, 0.2)",
    glowShadow: "rgba(255, 255, 255, 0.55)",
    accent: "#ffffff",
    accentHover: "#e2e8f0",
    blooms: [
      { top: "8%", left: "16%", width: "560px", height: "390px", color: "rgba(210, 215, 225, 0.08)", opacity: "1", blur: "140px" },
      { top: "35%", right: "12%", width: "540px", height: "380px", color: "rgba(160, 165, 180, 0.07)", opacity: "1", blur: "140px" },
      { top: "65%", left: "10%", width: "550px", height: "400px", color: "rgba(100, 105, 120, 0.08)", opacity: "1", blur: "140px" },
      { bottom: "5%", right: "16%", width: "500px", height: "350px", color: "rgba(255, 255, 255, 0.06)", opacity: "1", blur: "130px" },
    ],
  },
};

export const defaultThemeId: ThemeId = "prism";
