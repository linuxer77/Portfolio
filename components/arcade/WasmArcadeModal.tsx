"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

import type { Nostalgist } from "nostalgist";

export type ArcadeGame = "umk3" | "contra" | "sf2";

interface GameMeta {
  title: string;
  system: "megadrive" | "nes";
  rom: string;
  coreName: string;
  themeColor: string;
  accentColor: string;
  tagline: string;
  controls: {
    dpad: string;
    action1: string;
    action2: string;
    action3?: string;
    start: string;
    select?: string;
  };
}

const GAME_CONFIGS: Record<ArcadeGame, GameMeta> = {
  umk3: {
    title: "ULTIMATE MORTAL KOMBAT 3",
    system: "megadrive",
    rom: "/roms/umk3.bin",
    coreName: "genesis_plus_gx",
    themeColor: "from-red-950 via-zinc-950 to-black",
    accentColor: "border-red-600 text-red-500 shadow-[0_0_25px_rgba(220,38,38,0.7)]",
    tagline: "MIDWAY 1995 // 100% ORIGINAL WASM GENESIS CORE",
    controls: {
      dpad: "Arrow Keys",
      action1: "A (Low Punch)",
      action2: "S (Block)",
      action3: "D (Low Kick) | Z, X, C: High Atks",
      start: "Enter",
    },
  },
  contra: {
    title: "CONTRA // 30 LIVES OVERCLOCK",
    system: "nes",
    rom: "/roms/contra.nes",
    coreName: "fceumm",
    themeColor: "from-amber-950 via-zinc-950 to-black",
    accentColor: "border-amber-500 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)]",
    tagline: "KONAMI 1988 // 100% ORIGINAL NES ROM",
    controls: {
      dpad: "Arrow Keys",
      action1: "A (Shoot)",
      action2: "S (Jump)",
      select: "Shift (Select)",
      start: "Enter (Start)",
    },
  },
  sf2: {
    title: "STREET FIGHTER II' SPECIAL CHAMPION EDITION",
    system: "megadrive",
    rom: "/roms/sf2.bin",
    coreName: "genesis_plus_gx",
    themeColor: "from-sky-950 via-zinc-950 to-black",
    accentColor: "border-cyan-500 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)]",
    tagline: "CAPCOM 1993 // 100% ORIGINAL CPS2/GENESIS SOUND & SPRITES",
    controls: {
      dpad: "Arrow Keys",
      action1: "Z, X, C (Light, Med, Hard Punch)",
      action2: "A, S, D (Light, Med, Hard Kick)",
      start: "Enter (Start)",
    },
  },
};

interface WasmArcadeModalProps {
  isOpen: boolean;
  game: ArcadeGame | null;
  onClose: () => void;
}

