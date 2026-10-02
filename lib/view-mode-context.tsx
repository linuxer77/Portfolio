"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ViewMode = "flow" | "static" | "minimal";

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  cycleViewMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const STORAGE_KEY = "portfolio-view-variant";

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>("flow");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as string | null;
      if (stored === "static" || stored === "minimal" || stored === "flow") {
        setViewModeState(stored as ViewMode);
      } else if (stored === "dynamic") {
        setViewModeState("flow");
      }
    } catch {
      // Storage blocked
    }
    setMounted(true);
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage blocked
    }
  };

  const cycleViewMode = () => {
    const sequence: ViewMode[] = ["flow", "static", "minimal"];
    const idx = sequence.indexOf(viewMode);
    const next = sequence[(idx + 1) % sequence.length];
    setViewMode(next);
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, cycleViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error("useViewMode must be used within a ViewModeProvider");
  }
  return context;
}
