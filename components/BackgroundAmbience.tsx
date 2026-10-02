"use client";

import { useTheme } from "@/lib/theme-context";
import LedCanvasBackground from "./LedCanvasBackground";
import MountainCanvasBackground from "./MountainCanvasBackground";
import FissureCanvasBackground from "./FissureCanvasBackground";
import EmberCanvasBackground from "./EmberCanvasBackground";

export default function BackgroundAmbience() {
  const { theme } = useTheme();

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-700"
      style={{ backgroundColor: theme.bgBase }}
      aria-hidden="true"
    >
      {/* 1. Underlying Atmospheric Ambient Glow Blooms */}
      <div className="absolute inset-0">
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

      {/* 2. Interactive Canvas Background 1: LED Dot Matrix (from Backgrounds/led-background(1).html) */}
      <LedCanvasBackground isActive={theme.id === "led"} />

      {/* 3. Interactive Canvas Background 2: Neon Mountains (from Backgrounds/mountain-background(1).html) */}
      <MountainCanvasBackground isActive={theme.id === "mountains"} />

      {/* 4. Interactive Canvas Background 3: Neon Laser Fissure (rock with pulsed laser cracks) */}
      <FissureCanvasBackground isActive={theme.id === "fissure"} />

      {/* 5. Interactive Canvas Background 4: Golden Ember Sunset Cloud (towering mosaic cloud with embers) */}
      <EmberCanvasBackground isActive={theme.id === "ember"} />

      {/* 6. Center-Column Text Readability Shadow Mask */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 85% at 50% 35%, rgba(4,2,8,0.48) 0%, rgba(4,2,8,0.18) 60%, transparent 100%)",
        }}
      />
    </div>
  );
}
