"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ViewMode = "flow" | "minimal";

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
      if (stored === "minimal" || stored === "flow") {
        setViewModeState(stored as ViewMode);
      } else {
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
    setViewMode(viewMode === "flow" ? "minimal" : "flow");
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
