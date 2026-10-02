"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface MkFatalityArenaProps {
  isOpen: boolean;
  onClose: () => void;
}

type FatalityId = "toasty" | "freeze" | "scare";

interface FatalityConfig {
  id: FatalityId;
  name: string;
  character: string;
  gif: string;
  comboKeys: string[];
  comboDisplay: string;
  announcement: string;
}

const FATALITIES: FatalityConfig[] = [
  {
    id: "toasty",
    name: "TOASTY! (SKULL FLAME)",
    character: "SCORPION",
    gif: "/arcade/mk/fatality_toasty.gif",
    comboKeys: ["ArrowDown", "ArrowUp", "ArrowUp", "2"],
    comboDisplay: "↓  ↑  ↑  2",
    announcement: "SCORPION SPEWS HELLFIRE // TOASTY!",
  },
  {
    id: "freeze",
    name: "DEEP FREEZE & SHATTER",
    character: "SUB-ZERO",
    gif: "/arcade/mk/fatality_freeze.gif",
    comboKeys: ["ArrowRight", "ArrowDown", "ArrowRight", "b"],
    comboDisplay: "→  ↓  →  B",
    announcement: "SUB-ZERO FLASH-FREEZES AND SHATTERS TARGET",
  },
  {
    id: "scare",
    name: "SOUL SCARE / UNMASKED",
    character: "KABAL",
    gif: "/arcade/mk/fatality_scare.gif",
    comboKeys: ["ArrowLeft", "ArrowRight", "ArrowDown", "a"],
    comboDisplay: "←  →  ↓  A",
    announcement: "MASK REMOVAL SCARES SOUL DIRECTLY OUT OF BODY",
  },
];

