"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FatalityConfig {
  id: string;
  attacker: "scorpion" | "subzero";
  victim: "subzero" | "scorpion";
  name: string;
  keys: string[]; // Key values
  altKeys: string[];
  displayKeys: string[];
  victoryText: string;
  fatalityType: "FATALITY." | "BRUTALITY.";
}

interface MkFatalityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MkFatalityModal({ isOpen, onClose }: MkFatalityModalProps) {
  const fatalities: FatalityConfig[] = useMemo(
    () => [
      {
        id: "toasty_fire",
        attacker: "scorpion",
        victim: "subzero",
        name: "FLAME INFERNO",
        keys: ["ArrowUp", "ArrowUp", "a"],
        altKeys: ["w", "w", "a"],
        displayKeys: ["↑", "↑", "A"],
        victoryText: "SCORPION WINS.",
        fatalityType: "FATALITY.",
      },
      {
        id: "ice_shatter",
        attacker: "subzero",
        victim: "scorpion",
        name: "DEEP FREEZE & SHATTER",
        keys: ["ArrowDown", "ArrowRight", "b"],
        altKeys: ["s", "d", "b"],
        displayKeys: ["↓", "→", "B"],
        victoryText: "SUB-ZERO WINS.",
        fatalityType: "FATALITY.",
      },
      {
        id: "spear_pull",
        attacker: "scorpion",
        victim: "subzero",
        name: "SPEAR DECAPITATION",
        keys: ["ArrowLeft", "ArrowLeft", "c"],
        altKeys: ["a", "a", "c"],
        displayKeys: ["←", "←", "C"],
        victoryText: "SCORPION WINS.",
        fatalityType: "FATALITY.",
      },
    ],
    []
  );

  const [activeFatalityIdx, setActiveFatalityIdx] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [animStage, setAnimStage] = useState<"dizzy" | "executing" | "finished" | "timeout">("dizzy");
  const [timeLeft, setTimeLeft] = useState(8);

  const currentFatality = fatalities[activeFatalityIdx];

  // Pick a random fatality on open & reset state
  useEffect(() => {
    if (isOpen) {
      const randIdx = Math.floor(Math.random() * fatalities.length);
      setActiveFatalityIdx(randIdx);
      setCurrentStep(0);
      setAnimStage("dizzy");
      setTimeLeft(8);
    }
  }, [isOpen, fatalities.length]);

  // Countdown timer while in dizzy prompt stage
  useEffect(() => {
    if (!isOpen || animStage !== "dizzy") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAnimStage("timeout");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, animStage]);

  // Execute fatality animation once combo completes
  const handleComboSuccess = useCallback(() => {
    setAnimStage("executing");
    setTimeout(() => {
      setAnimStage("finished");
    }, 2400);
  }, []);

  // Handle keyboard inputs
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (animStage !== "dizzy") return;

      const expectedKey = currentFatality.keys[currentStep];
      const expectedAlt = currentFatality.altKeys[currentStep];
      const pressed = e.key.toLowerCase();

