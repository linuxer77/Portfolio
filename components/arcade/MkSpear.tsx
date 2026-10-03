"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";

interface MkSpearProps {
  isActive: boolean;
  onComplete: () => void;
}

// Pixel dimensions of each authentic UMK3 sprite
const SPRITE_DATA: Record<string, { w: number; h: number }> = {
  "/arcade/mk/scorpion_stance.png": { w: 63, h: 129 },
  "/arcade/mk/scorpion_spear_throw.png": { w: 94, h: 126 },
  "/arcade/mk/scorpion_spear_pull1.png": { w: 97, h: 125 },
  "/arcade/mk/scorpion_spear_pull2.png": { w: 80, h: 127 },
  "/arcade/mk/scorpion_uppercut1.png": { w: 75, h: 75 },
  "/arcade/mk/scorpion_uppercut2.png": { w: 75, h: 89 },
  "/arcade/mk/scorpion_uppercut3.png": { w: 77, h: 115 },
  "/arcade/mk/scorpion_uppercut4.png": { w: 87, h: 125 },
  "/arcade/mk/scorpion_uppercut5.png": { w: 50, h: 160 },
  "/arcade/mk/subzero_dizzy1.png": { w: 51, h: 127 },
  "/arcade/mk/subzero_dizzy2.png": { w: 50, h: 125 },
  "/arcade/mk/subzero_dizzy3.png": { w: 51, h: 123 },
  "/arcade/mk/subzero_dizzy4.png": { w: 51, h: 125 },
};

// Fixed pixel multiplier so characters preserve natural 1:1 human proportions
const SCALE = 2.1;
const GROUND_Y = 40; // px from viewport bottom

