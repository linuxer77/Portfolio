"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { personalData } from "@/lib/portfolio-data";
import { PageGame, type Action, type GameEvent, type RunStats } from "./platformer/engine";
import { Sound } from "./platformer/sound";

// ==========================================
// Stack Runner: the portfolio page becomes a platformer level.
// A transparent canvas over the page draws the hero; the page scroll follows them.
// Launched from the terminal with `play`.
// ==========================================

const KEYS: Record<string, Action> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "jump",
  ArrowUp: "jump",
  KeyW: "jump",
  KeyZ: "jump",
  ShiftLeft: "run",
  ShiftRight: "run",
  KeyX: "run",
  ArrowDown: "down",
  KeyS: "down",
};

const CONTROL_KEYS = new Set(["Enter", "Escape", "KeyP", "KeyM", "KeyR"]);
// keys that would otherwise scroll the page
const SCROLL_KEYS = new Set(["PageUp", "PageDown", "Home", "End"]);

/** Rank by how much of the stack was collected on the way down. */
const rank = (stats: RunStats) => {
  const share = stats.totalSkills ? stats.skills.length / stats.totalSkills : 0;
  return share >= 0.9 ? "S" : share >= 0.7 ? "A" : share >= 0.45 ? "B" : share >= 0.2 ? "C" : "D";
};

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Btn({ children, onClick, primary = false }: { children: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "px-4 py-2 text-xs font-bold text-black bg-white hover:bg-zinc-200 transition-colors"
          : "px-3 py-1.5 text-[11px] text-zinc-300 hover:text-white border border-dotted border-zinc-700 hover:border-zinc-400 transition-colors"
      }
    >
      {children}
    </button>
  );
}

