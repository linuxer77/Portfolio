"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HoleGame } from "./game";
import { Sound } from "./sound";

// ==========================================
// BLACK HOLE mode shell: lays the canvas over the live page, reveals every section so all
// of it can be pulled in, turns the pointer into the hole, and runs the Big Bang on the way
// out so leaving rebuilds the page. Launched from the terminal with `blackhole`.
// ==========================================

export default function BlackHoleMode({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<HoleGame | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const [mounted, setMounted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.querySelector("[data-page-root]");
    const revealed = root?.hasAttribute("data-in");
    root?.setAttribute("data-in", "");

    const sound = new Sound();
    soundRef.current = sound;
    setMuted(sound.muted);
    sound.unlock();
    const game = new HoleGame(canvas, sound, (strength) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const frames = [0, 1, -1, 0.6, -0.4, 0].map((f) => ({
        transform: `translate(${f * strength}px, ${-f * strength * 0.6}px)`,
      }));
      const opts = { duration: 260, easing: "ease-out" };
      document.querySelector("[data-page-root]")?.animate(frames, opts);
      canvas.animate(frames, opts);
    });
    gameRef.current = game;
    game.start();

    const onResize = () => gameRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      game.stop();
      gameRef.current = null;
      sound.destroy();
      if (!revealed) root?.removeAttribute("data-in");
    };
  }, [mounted]);

  /** Leaving rebuilds the page with a Big Bang first, then closes. */
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
      if (e.code === "KeyM") return toggleMute();
      if (e.code === "Space") {
        e.preventDefault();
        gameRef.current?.collapse();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [leave, toggleMute]);

  if (!mounted) return null;

  return createPortal(
    <div data-arcade className="font-mono">
      <canvas
        ref={canvasRef}
        aria-label="Black hole mode: the page falls in"
        className="pointer-events-none fixed inset-0 z-[46] h-full w-full"
      />
      {/* the pointer is the hole: this layer tracks it and keeps clicks off the page's links */}
      <div
        className="fixed inset-0 z-[46]"
        style={{ cursor: "none", touchAction: touch ? "none" : "auto" }}
        onPointerMove={(e) => gameRef.current?.pointer(e.clientX, e.clientY)}
        onPointerDown={(e) => {
          soundRef.current?.unlock();
          gameRef.current?.pointer(e.clientX, e.clientY);
          // with a mouse, a click collapses it; a finger just drags it about
          if (e.pointerType === "mouse" && e.button === 0) gameRef.current?.collapse();
        }}
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
          {leaving ? "Rebuilding…" : "Exit [Esc]"}
        </button>
      </div>

      {touch ? (
        <div className="fixed inset-x-0 bottom-6 z-[47] flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => gameRef.current?.collapse()}
            className="rounded-full border border-zinc-400/80 bg-black/60 px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-white"
            style={{ touchAction: "none" }}
          >
            Collapse
          </button>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Drag to feed it</span>
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[47] text-center text-[10px] uppercase tracking-widest text-zinc-500">
          Move to feed it · scroll for more · click or space to collapse · esc to exit
        </div>
      )}
    </div>,
    document.body
  );
}
