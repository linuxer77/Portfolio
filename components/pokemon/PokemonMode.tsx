"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import TouchControls from "@/components/arcade/TouchControls";
import { BattleGame, type BattleStats } from "./game";
import { MEGA_MOVES, MEGA_NAME, MOVES, SLOT_KEY, SLOTS } from "./moves";
import { Sound } from "./sound";
import { loadMon, type Species } from "./sprites";

// ==========================================
// POKÉMON mode shell: loads the roster, lays the battle canvas over the live page, lets you
// pick your Pokémon and your rival's (or two CPUs to watch), routes keyboard and touch input,
// shakes the page on big hits, and shows the result. Launched from the terminal with `pokemon`.
// ==========================================

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const ROSTER: { species: Species; label: string; types: string; blurb: string }[] = [
  {
    species: "charizard",
    label: "CHARIZARD",
    types: "FIRE · FLYING",
    blurb: "Fast, and Fly takes it out of reach. Water hits it twice as hard, so keep moving.",
  },
  {
    species: "blastoise",
    label: "BLASTOISE",
    types: "WATER",
    blurb: "Slow and heavy. Ice Beam freezes, Earthquake shakes the whole page, and water drowns Charizard.",
  },
  {
    species: "gengar",
    label: "GENGAR",
    types: "GHOST · POISON",
    blurb: "Tricky and quick. Sinks into the shadows, puts foes to sleep, and Rapid Spin passes right through it.",
  },
  {
    species: "mewtwo",
    label: "MEWTWO",
    types: "PSYCHIC",
    blurb: "Fast and frightening. Throws foes with its mind, teleports, and its Barrier sends attacks right back.",
  },
];

const KEYS: [string, string][] = [
  ["MOVE", "W A S D / arrows"],
  ["ATTACK", "J"],
  ["MOVES", "K  L  U  O"],
  ["BURST", "I, when the meter fills"],
  ["DODGE", "Space"],
  ["MEGA EVOLVE", "E, once your HP is below 40%"],
];

interface Match {
  mine: Species;
  rival: Species;
  /** CPU vs CPU */
  watch: boolean;
}

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

