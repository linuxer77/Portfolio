"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import TouchControls from "@/components/arcade/TouchControls";
import { loadAtlases, Sfx } from "./assets";
import { FightGame, type FightStats, type Mode } from "./game";

// ==========================================
// STREET FIGHTER mode shell: loads Ryu, lays the fight canvas over the live page, routes
// keyboard input for one or two players, shakes the page on big hits, shows the menus.
// Launched from the terminal with `fight`.
// ==========================================

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const CONTROLS: [string, string, string][] = [
  ["MOVE", "W A S D", "← ↑ → ↓"],
  ["PUNCH", "F", "K"],
  ["KICK", "G", "L"],
  ["HADOUKEN", "E", "O"],
];

const SPECIALS: [string, string][] = [
  ["HADOUKEN", "↓ ↘ → + P"],
  ["SHORYUKEN", "→ ↓ ↘ + P"],
  ["TATSUMAKI", "↓ ↙ ← + K"],
  ["BLOCK", "hold back"],
];

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

export default function StreetFighterMode({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<FightGame | null>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [end, setEnd] = useState<FightStats | null>(null);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const orient = () => setPortrait(window.innerHeight > window.innerWidth);
    orient();
    window.addEventListener("resize", orient);
    return () => window.removeEventListener("resize", orient);
  }, []);

  /** Shakes the page and the fight layer together so the damage stays lined up. */
  const shake = useCallback((strength: number) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frames = [0, 1, -1, 0.6, -0.4, 0].map((f) => ({
      transform: `translate(${f * strength}px, ${-f * strength * 0.6}px)`,
    }));
    const opts = { duration: 240, easing: "ease-out" };
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
    Promise.all([loadAtlases(), sfx.load()])
      .then(([atlases]) => {
        if (cancelled) return;
        gameRef.current = new FightGame(canvas, atlases, sfx, setEnd, shake);
        setLoading(false);
      })
      .catch(() => setFailed(true));

    const onResize = () => gameRef.current?.resize();
    const onBlur = () => gameRef.current?.releaseAll();
    window.addEventListener("resize", onResize);
    window.addEventListener("blur", onBlur);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("blur", onBlur);
      gameRef.current?.stop();
      gameRef.current = null;
      sfx.destroy();
    };
  }, [mounted, shake]);

  // the stage stays put during a fight: no wheel or touch scrolling (the menus still scroll)
  useEffect(() => {
    if (!mode) return;
    const block = (e: Event) => {
      if (!(e.target as Element | null)?.closest?.("[data-menu]")) e.preventDefault();
    };
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    return () => {
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
    };
  }, [mode]);

  const play = useCallback((m: Mode) => {
    if (!gameRef.current) return;
    sfxRef.current?.unlock();
    setEnd(null);
    setMode(m);
    gameRef.current.start(m);
  }, []);

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
        return onClose();
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "KeyM") return toggleMute();
      if (!mode || end) {
        // menus: 1 / 2 pick a mode, Enter replays the last one
        if (e.code === "Digit1" || e.code === "Numpad1") play("cpu");
        else if (e.code === "Digit2") play("versus");
        else if (e.code === "Enter" && mode) play(mode);
        return;
      }
      if (gameRef.current?.key(e.code, true) || e.code === "Space") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (gameRef.current?.key(e.code, false)) e.preventDefault();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onClose, toggleMute, play, mode, end]);

  if (!mounted) return null;

  const playing = !loading && !failed && mode && !end;
  const winnerLabel =
    end?.winner == null ? "DRAW GAME" : end.winner === 0 ? "1P WINS" : mode === "cpu" ? "CPU WINS" : "2P WINS";

  return createPortal(
    <div data-sf className="font-mono">
      <canvas
        ref={canvasRef}
        aria-label="Street Fighter mode: fight on the page"
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

      {touch && playing && (
        <>
          {/* swallows stray taps so they can't follow the page's links mid-fight */}
          <div className="fixed inset-0 z-[46]" style={{ touchAction: "none" }} />
          <TouchControls
            pad={{ left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS" }}
            buttons={[
              { label: "P", code: "KeyF" },
              { label: "K", code: "KeyG" },
            ]}
            specials={[
              {
                label: "Hadouken",
                tone: "special",
                onTap: () => gameRef.current?.tapSpecial("hadouken"),
              },
              {
                label: "Shoryuken",
                tone: "special",
                onTap: () => gameRef.current?.tapSpecial("shoryuken"),
              },
              {
                label: "Tatsumaki",
                tone: "special",
                onTap: () => gameRef.current?.tapSpecial("tatsu"),
              },
            ]}
            onKey={(code, down) => gameRef.current?.key(code, down)}
          />
          {portrait && (
            <div className="pointer-events-none fixed inset-x-0 top-[104px] z-[47] text-center text-[10px] uppercase tracking-widest text-zinc-400">
              Turn your phone sideways for a bigger arena
            </div>
          )}
        </>
      )}

      {(loading || failed) && (
        <div className="fixed inset-0 z-[48] flex items-center justify-center bg-black/70 text-xs uppercase tracking-widest text-zinc-400">
          {failed ? "Could not load the fighters" : "Loading…"}
        </div>
      )}

      {!loading && !failed && (!mode || end) && (
        <div
          data-menu
          className="fixed inset-0 z-[48] flex items-center justify-center overflow-y-auto bg-black/60 p-4"
        >
          <div className="m-auto w-full max-w-lg space-y-5 border border-dotted border-zinc-700 bg-black p-6">
            {end ? (
              <>
                <div className="space-y-1 text-center">
                  <h2 className="text-2xl font-bold tracking-tight">{winnerLabel}</h2>
                  <p className="text-xs text-zinc-400">
                    The page took {end.letters} letters of damage. It all goes back when you exit.
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-3 text-left text-xs">
                  {(
                    [
                      ["ROUNDS", `${end.rounds[0]} – ${end.rounds[1]}`],
                      ["HITS", `${end.hits[0]} – ${end.hits[1]}`],
                      ["COMBO", `${end.maxCombo[0]} – ${end.maxCombo[1]}`],
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
                  <Btn primary onClick={() => play(mode!)}>
                    REMATCH [ENTER]
                  </Btn>
                  <Btn onClick={() => play(mode === "cpu" ? "versus" : "cpu")}>
                    {mode === "cpu" ? "2P VERSUS [2]" : "VS CPU [1]"}
                  </Btn>
                  <Btn onClick={onClose}>EXIT</Btn>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1 text-center">
                  <h2 className="text-2xl font-bold tracking-tight">STREET FIGHTER</h2>
                  <p className="text-xs text-zinc-400">
                    This page is the stage. Every hit lands on it too, and each round moves down a section. Exit and it
                    all goes back.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <Btn primary onClick={() => play("cpu")}>
                    1P VS CPU [1]
                  </Btn>
                  <Btn primary onClick={() => play("versus")}>
                    2P VERSUS [2]
                  </Btn>
                </div>
                {touch ? (
                  <p className="text-center text-[11px] leading-relaxed text-zinc-300">
                    Thumb pad to move, jump and crouch. P and K to attack. The yellow buttons are one-tap specials. Hold
                    away from your opponent to block.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-6 text-[11px]">
                    <table className="w-full text-left">
                      <thead className="text-zinc-500">
                        <tr>
                          <th className="pb-1 font-normal" />
                          <th className="pb-1 font-normal">1P</th>
                          <th className="pb-1 font-normal">2P</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CONTROLS.map(([label, p1, p2]) => (
                          <tr key={label} className="border-t border-dotted border-zinc-800">
                            <td className="py-1 text-zinc-500">{label}</td>
                            <td className="py-1 text-white">{p1}</td>
                            <td className="py-1 text-white">{p2}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <table className="w-full text-left">
                      <thead className="text-zinc-500">
                        <tr>
                          <th className="pb-1 font-normal">SPECIALS</th>
                          <th className="pb-1 font-normal" />
                        </tr>
                      </thead>
                      <tbody>
                        {SPECIALS.map(([label, keys]) => (
                          <tr key={label} className="border-t border-dotted border-zinc-800">
                            <td className="py-1 text-zinc-500">{label}</td>
                            <td className="py-1 text-white">{keys}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-center text-[10px] text-zinc-600">
                  {touch
                    ? portrait
                      ? "Turn your phone sideways first. 2P needs two gamepads."
                      : "2P needs two gamepads; a Bluetooth keyboard works too."
                    : "Gamepads work too. Against the CPU, either side of the keyboard plays 1P."}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
