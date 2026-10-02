"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface MkFatalityProps {
  isActive: boolean;
  onComplete: () => void;
}

type FatalityStage = "idle" | "finish_him" | "unmask" | "flame_blast" | "burn_skeleton" | "victory";

export default function MkFatality({ isActive, onComplete }: MkFatalityProps) {
  const [stage, setStage] = useState<FatalityStage>("idle");
  const [showToasty, setShowToasty] = useState(false);
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

  useEffect(() => {
    if (!isActive) {
      stopAllAudio();
      setStage("idle");
      setShowToasty(false);
      return;
    }

    // Step 1: "FINISH HIM!"
    setStage("finish_him");
    playAudio("/arcade/mk/finish-him.mp3", 0.95);

    // Step 2: Scorpion unmasks and reveals the skull
    const tUnmask = setTimeout(() => {
      setStage("unmask");
    }, 1100);

    // Step 3: Scorpion spews roaring hellfire stream
    const tFlame = setTimeout(() => {
      setStage("flame_blast");
    }, 1800);

    // Step 4: Sub-Zero burns into skeleton, Fatality boom sound
    const tBurn = setTimeout(() => {
      setStage("burn_skeleton");
      playAudio("/arcade/mk/fatality.mp3", 1.0);
    }, 2400);

    // Step 5: Dan Forden "TOASTY!" peek in bottom-right
    const tToasty = setTimeout(() => {
      setShowToasty(true);
      playAudio("/arcade/toasty.mp3", 0.9);
      setTimeout(() => setShowToasty(false), 1200);
    }, 3100);

    // Step 6: Victory stamp & flawless victory announcer
    const tVictory = setTimeout(() => {
      setStage("victory");
      playAudio("/arcade/mk/flawless-victory.mp3", 0.95);
    }, 3500);

    // Step 7: Dismiss cleanly
    const tEnd = setTimeout(() => {
      onComplete();
    }, 5200);

    return () => {
      clearTimeout(tUnmask);
      clearTimeout(tFlame);
      clearTimeout(tBurn);
      clearTimeout(tToasty);
      clearTimeout(tVictory);
      clearTimeout(tEnd);
      stopAllAudio();
    };
  }, [isActive, onComplete, playAudio, stopAllAudio]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden font-mono">
        {/* Cinematic dark vignette backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 pointer-events-none"
        />

        {/* Screen flash on flame blast & fatality stamp */}
        {(stage === "flame_blast" || stage === "burn_skeleton") && (
          <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.1, 0.4, 0.15] }}
            transition={{ repeat: Infinity, duration: 0.2 }}
            className="absolute inset-0 bg-orange-600/20 mix-blend-screen pointer-events-none"
          />
        )}

        {/* 1. "FINISH HIM!" Header Announcement */}
        {stage === "finish_him" && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center z-40">
            <motion.h2
              initial={{ scale: 2.2, opacity: 0 }}
              animate={{ scale: [1.1, 1], opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
              className="text-5xl sm:text-7xl font-black italic tracking-widest text-red-600 drop-shadow-[0_0_30px_rgba(220,38,38,1)] [text-shadow:3px_3px_0_#450a0a,-3px_-3px_0_#450a0a]"
            >
              FINISH HIM!
            </motion.h2>
          </div>
        )}

        {/* 2. Scorpion on Left Side */}
        <motion.div
          initial={{ x: -160, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="absolute bottom-14 left-4 sm:left-14 flex flex-col items-center z-30"
        >
          <div className="relative w-36 h-48 sm:w-44 sm:h-56 filter drop-shadow-[0_0_20px_rgba(234,179,8,0.7)]">
            {stage === "idle" || stage === "finish_him" ? (
              // Masked Ninja Stance
              <Image
                src="/arcade/mk/scorpion_sheet.png"
                alt="Scorpion MK"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              // Unmasked Flaming Skull
              <div className="relative w-full h-full">
                {/* Body base */}
                <Image
                  src="/arcade/mk/scorpion_sheet.png"
                  alt="Scorpion MK Body"
                  fill
                  className="object-contain brightness-90"
                  unoptimized
                />
                {/* Flaming Demonic Skull Head Overlay */}
                <div className="absolute top-0 left-6 sm:left-9 w-20 h-24 filter drop-shadow-[0_0_25px_rgba(249,115,22,1)] animate-pulse">
                  <Image
                    src="/arcade/mk/scorpion_skull_trans.png"
                    alt="Scorpion Skull"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                  {/* Blazing flame aura over skull */}
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-600/40 via-yellow-400/50 to-transparent blur-sm animate-ping rounded-full" />
                </div>
              </div>
            )}
          </div>

          <span className="text-[11px] font-black tracking-widest text-yellow-400 bg-black/90 px-2.5 py-0.5 rounded border border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.6)] uppercase mt-1">
            SCORPION // HELLFIRE
          </span>
        </motion.div>

        {/* 3. Infernal Hellfire Torrent streaming from Scorpion to Sub-Zero */}
        {(stage === "flame_blast" || stage === "burn_skeleton") && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ originX: 0 }}
            className="absolute bottom-28 sm:bottom-36 left-32 sm:left-48 right-32 sm:right-48 h-20 sm:h-28 z-35 flex items-center"
          >
            {/* Blazing animated fire beam */}
            <div className="w-full h-full relative overflow-hidden flex items-center">
              {/* Flame core gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600 blur-sm animate-pulse rounded-full opacity-90" />
              <div className="absolute inset-x-0 h-8 sm:h-12 bg-gradient-to-r from-white via-yellow-200 to-orange-400 blur-xs rounded-full shadow-[0_0_30px_rgba(249,115,22,1)]" />

              {/* Multiple streaming arcade fireballs */}
              <div className="absolute inset-0 flex justify-around items-center">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      x: [0, 80, 0],
                      scale: [0.9, 1.3, 0.9],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.4 + i * 0.1,
                      ease: "linear",
                    }}
                    className="relative w-12 h-12 shrink-0 filter drop-shadow-[0_0_15px_rgba(239,68,68,1)]"
                  >
                    <Image
                      src="/arcade/mk/fire_blast.png"
                      alt="Fire Blast"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. Opponent (Sub-Zero) on Right Side */}
        <motion.div
          initial={{ x: 160, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="absolute bottom-14 right-4 sm:right-14 flex flex-col items-center z-30"
        >
          <div className="relative w-36 h-48 sm:w-44 sm:h-56 filter drop-shadow-[0_0_20px_rgba(59,130,246,0.7)]">
            {stage !== "burn_skeleton" && stage !== "victory" ? (
              // Dizzy Staggering Sub-Zero
              <motion.div
                animate={{
                  rotate: [-3, 3, -3],
                  x: [-2, 2, -2],
                }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                className="relative w-full h-full"
              >
                <Image
                  src="/arcade/mk/subzero_sheet.png"
                  alt="Sub-Zero MK"
                  fill
                  className={`object-contain ${stage === "flame_blast" ? "brightness-150 contrast-125 hue-rotate-15" : ""}`}
                  unoptimized
                />
                {/* Flame ignition particles on hit */}
                {stage === "flame_blast" && (
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-600/70 via-yellow-500/50 to-transparent animate-pulse rounded-lg" />
                )}
              </motion.div>
            ) : (
              // Incinerated Burning Skeleton / Bones
              <motion.div
                initial={{ scale: 1.1, filter: "brightness(2)" }}
                animate={{ scale: 1, filter: "brightness(1)" }}
                className="relative w-full h-full flex items-center justify-center"
              >
                <div className="relative w-28 h-40 filter drop-shadow-[0_0_30px_rgba(239,68,68,1)] animate-bounce">
                  <Image
                    src="/arcade/mk/burning_victim_trans.png"
                    alt="Burning Skeleton"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                  {/* Blazing fire aura engulfing bones */}
                  <div className="absolute -inset-4 bg-gradient-to-t from-red-600/80 via-orange-500/60 to-transparent blur-md animate-pulse" />
                </div>
              </motion.div>
            )}
          </div>

          <span className="text-[11px] font-black tracking-widest text-cyan-400 bg-black/90 px-2.5 py-0.5 rounded border border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)] uppercase mt-1">
            {stage === "burn_skeleton" || stage === "victory" ? "INCINERATED // ASHES" : "SUB-ZERO // DIZZY"}
          </span>
        </motion.div>

        {/* 5. Dan Forden "TOASTY!" Pop-out from bottom right */}
        <AnimatePresence>
          {showToasty && (
            <motion.div
              initial={{ x: 140, y: 140, rotate: 15 }}
              animate={{ x: 0, y: 0, rotate: 0 }}
              exit={{ x: 140, y: 140, rotate: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
              className="absolute bottom-0 right-0 z-50 pointer-events-none flex flex-col items-center"
            >
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 filter drop-shadow-[0_0_25px_rgba(249,115,22,0.9)]">
                <Image
                  src="/arcade/toasty.png"
                  alt="Dan Forden Toasty"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span className="text-xl sm:text-2xl font-black italic tracking-widest text-yellow-300 drop-shadow-[0_0_15px_rgba(234,179,8,1)] [text-shadow:2px_2px_0_#b91c1c] -mt-2">
                TOASTY!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6. Iconic FATALITY & SCORPION WINS Victory Stamp */}
        {stage === "victory" && (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 3.5, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              className="text-center"
            >
              <h2 className="text-6xl sm:text-9xl font-black italic tracking-widest text-red-600 drop-shadow-[0_0_50px_rgba(220,38,38,1)] [text-shadow:5px_5px_0_#450a0a,-5px_-5px_0_#450a0a]">
                FATALITY!
              </h2>
              <div className="mt-3 space-y-1">
                <p className="text-lg sm:text-2xl font-black text-yellow-400 tracking-widest uppercase bg-black/90 px-6 py-1.5 rounded inline-block border border-yellow-500 shadow-2xl">
                  SCORPION WINS // FLAWLESS VICTORY
                </p>
                <p className="text-[11px] font-mono text-zinc-400 tracking-widest uppercase">
                  MIDWAY 1995 // HELLFIRE INCINERATION
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
