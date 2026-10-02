"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeConfig, ThemeId, defaultThemeId, themes } from "./themes";

interface ThemeContextType {
  theme: ThemeConfig;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  allThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "portfolio-theme";

function applyThemeVariables(theme: ThemeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--theme-bg", theme.bgBase);
  root.style.setProperty("--theme-glow-start", theme.glowStart);
  root.style.setProperty("--theme-glow-mid", theme.glowMid);
  root.style.setProperty("--theme-glow-bright", theme.glowBright);
  root.style.setProperty("--theme-glow-end", theme.glowEnd);
  root.style.setProperty("--theme-glow-shadow", theme.glowShadow);
  root.style.setProperty("--theme-accent", theme.accent);
  root.style.setProperty("--theme-accent-hover", theme.accentHover);
  root.setAttribute("data-theme", theme.id);
  document.body.style.backgroundColor = theme.bgBase;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(defaultThemeId);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (stored && themes[stored]) {
        setThemeIdState(stored);
        applyThemeVariables(themes[stored]);
      } else {
        applyThemeVariables(themes[defaultThemeId]);
      }
    } catch {
      applyThemeVariables(themes[defaultThemeId]);
    }
    setMounted(true);
  }, []);

  const setTheme = (id: ThemeId) => {
    if (!themes[id]) return;
    setThemeIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Storage unavailable or blocked
    }
    applyThemeVariables(themes[id]);
  };

  const currentTheme = themes[themeId] || themes[defaultThemeId];

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        themeId,
        setTheme,
        allThemes: Object.values(themes),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
