"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import TouchControls, {
  type TouchButton,
} from "@/components/arcade/TouchControls";
import { loadFighters, Sfx, type FighterId } from "./assets";
import { KombatGame, type KombatStats, type Mode, type Special } from "./game";

// ==========================================
// MORTAL KOMBAT mode shell: loads Scorpion and Sub-Zero, lays the arena canvas over the live
// page, routes keyboard input for one or two players, shakes the page on big hits, shows the
// menus. Launched from the terminal with `mk3`.
// ==========================================

const formatTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const NAMES: Record<FighterId, string> = {
  scorpion: "SCORPION",
  subzero: "SUB-ZERO",
};

// one-tap specials on the touch controls
const TAPS: Record<FighterId, [string, Special][]> = {
  scorpion: [
    ["Spear", "spear"],
    ["Teleport", "teleport"],
  ],
  subzero: [
    ["Freeze", "freeze"],
    ["Ground ice", "groundFreeze"],
    ["Slide", "slide"],
  ],
};

const CONTROLS: [string, string, string][] = [
  ["MOVE", "W A S D", "← ↑ → ↓"],
  ["HIGH PUNCH", "R", "I"],
  ["LOW PUNCH", "F", "K"],
  ["HIGH KICK", "T", "O"],
  ["LOW KICK", "G", "L"],
  ["BLOCK", "H", ";"],
  ["RUN", "Y", "P"],
];

// arrows are relative to the way you face: → is toward the opponent
const MOVES: Record<FighterId | "both", [string, string][]> = {
  both: [
    ["Uppercut", "↓ + HP"],
    ["Sweep", "← + LK"],
    ["Roundhouse", "← + HK"],
    ["Throw", "close, → + LP"],
    ["Combos", "HP HP LP ↓+HP · HK B+HK"],
  ],
  scorpion: [
    ["Spear", "← ← LP"],
    ["Teleport Punch", "↓ ← HP (air too)"],
    ["Air Throw", "BLOCK, in the air near them"],
    ["Fatality", "↓ ↓ ↑ HK"],
  ],
  subzero: [
    ["Freeze", "↓ → LP"],
    ["Ground Freeze", "↓ ← LK"],
    ["Slide", "← + LP + LK"],
    ["Fatality", "↓ ↓ ↓ → HP"],
  ],
};

