"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface HadoukenWaveProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function HadoukenWave({ isActive, onComplete }: HadoukenWaveProps) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [fireballX, setFireballX] = useState<number | null>(null);
  const [isKO, setIsKO] = useState(false);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

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
      setFrameIdx(0);
      setFireballX(null);
      setIsKO(false);
      return;
    }

    // 1. Play "ROUND ONE... FIGHT!"
    playAudio("/arcade/sf2/round-one-fight.mp3", 0.75);

    // 2. Animate Ryu winding up: frame 1 -> 2 -> 3 -> 4
    const t1 = setTimeout(() => setFrameIdx(1), 220);
    const t2 = setTimeout(() => setFrameIdx(2), 400);
    const t3 = setTimeout(() => {
      setFrameIdx(3);
      // Play "HADOUKEN!"
      playAudio("/arcade/sf2/hadouken.mp3", 0.95);
      // Launch fireball
      setFireballX(0);
    }, 600);

    // 3. Fireball travels across screen
    let currentX = 0;
    let animId: number;

    const launchTimer = setTimeout(() => {
      const startTime = performance.now();
      const speed = window.innerWidth / 900; // takes ~900ms to cross

      const step = (now: number) => {
        const elapsed = now - startTime;
        currentX = elapsed * speed;
        setFireballX(currentX);

        if (currentX < window.innerWidth - 60) {
          animId = requestAnimationFrame(step);
        } else {
          // Hit the edge! Trigger K.O.!
          setIsKO(true);
          playAudio("/arcade/sf2/ko.mp3", 0.95);

          // Complete and dismiss after impact
          setTimeout(() => {
            onComplete();
          }, 1400);
        }
      };

      animId = requestAnimationFrame(step);
    }, 650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(launchTimer);
      cancelAnimationFrame(animId);
      stopAllAudio();
    };
  }, [isActive, onComplete, playAudio, stopAllAudio]);

  if (!isActive) return null;

  const ryuSprites = [
    "/arcade/sf2/ryu_hadouken_1.png",
    "/arcade/sf2/ryu_hadouken_2.png",
    "/arcade/sf2/ryu_hadouken_3.png",
    "/arcade/sf2/ryu_hadouken_4.png",
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden font-mono">
        {/* Screen Flash on Fireball Release / Impact */}
        {isKO && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-cyan-400 mix-blend-screen"
          />
        )}

        {/* Authentic CPS2 Ryu on Left Side */}
        <motion.div
          initial={{ x: -180, opacity: 0 }}
          animate={{ x: 30, opacity: 1 }}
          exit={{ x: -180, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="absolute bottom-16 left-4 flex flex-col items-center z-30"
        >
          <div className="relative w-40 h-44 filter drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]">
            <Image
              src={ryuSprites[frameIdx]}
              alt="Ryu Hadouken"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <span className="text-[11px] font-black tracking-widest text-cyan-400 bg-black/90 px-2.5 py-0.5 rounded border border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)] uppercase mt-1">
            RYU // HADOUKEN (波動拳)
          </span>
        </motion.div>

        {/* Authentic Hadouken Energy Ball */}
        {fireballX !== null && !isKO && (
          <motion.div
            style={{
              left: `${180 + fireballX}px`,
              bottom: "125px",
            }}
            className="absolute z-40 flex items-center"
          >
            {/* Energy Particle Trail */}
            <div className="w-16 h-10 bg-gradient-to-r from-transparent via-cyan-400/40 to-blue-500 rounded-full blur-md animate-pulse" />

            {/* Fireball Sprite */}
            <div className="relative w-28 h-18 filter drop-shadow-[0_0_25px_rgba(56,189,248,1)] animate-spin-slow">
              <Image
                src="/arcade/sf2/fireball_1.png"
                alt="Hadouken Fireball"
                width={112}
                height={72}
                className="object-contain"
                unoptimized
              />
            </div>
          </motion.div>
        )}

        {/* Dramatic K.O. Impact Stamp */}
        {isKO && (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 3.5, rotate: -15, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              className="text-center"
            >
              <h2 className="text-7xl sm:text-9xl font-black italic tracking-widest text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,1)] [text-shadow:4px_4px_0_#b91c1c,-4px_-4px_0_#b91c1c]">
                K.O.!
              </h2>
              <p className="text-sm font-black text-cyan-300 tracking-widest uppercase mt-2 bg-black/80 px-4 py-1 rounded inline-block border border-cyan-400 shadow-xl">
                CAPCOM 1993 // PERFECT VICTORY
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
