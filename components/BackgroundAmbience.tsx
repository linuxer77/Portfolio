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

      {/* 2. Atmospheric Ambient Glow Blooms with screen blend for rich luminous clouds behind glass */}
      <div className="absolute inset-0 mix-blend-screen opacity-70 pointer-events-none">
        {theme.blooms.map((bloom, index) => (
          <div
            key={`${theme.id}-bloom-${index}`}
            className="absolute rounded-full transition-all duration-1000 ease-out will-change-transform"
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
    </div>
  );
}
