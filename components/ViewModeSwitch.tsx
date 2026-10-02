"use client";

import { useViewMode, ViewMode } from "@/lib/view-mode-context";
import { FaWaveSquare, FaTableCellsLarge, FaMinus } from "react-icons/fa6";

export default function ViewModeSwitch() {
  const { viewMode, setViewMode } = useViewMode();

  const options: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: "flow", label: "Flow", icon: <FaWaveSquare size={11} /> },
    { id: "static", label: "Static", icon: <FaTableCellsLarge size={11} /> },
    { id: "minimal", label: "Minimal", icon: <FaMinus size={11} /> },
  ];

  return (
    <div
      role="group"
      aria-label="Portfolio View Variant Switcher"
      className="inline-flex items-center p-1 rounded-full bg-white/[0.06] border border-white/[0.1] backdrop-blur-md"
    >
      {options.map((opt) => {
        const isActive = viewMode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setViewMode(opt.id)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-mono transition-all duration-200 select-none ${
              isActive
                ? "bg-white text-black font-bold shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
            }`}
            title={`Switch to ${opt.label} View`}
          >
            <span className={isActive ? "text-black" : "text-zinc-400"}>
              {opt.icon}
            </span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
