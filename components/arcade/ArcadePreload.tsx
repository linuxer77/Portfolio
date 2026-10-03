"use client";

import { useEffect } from "react";

export const ARCADE_SPRITES = [
  // Mario
  "/arcade/mario/small_run1.png",
  "/arcade/mario/small_run2.png",
  "/arcade/mario/small_run3.png",
  "/arcade/mario/small_jump.png",
  "/arcade/mario/super_run1.png",
  "/arcade/mario/super_run2.png",
  "/arcade/mario/super_run3.png",
  "/arcade/mario/super_jump.png",
  "/arcade/mario/q_block.png",
  "/arcade/mario/empty_block.png",
  "/arcade/mario/mushroom.png",
  // Contra
  "/arcade/contra/bill_run1.png",
  "/arcade/contra/bill_run2.png",
  // Street Fighter 2
  "/arcade/sf2/ryu_hadouken_1.png",
  "/arcade/sf2/ryu_hadouken_2.png",
  "/arcade/sf2/ryu_hadouken_3.png",
  "/arcade/sf2/ryu_hadouken_4.png",
  "/arcade/sf2/fireball_1.png",
  "/arcade/sf2/fireball_2.png",
  // Toasty
  "/arcade/toasty.png",
  // Mortal Kombat Fatality
  "/arcade/mk/fatality.gif",
  "/arcade/mk/fatality_0.png",
];

export const ARCADE_SOUNDS = [
  "/arcade/mario/jump.mp3",
  "/arcade/mario/sprout.mp3",
  "/arcade/mario/powerup.mp3",
  "/arcade/contra/jungle-theme.mp3",
  "/arcade/sf2/round-one-fight.mp3",
  "/arcade/sf2/hadouken.mp3",
  "/arcade/toasty.mp3",
  "/arcade/mk/fatality.mp3",
];

// In-memory cache for audio buffers to eliminate cold-start latency
const audioCache: Record<string, HTMLAudioElement> = {};

export function playCachedAudio(src: string, volume = 0.85): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  try {
    let audio = audioCache[src];
    if (!audio) {
      audio = new Audio(src);
      audio.preload = "auto";
      audioCache[src] = audio;
    }
    // Clone or reset to allow rapid replay
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = volume;
    clone.play().catch(() => {});
    return clone;
  } catch {
    return null;
  }
}

export default function ArcadePreload() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Preload and GPU-decode all sprite images immediately
    ARCADE_SPRITES.forEach((src) => {
      const img = new window.Image();
      img.src = src;
      img.decode?.().catch(() => {});
    });

    // 2. Pre-buffer all arcade audio files
    ARCADE_SOUNDS.forEach((src) => {
      if (!audioCache[src]) {
        try {
          const audio = new Audio(src);
          audio.preload = "auto";
          audioCache[src] = audio;
        } catch {
          // Ignore
        }
      }
    });
  }, []);

  return (
    <div
      className="fixed -left-[9999px] -top-[9999px] w-1 h-1 overflow-hidden pointer-events-none opacity-0 select-none"
      aria-hidden="true"
    >
      {ARCADE_SPRITES.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" loading="eager" decoding="sync" />
      ))}
    </div>
  );
}
