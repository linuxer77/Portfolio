"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";

interface ContraRunProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function ContraRun({ isActive, onComplete }: ContraRunProps) {
  const [billX, setBillX] = useState<number | null>(null);
  const [spriteIdx, setSpriteIdx] = useState(0);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const playAudio = useCallback((path: string, volume = 0.85) => {
    try {
      const audio = new Audio(path);
      audio.volume = volume;
      audioRefs.current[path] = audio;
      audio.play().catch(() => {});
    } catch {
      // Audio playback denied or blocked
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    Object.values(audioRefs.current).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioRefs.current = {};
  }, []);

  const runningSprites = [
    "/arcade/contra/bill_run1.png",
    "/arcade/contra/bill_run2.png",
  ];

  useEffect(() => {
    if (!isActive) {
      stopAllAudio();
      setBillX(null);
      return;
    }

    // Play classic Contra Jungle Theme
    playAudio("/arcade/contra/jungle-theme.mp3", 0.85);

    // Sprint animation across viewport (no bullets, no text)
    const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const startX = -120;
    const endX = screenW + 140;
    const totalDuration = 3400; // 3.4s to sprint across
    const startTime = performance.now();

    let animFrame: number;

    const loop = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const currentX = startX + progress * (endX - startX);
      setBillX(currentX);

      // Cycle running sprites smoothly
      const f = Math.floor(elapsed / 120) % 2;
      setSpriteIdx(f);

      if (progress < 1) {
        animFrame = requestAnimationFrame(loop);
      } else {
        setTimeout(() => {
          onComplete();
        }, 200);
      }
    };

    animFrame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrame);
      stopAllAudio();
    };
  }, [isActive, onComplete, playAudio, stopAllAudio]);

  if (!isActive || billX === null) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden">
      {/* Bill Rizer NES Sprite running across bottom - no text, no bullets */}
      <div
        style={{
          left: `${billX}px`,
          bottom: "48px",
        }}
        className="absolute z-30 flex flex-col items-center pointer-events-none"
      >
        <div className="relative w-16 h-28 sm:w-20 sm:h-36 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]">
          <Image
            src={runningSprites[spriteIdx]}
            alt="Contra Bill Rizer"
            fill
            className="object-contain"
            style={{ imageRendering: "pixelated" }}
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
