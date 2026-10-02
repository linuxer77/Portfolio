"use client";

import Image from "next/image";
import { useTheme } from "@/lib/theme-context";

export default function BackgroundAmbience() {
  const { theme, allThemes } = useTheme();

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

      {/* 2. Artistic Image Layers (Smooth crossfade between themes) */}
      <div className="absolute inset-0">
        {allThemes.map((item) => {
          const isActive = item.id === theme.id;
          return (
            <div
              key={item.id}
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{
                opacity: isActive ? item.imageOpacity : 0,
              }}
            >
              <Image
                src={item.bgImage}
                alt=""
                fill
                priority={isActive}
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          );
        })}
      </div>

      {/* 3. Artistic Readability Mask & Vignette Overlay */}
      {/* Ensures typography remains crisp pure white with 100% contrast, while image art shines through cleanly */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 30%, rgba(2,2,4,0.55) 0%, rgba(2,2,4,0.85) 65%, #020204 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(2,2,4,0.45) 0%, rgba(2,2,4,0.2) 25%, rgba(2,2,4,0.7) 80%, #020204 100%)",
        }}
      />
    </div>
  );
}