      if (
        e.key === expectedKey ||
        pressed === expectedKey.toLowerCase() ||
        pressed === expectedAlt.toLowerCase()
      ) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        if (nextStep >= currentFatality.keys.length) {
          handleComboSuccess();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, animStage, currentStep, currentFatality, handleComboSuccess, onClose]);

  // Auto-close after celebration
  useEffect(() => {
    if (animStage === "finished" || animStage === "timeout") {
      const exitTimer = setTimeout(() => {
        onClose();
      }, 4500);
      return () => clearTimeout(exitTimer);
    }
  }, [animStage, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-8 select-none font-mono overflow-hidden">
      {/* Red Blood Vignette & Screen Shake */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(153,27,27,0.45)_100%)]" />

      {/* Top Bar: Title & Exit */}
      <div className="w-full max-w-5xl flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
          <span className="text-red-500 font-bold tracking-widest text-xs uppercase">
            MORTAL KOMBAT 3 // KOMBAT ARENA
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1 bg-zinc-900 border border-red-900 text-zinc-400 hover:text-white hover:border-red-500 text-xs transition-colors"
        >
          [ ESC: EXIT ]
        </button>
      </div>

      {/* Center Action Stage */}
      <div className="relative w-full max-w-4xl h-[420px] sm:h-[460px] flex flex-col items-center justify-center my-auto z-10">
        {/* FINISH HIM Giant Blood Header */}
        <AnimatePresence>
          {animStage === "dizzy" && (
            <motion.div
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute top-2 text-center"
            >
              <h1 className="text-4xl sm:text-6xl font-black tracking-widest text-red-600 drop-shadow-[0_0_25px_rgba(220,38,38,0.9)] uppercase">
                FINISH HIM!
              </h1>
              <p className="text-xs text-amber-500 font-bold tracking-widest mt-1">
                EXECUTE {currentFatality.name}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Combatants Arena */}
        <div className="relative w-full h-64 flex items-end justify-between px-8 sm:px-24 border-b-4 border-zinc-800">
          {/* Ground Surface Embers */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent shadow-[0_0_20px_#ef4444]" />

          {/* Fighter Left: Scorpion */}
          <div className="relative flex flex-col items-center">
            {/* Scorpion SVG Fighter */}
            <motion.div
              animate={
                currentFatality.attacker === "scorpion" && animStage === "executing"
                  ? { x: [0, 40, 20] }
                  : currentFatality.victim === "scorpion" && animStage === "dizzy"
                  ? { rotate: [-5, 5, -5] }
                  : {}
              }
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="relative"
            >
              {/* Flame Breath Overlay during Execution */}
              {currentFatality.attacker === "scorpion" &&
                currentFatality.id === "toasty_fire" &&
                animStage === "executing" && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "320px", opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="absolute left-20 top-4 h-16 bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600 rounded-full blur-md shadow-[0_0_40px_#f97316] z-30"
                  />
                )}

              {/* Spear Rope during Execution */}
              {currentFatality.attacker === "scorpion" &&
                currentFatality.id === "spear_pull" &&
                animStage === "executing" && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "280px" }}
                    transition={{ duration: 0.3 }}
                    className="absolute left-20 top-12 h-1 bg-zinc-300 shadow-[0_0_10px_white] z-30"
                  >
                    <div className="absolute right-0 -top-1 text-zinc-100 font-bold text-xs">▶▶</div>
                  </motion.div>
                )}

              {/* Character Silhouette SVG */}
              <svg viewBox="0 0 100 140" className="w-24 sm:w-32 h-36 sm:h-44 drop-shadow-[0_0_15px_rgba(234,179,8,0.7)]">
                {/* Ninja Hood */}
                <ellipse cx="50" cy="28" rx="16" ry="18" fill="#18181b" />
                {/* Yellow Mask */}
                <path d="M 38 28 L 50 38 L 62 28 L 50 20 Z" fill="#eab308" />
                {/* Glowing White Eyes */}
                <circle cx="44" cy="24" r="2.5" fill="#ffffff" />
                <circle cx="56" cy="24" r="2.5" fill="#ffffff" />
                {/* Yellow Ninja Tunic / V-Vest */}
                <polygon points="34,44 66,44 58,85 42,85" fill="#eab308" />
                <polygon points="44,44 56,44 52,85 48,85" fill="#18181b" />
                {/* Black Undersuit / Arms */}
                <path d="M 34 46 L 18 70 L 26 74 L 38 52" fill="#27272a" />
                <path d="M 66 46 L 82 70 L 74 74 L 62 52" fill="#27272a" />
                {/* Legs */}
                <path d="M 40 85 L 32 135 L 42 135 L 48 95" fill="#18181b" />
                <path d="M 60 85 L 68 135 L 58 135 L 52 95" fill="#18181b" />
                {/* Yellow Shin Guards */}
                <rect x="30" y="105" width="10" height="25" fill="#eab308" rx="2" />
                <rect x="60" y="105" width="10" height="25" fill="#eab308" rx="2" />
              </svg>
            </motion.div>

            <span className="text-[11px] font-bold text-yellow-400 tracking-wider mt-1">
              SCORPION
            </span>
          </div>

          {/* Center Shout / Callout */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
            {animStage === "executing" && currentFatality.id === "spear_pull" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1.4 }}
                className="px-4 py-2 bg-yellow-500 text-black font-black text-xl tracking-widest border-2 border-white shadow-[0_0_20px_#eab308]"
              >
                &quot;GET OVER HERE!&quot;
              </motion.div>
            )}
          </div>

          {/* Fighter Right: Sub-Zero */}
          <div className="relative flex flex-col items-center">
            {/* Dizzy stars / Ice shatter animation */}
            {currentFatality.victim === "subzero" && animStage === "dizzy" && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="absolute -top-6 text-amber-300 text-sm tracking-widest font-black"
              >
                ★ ★ ★
              </motion.div>
            )}

            <motion.div
              animate={
                currentFatality.victim === "subzero" && animStage === "dizzy"
                  ? { rotate: [4, -6, 4], x: [2, -2, 2] }
                  : currentFatality.victim === "subzero" && animStage === "executing"
                  ? { opacity: [1, 0.4, 0], scale: [1, 1.1, 0.4] }
                  : {}
              }
              transition={{ repeat: animStage === "dizzy" ? Infinity : 0, duration: 1.2 }}
              className="relative"
            >
              {/* Frozen Solid Ice Block */}
              {currentFatality.id === "ice_shatter" && animStage === "executing" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  className="absolute inset-0 bg-cyan-400/70 border-4 border-white backdrop-blur-md rounded-lg shadow-[0_0_35px_#22d3ee] z-30"
                />
              )}

              {/* Sub-Zero SVG Character */}
              <svg viewBox="0 0 100 140" className="w-24 sm:w-32 h-36 sm:h-44 drop-shadow-[0_0_15px_rgba(6,182,212,0.7)] scale-x-[-1]">
                {/* Ninja Hood */}
                <ellipse cx="50" cy="28" rx="16" ry="18" fill="#18181b" />
                {/* Ice Cyan Mask */}
                <path d="M 38 28 L 50 38 L 62 28 L 50 20 Z" fill="#06b6d4" />
                {/* Glowing Cyan Eyes */}
                <circle cx="44" cy="24" r="2.5" fill="#a5f3fc" />
                <circle cx="56" cy="24" r="2.5" fill="#a5f3fc" />
                {/* Cyan Ninja Tunic */}
                <polygon points="34,44 66,44 58,85 42,85" fill="#06b6d4" />
                <polygon points="44,44 56,44 52,85 48,85" fill="#18181b" />
                {/* Arms */}
                <path d="M 34 46 L 18 70 L 26 74 L 38 52" fill="#27272a" />
                <path d="M 66 46 L 82 70 L 74 74 L 62 52" fill="#27272a" />
                {/* Legs */}
                <path d="M 40 85 L 32 135 L 42 135 L 48 95" fill="#18181b" />
                <path d="M 60 85 L 68 135 L 58 135 L 52 95" fill="#18181b" />
                {/* Cyan Shin Guards */}
                <rect x="30" y="105" width="10" height="25" fill="#06b6d4" rx="2" />
                <rect x="60" y="105" width="10" height="25" fill="#06b6d4" rx="2" />
              </svg>
            </motion.div>

            <span className="text-[11px] font-bold text-cyan-400 tracking-wider mt-1">
              SUB-ZERO
            </span>
          </div>
        </div>

        {/* Victory Celebration Announcer Screen */}
        <AnimatePresence>
          {animStage === "finished" && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-40 text-center"
            >
              <h2 className="text-3xl sm:text-5xl font-black text-amber-400 tracking-widest uppercase drop-shadow-[0_0_20px_#f59e0b]">
                {currentFatality.victoryText}
              </h2>
              <h1 className="text-5xl sm:text-7xl font-black text-red-600 tracking-widest uppercase my-2 drop-shadow-[0_0_35px_#dc2626]">
                {currentFatality.fatalityType}
              </h1>
              <p className="text-sm font-bold text-zinc-300 tracking-widest mt-1">
                FLAWLESS VICTORY
              </p>
            </motion.div>
          )}

          {animStage === "timeout" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-40 text-center"
            >
              <h2 className="text-4xl font-black text-zinc-400 tracking-widest">TOO SLOW!</h2>
              <h1 className="text-5xl font-black text-amber-500 tracking-widest mt-2">MERCY...</h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls & Key Sequence Prompt */}
      <div className="w-full max-w-xl flex flex-col items-center gap-3 z-10">
        {animStage === "dizzy" && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                EXECUTE COMBO IN [{timeLeft}s]:
              </span>
              <div className="flex gap-2">
                {currentFatality.displayKeys.map((keyLabel, idx) => {
                  const isDone = idx < currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (isCurrent) {
                          const next = currentStep + 1;
                          setCurrentStep(next);
                          if (next >= currentFatality.keys.length) {
                            handleComboSuccess();
                          }
                        }
                      }}
                      className={`w-12 h-12 flex items-center justify-center rounded border-2 font-mono font-black text-lg transition-all ${
                        isDone
                          ? "bg-red-600 border-red-400 text-white shadow-[0_0_15px_#dc2626]"
                          : isCurrent
                          ? "bg-amber-500 border-white text-black animate-pulse shadow-[0_0_20px_#f59e0b]"
                          : "bg-zinc-900 border-zinc-700 text-zinc-500"
                      }`}
                    >
                      {isDone ? "✓" : keyLabel}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 tracking-wider">
              USE ARROW KEYS OR CLICK BUTTONS ABOVE
            </p>
          </>
        )}

        {(animStage === "finished" || animStage === "timeout") && (
          <button
            onClick={onClose}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-widest uppercase shadow-[0_0_20px_#dc2626] transition-colors"
          >
            RETURN TO PORTFOLIO
          </button>
        )}
      </div>
    </div>
  );
}
