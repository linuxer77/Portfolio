"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LifeGame, type LifeStats } from "./game";
import { Sound } from "./sound";

// ==========================================
// GAME OF LIFE mode shell: reveals every section, lays the board canvas over the page,
// lets the pointer draw cells, and puts the controls in a small bar at the bottom.
// Launched from the terminal with `life`.
// ==========================================

function Key({ children, onClick, active = false }: { children: ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border border-dotted px-2.5 py-1.5 text-[10px] uppercase tracking-wider transition-colors ${
        active
          ? "border-cyan-300 bg-cyan-300 text-black"
          : "border-zinc-700 bg-black/90 text-zinc-300 hover:border-zinc-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function LifeMode({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<LifeGame | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const [mounted, setMounted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [stats, setStats] = useState<LifeStats | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // every section takes part, not just the ones already scrolled past
    const root = document.querySelector("[data-page-root]");
    const revealed = root?.hasAttribute("data-in");
    root?.setAttribute("data-in", "");

    const sound = new Sound();
    soundRef.current = sound;
    setMuted(sound.muted);
    sound.unlock();
    const game = new LifeGame(canvas, sound, setStats);
    gameRef.current = game;
    // let the reveal animations land before the page is read into cells
    const t = window.setTimeout(() => game.start(), 900);

    const onResize = () => gameRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
      game.stop();
      gameRef.current = null;
      sound.destroy();
      if (!revealed) root?.removeAttribute("data-in");
    };
  }, [mounted]);

  const leave = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    const game = gameRef.current;
    if (!game) return onClose();
    game.exit(onClose);
  }, [leaving, onClose]);

  const toggleMute = useCallback(() => {
    const sound = soundRef.current;
    if (!sound) return;
    sound.setMuted(!sound.muted);
    setMuted(sound.muted);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      soundRef.current?.unlock();
      if (e.code === "Escape") {
        e.preventDefault();
        return leave();
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const game = gameRef.current;
      if (!game) return;
      if (e.code === "KeyM") toggleMute();
      else if (e.code === "Space") {
        e.preventDefault();
        game.togglePause();
      } else if (e.code === "KeyN") game.step();
      else if (e.code === "KeyG") game.gliders();
      else if (e.code === "KeyR") game.soup();
      else if (e.code === "BracketRight" || e.code === "Equal") game.faster(1);
      else if (e.code === "BracketLeft" || e.code === "Minus") game.faster(-1);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [leave, toggleMute]);

  if (!mounted) return null;

  const game = () => gameRef.current;

  return createPortal(
    <div data-arcade className="font-mono">
      <canvas
        ref={canvasRef}
        aria-label="Game of Life mode: the page comes alive"
        className="pointer-events-none fixed inset-0 z-[46] h-full w-full"
      />
      {/* drawing layer: drag to paint cells; it also keeps clicks off the page's links */}
      <div
        className="fixed inset-0 z-[46]"
        style={{ cursor: "crosshair", touchAction: touch ? "none" : "auto" }}
        onPointerDown={(e) => {
          soundRef.current?.unlock();
          e.currentTarget.setPointerCapture(e.pointerId);
          game()?.draw(e.clientX, e.clientY, true);
        }}
        onPointerMove={(e) => game()?.draw(e.clientX, e.clientY, e.buttons > 0)}
        onPointerUp={(e) => game()?.draw(e.clientX, e.clientY, false)}
        onPointerCancel={(e) => game()?.draw(e.clientX, e.clientY, false)}
      />

      <div className="fixed right-3 top-[72px] z-[47] flex gap-2 text-[10px] uppercase tracking-wider">
        <button
          type="button"
          onClick={toggleMute}
          className="border border-dotted border-zinc-700 bg-black/90 px-2 py-1 text-zinc-400 hover:text-white transition-colors"
        >
          {muted ? "Sound off" : "Sound on"} [M]
        </button>
        <button
          type="button"
          onClick={leave}
          className="border border-dotted border-zinc-700 bg-black/90 px-2 py-1 text-zinc-400 hover:text-white transition-colors"
        >
          {leaving ? "Restoring…" : "Exit [Esc]"}
        </button>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-[47] flex flex-col items-center gap-2 px-3"
        style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-wrap justify-center gap-2">
          <Key active={stats?.paused} onClick={() => game()?.togglePause()}>
            {stats?.paused ? "Play" : "Pause"}
            {touch ? "" : " [Space]"}
          </Key>
          <Key onClick={() => game()?.step()}>Step{touch ? "" : " [N]"}</Key>
          <Key onClick={() => game()?.gliders()}>Gliders{touch ? "" : " [G]"}</Key>
          <Key onClick={() => game()?.soup()}>Random{touch ? "" : " [R]"}</Key>
          <Key onClick={() => game()?.faster(-1)}>Slower{touch ? "" : " [["}</Key>
          <Key onClick={() => game()?.faster(1)}>Faster{touch ? "" : " []]"}</Key>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">
          {touch ? "Drag to draw cells" : "Drag to draw cells · scroll to wake more of the page · esc to restore"}
        </span>
      </div>
    </div>,
    document.body
  );
}
