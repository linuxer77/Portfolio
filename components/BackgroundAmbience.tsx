"use client";

import { useTheme } from "@/lib/theme-context";
import LedCanvasBackground from "./LedCanvasBackground";

export default function BackgroundAmbience() {
  const { theme } = useTheme();

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-700"
      style={{ backgroundColor: theme.bgBase }}
      aria-hidden="true"
    >
      {/* 1. Interactive LED Dot Matrix Canvas (running from led-background(1).html with dynamic flavour palette) */}
      <LedCanvasBackground theme={theme} />

      {/* 2. Atmospheric Ambient Glow Blooms (pure hardware-accelerated alpha blending, no mix-blend stall) */}
      <div className="absolute inset-0 opacity-35 pointer-events-none">
        {theme.blooms.map((bloom, index) => (
          <div
            key={`${theme.id}-bloom-${index}`}
            className="absolute rounded-full transition-all duration-1000 ease-out"
            style={{
              top: bloom.top,
              bottom: bloom.bottom,
              left: bloom.left,
              right: bloom.right,
              width: bloom.width,
              height: bloom.height,
              backgroundColor: bloom.color,
              filter: `blur(${bloom.blur})`,
              opacity: bloom.opacity,
            }}
          />
        ))}
      </div>

      {/* 3. Balanced ambient vignette for Hero text contrast and framing */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 18%, rgba(6,3,14,0.5) 0%, rgba(6,3,14,0.15) 55%, rgba(6,3,14,0.75) 100%)",
        }}
      />
    </div>
  );
}
