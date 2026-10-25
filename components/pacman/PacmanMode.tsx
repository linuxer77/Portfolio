"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import TouchControls from "@/components/arcade/TouchControls";
import { PacGame, type PacStats } from "./game";
import { Sound } from "./sound";

// ==========================================
// PAC-MAN mode shell: lays the game canvas over the live page, reveals every section so all
// of it is edible, routes arrows / WASD (or the touch pad), shows the end screen.
// Launched from the terminal with `pacman`.
// ==========================================

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

export default function PacmanMode({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PacGame | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const [mounted, setMounted] = useState(false);
  const [end, setEnd] = useState<PacStats | null>(null);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // every section is edible, not just the ones already scrolled past: reveal them all
    const root = document.querySelector("[data-page-root]");
    const revealed = root?.hasAttribute("data-in");
    root?.setAttribute("data-in", "");

    const sound = new Sound();
    soundRef.current = sound;
    setMuted(sound.muted);
    sound.unlock();
    const game = new PacGame(canvas, sound, setEnd, (strength) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const frames = [0, 1, -1, 0.6, -0.4, 0].map((f) => ({
        transform: `translate(${f * strength}px, ${-f * strength * 0.6}px)`,
      }));
      const opts = { duration: 240, easing: "ease-out" };
      document.querySelector("[data-page-root]")?.animate(frames, opts);
      canvas.animate(frames, opts);
    });
    gameRef.current = game;
    game.start();

    const onResize = () => gameRef.current?.resize();
    // the camera follows Pac-Man, so the page doesn't scroll by hand
    const block = (e: Event) => {
      if (!(e.target as Element | null)?.closest?.("[data-menu]")) e.preventDefault();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
      game.stop();
      gameRef.current = null;
      sound.destroy();
      if (!revealed) root?.removeAttribute("data-in");
    };
  }, [mounted]);

  const restart = useCallback(() => {
    setEnd(null);
    soundRef.current?.unlock();
    gameRef.current?.start();
  }, []);

  const toggleMute = useCallback(() => {
    const sound = soundRef.current;
    if (!sound) return;
    sound.setMuted(!sound.muted);
    setMuted(sound.muted);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        return onClose();
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "KeyM") return toggleMute();
      if (end) {
        if (e.code === "Enter" || e.code === "KeyR") restart();
        return;
      }
      if (gameRef.current?.key(e.code, true) || e.code === "Space") e.preventDefault();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [onClose, toggleMute, restart, end]);

  if (!mounted) return null;

  return createPortal(
    <div data-arcade className="font-mono">
      <canvas
        ref={canvasRef}
        aria-label="Pac-Man mode: eat the page"
        className="pointer-events-none fixed inset-0 z-[46] h-full w-full"
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
          onClick={onClose}
          className="border border-dotted border-zinc-700 bg-black/90 px-2 py-1 text-zinc-400 hover:text-white transition-colors"
        >
          Exit [Esc]
        </button>
      </div>

      {touch && !end && (
        <>
          <div className="fixed inset-0 z-[46]" style={{ touchAction: "none" }} />
          <TouchControls
            pad={{
              left: "ArrowLeft",
              right: "ArrowRight",
              up: "ArrowUp",
              down: "ArrowDown",
            }}
            buttons={[]}
            onKey={(code, down) => gameRef.current?.key(code, down)}
          />
        </>
      )}

      {!touch && !end && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[47] text-center text-[10px] uppercase tracking-widest text-zinc-500">
          Arrows or WASD to steer · eat the page · flashing pellets turn the ghosts blue
        </div>
      )}

      {end && (
        <div
          data-menu
          className="fixed inset-0 z-[48] flex items-center justify-center overflow-y-auto bg-black/60 p-4"
        >
          <div className="m-auto w-full max-w-md space-y-5 border border-dotted border-zinc-700 bg-black p-6 text-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">{end.won ? "PORTFOLIO DEVOURED" : "GAME OVER"}</h2>
              <p className="text-xs text-zinc-400">
                {end.won
                  ? "Nothing left but a very full Pac-Man. It all goes back when you exit."
                  : `The ghosts got you. ${end.letters} letters eaten before they did.`}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3 text-left text-xs">
              {(
                [
                  ["SCORE", String(end.score)],
                  ["LETTERS", String(end.letters)],
                  ["GHOSTS", String(end.ghosts)],
                  ["TIME", formatTime(end.time)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="border-b border-dotted border-zinc-800 pb-1">
                  <div className="text-zinc-500">{label}</div>
                  <div className="font-bold text-white">{value}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-3">
              <Btn primary onClick={restart}>
                PLAY AGAIN [ENTER]
              </Btn>
              <Btn onClick={onClose}>EXIT</Btn>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
