"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { personalData } from "@/lib/portfolio-data";
import { loadAtlas, Sfx } from "./assets";
import { DoomGame, type DoomEnd } from "./game";
import { record, unlock } from "@/lib/arcade";

// ==========================================
// DOOM mode shell: loads the Freedoom assets, lays the game canvas over the live page,
// routes input, shakes the page on hits, and shows the end screens.
// Launched from the terminal with `doom`.
// ==========================================

const pct = (n: number, total: number) => `${total ? Math.round((n / total) * 100) : 100}%`;
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

export default function DoomMode({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<DoomGame | null>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [end, setEnd] = useState<DoomEnd | null>(null);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  /** Shakes the page and the game layer together so the holes stay lined up. */
  const shake = useCallback((strength: number) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frames = [0, 1, -1, 0.6, -0.4, 0].map((f) => ({
      transform: `translate(${f * strength}px, ${-f * strength * 0.6}px)`,
    }));
    const opts = { duration: 220, easing: "ease-out" };
    document.querySelector("[data-page-root]")?.animate(frames, opts);
    canvasRef.current?.animate(frames, opts);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const sfx = new Sfx();
    sfxRef.current = sfx;
    setMuted(sfx.muted);
    Promise.all([loadAtlas(), sfx.load()])
      .then(([atlas]) => {
        if (cancelled) return;
        const game = new DoomGame(
          canvas,
          atlas,
          sfx,
          (e) => {
            setEnd(e);
            if (e.stats.secrets) unlock("doom-secret");
            if (e.type === "win") {
              unlock("doom-clear");
              record("doom", e.stats.time);
            }
          },
          shake
        );
        gameRef.current = game;
        window.scrollTo({ top: 0, behavior: "instant" });
        game.start();
        setLoading(false);
      })
      .catch(() => setFailed(true));

    const onResize = () => gameRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      gameRef.current?.stop();
      gameRef.current = null;
      sfx.destroy();
    };
  }, [mounted, shake]);

  const restart = useCallback(() => {
    setEnd(null);
    gameRef.current?.restart();
  }, []);

  /** Leaving plays the rewind first: the page flies back together, then the mode closes. */
  const [leaving, setLeaving] = useState(false);
  const leave = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    const game = gameRef.current;
    if (!game) return onClose();
    game.exit(onClose);
  }, [leaving, onClose]);

  const toggleMute = useCallback(() => {
    const sfx = sfxRef.current;
    if (!sfx) return;
    sfx.setMuted(!sfx.muted);
    setMuted(sfx.muted);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        return leave();
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "KeyM") return toggleMute();
      if (e.code === "KeyR") return restart();
      gameRef.current?.key(e.key, e.code);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [leave, restart, toggleMute]);

  if (!mounted) return null;

  return createPortal(
    <div data-doom className="font-mono">
      <canvas
        ref={canvasRef}
        aria-label="DOOM mode: shoot the page"
        className="fixed inset-0 z-[46] h-full w-full"
        style={{ cursor: "crosshair", touchAction: "pan-y", pointerEvents: end ? "none" : "auto" }}
        onPointerMove={(e) => gameRef.current?.pointer(e.clientX, e.clientY)}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          gameRef.current?.pointer(e.clientX, e.clientY);
          gameRef.current?.setTrigger(true);
        }}
        onPointerUp={() => gameRef.current?.setTrigger(false)}
        onPointerCancel={() => gameRef.current?.setTrigger(false)}
        onPointerLeave={() => gameRef.current?.setTrigger(false)}
        onContextMenu={(e) => e.preventDefault()}
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
          Exit [Esc]
        </button>
      </div>

      {(loading || failed) && (
        <div className="fixed inset-0 z-[48] flex items-center justify-center bg-black/70 text-xs uppercase tracking-widest text-zinc-400">
          {failed ? "Could not load DOOM assets" : "Loading DOOM…"}
        </div>
      )}

      {end && !leaving && (
        <div className="fixed inset-0 z-[48] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-5 border border-dotted border-zinc-700 bg-black p-6 text-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">{end.type === "win" ? "PORTFOLIO CLEARED" : "YOU DIED"}</h2>
              <p className="text-xs text-zinc-400">
                {end.type === "win"
                  ? "Every monster on the page is down. Now let's talk for real:"
                  : "The page fought back. Press R to try again."}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3 text-left text-xs">
              {(
                [
                  ["KILLS", pct(end.stats.kills, end.stats.totalKills)],
                  ["ITEMS", pct(end.stats.items, end.stats.totalItems)],
                  ["SECRET", pct(end.stats.secrets, end.stats.totalSecrets)],
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
                <Btn
                  primary
                  onClick={() => {
                    void navigator.clipboard?.writeText(personalData.email);
                    setCopied(true);
                  }}
                >
                  {copied ? "EMAIL COPIED" : "COPY EMAIL"}
                </Btn>
                <Btn onClick={() => window.open(personalData.github, "_blank")}>GITHUB ↗</Btn>
                <Btn onClick={() => window.open(personalData.linkedin, "_blank")}>LINKEDIN ↗</Btn>
                <Btn onClick={() => window.open(personalData.resumePath, "_blank")}>RÉSUMÉ ↗</Btn>
              </div>
            )}
            <div className="flex justify-center gap-3">
              <Btn primary={end.type === "dead"} onClick={restart}>
                {end.type === "win" ? "PLAY AGAIN" : "RESTART [R]"}
              </Btn>
              <Btn onClick={leave}>EXIT</Btn>
            </div>
            <p className="text-[10px] text-zinc-600">Art and sounds from Freedoom (BSD licence).</p>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