export default function PokemonMode({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<BattleGame | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // your pick while you choose a rival, then the match (kept for rematches)
  const [choice, setChoice] = useState<Species | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  // your Pokémon has Mega Evolved: the touch buttons show its Mega moves
  const [megaOn, setMegaOn] = useState(false);
  const [watch, setWatch] = useState(false);
  const [end, setEnd] = useState<BattleStats | null>(null);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  /** Shakes the page and the battle layer together so the damage stays lined up. */
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
    // every section is on show, so the whole page can be fought over
    const root = document.querySelector("[data-page-root]");
    const revealed = root?.hasAttribute("data-in");
    root?.setAttribute("data-in", "");
    const sound = new Sound();
    soundRef.current = sound;
    setMuted(sound.muted);
    Promise.all([
      loadMon("charizard"),
      loadMon("blastoise"),
      loadMon("gengar"),
      loadMon("charizard", "charizard-mega"),
      loadMon("gengar", "gengar-mega"),
      loadMon("blastoise", "blastoise-mega"),
      loadMon("mewtwo"),
      loadMon("mewtwo", "mewtwo-mega"),
    ])
      .then(([charizard, blastoise, gengar, megaCharizard, megaGengar, megaBlastoise, mewtwo, megaMewtwo]) => {
        if (cancelled) return;
        const megas = { charizard: megaCharizard, gengar: megaGengar, blastoise: megaBlastoise, mewtwo: megaMewtwo };
        gameRef.current = new BattleGame(canvas, { charizard, blastoise, gengar, mewtwo }, megas, sound, setEnd, shake);
        gameRef.current.setTouch(window.matchMedia("(pointer: coarse)").matches);
        gameRef.current.onMega = (id) => {
          if (id === 0) setMegaOn(true);
        };
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
      sound.destroy();
      if (!revealed) root?.removeAttribute("data-in");
    };
  }, [mounted, shake]);

  const battling = !!match && !end && !leaving;

  // the arena stays put during a battle: no wheel or touch scrolling (the menus still scroll)
  useEffect(() => {
    if (!battling) return;
    const block = (e: Event) => {
      if (!(e.target as Element | null)?.closest?.("[data-menu]")) e.preventDefault();
    };
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    return () => {
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
    };
  }, [battling]);

  const play = useCallback((m: Match) => {
    if (!gameRef.current) return;
    soundRef.current?.unlock();
    setEnd(null);
    setChoice(null);
    setMatch(m);
    setMegaOn(false);
    gameRef.current.start(m.mine, m.rival, m.watch);
  }, []);

  /** The rivals on offer once you've picked: everyone else, then a random one. */
  const rivals = choice ? ROSTER.filter((r) => r.species !== choice) : [];
  const chooseRival = useCallback(
    (i: number) => {
      if (!choice) return;
      const others = ROSTER.filter((r) => r.species !== choice);
      const r = others[i] ?? others[Math.floor(Math.random() * others.length)];
      play({ mine: choice, rival: r.species, watch });
    },
    [choice, play, watch]
  );

  /** Back to the pick screen. */
  const pick = useCallback(() => {
    setEnd(null);
    setMatch(null);
    setChoice(null);
  }, []);

  /** Leaving plays the rewind first: the page flies back together, then the mode closes. */
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
      if (e.code === "Escape") {
        e.preventDefault();
        return leave();
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "KeyM") return toggleMute();
      // the arena is the screen you're on: Space and the arrows never scroll it away
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      if (!match || end) {
        // menus: number keys pick, Enter for a rematch, Backspace goes back a step
        const n = Number(/^(?:Digit|Numpad)([1-9])$/.exec(e.code)?.[1]) - 1;
        if (end) {
          if (e.code === "Enter" && match) play(match);
          else if (e.code === "Backspace") pick();
        } else if (choice) {
          if (n >= 0 && n <= rivals.length) chooseRival(n);
          else if (e.code === "Backspace") setChoice(null);
        } else if (n >= 0 && ROSTER[n]) setChoice(ROSTER[n].species);
        else if (e.code === "KeyC") setWatch((w) => !w);
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
  }, [leave, toggleMute, play, pick, chooseRival, choice, rivals.length, match, end]);

  if (!mounted) return null;

  const moves = match && !match.watch ? (megaOn ? MEGA_MOVES : MOVES)[match.mine] : null;

  return createPortal(
    <div data-arcade className="font-mono">
      <canvas
        ref={canvasRef}
        aria-label="Pokémon mode: a battle on the page"
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
          onClick={leave}
          className="border border-dotted border-zinc-700 bg-black/90 px-2 py-1 text-zinc-400 hover:text-white transition-colors"
        >
          {leaving ? "Rebuilding…" : "Exit [Esc]"}
        </button>
      </div>

      {battling && (
        <>
          {/* swallows stray clicks and taps so they can't follow the page's links mid-battle */}
          <div className="fixed inset-0 z-[46]" style={{ touchAction: "none" }} />
          {touch && moves ? (
            <TouchControls
              pad={{ left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS" }}
              buttons={[
                { label: "Hit", code: "KeyJ" },
                { label: "Dodge", code: "Space" },
              ]}
              specials={[
                ...(["s1", "s2", "s3", "s4"] as const).map((slot) => ({
                  label: moves[slot].short,
                  tone: "special" as const,
                  onTap: () => gameRef.current?.press(slot),
                })),
                { label: moves.burst.short, tone: "finish", onTap: () => gameRef.current?.press("burst") },
                ...(megaOn
                  ? []
                  : [{ label: "MEGA", tone: "finish" as const, onTap: () => gameRef.current?.press("mega") }]),
              ]}
              onKey={(code, down) => gameRef.current?.key(code, down)}
            />
          ) : (
            <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[47] text-center text-[10px] uppercase tracking-widest text-zinc-500">
              {match?.watch
                ? "CPU vs CPU · sit back and watch · esc exit"
                : "WASD move · J attack · K L U O moves · I burst · E mega · space dodge · esc exit"}
            </div>
          )}
        </>
      )}

      {(loading || failed) && (
        <div className="fixed inset-0 z-[48] flex items-center justify-center bg-black/70 text-xs uppercase tracking-widest text-zinc-400">
          {failed ? "Could not load the Pokémon" : "Loading…"}
        </div>
      )}

      {!loading && !failed && !leaving && (!match || end) && (
        <div
          data-menu
          className="fixed inset-0 z-[48] flex items-center justify-center overflow-y-auto bg-black/60 p-4"
        >
          <div className="m-auto w-full max-w-6xl space-y-5 border border-dotted border-zinc-700 bg-black p-6">
            {end ? (
              <>
                <div className="space-y-1 text-center">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {end.watch
                      ? `${(end.won ? end.species : end.foe).toUpperCase()} WINS!`
                      : end.won
                        ? "YOU WIN!"
                        : "YOU LOST…"}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {end.watch
                      ? `${(end.won ? end.species : end.foe).toUpperCase()} beat ${(end.won ? end.foe : end.species).toUpperCase()}.`
                      : end.won
                        ? `${end.species.toUpperCase()} beat ${end.foe.toUpperCase()}.`
                        : `${end.foe.toUpperCase()} was too strong this time.`}{" "}
                    The page took {end.letters} letters of damage. It all goes back when you exit.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-left text-xs sm:grid-cols-4">
                  {(
                    [
                      ["TIME", formatTime(end.time)],
                      ["DAMAGE", `${end.dealt} – ${end.taken}`],
                      [end.watch ? `${end.species.toUpperCase()} SUPERS` : "SUPER EFFECTIVE", String(end.supers)],
                      [end.watch ? `${end.species.toUpperCase()} HP` : "HP LEFT", `${Math.round(end.hpLeft * 100)}%`],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="border-b border-dotted border-zinc-800 pb-1">
                      <div className="text-zinc-500">{label}</div>
                      <div className="font-bold text-white">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Btn primary onClick={() => match && play(match)}>
                    REMATCH [ENTER]
                  </Btn>
                  <Btn onClick={pick}>SWITCH POKÉMON</Btn>
                  <Btn onClick={leave}>EXIT</Btn>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1 text-center">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {choice ? (watch ? "CHOOSE CPU 2" : "CHOOSE YOUR RIVAL") : "POKÉMON ARENA"}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {choice
                      ? watch
                        ? `CPU 1 sends out ${choice.toUpperCase()}. Who does CPU 2 send out?`
                        : `You'll send out ${choice.toUpperCase()}. Who does the CPU send out?`
                      : "A live battle on this page, seen from above. Every move lands on the page too. Exit and it all goes back."}
                  </p>
                </div>
                {!choice && (
                  <div className="flex justify-center gap-2 text-[11px] uppercase tracking-wider">
                    {([false, true] as const).map((w) => (
                      <button
                        key={String(w)}
                        type="button"
                        onClick={() => setWatch(w)}
                        className={`border border-dotted px-3 py-1.5 transition-colors ${
                          watch === w
                            ? "border-white bg-white font-bold text-black"
                            : "border-zinc-700 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {w ? "CPU vs CPU" : "You vs CPU"}
                      </button>
                    ))}
                    <span className="self-center text-[10px] normal-case tracking-normal text-zinc-600">
                      [C] to switch
                    </span>
                  </div>
                )}
                <div className={`grid gap-3 sm:grid-cols-2 ${choice ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
                  {(choice ? rivals : ROSTER).map((r, i) => (
                    <button
                      key={r.species}
                      type="button"
                      onClick={() => (choice ? chooseRival(i) : setChoice(r.species))}
                      className="group flex flex-col gap-2 border border-dotted border-zinc-700 p-3 text-left transition-colors hover:border-zinc-300 focus:border-white focus:outline-none"
                    >
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/pokemon/${r.species}/portrait.png`}
                          alt=""
                          width={48}
                          height={48}
                          className="h-12 w-12 border border-zinc-800"
                          style={{ imageRendering: "pixelated" }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-bold tracking-wider text-white">{r.label}</div>
                          <div className="text-[10px] tracking-wider text-zinc-500">{r.types}</div>
                        </div>
                        <span className="text-[10px] text-zinc-600">[{i + 1}]</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-400">{r.blurb}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-zinc-300">
                        {SLOTS.map((slot) => (
                          <span key={slot} className={slot === "burst" ? "text-yellow-300" : ""}>
                            <span className="text-zinc-600">{SLOT_KEY[slot]}</span> {MOVES[r.species][slot].name}
                          </span>
                        ))}
                      </div>
                      <div className="border-t border-dotted border-zinc-800 pt-2 text-[10px]">
                        <div className="mb-0.5 font-bold tracking-wider text-fuchsia-300">
                          E → {MEGA_NAME[r.species]}
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-zinc-400">
                          {SLOTS.map((slot) => (
                            <span key={slot} className={slot === "burst" ? "text-fuchsia-300" : ""}>
                              {MEGA_MOVES[r.species][slot].name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {choice ? (
                  <div className="flex justify-center gap-3">
                    <Btn onClick={() => chooseRival(-1)}>RANDOM [{rivals.length + 1}]</Btn>
                    <Btn onClick={() => setChoice(null)}>BACK [⌫]</Btn>
                  </div>
                ) : touch ? (
                  <p className="text-center text-[11px] leading-relaxed text-zinc-300">
                    Thumb pad to move. Hit and Dodge on the right, your four moves above them; the red one is your
                    Burst, ready when its meter fills.
                  </p>
                ) : (
                  <table className="mx-auto text-left text-[11px]">
                    <tbody>
                      {KEYS.map(([label, keys]) => (
                        <tr key={label} className="border-t border-dotted border-zinc-800">
                          <td className="py-1 pr-6 text-zinc-500">{label}</td>
                          <td className="py-1 text-white">{keys}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="text-center text-[10px] text-zinc-600">
                  {watch ? "Pick both sides, then watch." : "You vs the CPU."} Types matter: water drowns Charizard,
                  Bite and Earthquake hurt Gengar, and Ground can&apos;t touch a flyer.
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