function Btn({
  children,
  onClick,
  primary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
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

function MoveList({ who }: { who: FighterId | "both" }) {
  return (
    <table className="w-full text-left">
      <thead className="text-zinc-500">
        <tr>
          <th className="pb-1 font-normal" colSpan={2}>
            {who === "both" ? "BOTH" : NAMES[who]}
          </th>
        </tr>
      </thead>
      <tbody>
        {MOVES[who].map(([label, keys]) => (
          <tr key={label} className="border-t border-dotted border-zinc-800">
            <td className="py-1 pr-2 text-zinc-500">{label}</td>
            <td className="py-1 text-white">{keys}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function KombatMode({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<KombatGame | null>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [p1, setP1] = useState<FighterId>("scorpion");
  const [end, setEnd] = useState<KombatStats | null>(null);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [canFinish, setCanFinish] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const orient = () => setPortrait(window.innerHeight > window.innerWidth);
    orient();
    window.addEventListener("resize", orient);
    return () => window.removeEventListener("resize", orient);
  }, []);

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
    Promise.all([loadFighters(), sfx.load()])
      .then(([art]) => {
        if (cancelled) return;
        gameRef.current = new KombatGame(canvas, art, sfx, setEnd, shake);
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

  useEffect(() => {
    if (!mode) return;
    const block = (e: Event) => {
      if (!(e.target as Element | null)?.closest?.("[data-menu]"))
        e.preventDefault();
    };
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    return () => {
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
    };
  }, [mode]);

  const play = useCallback(
    (m: Mode) => {
      if (!gameRef.current) return;
      sfxRef.current?.unlock();
      setEnd(null);
      setMode(m);
      gameRef.current.start(m, p1);
    },
    [p1],
  );

  const swap = useCallback(
    () => setP1((who) => (who === "scorpion" ? "subzero" : "scorpion")),
    [],
  );

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
        if (e.code === "Digit1" || e.code === "Numpad1") play("cpu");
        else if (e.code === "Digit2") play("versus");
        else if (e.code === "KeyC") swap();
        else if (e.code === "Enter" && mode) play(mode);
        return;
      }
      if (gameRef.current?.key(e.code, true) || e.code === "Space")
        e.preventDefault();
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
  }, [onClose, toggleMute, play, swap, mode, end]);

  // the touch FATALITY button only shows up during FINISH HIM
  useEffect(() => {
    if (!touch || !mode || end) return;
    const id = window.setInterval(
      () => setCanFinish(!!gameRef.current?.canFinish),
      150,
    );
    return () => window.clearInterval(id);
  }, [touch, mode, end]);

  if (!mounted) return null;

  const p2 = p1 === "scorpion" ? "subzero" : "scorpion";
  const winner = end?.winner == null ? null : end.winner === 0 ? p1 : p2;
  const winnerTag = end?.winner === 0 ? "1P" : mode === "cpu" ? "CPU" : "2P";
  const playing = !loading && !failed && mode && !end;
  const specials: TouchButton[] = TAPS[p1].map(([label, id]) => ({
    label,
    tone: "special",
    onTap: () => gameRef.current?.tapSpecial(id),
  }));
  if (canFinish)
    specials.unshift({
      label: "Fatality",
      tone: "finish",
      onTap: () => gameRef.current?.fatality(),
    });

  return createPortal(
    <div data-sf className="font-mono">
      <canvas
        ref={canvasRef}
        aria-label="Mortal Kombat mode: fight on the page"
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
          <div
            className="fixed inset-0 z-[46]"
            style={{ touchAction: "none" }}
          />
          <TouchControls
            pad={{ left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS" }}
            buttons={[
              { label: "HP", code: "KeyR" },
              { label: "HK", code: "KeyT" },
              { label: "Run", code: "KeyY" },
              { label: "LP", code: "KeyF" },
              { label: "LK", code: "KeyG" },
              { label: "Block", code: "KeyH" },
            ]}
            specials={specials}
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
          {failed ? "Could not load the kombatants" : "Loading…"}
        </div>
      )}

      {!loading && !failed && (!mode || end) && (
        <div
          data-menu
          className="fixed inset-0 z-[48] flex items-center justify-center overflow-y-auto bg-black/60 p-4"
        >
          <div className="m-auto w-full max-w-2xl space-y-5 border border-dotted border-zinc-700 bg-black p-6">
            {end ? (
              <>
                <div className="space-y-1 text-center">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {winner ? `${NAMES[winner]} WINS` : "DRAW"}
                    {winner && (
                      <span className="ml-2 text-sm text-zinc-500">
                        {winnerTag}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {end.fatality ? "FATALITY. " : ""}The page took{" "}
                    {end.letters} letters of damage. It all goes back when you
                    exit.
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
                    <div
                      key={label}
                      className="border-b border-dotted border-zinc-800 pb-1"
                    >
                      <div className="text-zinc-500">{label}</div>
                      <div className="font-bold text-white">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Btn primary onClick={() => play(mode!)}>
                    REMATCH [ENTER]
                  </Btn>
                  <Btn onClick={() => play(mode === "cpu" ? "versus" : "cpu")}>
                    {mode === "cpu" ? "2P VERSUS [2]" : "VS CPU [1]"}
                  </Btn>
                  <Btn onClick={swap}>1P: {NAMES[p1]} [C]</Btn>
                  <Btn onClick={onClose}>EXIT</Btn>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1 text-center">
                  <h2 className="text-2xl font-bold tracking-tight">
                    MORTAL KOMBAT
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Scorpion vs Sub-Zero, UMK3 rules, on this page. Blood stains
                    it, ice frosts it, fire burns it, and each round moves down
                    a section. Exit and it all goes back.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Btn primary onClick={() => play("cpu")}>
                    1P VS CPU [1]
                  </Btn>
                  <Btn primary onClick={() => play("versus")}>
                    2P VERSUS [2]
                  </Btn>
                  <Btn onClick={swap}>
                    1P: {NAMES[p1]} · 2P: {NAMES[p2]} [C]
                  </Btn>
                </div>
                {touch && (
                  <p className="text-center text-[11px] leading-relaxed text-zinc-300">
                    Thumb pad to move, jump and crouch. HP LP HK LK to attack,
                    hold Block to block, hold Run with → to run. Yellow buttons
                    are one-tap specials; a red FATALITY button appears during
                    FINISH HIM.
                  </p>
                )}
                <div
                  className={`grid gap-6 text-[11px] sm:grid-cols-2 ${touch ? "hidden" : ""}`}
                >
                  <table className="w-full text-left">
                    <thead className="text-zinc-500">
                      <tr>
                        <th className="pb-1 font-normal" />
                        <th className="pb-1 font-normal">1P</th>
                        <th className="pb-1 font-normal">2P</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CONTROLS.map(([label, a, b]) => (
                        <tr
                          key={label}
                          className="border-t border-dotted border-zinc-800"
                        >
                          <td className="py-1 text-zinc-500">{label}</td>
                          <td className="py-1 text-white">{a}</td>
                          <td className="py-1 text-white">{b}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <MoveList who="both" />
                  <MoveList who={p1} />
                  <MoveList who={p2} />
                </div>
                <p className="text-center text-[10px] text-zinc-600">
                  {touch
                    ? portrait
                      ? "Turn your phone sideways first. 2P needs two gamepads."
                      : "2P needs two gamepads; a Bluetooth keyboard works too."
                    : "Arrows are relative to where you face: → is toward your opponent. Tap motions, don't hold them. Fatalities work during FINISH HIM."}
                </p>
              </>
            )}
            <p className="text-center text-[10px] text-zinc-600">
              Ultimate Mortal Kombat 3 sprites and sounds © Midway / Warner
              Bros., via mortalkombatwarehouse.com.
            </p>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