export default function StackRunner({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PageGame | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [end, setEnd] = useState<GameEvent | null>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [hint, setHint] = useState(true);
  const [copied, setCopied] = useState(false);
  const endRef = useRef(end);
  endRef.current = end;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sound = new Sound();
    sound.unlock();
    const game = new PageGame(canvas, sound, getComputedStyle(canvas).fontFamily, setStats, setEnd);
    soundRef.current = sound;
    gameRef.current = game;
    setMuted(sound.muted);
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    game.start();

    const hintTimer = window.setTimeout(() => setHint(false), 8000);
    const onResize = () => game.resize();
    // the game owns scrolling while it runs
    const block = (e: Event) => e.preventDefault();
    window.addEventListener("resize", onResize);
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    return () => {
      window.clearTimeout(hintTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
      game.destroy();
      sound.destroy();
    };
  }, []);

  const pause = useCallback(() => {
    gameRef.current?.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    soundRef.current?.unlock();
    gameRef.current?.start();
    setPaused(false);
  }, []);

  const restart = useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    setEnd(null);
    setPaused(false);
    gameRef.current?.restart();
  }, []);

  const toggleMute = useCallback(() => {
    const sound = soundRef.current;
    if (!sound) return;
    sound.setMuted(!sound.muted);
    setMuted(sound.muted);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const action = KEYS[e.code];
      if (action || CONTROL_KEYS.has(e.code) || SCROLL_KEYS.has(e.code)) e.preventDefault();
      if (e.code === "Escape") return onClose();
      if (e.code === "KeyM") return toggleMute();
      if (endRef.current) {
        if (e.code === "Enter" || e.code === "KeyR") restart();
      } else if (pausedRef.current) {
        if (e.code === "Enter" || e.code === "KeyP" || e.code === "Space") resume();
      } else if (e.code === "KeyP") {
        pause();
      } else if (action) {
        soundRef.current?.unlock();
        gameRef.current?.setKey(action, true);
      }
    };
    const up = (e: KeyboardEvent) => {
      const action = KEYS[e.code];
      if (action) gameRef.current?.setKey(action, false);
    };
    const autoPause = () => {
      if (!endRef.current && !pausedRef.current) pause();
    };
    const onVisibility = () => {
      if (document.hidden) autoPause();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", autoPause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", autoPause);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [onClose, pause, resume, restart, toggleMute]);

  const hold = (action: Action) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      soundRef.current?.unlock();
      gameRef.current?.setKey(action, true);
    },
    onPointerUp: () => gameRef.current?.setKey(action, false),
    onPointerCancel: () => gameRef.current?.setKey(action, false),
  });

  const copyEmail = () => {
    void navigator.clipboard?.writeText(personalData.email);
    setCopied(true);
  };

  const padClass =
    "flex h-14 w-14 items-center justify-center border border-dotted border-zinc-600 bg-black/80 text-sm font-bold text-zinc-200 active:bg-white active:text-black";

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[45] h-full w-full font-mono"
      />

      {/* HUD */}
      <div
        className={`fixed left-3 z-50 flex flex-wrap items-center gap-x-4 gap-y-1 border border-dotted border-zinc-700 bg-black/90 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500 ${
          touch ? "right-3 bottom-[88px]" : "bottom-3"
        }`}
      >
        <span className="font-bold text-white">Stack Runner</span>
        {stats && (
          <>
            <span>
              Score <span className="text-white">{String(stats.score).padStart(6, "0")}</span>
            </span>
            <span>
              Stack{" "}
              <span className="text-white">
                {stats.skills.length}/{stats.totalSkills}
              </span>
            </span>
            <span>
              Lives <span className="text-white">{stats.lives}</span>
            </span>
          </>
        )}
        <button type="button" onClick={toggleMute} className="hover:text-white transition-colors">
          {muted ? "Sound off" : "Sound on"}
        </button>
        <button type="button" onClick={paused ? resume : pause} className="hover:text-white transition-colors">
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={onClose} className="hover:text-white transition-colors">
          Exit [Esc]
        </button>
        {hint && !touch && (
          <span className="basis-full normal-case tracking-normal text-zinc-400">
            ← → move · Space jump · ↓ drop through a line · Shift run · grab skill tags to rank up, stomp bugs,
            bump glyphs for coffee, reach Contact
          </span>
        )}
      </div>

      {touch && !end && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between px-4 pb-4">
          <div className="flex gap-3">
            <button type="button" aria-label="Move left" className={padClass} {...hold("left")}>
              ◀
            </button>
            <button type="button" aria-label="Move right" className={padClass} {...hold("right")}>
              ▶
            </button>
          </div>
          <div className="flex gap-3">
            <button type="button" aria-label="Drop through" className={padClass} {...hold("down")}>
              ▼
            </button>
            <button type="button" aria-label="Jump" className={padClass} {...hold("jump")}>
              JUMP
            </button>
          </div>
        </div>
      )}

      {(end || paused) && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4 font-mono">
          <div className="w-full max-w-md space-y-5 border border-dotted border-zinc-700 bg-black p-6 text-center">
            {paused && !end && (
              <>
                <h2 className="text-2xl font-bold tracking-tight">PAUSED</h2>
                <div className="flex justify-center gap-3">
                  <Btn primary onClick={resume}>
                    RESUME
                  </Btn>
                  <Btn onClick={onClose}>EXIT</Btn>
                </div>
              </>
            )}

            {end && (
              <>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {end.type === "win" ? "YOU REACHED CONTACT ✓" : "PROCESS EXITED (CODE 1)"}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {end.type === "win"
                      ? rank(end.stats) === "S"
                        ? "Full stack collected. Want to talk for real?"
                        : "Collect more of the stack on the way down to rank up. Or just say hi:"
                      : "Out of lives. The bugs won this round."}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-4 text-left text-xs">
                  {(
                    [
                      ["RANK", rank(end.stats)],
                      ["SCORE", String(end.stats.score)],
                      ["STACK", `${end.stats.skills.length}/${end.stats.totalSkills}`],
                      ["TIME", formatTime(end.stats.time)],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="border-b border-dotted border-zinc-800 pb-1">
                      <div className="text-zinc-500">{label}</div>
                      <div className="font-bold text-white">{value}</div>
                    </div>
                  ))}
                </div>

                {end.type === "win" && (
                  <div className="flex flex-wrap justify-center gap-3">
                    <Btn primary onClick={copyEmail}>
                      {copied ? "EMAIL COPIED" : "COPY EMAIL"}
                    </Btn>
                    <Btn onClick={() => window.open(personalData.github, "_blank")}>GITHUB ↗</Btn>
                    <Btn onClick={() => window.open(personalData.linkedin, "_blank")}>LINKEDIN ↗</Btn>
                    <Btn onClick={() => window.open(personalData.resumePath, "_blank")}>RÉSUMÉ ↗</Btn>
                  </div>
                )}

                <div className="flex justify-center gap-3">
                  <Btn primary={end.type !== "win"} onClick={restart}>
                    {end.type === "win" ? "PLAY AGAIN" : "RETRY"}
                  </Btn>
                  <Btn onClick={onClose}>EXIT</Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
