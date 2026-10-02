"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface ScorpionSpearProps {
  isActive: boolean;
  onComplete: () => void;
}

type SpearStage = "idle" | "launch" | "latched" | "pulling" | "uppercut" | "complete";

export default function ScorpionSpear({ isActive, onComplete }: ScorpionSpearProps) {
  const [stage, setStage] = useState<SpearStage>("idle");
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const playAudio = useCallback((path: string, volume = 0.9) => {
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

  useEffect(() => {
    if (!isActive) {
      stopAllAudio();
      setStage("idle");
      return;
    }

    // Step 1: Launch spear across the screen
    setStage("launch");

    // Step 2: Spear hits opponent + "GET OVER HERE!" voice
    const tLatch = setTimeout(() => {
      setStage("latched");
      playAudio("/arcade/mk/get-over-here.mp3", 1.0);
    }, 550);

    // Step 3: Chain yanks opponent flying across to Scorpion
    const tPull = setTimeout(() => {
      setStage("pulling");
    }, 950);

    // Step 4: Uppercut impact + screen shake + blood splatter
    const tUppercut = setTimeout(() => {
      setStage("uppercut");
      playAudio("/arcade/sf2/ko.mp3", 0.9);
    }, 1550);

    // Step 5: Complete & dismiss
    const tEnd = setTimeout(() => {
      setStage("complete");
      onComplete();
    }, 3400);

    return () => {
      clearTimeout(tLatch);
      clearTimeout(tPull);
      clearTimeout(tUppercut);
      clearTimeout(tEnd);
      stopAllAudio();
    };
  }, [isActive, onComplete, playAudio, stopAllAudio]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden font-mono">
        {/* Uppercut Screen Shake */}
        {stage === "uppercut" && (
          <motion.div
            initial={{ y: -12 }}
            animate={{ y: [12, -8, 6, -3, 0] }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 bg-red-600/15 mix-blend-screen pointer-events-none"
          />
        )}

        {/* 1. Scorpion on the Left Side */}
        <motion.div
          initial={{ x: -160, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 20 }}
          className="absolute bottom-14 left-4 sm:left-14 flex flex-col items-center z-30"
        >
          <div className="relative w-36 h-48 sm:w-44 sm:h-56 filter drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]">
            <motion.div
              animate={
                stage === "uppercut"
                  ? { y: [-15, 0], scaleY: [1.1, 1] }
                  : stage === "launch" || stage === "pulling"
                  ? { x: [-4, 4, 0] }
                  : {}
              }
              transition={{ duration: 0.25 }}
              className="relative w-full h-full"
            >
              <Image
                src="/arcade/mk/scorpion_sheet.png"
                alt="Scorpion MK"
                fill
                className="object-contain"
                unoptimized
              />
            </motion.div>
          </div>
        </motion.div>

        {/* 2. Kunai Spear & Steel Chain */}
        {(stage === "launch" || stage === "latched" || stage === "pulling") && (
          <div className="absolute bottom-32 sm:bottom-40 left-28 sm:left-40 right-28 sm:right-40 h-8 z-35 flex items-center pointer-events-none">
            {/* The Chain */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={
                stage === "pulling"
                  ? { scaleX: [1, 0.2] }
                  : { scaleX: 1 }
              }
              transition={{
                duration: stage === "launch" ? 0.45 : stage === "pulling" ? 0.6 : 0.2,
                ease: stage === "pulling" ? "easeIn" : "easeOut",
              }}
              style={{ originX: 0 }}
              className="w-full h-2 sm:h-2.5 bg-repeat-x flex items-center"
            >
              {/* Linked Chain Links */}
              <div className="w-full h-full border-t-2 border-b-2 border-zinc-400 bg-gradient-to-r from-zinc-500 via-zinc-300 to-amber-300 shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
            </motion.div>

            {/* Kunai Harpoon Tip */}
            <motion.div
              initial={{ x: 0 }}
              animate={
                stage === "launch"
                  ? { x: ["0%", "100%"] }
                  : stage === "pulling"
                  ? { x: ["100%", "15%"] }
                  : { x: "100%" }
              }
              transition={{
                duration: stage === "launch" ? 0.45 : stage === "pulling" ? 0.6 : 0.2,
                ease: stage === "pulling" ? "easeIn" : "easeOut",
              }}
              className="relative -ml-3 z-40 filter drop-shadow-[0_0_12px_rgba(250,204,21,1)]"
            >
              {/* Metal Kunai Dagger Head */}
              <svg viewBox="0 0 40 24" className="w-9 h-6 sm:w-11 sm:h-7 fill-zinc-200 stroke-zinc-900" strokeWidth="1.5">
                <polygon points="0,6 26,6 40,12 26,18 0,18" className="fill-zinc-300" />
                <polygon points="12,3 28,12 12,21" className="fill-amber-400" />
                <circle cx="5" cy="12" r="3" className="fill-zinc-800" />
              </svg>
            </motion.div>
          </div>
        )}

        {/* 3. Opponent (Sub-Zero) being yanked and uppercut */}
        {stage !== "complete" && (
          <motion.div
            initial={{ x: 0, opacity: 1 }}
            animate={
              stage === "pulling"
                ? { x: ["0%", "-65%"], rotate: [0, -15] }
                : stage === "uppercut"
                ? { x: "-65%", y: -700, rotate: 360, opacity: 0 }
                : { x: 0, opacity: 1 }
            }
            transition={
              stage === "pulling"
                ? { duration: 0.6, ease: "easeIn" }
                : stage === "uppercut"
                ? { duration: 0.8, ease: "easeOut" }
                : {}
            }
            className="absolute bottom-14 right-4 sm:right-16 flex flex-col items-center z-30"
          >
            <div className="relative w-36 h-48 sm:w-44 sm:h-56 filter drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]">
              <Image
                src="/arcade/mk/subzero_sheet.png"
                alt="Sub-Zero MK"
                fill
                className="object-contain"
                unoptimized
              />

              {/* Impaled Blood Burst */}
              {(stage === "latched" || stage === "pulling") && (
                <div className="absolute top-1/3 left-4 w-12 h-12 bg-red-600/70 rounded-full blur-xs animate-ping" />
              )}
            </div>
          </motion.div>
        )}

        {/* Uppercut Blood Splatter Particles */}
        {stage === "uppercut" && (
          <div className="absolute bottom-32 left-28 sm:left-48 z-40">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: (i % 2 === 0 ? 1 : -1) * (30 + i * 20),
                  y: -50 - i * 35,
                  opacity: 0,
                  scale: 0.3,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-600 shadow-[0_0_12px_rgba(220,38,38,1)]"
              />
            ))}
          </div>
        )}

        {/* 4. Iconic "GET OVER HERE!" Stamp */}
        {(stage === "latched" || stage === "pulling" || stage === "uppercut") && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center z-50">
            <motion.div
              initial={{ scale: 2.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
            >
              <h2 className="text-5xl sm:text-8xl font-black italic tracking-widest text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,1)] [text-shadow:4px_4px_0_#991b1b,-4px_-4px_0_#991b1b]">
                GET OVER HERE!
              </h2>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
