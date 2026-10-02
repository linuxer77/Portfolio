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

  // Close on outside pointer interaction
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      window.addEventListener("pointerdown", handlePointerDown);
    }
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Toggle Button with ample touch target */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Switch theme aesthetic. Currently active: ${theme.name}`}
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-full bg-white/[0.07] hover:bg-white/[0.14] active:bg-white/[0.2] border border-white/[0.12] hover:border-white/25 transition-all text-xs font-medium text-zinc-200 hover:text-white touch-manipulation select-none"
      >
        {/* Color preview dots */}
        <div className="flex items-center -space-x-1 shrink-0">
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
          size={14}
          style={{ color: theme.accent }}
          className="transition-colors shrink-0"
        />
      </button>

      {/* Mobile Backdrop Overlay (ensures easy tap-outside to close on touchscreens) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown Menu (Centered modal on mobile, anchored popover on desktop) */}
      {isOpen && (
        <div className="fixed left-4 right-4 top-20 max-w-xs mx-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 p-2 rounded-2xl bg-[#08070d]/95 backdrop-blur-2xl border border-white/[0.15] shadow-2xl shadow-black/95 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.08] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Select Theme & Vibe
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Saved automatically
            </span>
          </div>

          <div className="space-y-1">
            {allThemes.map((item) => {
              const isSelected = item.id === themeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all touch-manipulation min-h-[50px] ${
                    isSelected
                      ? "bg-white/[0.1] text-white border border-white/[0.14]"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.05] active:bg-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Swatch Pill */}
                    <div className="flex items-center -space-x-1.5 p-1.5 rounded-lg bg-black/70 border border-white/[0.1] shrink-0">
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
                      <div className="text-[10px] font-mono text-zinc-400">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <FaCheck size={12} style={{ color: item.accent }} className="shrink-0" />
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
