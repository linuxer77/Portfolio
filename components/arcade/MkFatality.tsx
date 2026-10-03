"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { playCachedAudio } from "./ArcadePreload";

interface MkFatalityProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function MkFatality({ isActive, onComplete }: MkFatalityProps) {
  const [scale, setScale] = useState(2.4);
  const [shake, setShake] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(1);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isActive) {
      stopAudio();
      setScale(2.4);
      setShake({ x: 0, y: 0 });
      setOpacity(1);
      return;
    }

    // Play authentic Steve Ritchie Shao Kahn FATALITY announcer voice line from memory cache
    const audio = playCachedAudio("/arcade/mk/fatality.mp3", 1.0);
    if (audio) {
      activeAudioRef.current = audio;
    }

    const startTime = performance.now();
    let animId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;

      // =========================================================
      // Timeline (~2.8s total):
      // 0ms - 220ms: Heavy arcade slam deceleration from 2.4x -> 1.0x
      // 220ms - 420ms: Arcade impact screen shake
      // 420ms - 2350ms: Pristine centered hold with glistening blood anim
      // 2350ms - 2800ms: Smooth cinematic fade out
      // =========================================================

      if (elapsed < 220) {
        // Slam zoom-in
        const p = elapsed / 220;
        // Cubic ease out
        const ease = 1 - Math.pow(1 - p, 3);
        setScale(2.4 - ease * 1.4);
        setShake({ x: 0, y: 0 });
        setOpacity(1);
      } else if (elapsed < 420) {
        // Slam impact shake
        setScale(1.0);
        const shakeElapsed = elapsed - 220;
        const decay = 1 - shakeElapsed / 200;
        const freq = shakeElapsed * 0.08;
        setShake({
          x: Math.sin(freq * 3.5) * 8 * decay,
          y: Math.cos(freq * 4.2) * 8 * decay,
        });
        setOpacity(1);
      } else if (elapsed < 2350) {
        // Steady hold
        setScale(1.0);
        setShake({ x: 0, y: 0 });
        setOpacity(1);
      } else if (elapsed < 2800) {
        // Fade out
        setScale(1.0);
        setShake({ x: 0, y: 0 });
        const fadeP = (elapsed - 2350) / 450;
        setOpacity(Math.max(0, 1 - fadeP));
      } else {
        setScale(1.0);
        setShake({ x: 0, y: 0 });
        setOpacity(0);
        onComplete();
        return;
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      stopAudio();
    };
  }, [isActive, onComplete, stopAudio]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden flex items-center justify-center">
      {/* 100% Transparent In-Situ DOM Overlay - No background cards, boxes, or masks */}
      <div
        style={{
          transform: `translate3d(${shake.x}px, ${shake.y}px, 0) scale(${scale})`,
          opacity,
          imageRendering: "pixelated",
        }}
        className="transform-gpu transition-none flex flex-col items-center justify-center"
      >
        {/* Authentic Digitized Arcade Sprite (171x26 scaled crisp with pixel-perfect resolution) */}
        <div className="relative w-[342px] h-[52px] sm:w-[513px] sm:h-[78px] md:w-[684px] md:h-[104px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/arcade/mk/fatality.gif"
            alt="Mortal Kombat Fatality"
            className="w-full h-full object-contain"
            style={{ imageRendering: "pixelated" }}
            loading="eager"
            decoding="sync"
          />
        </div>
      </div>
    </div>
  );
}
