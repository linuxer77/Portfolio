"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { playCachedAudio } from "./ArcadePreload";

interface MarioRunProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function MarioRun({ isActive, onComplete }: MarioRunProps) {
  // Positions and animation state
  const [marioPos, setMarioPos] = useState<{ x: number; y: number } | null>(null);
  const [marioSprite, setMarioSprite] = useState<string>("/arcade/mario/small_run1.png");
  const [isSuper, setIsSuper] = useState(false);

  // Block state
  const [blockPos, setBlockPos] = useState<{ x: number; y: number } | null>(null);
  const [blockHit, setBlockHit] = useState(false);
  const [blockBumpY, setBlockBumpY] = useState(0);

  // Mushroom state
  const [mushroomPos, setMushroomPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const activeAudiosRef = useRef<HTMLAudioElement[]>([]);

  const playAudio = useCallback((path: string, volume = 0.85) => {
    const audio = playCachedAudio(path, volume);
    if (audio) {
      activeAudiosRef.current.push(audio);
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    activeAudiosRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeAudiosRef.current = [];
  }, []);

  useEffect(() => {
    if (!isActive) {
      stopAllAudio();
      setMarioPos(null);
      setBlockPos(null);
      setBlockHit(false);
      setBlockBumpY(0);
      setMushroomPos({ x: 0, y: 0, visible: false });
      setIsSuper(false);
      return;
    }

    const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const groundY = 40; // bottom in px

    // Position the ? block at ~38% across the screen
    const bx = Math.min(Math.max(screenW * 0.38, 280), screenW - 240);
    const by = groundY + 110;
    setBlockPos({ x: bx, y: by });

    const startTime = performance.now();
    let animFrame: number;

    let hasJumped = false;
    let hasHitBlock = false;
    let hasCollectedShroom = false;

    // Small Mario run frames
    const smallRunSprites = [
      "/arcade/mario/small_run1.png",
      "/arcade/mario/small_run2.png",
      "/arcade/mario/small_run3.png",
    ];

    // Super Mario run frames
    const superRunSprites = [
      "/arcade/mario/super_run1.png",
      "/arcade/mario/super_run2.png",
      "/arcade/mario/super_run3.png",
    ];

    const jumpStartX = bx - 60;
    const jumpPeakX = bx + 4;
    const landX = bx + 55;

    const loop = (now: number) => {
      const elapsed = now - startTime;

      // =========================================================
      // Timeline Sequence
      // 0ms - 1300ms: Small Mario runs toward block
      // 1300ms - 1900ms: Small Mario jumps, hits ? block, falls to ground
      // 1600ms - 2400ms: Mushroom sprouts out of block and slides forward
      // 2400ms - 3200ms: Mario catches mushroom, powerup sound plays, flickers and grows into Super Mario
      // 3200ms - 5000ms: Super Mario sprints across the remaining screen and exits
      // =========================================================

      if (elapsed < 1300) {
        // --- PHASE 1: Small Mario Sprint ---
        const progress = elapsed / 1300;
        const currentX = -60 + progress * (jumpStartX - (-60));
        setMarioPos({ x: currentX, y: groundY });
        setIsSuper(false);

        const frameIdx = Math.floor(elapsed / 90) % 3;
        setMarioSprite(smallRunSprites[frameIdx]);
      } else if (elapsed < 1900) {
        // --- PHASE 2: Jump & Strike ? Block ---
        if (!hasJumped) {
          hasJumped = true;
          playAudio("/arcade/mario/jump.mp3", 0.9);
        }

        const jumpProgress = (elapsed - 1300) / 600; // 0 to 1

        let currentX: number;
        let currentY: number;

        if (jumpProgress < 0.5) {
          // Rising up to strike the underside of block
          const p = jumpProgress / 0.5;
          currentX = jumpStartX + p * (jumpPeakX - jumpStartX);
          // Parabolic rise
          const h = 1 - (1 - p) * (1 - p);
          currentY = groundY + h * (by - groundY - 42);
        } else {
          // Falling down after hitting the block
          if (!hasHitBlock) {
            hasHitBlock = true;
            setBlockHit(true);
            playAudio("/arcade/mario/sprout.mp3", 0.9);
          }

          const p = (jumpProgress - 0.5) / 0.5;
          currentX = jumpPeakX + p * (landX - jumpPeakX);
          // Parabolic fall
          const h = (1 - p) * (1 - p);
          currentY = groundY + h * (by - groundY - 42);
        }

        setMarioPos({ x: currentX, y: currentY });
        setMarioSprite("/arcade/mario/small_jump.png");

        // Bump effect for the block right around impact (at jumpProgress ~ 0.5)
        if (jumpProgress >= 0.5 && jumpProgress <= 0.75) {
          const bumpP = (jumpProgress - 0.5) / 0.25;
          const bumpOffset = Math.sin(bumpP * Math.PI) * 14;
          setBlockBumpY(bumpOffset);
        } else {
          setBlockBumpY(0);
        }
      }

      // --- MUSHROOM SPROUT & SLIDE (1600ms - 2400ms) ---
      if (elapsed >= 1600 && elapsed < 2400) {
        const shroomElapsed = elapsed - 1600;
        if (shroomElapsed < 300) {
          // Emerging upward from the block
          const emergeP = shroomElapsed / 300;
          setMushroomPos({
            x: bx + 12,
            y: by + 16 + emergeP * 32,
            visible: true,
          });
        } else {
          // Sliding forward to the right and falling down to ground
          const slideP = (shroomElapsed - 300) / 500;
          const sx = bx + 12 + slideP * 85;
          const sy = Math.max(groundY + 2, by + 48 - slideP * (by + 48 - (groundY + 2)));
          setMushroomPos({
            x: sx,
            y: sy,
            visible: true,
          });
        }
      }

      // Small Mario running to catch mushroom after landing (1900ms - 2400ms)
      if (elapsed >= 1900 && elapsed < 2400) {
        const runP = (elapsed - 1900) / 500;
        const currentX = landX + runP * (bx + 80 - landX);
        setMarioPos({ x: currentX, y: groundY });
        const frameIdx = Math.floor(elapsed / 90) % 3;
        setMarioSprite(smallRunSprites[frameIdx]);
      }

      // --- PHASE 3: Touching Mushroom & Powering Up (2400ms - 3200ms) ---
      if (elapsed >= 2400 && elapsed < 3200) {
        if (!hasCollectedShroom) {
          hasCollectedShroom = true;
          setMushroomPos((m) => ({ ...m, visible: false }));
          playAudio("/arcade/mario/powerup.mp3", 0.95);
        }

        const growElapsed = elapsed - 2400;
        setMarioPos({ x: bx + 80, y: groundY });

        // Authentic NES flicker between small and super Mario
        const flickerCycle = Math.floor(growElapsed / 100) % 2;
        if (growElapsed > 650) {
          // Fully powered up
          setIsSuper(true);
          setMarioSprite("/arcade/mario/super_run1.png");
        } else if (flickerCycle === 0) {
          setIsSuper(false);
          setMarioSprite("/arcade/mario/small_run1.png");
        } else {
          setIsSuper(true);
          setMarioSprite("/arcade/mario/super_run1.png");
        }
      }

      // --- PHASE 4: Super Mario Sprint Across Website (3200ms - 5000ms) ---
      if (elapsed >= 3200) {
        setIsSuper(true);
        const dashElapsed = elapsed - 3200;
        const dashDuration = 1800;
        const progress = Math.min(dashElapsed / dashDuration, 1);

        const startDashX = bx + 80;
        const exitDashX = screenW + 120;
        const currentX = startDashX + progress * (exitDashX - startDashX);

        // Fun celebratory jump mid-dash around 4000ms - 4400ms
        let currentY = groundY;
        let sprite = superRunSprites[Math.floor(dashElapsed / 80) % 3];

        if (dashElapsed >= 700 && dashElapsed <= 1150) {
          const jumpP = (dashElapsed - 700) / 450;
          currentY = groundY + Math.sin(jumpP * Math.PI) * 55;
          sprite = "/arcade/mario/super_jump.png";
        }

        setMarioPos({ x: currentX, y: currentY });
        setMarioSprite(sprite);
      }

      if (elapsed < 5200) {
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

  if (!isActive || !marioPos || !blockPos) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden">
      {/* 1. Floating ? Question Mark Block (turns into empty_block on impact) */}
      <div
        style={{
          left: `${blockPos.x}px`,
          bottom: `${blockPos.y + blockBumpY}px`,
        }}
        className="absolute z-20 pointer-events-none filter drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]"
      >
        <div className="relative w-11 h-11 sm:w-12 sm:h-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blockHit ? "/arcade/mario/empty_block.png" : "/arcade/mario/q_block.png"}
            alt="Question Block"
            className="w-full h-full object-contain"
            style={{ imageRendering: "pixelated" }}
            loading="eager"
            decoding="sync"
          />
        </div>
      </div>

      {/* 2. Authentic Super Mushroom sprouting and sliding */}
      {mushroomPos.visible && (
        <div
          style={{
            left: `${mushroomPos.x}px`,
            bottom: `${mushroomPos.y}px`,
          }}
          className="absolute z-10 pointer-events-none filter drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
        >
          <div className="relative w-9 h-9 sm:w-10 sm:h-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/arcade/mario/mushroom.png"
              alt="Super Mushroom"
              className="w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
              loading="eager"
              decoding="sync"
            />
          </div>
        </div>
      )}

      {/* 3. Authentic 1985 NES Mario (Small -> Super Mario) */}
      <div
        style={{
          left: `${marioPos.x}px`,
          bottom: `${marioPos.y}px`,
        }}
        className="absolute z-30 pointer-events-none filter drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]"
      >
        <div
          className={`relative transition-all duration-75 ${
            isSuper ? "w-12 h-24 sm:w-14 sm:h-28" : "w-11 h-11 sm:w-12 sm:h-12"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={marioSprite}
            alt="NES Mario"
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