export default function MkFatalityArena({ isOpen, onClose }: MkFatalityArenaProps) {
  const [selectedFatality, setSelectedFatality] = useState<FatalityConfig>(FATALITIES[0]);
  const [phase, setPhase] = useState<"finish_him" | "executing" | "complete">("finish_him");
  const [inputProgress, setInputProgress] = useState<number>(0);
  const [timerProgress, setTimerProgress] = useState<number>(100);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const playAudio = useCallback((path: string, volume = 0.8) => {
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

  // Pick a random fatality upon opening
  useEffect(() => {
    if (isOpen) {
      const rand = FATALITIES[Math.floor(Math.random() * FATALITIES.length)];
      setSelectedFatality(rand);
      setPhase("finish_him");
      setInputProgress(0);
      setTimerProgress(100);

      // Play "FINISH HIM!"
      playAudio("/arcade/mk/finish-him.mp3", 0.9);
    } else {
      stopAllAudio();
    }
  }, [isOpen, playAudio, stopAllAudio]);

  // Execute fatality sequence
  const deliverFatality = useCallback(() => {
    if (phase !== "finish_him") return;
    setPhase("executing");

    // Play Fatality boom sound
    playAudio("/arcade/mk/fatality.mp3", 0.95);

    // If toasty fatality, queue Dan Forden's voice
    if (selectedFatality.id === "toasty") {
      setTimeout(() => {
        playAudio("/arcade/toasty.mp3", 0.85);
      }, 1600);
    }

    // After animation, announce victory
    setTimeout(() => {
      setPhase("complete");
      playAudio("/arcade/mk/flawless-victory.mp3", 0.9);
    }, 3800);
  }, [phase, playAudio, selectedFatality]);

  // Timer countdown during "finish_him" phase
  useEffect(() => {
    if (!isOpen || phase !== "finish_him") return;

    const interval = setInterval(() => {
      setTimerProgress((prev) => {
        if (prev <= 2) {
          clearInterval(interval);
          // Auto deliver if time runs out!
          deliverFatality();
          return 0;
        }
        return prev - 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, phase, deliverFatality]);

  // Listen for key inputs matching the combo
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (phase === "finish_him") {
        const expected = selectedFatality.comboKeys[inputProgress];
        if (e.key.toLowerCase() === expected.toLowerCase()) {
          const next = inputProgress + 1;
          setInputProgress(next);
          if (next >= selectedFatality.comboKeys.length) {
            deliverFatality();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, phase, inputProgress, selectedFatality, deliverFatality, onClose]);

  const restartWithRandom = () => {
    stopAllAudio();
    const other = FATALITIES.filter((f) => f.id !== selectedFatality.id);
    const rand = other[Math.floor(Math.random() * other.length)];
    setSelectedFatality(rand);
    setPhase("finish_him");
    setInputProgress(0);
    setTimerProgress(100);
    playAudio("/arcade/mk/finish-him.mp3", 0.9);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-6"
      >
        {/* CRT Scanline Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25 z-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 1px, transparent 1px, transparent 2px)",
          }}
        />

        {/* Arcade Cabinet Frame */}
        <div className="relative z-10 w-full max-w-4xl bg-zinc-950 border-2 border-red-700 rounded-lg shadow-[0_0_50px_rgba(220,38,38,0.5)] overflow-hidden font-mono flex flex-col">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-red-950/80 border-b border-red-800 text-red-200 select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-xs uppercase tracking-widest text-red-100">
                MIDWAY 1995 // FATALITY ARENA
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={restartWithRandom}
                className="px-2 py-0.5 text-[11px] rounded border border-red-800 bg-black/60 hover:bg-red-900/60 text-red-200 transition-colors"
                title="Roll a new random fatality"
              >
                ↻ RANDOM FATALITY
              </button>
              <button
                onClick={onClose}
                className="px-2 py-0.5 text-[11px] rounded border border-red-800 bg-red-900/80 hover:bg-red-700 text-white font-bold transition-colors"
              >
                ✕ ESC
              </button>
            </div>
          </div>

          {/* Arena Stage */}
          <div className="relative min-h-[380px] sm:min-h-[460px] bg-black flex flex-col items-center justify-center p-4 overflow-hidden select-none">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 bg-gradient-to-t from-red-950/40 via-black to-zinc-950 pointer-events-none" />

            {/* PHASE 1: FINISH HIM! Interactive Duel */}
            {phase === "finish_him" && (
              <div className="relative z-10 w-full flex flex-col items-center justify-between h-full space-y-6">
                {/* Big Dripping "FINISH HIM!" Text */}
                <motion.div
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-center pt-2"
                >
                  <h2 className="text-4xl sm:text-6xl font-black tracking-widest text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.9)] uppercase">
                    FINISH HIM!
                  </h2>
                  <p className="text-xs sm:text-sm text-red-400/90 font-bold uppercase tracking-wider mt-1">
                    {selectedFatality.character} WINS // DELIVER THE FATALITY
                  </p>
                </motion.div>

                {/* Staged Sprites: Scorpion (Attacker) vs Sub-Zero (Dizzy Victim) */}
                <div className="flex items-end justify-around w-full max-w-lg py-4">
                  {/* Attacker (Scorpion in yellow ninja attire) */}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative w-28 h-40 filter drop-shadow-[0_0_12px_rgba(234,179,8,0.7)]">
                      <Image
                        src="/arcade/mk/scorpion_sheet.png"
                        alt="Scorpion"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="text-[11px] font-bold text-amber-400 mt-2 bg-black/80 px-2 py-0.5 rounded border border-amber-600/60">
                      SCORPION (READY)
                    </span>
                  </motion.div>

                  {/* Victim (Sub-Zero dizzy wobbling stance) */}
                  <motion.div
                    animate={{ rotate: [-4, 4, -4], x: [-2, 2, -2] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                    className="flex flex-col items-center opacity-85"
                  >
                    <div className="relative w-28 h-36 filter drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]">
                      <Image
                        src="/arcade/mk/subzero_sheet.png"
                        alt="Sub-Zero"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="text-[11px] font-bold text-cyan-400 mt-2 bg-black/80 px-2 py-0.5 rounded border border-cyan-700/60 animate-pulse">
                      SUB-ZERO (DIZZY)
                    </span>
                  </motion.div>
                </div>

                {/* Combo Execution Box */}
                <div className="w-full max-w-md bg-zinc-950/90 border border-red-800/80 rounded p-4 text-center space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="text-red-400 font-bold uppercase">{selectedFatality.name}</span>
                    <span>PRESS KEYS IN ORDER</span>
                  </div>

                  {/* Keys Sequence */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                    {selectedFatality.comboKeys.map((key, i) => {
                      const isPressed = i < inputProgress;
                      const isCurrent = i === inputProgress;
                      const label =
                        key === "ArrowDown"
                          ? "↓"
                          : key === "ArrowUp"
                          ? "↑"
                          : key === "ArrowLeft"
                          ? "←"
                          : key === "ArrowRight"
                          ? "→"
                          : key.toUpperCase();
                      return (
                        <div
                          key={i}
                          className={`w-11 h-11 rounded flex items-center justify-center text-lg font-black transition-all ${
                            isPressed
                              ? "bg-red-600 text-white scale-95 shadow-[0_0_10px_rgba(220,38,38,0.8)]"
                              : isCurrent
                              ? "bg-red-950 border-2 border-red-500 text-red-200 animate-bounce"
                              : "bg-zinc-900 border border-zinc-700 text-zinc-500"
                          }`}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>

                  {/* Click Button Alternative */}
                  <button
                    onClick={deliverFatality}
                    className="w-full py-2 rounded bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                  >
                    ⚡ DELIVER FATALITY NOW ⚡
                  </button>

                  {/* Timer Bar */}
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 transition-all duration-100 ease-linear"
                      style={{ width: `${timerProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PHASE 2 & 3: EXECUTING & COMPLETE (Actual Digitized Arcade Fatality GIF) */}
            {(phase === "executing" || phase === "complete") && (
              <div className="relative z-10 w-full flex flex-col items-center justify-center space-y-4">
                {/* Fatality Title Banner */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-center"
                >
                  <span className="text-xs uppercase tracking-widest text-red-400 font-bold">
                    {selectedFatality.announcement}
                  </span>
                </motion.div>

                {/* The Genuine Digitized Arcade Fatality Animation */}
                <div className="relative w-full max-w-lg aspect-[4/3] rounded-lg overflow-hidden border-2 border-red-600 shadow-[0_0_35px_rgba(220,38,38,0.8)] bg-black">
                  <Image
                    src={selectedFatality.gif}
                    alt={selectedFatality.name}
                    fill
                    className="object-contain"
                    unoptimized
                    priority
                  />
                </div>

                {/* Post-Fatality Stamp & Replay */}
                {phase === "complete" && (
                  <motion.div
                    initial={{ scale: 3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                    className="text-center space-y-3 pt-2"
                  >
                    <h3 className="text-4xl sm:text-6xl font-black text-red-600 drop-shadow-[0_0_25px_rgba(220,38,38,1)] tracking-widest uppercase">
                      FATALITY
                    </h3>
                    <p className="text-sm font-bold text-amber-400 tracking-wider">
                      {selectedFatality.character} WINS // FLAWLESS VICTORY
                    </p>
                    <div className="flex items-center justify-center gap-4 pt-2">
                      <button
                        onClick={restartWithRandom}
                        className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 text-white font-bold text-xs uppercase transition-colors"
                      >
                        ↻ NEXT RANDOM FATALITY
                      </button>
                      <button
                        onClick={onClose}
                        className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase transition-colors"
                      >
                        ESC / CLOSE
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
