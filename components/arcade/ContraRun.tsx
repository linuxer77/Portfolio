"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface ContraRunProps {
  isActive: boolean;
  onComplete: () => void;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  angle: number;
}

export default function ContraRun({ isActive, onComplete }: ContraRunProps) {
  const [billX, setBillX] = useState<number | null>(null);
  const [spriteIdx, setSpriteIdx] = useState(0);
  const [bullets, setBullets] = useState<Bullet[]>([]);
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

  const sprites = [
    "/arcade/contra/bill_run1.png",
    "/arcade/contra/bill_run_shoot.png",
    "/arcade/contra/bill_run2.png",
    "/arcade/contra/bill_shoot.png",
  ];

  useEffect(() => {
    if (!isActive) {
      stopAllAudio();
      setBillX(null);
      setBullets([]);
      return;
    }

    // 1. Play 1UP chime and classic Jungle Theme
    playAudio("/arcade/contra/1up.mp3", 0.95);
    const tTheme = setTimeout(() => {
      playAudio("/arcade/contra/jungle-theme.mp3", 0.85);
    }, 450);

    // 2. Sprint animation across viewport
    const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const startX = -120;
    const endX = screenW + 140;
    const totalDuration = 3800; // 3.8s to cross screen
    const startTime = performance.now();

    let animFrame: number;
    let lastBulletTime = 0;
    let bulletCounter = 0;

    const loop = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const currentX = startX + progress * (endX - startX);
      setBillX(currentX);

      // Cycle running sprite every 110ms
      const f = Math.floor(elapsed / 110) % 4;
      setSpriteIdx(f);

      // Fire Spread Gun bullets every 260ms
      if (now - lastBulletTime > 260 && progress < 0.85) {
        lastBulletTime = now;
        bulletCounter++;
        // 3-way spread gun shot
        const newPellets: Bullet[] = [
          { id: bulletCounter * 10 + 1, x: currentX + 60, y: 0, angle: -12 },
          { id: bulletCounter * 10 + 2, x: currentX + 60, y: 0, angle: 0 },
          { id: bulletCounter * 10 + 3, x: currentX + 60, y: 0, angle: 12 },
        ];
        setBullets((prev) => [...prev.slice(-15), ...newPellets]);
      }

      if (progress < 1) {
        animFrame = requestAnimationFrame(loop);
      } else {
        // Bill ran off screen! Conclude
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    };

    animFrame = requestAnimationFrame(loop);

    return () => {
      clearTimeout(tTheme);
      cancelAnimationFrame(animFrame);
      stopAllAudio();
    };
  }, [isActive, onComplete, playAudio, stopAllAudio]);

  if (!isActive || billX === null) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden font-mono">
        {/* Authentic 8-bit Contra HUD (Top Left, Transparent) */}
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="absolute top-20 left-4 sm:left-8 z-40 flex items-center gap-2"
        >
          <div className="relative w-4 h-7 filter drop-shadow-[0_0_6px_rgba(239,68,68,1)]">
            <Image
              src="/arcade/contra/lives_medal.png"
              alt="Lives Medal"
              fill
              className="object-contain"
              style={{ imageRendering: "pixelated" }}
              unoptimized
            />
          </div>
          <span className="text-xs sm:text-sm font-black text-red-500 tracking-wider [text-shadow:1px_1px_0_#000]">
            1P REST <span className="text-white text-base">30</span>
          </span>
        </motion.div>

        {/* Bill Rizer NES Sprite sprinting across bottom */}
        <div
          style={{
            left: `${billX}px`,
            bottom: "55px",
          }}
          className="absolute z-30 flex flex-col items-center pointer-events-none"
        >
          <div className="relative w-16 h-28 sm:w-20 sm:h-36 filter drop-shadow-[0_0_16px_rgba(239,68,68,0.8)]">
            <Image
              src={sprites[spriteIdx]}
              alt="Contra Bill Rizer"
              fill
              className="object-contain"
              style={{ imageRendering: "pixelated" }}
              unoptimized
            />
            {/* Muzzle flash glow when shooting */}
            {(spriteIdx === 1 || spriteIdx === 3) && (
              <div className="absolute top-4 -right-3 w-6 h-6 bg-red-500 rounded-full blur-xs animate-ping" />
            )}
          </div>
        </div>

        {/* Spread Gun Red/Orange 8-Bit Energy Bullets */}
        {bullets.map((b) => (
          <motion.div
            key={b.id}
            initial={{
              x: b.x,
              y: 0,
              opacity: 1,
            }}
            animate={{
              x: b.x + 550,
              y: Math.tan((b.angle * Math.PI) / 180) * 550,
              opacity: 0,
            }}
            transition={{
              duration: 0.65,
              ease: "linear",
            }}
            style={{
              position: "absolute",
              bottom: "105px",
            }}
            className="z-35 flex items-center"
          >
            {/* 8-bit Spread Gun Energy Pellet */}
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-red-500 border-2 border-amber-300 shadow-[0_0_14px_rgba(239,68,68,1)]" />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}
