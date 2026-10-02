"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/theme-context";
import { ThemeId } from "@/lib/themes";
import { FaCheck } from "react-icons/fa6";
import { IoSparklesOutline } from "react-icons/io5";

export default function ThemeToggle() {
  const { theme, themeId, setTheme, allThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Change theme. Current: ${theme.name}`}
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/20 transition-all text-xs font-medium text-zinc-300 hover:text-white"
      >
        {/* Color preview dots */}
        <div className="flex items-center -space-x-1">
          {theme.previewColors.map((color, i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full ring-1 ring-black"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <span className="hidden sm:inline font-mono text-[11px] text-zinc-300">
          {theme.name}
        </span>

        <IoSparklesOutline
          size={13}
          style={{ color: theme.accent }}
          className="transition-colors"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 p-2 rounded-2xl bg-[#09080e]/95 backdrop-blur-xl border border-white/[0.12] shadow-2xl shadow-black/90 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold border-b border-white/[0.06] mb-1">
            Theme & Ambiance
          </div>

          <div className="space-y-1">
            {allThemes.map((item) => {
              const isSelected = item.id === themeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? "bg-white/[0.08] text-white border border-white/[0.1]"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Swatch */}
                    <div className="flex items-center -space-x-1.5 p-1 rounded-md bg-black/60 border border-white/[0.08]">
                      {item.previewColors.map((c, i) => (
                        <span
                          key={i}
                          className="w-2.5 h-2.5 rounded-full ring-1 ring-black"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span>{item.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <FaCheck size={11} style={{ color: item.accent }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
