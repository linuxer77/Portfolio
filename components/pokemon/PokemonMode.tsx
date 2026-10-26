"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import TouchControls from "@/components/arcade/TouchControls";
import { BattleGame, type BattleStats } from "./game";
import { MEGA_MOVES, MEGA_NAME, MOVES, SLOT_KEY, SLOTS } from "./moves";
import { Sound } from "./sound";
import { loadMon, type Species } from "./sprites";

// ==========================================
// POKÉMON mode shell: loads the roster, lays the battle canvas over the live page, lets you
// pick your Pokémon (or a team of three) and your rival's, or two CPUs to watch, routes keyboard and touch input,
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
  {
    species: "rayquaza",
    label: "RAYQUAZA",
    types: "DRAGON · FLYING",
    blurb:
      "Lord of the sky. Its Air Lock cancels all weather, and Draco Meteor rains down from above. Ice is its bane.",
  },
  {
    species: "groudon",
    label: "GROUDON",
    types: "GROUND",
    blurb:
      "Brings harsh sunlight that powers up fire and dries up water. Huge and slow, with stone that erupts underfoot.",
  },
  {
    species: "kyogre",
    label: "KYOGRE",
    types: "WATER",
    blurb:
      "Summons rain that powers up water and douses fire. Origin Pulse cuts across the arena; Thunder never misses in rain.",
  },
];

/** Loaded with the arena; the legendaries load the first time they're picked. */
const STARTERS: Species[] = ["charizard", "blastoise", "gengar", "mewtwo"];

const KEYS: [string, string][] = [
  ["MOVE", "W A S D / arrows"],
  ["ATTACK", "J"],
  ["MOVES", "K  L  U  O"],
  ["BURST", "I, when the meter fills"],
  ["DODGE", "Space"],
  ["MEGA EVOLVE", "E, once your HP is below 40%"],
];

