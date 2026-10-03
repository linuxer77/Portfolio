"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";

interface MkSpearProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function MkSpear({ isActive, onComplete }: MkSpearProps) {
  const [scorpionSprite, setScorpionSprite] = useState("/arcade/mk/scorpion_stance.png");
  const [subzeroSprite, setSubzeroSprite] = useState("/arcade/mk/subzero_dizzy1.png");
  const [subzeroX, setSubzeroX] = useState<number | null>(null);
  const [subzeroY, setSubzeroY] = useState(0);
  const [subzeroRotate, setSubzeroRotate] = useState(0);
  const [spearProgress, setSpearProgress] = useState(0); // 0: none, 0->1: extending, 1->0: retracting
  const [isPulling, setIsPulling] = useState(false);
  const [scorpionOpacity, setScorpionOpacity] = useState(1);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const playAudio = useCallback((path: string, volume = 0.9) => {
    try {
      const audio = new Audio(path);
      audio.volume = volume;
      audioRefs.current[path] = audio;
      audio.play().catch(() => {});
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    Object.values(audioRefs.current).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioRefs.current = {};
  }, []);

  useEffect(() => {
    if (!isActive) {
      stopAllAudio();
      setSubzeroX(null);
      setSubzeroY(0);
      setSubzeroRotate(0);
      setSpearProgress(0);
      setIsPulling(false);
      setScorpionOpacity(1);
      return;
    }

    const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const scorpX = Math.max(60, screenW * 0.14);
    const startSubzeroX = Math.min(screenW - 120, scorpX + Math.max(280, screenW * 0.45));
    const pulledSubzeroX = scorpX + 75;

    setSubzeroX(startSubzeroX);
    setScorpionSprite("/arcade/mk/scorpion_stance.png");
    setSubzeroSprite("/arcade/mk/subzero_dizzy1.png");
    setScorpionOpacity(1);

    const startTime = performance.now();
    let animFrame: number;

    let playedSpear = false;
    let playedVoice = false;
    let playedHit = false;

    const dizzyFrames = [
      "/arcade/mk/subzero_dizzy1.png",
      "/arcade/mk/subzero_dizzy2.png",
      "/arcade/mk/subzero_dizzy3.png",
      "/arcade/mk/subzero_dizzy4.png",
    ];

    const uppercutFrames = [
      "/arcade/mk/scorpion_uppercut1.png",
      "/arcade/mk/scorpion_uppercut2.png",
      "/arcade/mk/scorpion_uppercut3.png",
      "/arcade/mk/scorpion_uppercut4.png",
      "/arcade/mk/scorpion_uppercut5.png",
    ];

    const loop = (now: number) => {
      const elapsed = now - startTime;

      // =========================================================
      // Timeline Sequence (~2.6s total):
      // 0ms - 280ms: Stance
      // 280ms - 750ms: Spear throw expands across screen
      // 750ms - 1700ms: "GET OVER HERE!" + Sub-Zero reeled in
      // 1700ms - 2150ms: UPPERCUT + bone crunch + Sub-Zero rockets off top
      // 2150ms - 2600ms: Scorpion ninja smoke fade out
      // 2700ms: onComplete
      // =========================================================

      if (elapsed < 280) {
        // Phase 0: Initial standoff
        setScorpionSprite("/arcade/mk/scorpion_stance.png");
        setSubzeroSprite("/arcade/mk/subzero_dizzy1.png");
        setSpearProgress(0);
      } else if (elapsed < 750) {
        // Phase 1: Spear Throw
        if (!playedSpear) {
          playedSpear = true;
          playAudio("/arcade/mk/spear.mp3", 0.85);
        }
        setScorpionSprite("/arcade/mk/scorpion_spear_throw.png");

        const throwP = Math.min((elapsed - 280) / 400, 1);
        setSpearProgress(throwP);
      } else if (elapsed < 1700) {
        // Phase 2: Hook & "GET OVER HERE!" reel in
        if (!playedVoice) {
          playedVoice = true;
          playAudio("/arcade/mk/get-over-here.mp3", 1.0);
          setIsPulling(true);
        }

        const pullElapsed = elapsed - 750;
        const pullP = Math.min(pullElapsed / 850, 1);

        // Smoothly pull Sub-Zero toward Scorpion
        const curSubX = startSubzeroX - pullP * (startSubzeroX - pulledSubzeroX);
        setSubzeroX(curSubX);

        // Cycle reeling arm sprites
        const pullFrame = Math.floor(pullElapsed / 140) % 2 === 0
          ? "/arcade/mk/scorpion_spear_pull1.png"
          : "/arcade/mk/scorpion_spear_pull2.png";
        setScorpionSprite(pullFrame);

        // Subzero staggering dizzy frames
        const dizzyIdx = Math.floor(pullElapsed / 100) % 4;
        setSubzeroSprite(dizzyFrames[dizzyIdx]);

        // Keep spear taut between them
        setSpearProgress(1 - pullP * 0.9);
      } else if (elapsed < 2150) {
        // Phase 3: UPPERCUT
        setSpearProgress(0);
        setIsPulling(false);

        const uppercutElapsed = elapsed - 1700;

        // 5-frame uppercut sequence
        const uIdx = Math.min(Math.floor(uppercutElapsed / 60), 4);
        setScorpionSprite(uppercutFrames[uIdx]);

        // Impact happens at frame 3 (~180ms)
        if (uppercutElapsed >= 140) {
          if (!playedHit) {
            playedHit = true;
            playAudio("/arcade/mk/uppercut.mp3", 0.95);
          }

          // Launch Sub-Zero spinning up off top of the screen
          const flightElapsed = uppercutElapsed - 140;
          const flightP = flightElapsed / 310;
          // Exponential upward rocket velocity
          const lift = flightP * flightP * 900;
          setSubzeroY(lift);
          setSubzeroRotate(flightP * -120);
        }
      } else {
        // Phase 4: Clean ninja vanish
        const fadeElapsed = elapsed - 2150;
        const fadeP = Math.min(fadeElapsed / 400, 1);
        setScorpionOpacity(1 - fadeP);
      }

      if (elapsed < 2650) {
        animFrame = requestAnimationFrame(loop);
      } else {
        setTimeout(() => {
          onComplete();
        }, 100);
      }
    };

    animFrame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrame);
      stopAllAudio();
    };
  }, [isActive, onComplete, playAudio, stopAllAudio]);

  if (!isActive || subzeroX === null) return null;

  const scorpScreenX = typeof window !== "undefined" ? Math.max(60, window.innerWidth * 0.14) : 120;
  // Spear launch point from Scorpion's outstretched hand
  const spearOriginX = scorpScreenX + 90;
  const spearOriginY = 120; // px from bottom

  // Sub-Zero chest target
  const spearTargetX = subzeroX + 20;
  const spearTargetY = 115;

  const currentSpearEndX = spearOriginX + (spearTargetX - spearOriginX) * spearProgress;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden">
      {/* 1. Authentic Kunai Spear with Retracting Rope/Chain */}
      {spearProgress > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {/* Segmented arcade rope line */}
          <line
            x1={spearOriginX}
            y1={`calc(100% - ${spearOriginY}px)`}
            x2={currentSpearEndX}
            y2={`calc(100% - ${spearTargetY}px)`}
            stroke="#e4e4e7"
            strokeWidth="3"
            strokeDasharray="6 3"
            strokeLinecap="round"
          />
          {/* Kunai metal spear tip */}
          <polygon
            points={`${currentSpearEndX},${`calc(100% - ${spearTargetY}px)`} ${currentSpearEndX - 16},${`calc(100% - ${spearTargetY - 6}px)`} ${currentSpearEndX - 10},${`calc(100% - ${spearTargetY}px)`} ${currentSpearEndX - 16},${`calc(100% - ${spearTargetY + 6}px)`}`}
            fill="#f43f5e"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </svg>
      )}

      {/* 2. Authentic UMK3 Scorpion Digitized Sprite */}
      <div
        style={{
          left: `${scorpScreenX}px`,
          bottom: "36px",
          opacity: scorpionOpacity,
        }}
        className="absolute z-30 pointer-events-none filter drop-shadow-[0_0_15px_rgba(234,179,8,0.7)]"
      >
        <div className="relative w-28 h-56 sm:w-32 sm:h-64">
          <Image
            src={scorpionSprite}
            alt="UMK3 Scorpion"
            fill
            className="object-contain"
            style={{ imageRendering: "pixelated" }}
            unoptimized
          />
        </div>
      </div>

      {/* 3. Authentic UMK3 Sub-Zero Digitized Sprite (Reeled in & Launched) */}
      <div
        style={{
          left: `${subzeroX}px`,
          bottom: `${36 + subzeroY}px`,
          transform: `scaleX(-1) rotate(${subzeroRotate}deg)`,
        }}
        className="absolute z-30 pointer-events-none filter drop-shadow-[0_0_15px_rgba(59,130,246,0.7)]"
      >
        <div className="relative w-28 h-56 sm:w-32 sm:h-64">
          <Image
            src={subzeroSprite}
            alt="UMK3 Sub-Zero"
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