export default function WasmArcadeModal({ isOpen, game, onClose }: WasmArcadeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nostalgistInstanceRef = useRef<Nostalgist | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState("Initializing WebAssembly runtime...");
  const [isPaused, setIsPaused] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentGame = game ? GAME_CONFIGS[game] : null;

  const cleanupEmulator = useCallback(async () => {
    if (nostalgistInstanceRef.current) {
      try {
        await nostalgistInstanceRef.current.exit();
      } catch {
        // Ignored
      }
      nostalgistInstanceRef.current = null;
    }
  }, []);

  const launchEmulator = useCallback(async () => {
    if (!game || !canvasRef.current) return;
    await cleanupEmulator();

    setLoading(true);
    setErrorMsg(null);
    setIsPaused(false);

    try {
      setLoadingStep("Importing Nostalgist Wasm Core...");
      const { Nostalgist } = await import("nostalgist");

      const meta = GAME_CONFIGS[game];
      setLoadingStep(`Downloading authentic ROM: ${meta.rom}...`);

      setLoadingStep(`Starting 60FPS ${meta.system.toUpperCase()} core (${meta.coreName})...`);

      const launchFn = meta.system === "nes" ? Nostalgist.nes : Nostalgist.megadrive;

      const instance = await launchFn({
        element: canvasRef.current,
        rom: meta.rom,
      });

      nostalgistInstanceRef.current = instance;
      setLoading(false);
    } catch (err: unknown) {
      console.error("WASM Arcade Emulator error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to launch WebAssembly emulator: ${msg}`);
      setLoading(false);
    }
  }, [game, cleanupEmulator]);

  useEffect(() => {
    if (isOpen && game) {
      // Small timeout to allow modal mount and canvas ref binding
      const timer = setTimeout(() => {
        launchEmulator();
      }, 80);
      return () => {
        clearTimeout(timer);
        cleanupEmulator();
      };
    } else {
      cleanupEmulator();
    }
  }, [isOpen, game, launchEmulator, cleanupEmulator]);

  // Handle ESC key to exit
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const togglePause = async () => {
    if (!nostalgistInstanceRef.current) return;
    if (isPaused) {
      await nostalgistInstanceRef.current.resume();
      setIsPaused(false);
    } else {
      await nostalgistInstanceRef.current.pause();
      setIsPaused(true);
    }
  };

  const restartGame = async () => {
    if (!nostalgistInstanceRef.current) return;
    await nostalgistInstanceRef.current.restart();
    setIsPaused(false);
  };

  const toggleFullscreen = () => {
    if (!canvasRef.current) return;
    if (!document.fullscreenElement) {
      canvasRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  if (!isOpen || !currentGame) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-3 sm:p-6 font-mono select-none overflow-y-auto">
        {/* Top Arcade Marquee Header */}
        <div className="w-full max-w-5xl flex items-center justify-between border-b-2 border-zinc-800 pb-3 mb-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-widest text-white uppercase">
                {currentGame.title}
              </h1>
              <p className="text-[10px] text-zinc-400 font-bold tracking-wider">
                {currentGame.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="hidden sm:inline-block px-2.5 py-1 text-[11px] bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Fullscreen"
            >
              ⛶ FULLSCREEN
            </button>
            <button
              onClick={togglePause}
              className="px-2.5 py-1 text-[11px] bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            >
              {isPaused ? "▶ RESUME" : "❚❚ PAUSE"}
            </button>
            <button
              onClick={restartGame}
              className="px-2.5 py-1 text-[11px] bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            >
              ↻ RESTART
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-[0_0_15px_#dc2626]"
            >
              [ ESC: EXIT ]
            </button>
          </div>
        </div>

        {/* Center CRT Arcade Cabinet Enclosure */}
        <div className="relative w-full max-w-4xl my-auto flex flex-col items-center justify-center">
          {/* Outer Arcade CRT Bezel Frame */}
          <div
            className={`relative w-full aspect-[4/3] max-h-[70vh] bg-black rounded-2xl border-4 ${currentGame.accentColor} p-2 flex items-center justify-center overflow-hidden shadow-2xl`}
          >
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 border-4 border-zinc-700 border-t-amber-400 rounded-full animate-spin mb-4" />
                <h2 className="text-sm sm:text-base font-bold text-white tracking-widest uppercase mb-1">
                  STARTING RETROARCH WASM KERNEL...
                </h2>
                <p className="text-xs text-amber-400 animate-pulse">{loadingStep}</p>
                <p className="text-[10px] text-zinc-500 mt-4 max-w-md">
                  Running actual byte-for-byte 1990s ROM with native audio &amp; video emulation.
                </p>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="absolute inset-0 z-30 bg-black/95 flex flex-col items-center justify-center p-6 text-center">
                <span className="text-red-500 text-2xl font-black mb-2">⚠ SYSTEM HALT</span>
                <p className="text-xs text-red-400 mb-4">{errorMsg}</p>
                <button
                  onClick={launchEmulator}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-wider"
                >
                  RETRY BOOT
                </button>
              </div>
            )}

            {/* Retro CRT Scanline Shader Overlay */}
            <div
              className="absolute inset-0 pointer-events-none z-10 opacity-20"
              style={{
                backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.75) 50%)",
                backgroundSize: "100% 4px",
              }}
            />

            {/* WebAssembly Canvas Mount Point */}
            <canvas
              ref={canvasRef}
              id="retro-canvas"
              tabIndex={0}
              className="w-full h-full object-contain bg-black rounded-lg cursor-crosshair focus:outline-none"
            />
          </div>
        </div>

        {/* Bottom Controller Key Mapping HUD */}
        <div className="w-full max-w-4xl border-t border-dotted border-zinc-800 pt-3 mt-2 shrink-0 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-white font-bold uppercase tracking-widest text-[10px]">
              ARCADE CONTROLS:
            </span>
            <span className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300">
              <span className="text-zinc-500">D-PAD:</span> {currentGame.controls.dpad}
            </span>
            <span className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300">
              <span className="text-zinc-500">BUTTON 1:</span> {currentGame.controls.action1}
            </span>
            <span className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300">
              <span className="text-zinc-500">BUTTON 2:</span> {currentGame.controls.action2}
            </span>
            {currentGame.controls.action3 && (
              <span className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                {currentGame.controls.action3}
              </span>
            )}
            <span className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300">
              <span className="text-zinc-500">START:</span> {currentGame.controls.start}
            </span>
          </div>

          <div className="text-[10px] text-zinc-500 uppercase tracking-widest shrink-0">
            INSERT COIN // CREDITS: ∞
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
