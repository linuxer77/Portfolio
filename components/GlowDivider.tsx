"use client";

import React from "react";

interface GlowDividerProps {
  className?: string;
  intensity?: "normal" | "subtle" | "strong";
}

export default function GlowDivider({
  className = "",
  intensity = "normal",
}: GlowDividerProps) {
  const ambientOpacity =
    intensity === "strong" ? "opacity-75" : intensity === "subtle" ? "opacity-35" : "opacity-55";
  const coreHeight = intensity === "strong" ? "h-[1.5px]" : "h-[1px]";

  return (
    <div
      className={`relative w-full py-4 select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Diffused Neon Glow Aura */}
      <div
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 ${ambientOpacity} blur-[8px] transition-all duration-700`}
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--theme-glow-start, rgba(0,240,255,0.15)) 15%, var(--theme-glow-mid, #00f0ff) 50%, var(--theme-glow-end, rgba(168,85,247,0.15)) 85%, transparent 100%)",
        }}
      />

      {/* Sharper Secondary Radiance */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] opacity-70 blur-[2px] transition-all duration-700"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--theme-glow-mid, #00f0ff) 50%, transparent 100%)",
        }}
      />

      {/* Razor-Sharp Center Laser Core Line */}
      <div
        className={`relative ${coreHeight} w-full transition-all duration-700`}
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--theme-glow-start, rgba(0,240,255,0.15)) 20%, var(--theme-glow-bright, #ffffff) 50%, var(--theme-glow-end, rgba(168,85,247,0.15)) 80%, transparent 100%)",
          boxShadow: "0 0 12px var(--theme-glow-shadow, rgba(0,240,255,0.5))",
        }}
      />
    </div>
  );
}
