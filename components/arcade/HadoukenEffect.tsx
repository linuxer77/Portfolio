"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HadoukenEffectProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function HadoukenEffect({ isActive, onComplete }: HadoukenEffectProps) {
  const [stage, setStage] = useState<"idle" | "firing" | "impact">("idle");

  useEffect(() => {
    if (!isActive) {
      setStage("idle");
      return;
    }

    setStage("firing");

    const impactTimer = setTimeout(() => {
      setStage("impact");
    }, 650);

    const endTimer = setTimeout(() => {
      setStage("idle");
      onComplete();
    }, 1250);

    return () => {
      clearTimeout(impactTimer);
      clearTimeout(endTimer);
    };
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">
      {/* Screen Vibration Effect */}
      <motion.div
        animate={{ x: [-2, 3, -3, 2, 0], y: [1, -2, 2, -1, 0] }}
        transition={{ duration: 0.6, repeat: 1 }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Ryu / Martial Artist Silhouette at Lower Left */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 20, opacity: 1 }}
        exit={{ x: -100, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute bottom-12 left-4 flex items-end gap-3 z-50"
      >
        <div className="relative">
          {/* Hadouken Speech Shout */}
          <motion.div
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 450 }}
            className="mb-2 px-3 py-1 bg-cyan-400 text-black font-mono font-black text-sm tracking-widest border-2 border-white shadow-[0_0_15px_#22d3ee] rounded-md"
          >
            HADOUKEN! 波動拳
          </motion.div>

          {/* Fighter Thrust Silhouette SVG */}
          <svg viewBox="0 0 100 100" className="w-24 h-24 text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] fill-current">
            {/* Martial artist torso + head + arms extended forward */}
            <circle cx="36" cy="22" r="10" />
            {/* Headband ribbon */}
            <path d="M 28 20 L 12 18 L 18 24 L 10 28" stroke="#ef4444" strokeWidth="3" fill="none" />
            {/* Torso & Gi */}
            <path d="M 28 32 L 48 32 L 52 64 L 24 64 Z" />
            <path d="M 34 32 L 42 50 L 50 32" stroke="#000" strokeWidth="2" fill="none" />
            {/* Extended Arms Forward into Hadouken Stance */}
            <path d="M 44 38 L 74 44 L 84 48 L 76 56 L 46 50 Z" />
            {/* Legs stance */}
            <path d="M 26 64 L 14 96 L 24 96 L 36 72" />
            <path d="M 48 64 L 62 96 L 74 96 L 52 70" />
          </svg>
        </div>
      </motion.div>

      {/* Surging Blue Plasma Fireball */}
      <AnimatePresence>
        {stage === "firing" && (
          <motion.div
            initial={{ left: 140, bottom: 90, scale: 0.5, opacity: 0 }}
            animate={{
              left: "100vw",
              bottom: 120,
              scale: [0.6, 1.4, 1.2],
              opacity: [0, 1, 1],
            }}
            transition={{ duration: 0.65, ease: "easeIn" }}
            className="absolute -translate-y-1/2 flex items-center justify-center z-50 pointer-events-none"
          >
            {/* Multi-layered Plasma Sphere */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center">
              {/* Outer Energy Halo */}
              <div className="absolute inset-0 rounded-full bg-cyan-500/40 blur-xl animate-pulse" />
              {/* Core Plasma Glow */}
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-white shadow-[0_0_50px_#06b6d4,0_0_90px_#38bdf8] flex items-center justify-center">
                {/* Inner white-hot center */}
                <div className="w-10 h-10 rounded-full bg-white shadow-[0_0_20px_#ffffff]" />
              </div>

              {/* Trailing Energy Wisps */}
              <div className="absolute -left-16 w-20 h-10 bg-cyan-400/60 blur-md rounded-full -rotate-6" />
              <div className="absolute -left-28 w-24 h-6 bg-blue-500/40 blur-lg rounded-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Edge Explosion Impact */}
      <AnimatePresence>
        {stage === "impact" && (
          <motion.div
            initial={{ opacity: 1, scale: 0.6 }}
            animate={{ opacity: 0, scale: 2.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            className="absolute right-0 bottom-20 w-64 h-64 rounded-full bg-cyan-400/80 blur-2xl z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