export default function MkSpear({ isActive, onComplete }: MkSpearProps) {
  const [scorpionSprite, setScorpionSprite] = useState("/arcade/mk/scorpion_stance.png");
  const [subzeroSprite, setSubzeroSprite] = useState("/arcade/mk/subzero_dizzy1.png");
  const [subzeroX, setSubzeroX] = useState<number | null>(null);
  const [subzeroY, setSubzeroY] = useState(0);
  const [subzeroRotate, setSubzeroRotate] = useState(0);

  // Chain state: spearTipX tracks the exact horizontal tip of the chain
  const [spearTipX, setSpearTipX] = useState<number | null>(null);
  const [showChain, setShowChain] = useState(false);
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
      setSpearTipX(null);
      setShowChain(false);
      setScorpionOpacity(1);
      return;
    }

    const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const scorpX = Math.max(60, screenW * 0.12);
    // Sub-Zero start position across screen
    const startSubzeroX = Math.min(screenW - 140, scorpX + Math.max(340, screenW * 0.5));
    // Final position when reeled in right next to Scorpion
    const pulledSubzeroX = scorpX + 115;

    setSubzeroX(startSubzeroX);
    setScorpionSprite("/arcade/mk/scorpion_stance.png");
    setSubzeroSprite("/arcade/mk/subzero_dizzy1.png");
    setScorpionOpacity(1);
    setShowChain(false);
    setSpearTipX(null);

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

    // Hand origin when throwing spear
    const scorpHandX = scorpX + 93 * SCALE - 10;
    // Sub-Zero chest target
    const subzeroTargetChestX = startSubzeroX + 25 * SCALE;

    const loop = (now: number) => {
      const elapsed = now - startTime;

      // =========================================================
      // Timeline Sequence (~2.7s total):
      // 0ms - 250ms: Initial standoff
      // 250ms - 750ms: Scorpion throws spear, chain shoots out across screen
      // 750ms - 1700ms: Hook hits + "GET OVER HERE!" + Sub-Zero reeled in on chain
      // 1700ms - 2200ms: Chain vanishes, UPPERCUT lands, Sub-Zero blasted to sky
      // 2200ms - 2650ms: Clean ninja vanish
      // =========================================================

      if (elapsed < 250) {
        // Phase 0: Standoff
        setScorpionSprite("/arcade/mk/scorpion_stance.png");
        setSubzeroSprite("/arcade/mk/subzero_dizzy1.png");
        setShowChain(false);
      } else if (elapsed < 750) {
        // Phase 1: Spear Throw
        if (!playedSpear) {
          playedSpear = true;
          playAudio("/arcade/mk/spear.mp3", 0.9);
        }
        setScorpionSprite("/arcade/mk/scorpion_spear_throw.png");
        setShowChain(true);

        const throwP = Math.min((elapsed - 250) / 450, 1);
        const curTipX = scorpHandX + (subzeroTargetChestX - scorpHandX) * throwP;
        setSpearTipX(curTipX);
      } else if (elapsed < 1700) {
        // Phase 2: Hook Connected & "GET OVER HERE!"
        if (!playedVoice) {
          playedVoice = true;
          playAudio("/arcade/mk/get-over-here.mp3", 1.0);
        }
        setShowChain(true);

        const pullElapsed = elapsed - 750;
        const pullP = Math.min(pullElapsed / 900, 1);

        // Subzero dragged smoothly across floor to Scorpion's feet
        const curSubX = startSubzeroX - pullP * (startSubzeroX - pulledSubzeroX);
        setSubzeroX(curSubX);

        // Chain tip stays firmly latched to Subzero's chest
        setSpearTipX(curSubX + 22 * SCALE);

        // Alternating rope pull arm frames
        const pullFrame = Math.floor(pullElapsed / 140) % 2 === 0
          ? "/arcade/mk/scorpion_spear_pull1.png"
          : "/arcade/mk/scorpion_spear_pull2.png";
        setScorpionSprite(pullFrame);

        // Subzero dizzy staggering animation
        const dizzyIdx = Math.floor(pullElapsed / 100) % 4;
        setSubzeroSprite(dizzyFrames[dizzyIdx]);
      } else if (elapsed < 2200) {
        // Phase 3: UPPERCUT
        setShowChain(false);
        setSpearTipX(null);

        const uppercutElapsed = elapsed - 1700;

        // 5-frame uppercut sequence
        const uIdx = Math.min(Math.floor(uppercutElapsed / 65), 4);
        setScorpionSprite(uppercutFrames[uIdx]);

        // Impact connects around frame 3 (~140ms)
        if (uppercutElapsed >= 140) {
          if (!playedHit) {
            playedHit = true;
            playAudio("/arcade/mk/uppercut.mp3", 0.95);
          }

          // Launch Sub-Zero spinning up off the top edge of screen
          const flightElapsed = uppercutElapsed - 140;
          const flightP = flightElapsed / 320;
          const lift = flightP * flightP * 1100;
          setSubzeroY(lift);
          setSubzeroRotate(flightP * -120);
        }
      } else {
        // Phase 4: Clean ninja vanish
        const fadeElapsed = elapsed - 2200;
        const fadeP = Math.min(fadeElapsed / 400, 1);
        setScorpionOpacity(1 - fadeP);
      }

      if (elapsed < 2700) {
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

  const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const scorpScreenX = Math.max(60, screenW * 0.12);

  // Exact pixel dimensions for current sprites to avoid any stretching or shrinking
  const scorpDims = SPRITE_DATA[scorpionSprite] || { w: 63, h: 129 };
  const scorpWidth = scorpDims.w * SCALE;
  const scorpHeight = scorpDims.h * SCALE;

  const subzeroDims = SPRITE_DATA[subzeroSprite] || { w: 51, h: 127 };
  const subzeroWidth = subzeroDims.w * SCALE;
  const subzeroHeight = subzeroDims.h * SCALE;

  // Chain origin at Scorpion's hand
  const chainStartX = scorpScreenX + (scorpDims.w === 94 ? 90 * SCALE : 75 * SCALE);
  const chainY = GROUND_Y + 195; // px from bottom of screen

  const chainLength = spearTipX ? Math.max(0, spearTipX - chainStartX) : 0;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden">
      {/* 1. Authentic Retro Steel Chain & Kunai Spearhead */}
      {showChain && spearTipX && chainLength > 0 && (
        <div
          style={{
            left: `${chainStartX}px`,
            bottom: `${chainY - 10}px`,
            width: `${chainLength}px`,
            height: "20px",
          }}
          className="absolute z-20 pointer-events-none flex items-center"
        >
          {/* Repeating Interlocking Steel Chain Links */}
          <div
            style={{
              width: `${Math.max(0, chainLength - 20)}px`,
              height: "8px",
              backgroundImage: `repeating-linear-gradient(
                90deg,
                #d4d4d8 0px,
                #ffffff 3px,
                #71717a 6px,
                #18181b 9px,
                #d4d4d8 12px
              )`,
              borderTop: "2px solid #52525b",
              borderBottom: "2px solid #27272a",
              boxShadow: "0 0 6px rgba(255, 255, 255, 0.4)",
            }}
            className="shrink-0"
          />

          {/* Barbed Steel Kunai Spearhead */}
          <div className="shrink-0 -ml-1">
            <svg width="24" height="18" viewBox="0 0 24 18" className="overflow-visible">
              {/* Outer metal blade */}
              <polygon
                points="0,2 20,9 0,16 6,9"
                fill="#f4f4f5"
                stroke="#09090b"
                strokeWidth="2"
              />
              {/* Center blade bevel and blood accent */}
              <line x1="2" y1="9" x2="16" y2="9" stroke="#dc2626" strokeWidth="2" />
            </svg>
          </div>
        </div>
      )}

      {/* 2. Authentic UMK3 Scorpion Digitized Sprite (Constant scale, bottom-anchored) */}
      <div
        style={{
          left: `${scorpScreenX}px`,
          bottom: `${GROUND_Y}px`,
          width: `${scorpWidth}px`,
          height: `${scorpHeight}px`,
          opacity: scorpionOpacity,
        }}
        className="absolute z-30 pointer-events-none filter drop-shadow-[0_0_15px_rgba(234,179,8,0.7)]"
      >
        <Image
          src={scorpionSprite}
          alt="UMK3 Scorpion"
          width={scorpWidth}
          height={scorpHeight}
          className="w-full h-full object-contain object-bottom"
          style={{ imageRendering: "pixelated" }}
          unoptimized
        />
      </div>

      {/* 3. Authentic UMK3 Sub-Zero Digitized Sprite (Constant scale, bottom-anchored) */}
      <div
        style={{
          left: `${subzeroX}px`,
          bottom: `${GROUND_Y + subzeroY}px`,
          width: `${subzeroWidth}px`,
          height: `${subzeroHeight}px`,
          transform: `scaleX(-1) rotate(${subzeroRotate}deg)`,
          transformOrigin: "bottom center",
        }}
        className="absolute z-30 pointer-events-none filter drop-shadow-[0_0_15px_rgba(59,130,246,0.7)]"
      >
        <Image
          src={subzeroSprite}
          alt="UMK3 Sub-Zero"
          width={subzeroWidth}
          height={subzeroHeight}
          className="w-full h-full object-contain object-bottom"
          style={{ imageRendering: "pixelated" }}
          unoptimized
        />
      </div>
    </div>
  );
}