interface Match {
  /** each side's team, in the order they're sent out (one each for 1 v 1) */
  mine: Species[];
  rival: Species[];
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
  // sprites already loaded (or on their way), by species
  const loads = useRef(new Map<Species, Promise<void>>());
  const [fetching, setFetching] = useState(false);
  // your pick while you choose a rival, then the match (kept for rematches)
  // 1 v 1 or 3 v 3, then your picks and the rival's (kept as the match for rematches)
  const [size, setSize] = useState<1 | 3>(1);
  const [team, setTeam] = useState<Species[]>([]);
  const [rivalTeam, setRivalTeam] = useState<Species[]>([]);
  // your Pokémon out right now, and whether it has used its Mega Evolution
  const [cur, setCur] = useState<Species | null>(null);
  const [megaSpent, setMegaSpent] = useState(false);
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
    loads.current.clear();
    Promise.all(STARTERS.map((s) => Promise.all([loadMon(s), loadMon(s, `${s}-mega`)])))
      .then((forms) => {
        if (cancelled) return;
        const game = new BattleGame(canvas, {}, {}, sound, setEnd, shake);
        STARTERS.forEach((s, i) => {
          game.addMon(s, forms[i][0], forms[i][1]);
          loads.current.set(s, Promise.resolve());
        });
        gameRef.current = game;
        gameRef.current.setTouch(window.matchMedia("(pointer: coarse)").matches);
        gameRef.current.onMega = (id) => {
          if (id !== 0) return;
          setMegaOn(true);
          setMegaSpent(true);
        };
        gameRef.current.onSwitch = (id, species) => {
          if (id !== 0) return;
          setCur(species);
          setMegaOn(false);
          setMegaSpent(false);
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

  /** A Pokémon's sprites, fetched the first time it's needed. */
  const need = useCallback((s: Species) => {
    let p = loads.current.get(s);
    if (!p) {
      p = Promise.all([loadMon(s), loadMon(s, `${s}-mega`)]).then(([mon, mega]) =>
        gameRef.current?.addMon(s, mon, mega)
      );
      p.catch(() => loads.current.delete(s));
      loads.current.set(s, p);
    }
    return p;
  }, []);

  const play = useCallback(
    (m: Match) => {
      if (!gameRef.current || fetching) return;
      soundRef.current?.unlock();
      setFetching(true);
      Promise.all([...m.mine, ...m.rival].map(need))
        .then(() => {
          const game = gameRef.current;
          if (!game) return;
          setEnd(null);
          setTeam([]);
          setRivalTeam([]);
          setMatch(m);
          setCur(m.mine[0]);
          setMegaOn(false);
          setMegaSpent(false);
          game.start(m.mine, m.rival, m.watch);
        })
        .catch(() => setFailed(true))
        .finally(() => setFetching(false));
    },
    [need, fetching]
  );

  /** Once your side is picked, the rival's options: everyone you didn't take. */
  const full = team.length >= size;
  const rivals = useMemo(() => (full ? ROSTER.filter((r) => !team.includes(r.species)) : []), [full, team]);
  /** A card picked (picked again, it's dropped); -1 fills the rival's team at random. */
  const pickCard = useCallback(
    (i: number) => {
      if (!full) {
        const s = ROSTER[i]?.species;
        if (s) setTeam((t) => (t.includes(s) ? t.filter((x) => x !== s) : [...t, s]));
        return;
      }
      let next: Species[];
      if (i < 0) {
        const rest = rivals
          .map((r) => r.species)
          .filter((s) => !rivalTeam.includes(s))
          .sort(() => Math.random() - 0.5);
        next = [...rivalTeam, ...rest].slice(0, size);
      } else {
        const s = rivals[i]?.species;
        if (!s) return;
        if (rivalTeam.includes(s)) return setRivalTeam(rivalTeam.filter((x) => x !== s));
        next = [...rivalTeam, s];
      }
      if (next.length >= size) play({ mine: team, rival: next, watch });
      else setRivalTeam(next);
    },
    [full, rivals, rivalTeam, size, team, play, watch]
  );
  /** Back a step: the last pick undone. */
  const back = useCallback(() => {
    if (rivalTeam.length) setRivalTeam((r) => r.slice(0, -1));
    else setTeam((t) => t.slice(0, -1));
  }, [rivalTeam.length]);

  /** Back to the pick screen. */
  const pick = useCallback(() => {
    setEnd(null);
    setMatch(null);
    setTeam([]);
    setRivalTeam([]);
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
        } else {
          const list = full ? rivals : ROSTER;
          if (n >= 0 && n < list.length) pickCard(n);
          else if (full && n === list.length) pickCard(-1);
          else if (e.code === "Backspace") back();
          else if (!team.length && e.code === "KeyC") setWatch((w) => !w);
          else if (!team.length && e.code === "KeyT") setSize((z) => (z === 1 ? 3 : 1));
        }
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
  }, [leave, toggleMute, play, pick, pickCard, back, full, rivals, team.length, match, end]);

  if (!mounted) return null;

  const moves = match && !match.watch && cur ? (megaOn ? MEGA_MOVES : MOVES)[cur] : null;
  const teamNames = (t: Species[]) => t.map((s) => s.toUpperCase()).join(" · ");
  /** In the pick screen, where a card stands: its place in the team being picked, if any. */
  const placeOf = (s: Species) => (full ? rivalTeam : team).indexOf(s);

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
                ...(megaSpent
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
                      ? end.team.length > 1
                        ? `CPU ${end.won ? 1 : 2} WINS!`
                        : `${(end.won ? end.species : end.foe).toUpperCase()} WINS!`
                      : end.won
                        ? "YOU WIN!"
                        : "YOU LOST…"}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {end.team.length > 1
                      ? end.watch
                        ? `${teamNames(end.won ? end.team : end.foeTeam)} beat ${teamNames(end.won ? end.foeTeam : end.team)}.`
                        : end.won
                          ? `Your ${teamNames(end.team)} beat the rival's ${teamNames(end.foeTeam)}.`
                          : `The rival's ${teamNames(end.foeTeam)} was too strong this time.`
                      : end.watch
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
                      [
                        end.watch
                          ? `${end.team.length > 1 ? "CPU 1" : end.species.toUpperCase()} SUPERS`
                          : "SUPER EFFECTIVE",
                        String(end.supers),
                      ],
                      [
                        end.watch ? `${end.team.length > 1 ? "CPU 1" : end.species.toUpperCase()} HP` : "HP LEFT",
                        `${Math.round(end.hpLeft * 100)}%`,
                      ],
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
                    {full
                      ? `${watch ? "CHOOSE CPU 2" : size > 1 ? "CHOOSE THE RIVAL'S TEAM" : "CHOOSE YOUR RIVAL"}${
                          size > 1 ? ` ${rivalTeam.length}/${size}` : ""
                        }`
                      : team.length
                        ? `${watch ? "CPU 1'S TEAM" : "YOUR TEAM"} ${team.length}/${size}`
                        : "POKÉMON ARENA"}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {full
                      ? `${watch ? "CPU 1 sends out" : "You'll send out"} ${team
                          .map((s) => s.toUpperCase())
                          .join(", then ")}. Who does ${watch ? "CPU 2" : "the CPU"} send out?`
                      : team.length
                        ? "Pick three, in the order they'll go out. Pick one again to drop it."
                        : "A live battle on this page, seen from above. Every move lands on the page too. Exit and it all goes back."}
                  </p>
                </div>
                {!team.length && (
                  <div className="flex flex-wrap justify-center gap-2 text-[11px] uppercase tracking-wider">
                    {([1, 3] as const).map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setSize(z)}
                        className={`border border-dotted px-3 py-1.5 transition-colors ${
                          size === z
                            ? "border-white bg-white font-bold text-black"
                            : "border-zinc-700 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {z} v {z}
                      </button>
                    ))}
                    <span className="mr-4 self-center text-[10px] normal-case tracking-normal text-zinc-600">[T]</span>
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
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(full ? rivals : ROSTER).map((r, i) => (
                    <button
                      key={r.species}
                      type="button"
                      onClick={() => pickCard(i)}
                      className={`group relative flex flex-col gap-2 border p-3 text-left transition-colors focus:outline-none ${
                        placeOf(r.species) >= 0
                          ? "border-solid border-white bg-zinc-900"
                          : "border-dotted border-zinc-700 hover:border-zinc-300 focus:border-white"
                      }`}
                    >
                      {placeOf(r.species) >= 0 && (
                        <span className="absolute -right-2 -top-2 bg-white px-1.5 text-[10px] font-bold text-black">
                          #{placeOf(r.species) + 1}
                        </span>
                      )}
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
                {full ? (
                  <div className="flex justify-center gap-3">
                    <Btn onClick={() => pickCard(-1)}>RANDOM [{rivals.length + 1}]</Btn>
                    <Btn onClick={back}>BACK [⌫]</Btn>
                  </div>
                ) : team.length ? (
                  <div className="flex justify-center gap-3">
                    <Btn onClick={back}>BACK [⌫]</Btn>
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
                  {fetching ? "Calling the legendary… " : ""}
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
