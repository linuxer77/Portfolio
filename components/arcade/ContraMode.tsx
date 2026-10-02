"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Bullet {
  id: number;
  x: number;
  y: number;
  angle: number;
}

interface ContraModeProps {
  isActive: boolean;
  onExit: () => void;
}

export default function ContraMode({ isActive, onExit }: ContraModeProps) {
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [screenFlash, setScreenFlash] = useState(false);

  // Trigger flash on activation
  useEffect(() => {
    if (isActive) {
      setScreenFlash(true);
      const timer = setTimeout(() => setScreenFlash(false), 350);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Click anywhere to fire Contra spread bullet sparks
  const handleScreenClick = useCallback(
    (e: MouseEvent) => {
      if (!isActive) return;
      // Do not fire if clicking interactive exit buttons
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("a")) return;

      const clickX = e.clientX;
      const clickY = e.clientY;
      const now = Date.now();

      // Spawn 3-way spread shot
      const newShots: Bullet[] = [
        { id: now, x: clickX, y: clickY, angle: -15 },
        { id: now + 1, x: clickX, y: clickY, angle: 0 },
        { id: now + 2, x: clickX, y: clickY, angle: 15 },
      ];

      setBullets((prev) => [...prev, ...newShots]);

      setTimeout(() => {
        setBullets((prev) => prev.filter((b) => b.id < now));
      }, 500);
    },
    [isActive]
  );

  useEffect(() => {
    if (!isActive) return;
    window.addEventListener("click", handleScreenClick);
    return () => window.removeEventListener("click", handleScreenClick);
  }, [isActive, handleScreenClick]);

  // Press ESC to exit
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
    <>
      {/* 1. CRT Flash upon Activation */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-50 bg-amber-400 pointer-events-none mix-blend-screen"
          />
        )}
      </AnimatePresence>

      {/* 2. Top 8-Bit Arcade HUD */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-0 inset-x-0 z-50 bg-black/95 border-b-2 border-amber-500/80 shadow-[0_4px_25px_rgba(245,158,11,0.35)] px-4 py-2 text-xs font-mono font-bold tracking-widest text-amber-400 select-none"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-10">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span className="text-cyan-300">1P</span>
              <span>SCORE: 300,000</span>
            </span>

            <span className="flex items-center gap-2">
              <span className="text-zinc-500">LIVES:</span>
              <span className="text-red-500 tracking-normal flex gap-1">
                <span>♥</span>
                <span>♥</span>
                <span>♥</span>
              </span>
              <span className="text-cyan-300">x 30</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-[11px] text-zinc-500">CLICK TO FIRE SPREAD GUN</span>
            <button
              onClick={onExit}
              className="px-2.5 py-1 text-[11px] rounded bg-amber-500/20 text-amber-300 border border-amber-500/60 hover:bg-amber-500 hover:text-black transition-colors"
              title="Exit Contra Mode"
            >
              [ ESC: EXIT ARCADE ]
            </button>
          </div>
        </div>
      </motion.div>

      {/* 3. Subtle CRT Scanline & Color Grading Overlay */}
      <div className="fixed inset-0 z-40 pointer-events-none select-none bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.06)_0%,_rgba(6,182,212,0.04)_70%,_transparent_100%)]">
        {/* Scanline horizontal stripes */}
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.6) 50%)",
            backgroundSize: "100% 4px",
          }}
        />
        {/* Amber Corner Brackets */}
        <div className="absolute top-12 left-4 text-amber-500 text-xs font-mono opacity-60">┌ CONTRA OVERCLOCK ACTIVE</div>
        <div className="absolute bottom-4 right-4 text-cyan-400 text-xs font-mono opacity-60">KONAMI 1988 ┘</div>
      </div>

      {/* 4. Interactive 8-bit Bullets & Spark Particles */}
      <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">
        {bullets.map((b) => (
          <motion.div
            key={b.id}
            initial={{
              x: b.x,
              y: b.y,
              scale: 0.8,
              opacity: 1,
            }}
            animate={{
              x: b.x + Math.sin((b.angle * Math.PI) / 180) * 160,
              y: b.y - 120,
              scale: 1.8,
              opacity: 0,
            }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute w-3.5 h-3.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#06b6d4,0_0_24px_#f59e0b] border border-white"
          />
        ))}
      </div>
    </>
  );
}
