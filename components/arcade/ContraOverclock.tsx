"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface ContraOverclockProps {
  isActive: boolean;
  onExit: () => void;
}

export default function ContraOverclock({ isActive, onExit }: ContraOverclockProps) {
  const [billX, setBillX] = useState(0);
  const [billFrame, setBillFrame] = useState(0);
  const [bullets, setBullets] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number }>>([]);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const nextBulletId = useRef(0);

  const playAudio = useCallback((path: string, volume = 0.85) => {
    try {
      const audio = new Audio(path);
      audio.volume = volume;
      audioRefs.current[path] = audio;
      audio.play().catch(() => {});
    } catch {
      // Audio playback denied
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
      setBullets([]);
      setBillX(0);
      return;
    }

    // 1. Play authentic NES 30-Lives Chime!
    playAudio("/arcade/contra/1up.mp3", 0.95);

    // 2. Bill running across screen
    let currentX = 0;
    const speed = 4;
    let animId: number;

    const runLoop = () => {
      currentX += speed;
      setBillX(currentX);
      setBillFrame((prev) => (prev === 0 ? 1 : 0));

      if (currentX < window.innerWidth - 100) {
        animId = requestAnimationFrame(runLoop);
      }
    };

    animId = requestAnimationFrame(runLoop);

    // 3. Fire Spread Gun (5-way spread bullets) periodically
    const bulletInterval = setInterval(() => {
      playAudio("/arcade/contra/explosion.mp3", 0.3);
      const startX = currentX + 40;
      const startY = 80;

      // 5 spread angles
      const angles = [-0.35, -0.18, 0, 0.18, 0.35];
      const newSpreads = angles.map((ang) => {
        nextBulletId.current += 1;
        return {
          id: nextBulletId.current,
          x: startX,
          y: startY,
          vx: Math.cos(ang) * 9,
          vy: Math.sin(ang) * 5,
        };
      });

      setBullets((prev) => [...prev.slice(-30), ...newSpreads]);
    }, 280);

    // 4. Update bullet positions
    const bulletAnim = setInterval(() => {
      setBullets((prev) =>
        prev
          .map((b) => ({ ...b, x: b.x + b.vx, y: b.y + b.vy }))
          .filter((b) => b.x < window.innerWidth + 50 && b.y < 400 && b.y > -100)
      );
    }, 30);

    // 5. Auto exit after 7 seconds
    const exitTimer = setTimeout(() => {
      onExit();
    }, 7000);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(bulletInterval);
      clearInterval(bulletAnim);
      clearTimeout(exitTimer);
      stopAllAudio();
    };
  }, [isActive, onExit, playAudio, stopAllAudio]);

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onExit]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none select-none font-mono">
        {/* Retro CRT Scanlines & Scanlines Tint */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.7) 0px, rgba(0,0,0,0.7) 2px, transparent 2px, transparent 4px)",
          }}
        />

        {/* Top Retro NES HUD Banner */}
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="absolute top-4 inset-x-0 mx-auto w-fit z-50 px-5 py-2.5 rounded-lg bg-black/95 border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center gap-4 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-amber-400 font-black tracking-widest text-sm uppercase">
              1UP // 30 LIVES GRANTED
            </span>
          </div>

          {/* 30 Lives Medals */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
            <div className="relative w-4 h-7 filter drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]">
              <Image
                src="/arcade/contra/lives_medal.png"
                alt="Lives"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <span className="text-white font-black text-sm">× 30</span>
          </div>

          <span className="text-zinc-400 font-bold hidden sm:inline text-[11px]">
            [SPREAD GUN // KONAMI 1988]
          </span>

          <button
            onClick={onExit}
            className="pointer-events-auto px-2 py-0.5 rounded border border-amber-600 bg-amber-950/60 hover:bg-amber-800/80 text-amber-200 text-[10px] font-bold transition-colors"
          >
            ESC
          </button>
        </motion.div>

        {/* Spread Gun Bullets flying across screen */}
        {bullets.map((b) => (
          <div
            key={b.id}
            style={{
              left: `${b.x}px`,
              bottom: `${110 + b.y}px`,
            }}
            className="absolute w-3.5 h-3.5 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-white shadow-[0_0_12px_rgba(245,158,11,1)]"
          />
        ))}

        {/* Bill Rizer Running & Firing across Bottom */}
        <div
          style={{
            left: `${billX}px`,
            bottom: "85px",
          }}
          className="absolute z-40 flex flex-col items-center"
        >
          <div className="relative w-16 h-28 filter drop-shadow-[0_0_15px_rgba(245,158,11,0.9)]">
            <Image
              src={billFrame === 0 ? "/arcade/contra/bill_run1.png" : "/arcade/contra/bill_run_shoot.png"}
              alt="Bill Rizer"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <span className="text-[10px] font-black text-amber-400 bg-black/90 px-2 py-0.5 rounded border border-amber-500 mt-1 whitespace-nowrap">
            BILL RIZER [30 LIVES]
          </span>
        </div>
      </div>
    </AnimatePresence>
  );
}
