"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { KIND_COLOUR, LifeGame, type LifeReport, type LifeStats } from "./game";
import { Sound } from "./sound";

// ==========================================
// GAME OF LIFE mode shell: reveals every section, lays the board canvas over the page, and
// explains what's going on: a prompt to click the page, a card with the rules and the colour
// key, the controls at the bottom, and a report card of what the page became on the way out.
// Launched from the terminal with `life`.
// ==========================================

const AGES: [string, string][] = [
  ["#67e8f9", "just born"],
  ["#c4b5fd", "a few generations old"],
  ["#fbbf24", "settled, not changing"],
  ["#2f4fbf", "just died"],
];

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

function Swatch({ colour }: { colour: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0" style={{ background: colour }} />;
}

export default function LifeMode({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<LifeGame | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const [mounted, setMounted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [stats, setStats] = useState<LifeStats | null>(null);
  const [report, setReport] = useState<LifeReport | null>(null);
  const [leaving, setLeaving] = useState(false);
  const wasPaused = useRef(false);

  useEffect(() => {
    setMounted(true);
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setTouch(coarse);
    // on a phone the card would cover the page: start it folded
    setRulesOpen(!coarse);
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

  const restore = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    setReport(null);
    const game = gameRef.current;
    if (!game) return onClose();
    game.exit(onClose);
  }, [leaving, onClose]);

  /** Esc: first the report card of what the page became, then (again) the page back. */
  const leave = useCallback(() => {
    const game = gameRef.current;
    if (report || !game || !stats?.awake) return restore();
    wasPaused.current = stats.paused;
    game.setPaused(true);
    setReport(game.report());
  }, [report, restore, stats]);

  const keepPlaying = useCallback(() => {
    setReport(null);
    gameRef.current?.setPaused(wasPaused.current);
  }, []);

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
      if (e.metaKey || e.ctrlKey || e.altKey || report) return;
      const game = gameRef.current;
      if (!game) return;
      if (e.code === "KeyM") toggleMute();
      else if (e.code === "Space") {
        e.preventDefault();
        game.togglePause();
      } else if (e.code === "KeyN") game.step();
      else if (e.code === "KeyG") game.gliders();
      else if (e.code === "KeyR") game.soup();
      else if (e.code === "KeyH") setRulesOpen((o) => !o);
      else if (e.code === "BracketRight" || e.code === "Equal") game.faster(1);
      else if (e.code === "BracketLeft" || e.code === "Minus") game.faster(-1);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [leave, toggleMute, report]);

  if (!mounted) return null;

  const game = () => gameRef.current;
  const awake = !!stats?.awake;

  return createPortal(
    <div data-arcade className="font-mono">
      <canvas
        ref={canvasRef}
        aria-label="Game of Life mode: the page comes alive"
        className="pointer-events-none fixed inset-0 z-[46] h-full w-full"
      />
      {/* click to wake the page, drag to draw cells; it also keeps clicks off the page's links */}
      <div
        className="fixed inset-0 z-[46]"
        style={{ cursor: "crosshair", touchAction: touch ? "none" : "auto" }}
        onPointerDown={(e) => {
          soundRef.current?.unlock();
          e.currentTarget.setPointerCapture(e.pointerId);
          game()?.down(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => game()?.move(e.clientX, e.clientY)}
        onPointerUp={(e) => game()?.up(e.clientX, e.clientY)}
        onPointerCancel={(e) => game()?.up(e.clientX, e.clientY)}
      />

      {!awake && stats && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 z-[47] -translate-y-1/2 px-6 text-center">
          <div className="inline-block border border-dotted border-cyan-300/60 bg-black/85 px-5 py-4">
            <div className="text-sm font-bold uppercase tracking-widest text-cyan-300">
              {touch ? "Tap" : "Click"} anything to bring it to life
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              Every letter on this page is now a cell in Conway&apos;s Game of Life. Wake some up and watch what they
              turn into.
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-[92px] left-3 z-[47] max-w-[300px] text-[11px]">
        {rulesOpen ? (
          <div className="space-y-2 border border-dotted border-zinc-700 bg-black/90 p-3 text-zinc-300">
            <div className="flex items-center justify-between gap-4">
              <span className="font-bold uppercase tracking-wider text-white">Conway&apos;s Game of Life</span>
              <button type="button" onClick={() => setRulesOpen(false)} className="text-zinc-500 hover:text-white">
                hide{touch ? "" : " [H]"}
              </button>
            </div>
            <p className="text-zinc-400">Each pixel is a cell. Every generation, each one looks at its 8 neighbours:</p>
            <ul className="space-y-0.5">
              <li>
                <span className="text-white">2 or 3</span> neighbours: it survives
              </li>
              <li>
                <span className="text-white">fewer or more</span>: it dies, of loneliness or crowding
              </li>
              <li>
                an empty spot with <span className="text-white">exactly 3</span>: a cell is born
              </li>
            </ul>
            <div className="space-y-1 border-t border-dotted border-zinc-800 pt-2">
              {AGES.map(([colour, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <Swatch colour={colour} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-dotted border-zinc-800 pt-2 text-zinc-400">
              <div>Labels name the creatures it spots:</div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                <span style={{ color: KIND_COLOUR.ship }}>gliders travel</span>
                <span style={{ color: KIND_COLOUR.oscillator }}>blinkers pulse</span>
                <span style={{ color: KIND_COLOUR.still }}>blocks sit still</span>
              </div>
            </div>
            {stats && awake && (
              <div className="border-t border-dotted border-zinc-800 pt-2 text-cyan-300">
                Generation {stats.generation.toLocaleString()} · {stats.population.toLocaleString()} alive ·{" "}
                {stats.speed}/s{stats.paused ? " · paused" : ""}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="border border-dotted border-zinc-700 bg-black/90 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-400 hover:text-white"
          >
            How it works{touch ? "" : " [H]"}
            {stats && awake ? ` · gen ${stats.generation.toLocaleString()}` : ""}
          </button>
        )}
      </div>

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
          {touch ? "Tap to wake · drag to draw cells" : "Click to wake the page · drag to draw cells · scroll for more"}
        </span>
      </div>

      {report && (
        <div
          data-menu
          className="fixed inset-0 z-[48] flex items-center justify-center overflow-y-auto bg-black/70 p-4"
        >
          <div className="m-auto w-full max-w-md space-y-4 border border-dotted border-zinc-700 bg-black p-6 text-center">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">What your page became</h2>
              <p className="text-xs text-zinc-400">
                {report.cells.toLocaleString()} cells woke up and lived through {report.generation.toLocaleString()}{" "}
                generations.
              </p>
            </div>
            {report.creatures.length ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-left text-xs">
                {report.creatures.slice(0, 10).map((c) => (
                  <div key={c.name} className="flex justify-between border-b border-dotted border-zinc-800 pb-1">
                    <span style={{ color: KIND_COLOUR[c.kind] }}>
                      {c.name === "LOAF" ? "loaves" : `${c.name.toLowerCase()}s`}
                    </span>
                    <span className="font-bold text-white">{c.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No known creatures yet. Give it a few more generations.</p>
            )}
            <p className="text-[10px] text-zinc-600">Counts are the most of each seen on screen at once.</p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={restore}
                className="bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200 transition-colors"
              >
                RESTORE THE PAGE [ESC]
              </button>
              <button
                type="button"
                onClick={keepPlaying}
                className="border border-dotted border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-300 hover:border-zinc-400 hover:text-white transition-colors"
              >
                KEEP PLAYING
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
