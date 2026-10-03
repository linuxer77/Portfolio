"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playCachedAudio } from "./ArcadePreload";

interface HadoukenWaveProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function HadoukenWave({ isActive, onComplete }: HadoukenWaveProps) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [fireballX, setFireballX] = useState<number | null>(null);
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
      setFrameIdx(0);
      setFireballX(null);
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

    // 3. Fireball travels across screen and flies off
    let currentX = 0;
    let animFrame: number;

    const launchTimer = setTimeout(() => {
      const startTime = performance.now();
      const speed = window.innerWidth / 850; // smooth travel across screen

      const step = (now: number) => {
        const elapsed = now - startTime;
        currentX = elapsed * speed;
        setFireballX(currentX);

        if (currentX < window.innerWidth + 80) {
          animFrame = requestAnimationFrame(step);
        } else {
          // Fireball flew off-screen, complete cleanly
          setTimeout(() => {
            onComplete();
          }, 250);
        }
      };

      animFrame = requestAnimationFrame(step);
    }, 650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(launchTimer);
      cancelAnimationFrame(animFrame);
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
        {/* Authentic CPS2 Ryu on Left Side */}
        <motion.div
          initial={{ x: -180, opacity: 0 }}
          animate={{ x: 30, opacity: 1 }}
          exit={{ x: -180, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="absolute bottom-16 left-4 flex flex-col items-center z-30"
        >
          <div className="relative w-40 h-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ryuSprites[frameIdx]}
              alt="Ryu Hadouken"
              className="w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
              loading="eager"
              decoding="sync"
            />
          </div>
        </motion.div>

        {/* Authentic Hadouken Energy Ball */}
        {fireballX !== null && (
          <motion.div
            style={{
              left: `${180 + fireballX}px`,
              bottom: "125px",
            }}
            className="absolute z-40 flex items-center"
          >
            {/* Fireball Sprite */}
            <div className="relative w-28 h-18">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/arcade/sf2/fireball_1.png"
                alt="Hadouken Fireball"
                className="w-full h-full object-contain"
                style={{ imageRendering: "pixelated" }}
                loading="eager"
                decoding="sync"
              />
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
