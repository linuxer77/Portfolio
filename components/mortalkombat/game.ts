import { drawFrame, type Atlas, type FighterId, type Fighters, type Sfx, type Sound } from "./assets";
import { PageWreck } from "../streetfighter/wreck";
import { docBox } from "../doom/page";

// ==========================================
// MORTAL KOMBAT mode: Scorpion vs Classic Sub-Zero (UMK3) on top of the portfolio. The
// viewport is the arena, each round moves down a section, and the page takes everything:
// hits knock letters off, blood stains it, ice frosts it, fire burns it, the spear drags
// words off it, and the lights go out for a Fatality. Arcade rules: a block button, high
// attacks whiff on crouchers, tapped motion specials, dial-a-combos paid for with run meter.
// Simulation runs at 60 ticks per second; sizes are in sprite pixels ("art px").
// ==========================================

const TICK = 1 / 60;
const GRAVITY = 0.6;
const JUMP_V = 13;
const JUMP_VX = 3.4;
const AIR_TICKS = (2 * JUMP_V) / GRAVITY;
const WALK_F = 2.2;
const WALK_B = 1.8;
const RUN = 4.6;
const PUSH_W = 22;
const WALL = 26;
const FLOOR_GAP = 26;
const MAX_HP = 100;
const MAX_METER = 100;
const CHAIN_COST = 8;
const ROUND_TIME = 99;
const ROUNDS_TO_WIN = 2;
const THROW_RANGE = 54;
const FINISH_TIME = 480;
const SPECIAL_WINDOW = 34; // ticks a special's taps may span
const FATALITY_WINDOW = 110;
const SECTIONS = ["intro", "experience", "projects", "stack", "contact"];
const NAMES: Record<FighterId, string> = { scorpion: "SCORPION", subzero: "SUB-ZERO" };

export type Mode = "cpu" | "versus";

export interface KombatStats {
  winner: 0 | 1 | null;
  rounds: [number, number];
  hits: [number, number];
  maxCombo: [number, number];
  letters: number;
  fatality: boolean;
  time: number;
}

type Rect = [number, number, number, number];
type Level = "high" | "mid" | "low" | "overhead";
type Btn = "hp" | "lp" | "hk" | "lk" | "block" | "run";
type Token = "F" | "B" | "U" | "D" | "HP" | "LP" | "HK" | "LK" | "BL" | "RN";

interface Strike {
  damage: number;
  chip: number;
  stun: number;
  block: number;
  push: number;
  level: Level;
  knockdown?: boolean;
  launch?: boolean;
  heavy?: boolean;
  wreck: number;
  sound: Sound;
}

type MoveId =
  | "hp" | "hp2" | "lp" | "lp2" | "lk" | "hk" | "roundhouse" | "sweep" | "uppercut"
  | "crouchPunch" | "lowKick" | "crouchHighKick" | "jumpPunch" | "jumpKick" | "flipKick" | "throw"
  | "spear" | "teleport" | "airThrow" | "freeze" | "groundFreeze" | "slide";

interface MoveDef {
  anim: string;
  /** [animation frame, ticks]; Infinity holds the frame until something else ends the move */
  seq: [number, number][];
  active?: [number, number];
  box?: Rect;
  strike?: Strike;
  air?: boolean;
  crouching?: boolean;
  /** dial-a-combo: the next button (optionally with D+ or B+) chains into this move */
  chain?: Partial<Record<string, MoveId>>;
}

const punch = (damage: number, level: Level, box: Rect, extra: Partial<Strike> = {}): Strike => ({
  damage, chip: 0, stun: 15, block: 10, push: 3.4, level, wreck: 34, sound: "punch", ...extra,
});
const kick = (damage: number, level: Level, extra: Partial<Strike> = {}): Strike => ({
  damage, chip: 0, stun: 17, block: 12, push: 4, level, wreck: 44, sound: "kick", ...extra,
});

const MOVES: Record<MoveId, MoveDef> = {
  hp: {
    anim: "hp",
    seq: [[0, 3], [1, 3], [2, 7], [1, 3], [0, 3]],
    active: [6, 13],
    box: [24, 72, 108, 140],
    strike: punch(7, "high", [24, 72, 108, 140]),
    chain: { hp: "hp2", lp: "lp2", "D+hp": "uppercut", hk: "hk" },
  },
  hp2: {
    anim: "hp2",
    seq: [[0, 2], [1, 3], [2, 7], [1, 3], [0, 3]],
    active: [5, 12],
    box: [24, 74, 108, 140],
    strike: punch(7, "high", [24, 74, 108, 140]),
    chain: { lp: "lp", "D+hp": "uppercut", hk: "hk", hp: "uppercut" },
  },
  lp: {
    anim: "lp",
    seq: [[0, 3], [1, 3], [2, 7], [1, 3], [0, 3]],
    active: [6, 13],
    box: [24, 80, 84, 108],
    strike: punch(5, "mid", [24, 80, 84, 108], { stun: 14 }),
    chain: { lp: "lp2", hp: "hp2", "D+hp": "uppercut" },
  },
  lp2: {
    anim: "lp2",
    seq: [[0, 2], [1, 3], [2, 7], [1, 3], [0, 3]],
    active: [5, 12],
    box: [24, 80, 84, 108],
    strike: punch(5, "mid", [24, 80, 84, 108], { stun: 14 }),
    chain: { hp: "hp", "D+hp": "uppercut", hk: "hk" },
  },
  lk: {
    anim: "lk",
    seq: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 8], [4, 3], [2, 3]],
    active: [10, 18],
    box: [24, 84, 74, 102],
    strike: kick(7, "mid"),
    chain: { hk: "hk", lk: "lk" },
  },
  hk: {
    anim: "hk",
    seq: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 3], [5, 8], [4, 3], [2, 3]],
    active: [11, 19],
    box: [18, 68, 106, 140],
    strike: kick(9, "high", { heavy: true }),
    chain: { "B+hk": "roundhouse", hk: "roundhouse" },
  },
  roundhouse: {
    anim: "roundhouse",
    seq: [[0, 2], [1, 2], [2, 2], [3, 3], [4, 9], [5, 3], [6, 3], [7, 3]],
    active: [9, 18],
    box: [14, 68, 102, 142],
    strike: kick(12, "high", { knockdown: true, heavy: true, wreck: 60, sound: "heavy" }),
  },
  sweep: {
    anim: "sweep",
    seq: [[0, 2], [1, 2], [2, 3], [3, 3], [4, 10], [5, 4], [6, 4], [7, 5]],
    active: [10, 20],
    box: [16, 62, 0, 18],
    crouching: true,
    strike: kick(9, "low", { knockdown: true, heavy: true, stun: 0, wreck: 52 }),
  },
  uppercut: {
    anim: "uppercut",
    seq: [[0, 3], [1, 3], [2, 2], [3, 2], [4, 14], [3, 4], [2, 4], [1, 3]],
    active: [8, 18],
    box: [-2, 36, 60, 158],
    strike: { damage: 16, chip: 0, stun: 0, block: 16, push: 3, level: "mid", launch: true, heavy: true, wreck: 80, sound: "uppercut" },
  },
  crouchPunch: {
    anim: "crouchPunch",
    seq: [[0, 2], [1, 3], [2, 7], [1, 3]],
    active: [5, 12],
    box: [24, 76, 66, 92],
    crouching: true,
    strike: punch(4, "mid", [24, 76, 66, 92], { stun: 12 }),
  },
  lowKick: {
    anim: "crouchKick",
    seq: [[0, 2], [1, 2], [2, 7], [1, 3]],
    active: [4, 11],
    box: [24, 84, 0, 24],
    crouching: true,
    strike: kick(5, "low", { stun: 13 }),
  },
  crouchHighKick: {
    anim: "crouchKick",
    seq: [[3, 2], [4, 2], [5, 2], [6, 8], [5, 3]],
    active: [6, 14],
    box: [24, 80, 60, 90],
    crouching: true,
    strike: kick(7, "mid"),
  },
  jumpPunch: {
    anim: "jumpPunch",
    seq: [[0, 3], [1, 3], [2, Infinity]],
    active: [6, Infinity],
    box: [16, 66, 20, 48],
    air: true,
    strike: punch(8, "overhead", [16, 66, 20, 48], { stun: 17 }),
  },
  jumpKick: {
    anim: "jumpKick",
    seq: [[0, 3], [1, 3], [2, Infinity]],
    active: [6, Infinity],
    box: [10, 56, 82, 120],
    air: true,
    strike: kick(10, "overhead", { heavy: true }),
  },
  flipKick: {
    anim: "flipKick",
    seq: [[0, 3], [1, 3], [2, Infinity]],
    active: [6, Infinity],
    box: [10, 62, 0, 28],
    air: true,
    strike: kick(10, "overhead", { heavy: true }),
  },
  throw: {
    anim: "throw",
    seq: [[0, 4], [1, 4], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 6]],
  },
  spear: {
    anim: "spear",
    seq: [[0, 3], [1, 3], [2, 3], [3, Infinity]],
  },
  teleport: {
    anim: "teleport",
    seq: [[0, Infinity]],
    box: [24, 78, 8, 50],
    strike: punch(10, "mid", [24, 78, 8, 50], { knockdown: true, heavy: true, wreck: 50, sound: "heavy" }),
  },
  airThrow: {
    anim: "throw",
    seq: [[1, Infinity]],
  },
  freeze: {
    anim: "freeze",
    seq: [[0, 4], [1, 4], [2, 26]],
  },
  groundFreeze: {
    anim: "groundFreeze",
    seq: [[0, 4], [1, 4], [2, 24]],
  },
  slide: {
    anim: "slide",
    seq: [[0, 4], [1, 26]],
    active: [4, 28],
    box: [10, 50, 0, 30],
    crouching: true,
    strike: kick(11, "mid", { knockdown: true, heavy: true, stun: 0, wreck: 46, sound: "heavy" }),
  },
};

const THROW: Strike = { damage: 12, chip: 0, stun: 0, block: 0, push: 0, level: "mid", knockdown: true, heavy: true, wreck: 70, sound: "heavy" };

const STAND: Rect = [-24, 26, 0, 128];
const CROUCH: Rect = [-26, 32, 0, 74];
const AIRBORNE: Rect = [-24, 26, 10, 118];

type State =
  | "idle" | "walk" | "run" | "crouch" | "block" | "jumpsquat" | "air" | "land" | "attack"
  | "hit" | "fall" | "down" | "getup" | "frozen" | "stagger" | "thrown" | "dizzy" | "dead"
  | "win" | "fatality" | "victim" | "gone";

interface Held {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  hp: boolean;
  lp: boolean;
  hk: boolean;
  lk: boolean;
  block: boolean;
  run: boolean;
}

const NONE: Held = { left: false, right: false, up: false, down: false, hp: false, lp: false, hk: false, lk: false, block: false, run: false };
const BUTTONS: Btn[] = ["hp", "lp", "hk", "lk", "block", "run"];
const BTN_TOKEN: Record<Btn, Token> = { hp: "HP", lp: "LP", hk: "HK", lk: "LK", block: "BL", run: "RN" };

interface Spear {
  x: number;
  alt: number;
  phase: "out" | "back" | "pull";
  t: number;
}

interface Fighter {
  id: 0 | 1;
  who: FighterId;
  x: number;
  alt: number;
  vx: number;
  vy: number;
  face: 1 | -1;
  air: boolean;
  flip: boolean;
  hp: number;
  shownHp: number;
  meter: number;
  state: State;
  t: number;
  move: MoveId | null;
  moveHit: boolean;
  stun: number;
  stunKind: "high" | "low" | "crouch";
  crouching: boolean;
  pushV: number;
  invuln: number;
  airAttacked: boolean;
  landFor: number;
  ko: boolean;
  wallSplat: boolean;
  wins: number;
  combo: number;
  comboShow: number;
  frozenAs: string;
  alpha: number;
  spear: Spear | null;
  keys: Held;
  pad: Held;
  buf: Record<Btn, number>;
  forced: MoveId | null;
  tokens: { k: Token; t: number }[];
}

interface Iceball {
  owner: 0 | 1;
  x: number;
  alt: number;
  dir: 1 | -1;
  t: number;
  dead: boolean;
}

interface GroundIce {
  owner: 0 | 1;
  x: number;
  dir: 1 | -1;
  t: number;
  used: boolean;
}

interface Spark {
  x: number;
  alt: number;
  t: number;
  kind: "hit" | "block" | "ice" | "explode";
}

/** Blood, in document px: it flies, then stays on the page as a stain. */
interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  stick: number;
}

interface Fatality {
  by: Fighter;
  victim: Fighter;
  t: number;
  fire: { x: number; alt: number; hit: boolean } | null;
}

interface Brain {
  wait: number;
  hold: Partial<Held>;
  holdT: number;
  seen: WeakSet<Iceball>;
}

const KEYS: Record<string, [0 | 1, keyof Held]> = {
  KeyA: [0, "left"], KeyD: [0, "right"], KeyW: [0, "up"], KeyS: [0, "down"],
  KeyR: [0, "hp"], KeyF: [0, "lp"], KeyT: [0, "hk"], KeyG: [0, "lk"], KeyH: [0, "block"], KeyY: [0, "run"],
  ArrowLeft: [1, "left"], ArrowRight: [1, "right"], ArrowUp: [1, "up"], ArrowDown: [1, "down"],
  KeyI: [1, "hp"], KeyK: [1, "lp"], KeyO: [1, "hk"], KeyL: [1, "lk"], Semicolon: [1, "block"], KeyP: [1, "run"],
  Numpad7: [1, "hp"], Numpad4: [1, "lp"], Numpad8: [1, "hk"], Numpad5: [1, "lk"], Numpad6: [1, "block"], Numpad9: [1, "run"],
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const chance = (p: number) => Math.random() < p;
const overlap = (a: Rect, b: Rect) => a[0] < b[1] && a[1] > b[0] && a[2] < b[3] && a[3] > b[2];

function frameAt(seq: [number, number][], t: number) {
  for (const [frame, ticks] of seq) {
    if (t < ticks) return frame;
    t -= ticks;
  }
  return seq[seq.length - 1][0];
}

const seqLength = (seq: [number, number][]) => seq.reduce((n, [, ticks]) => n + ticks, 0);

/** True when the most recent taps end with `code` and all fit inside `window` ticks. */
function tapped(tokens: { k: Token; t: number }[], code: Token[], now: number, window: number) {
  // block and run taps in between don't break a motion, unless the code asks for them
  const list = tokens.filter((e) => now - e.t <= window && (code.includes(e.k) || (e.k !== "BL" && e.k !== "RN")));
  if (list.length < code.length) return false;
  return code.every((k, i) => list[list.length - code.length + i].k === k);
}

export class KombatGame {
  private ctx: CanvasRenderingContext2D;
  private wreck: PageWreck;
  private k = 2;
  private arenaW = 500;
  private floorY = 0;
  private headerBottom = 0;
  private font = "monospace";

  private mode: Mode = "cpu";
  private fighters: [Fighter, Fighter];
  private iceballs: Iceball[] = [];
  private groundIce: GroundIce[] = [];
  private sparks: Spark[] = [];
  private drops: Drop[] = [];
  private stains: { x: number; y: number; r: number }[] = [];
  private brain: Brain = { wait: 30, hold: {}, holdT: 0, seen: new WeakSet() };
  private phase: "intro" | "fight" | "finish" | "fatality" | "ko" | "over" = "intro";
  private phaseT = 0;
  private round = 1;
  private clock = ROUND_TIME;
  private tick = 0;
  private freeze = 0;
  private slow = 1;
  private flash = 0;
  private dark = 0;
  private banner: { text: string; sub?: string } | null = null;
  private nextBanner: { banner: { text: string; sub?: string }; at: number } | null = null;
  private fatalityBanner = -1;
  private fatal: Fatality | null = null;
  private toasty = -1;
  private voices: { name: Sound; at: number }[] = [];
  private stats = { hits: [0, 0] as [number, number], maxCombo: [0, 0] as [number, number], time: 0, fatality: false };
  private padPrev: [Held, Held] = [{ ...NONE }, { ...NONE }];

  private running = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private over = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private art: Fighters,
    private sfx: Sfx,
    private onEnd: (s: KombatStats) => void,
    private onShake: (strength: number) => void
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.wreck = new PageWreck((s) => this.onShake(s));
    this.fighters = [this.newFighter(0, "scorpion"), this.newFighter(1, "subzero")];
    const root = document.querySelector("[data-page-root]") ?? document.body;
    this.font = getComputedStyle(root).fontFamily || "monospace";
    this.resize();
  }

  // ---------- public API ----------

  /** p1 picks their fighter; the other side gets the other ninja. */
  start(mode: Mode, p1: FighterId = "scorpion") {
    this.mode = mode;
    this.fighters[0].who = p1;
    this.fighters[1].who = p1 === "scorpion" ? "subzero" : "scorpion";
    this.newMatch();
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.canvas.width = Math.round(vw * dpr);
    this.canvas.height = Math.round(vh * dpr);
    this.headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    // the ninjas stand about a third of the screen tall; the arena stays at least 340 art px wide
    const k = Math.min((vh * 0.32) / 129, vw / 340);
    this.k = Math.max(0.75, Math.round(k * 4) / 4);
    this.arenaW = vw / this.k;
    this.floorY = vh - FLOOR_GAP;
    for (const f of this.fighters) f.x = Math.max(WALL, Math.min(this.arenaW - WALL, f.x));
    this.wreck.measure();
  }

  key(code: string, down: boolean) {
    let map = KEYS[code];
    if (!map) return false;
    if (this.mode === "cpu") map = [0, map[1]];
    const f = this.fighters[map[0]];
    const name = map[1];
    if (down && !f.keys[name]) this.press(f, name);
    f.keys[name] = down;
    return true;
  }

  releaseAll() {
    for (const f of this.fighters) f.keys = { ...NONE };
  }

  // ---------- input ----------

  /** A key or pad button going down: a tap for the motion history, a buffered press for buttons. */
  private press(f: Fighter, name: keyof Held) {
    this.sfx.unlock();
    let token: Token;
    if (name === "left" || name === "right") token = (name === "right") === (f.face > 0) ? "F" : "B";
    else if (name === "up") token = "U";
    else if (name === "down") token = "D";
    else {
      f.buf[name] = 4;
      token = BTN_TOKEN[name];
    }
    f.tokens.push({ k: token, t: this.tick });
    if (f.tokens.length > 16) f.tokens.shift();
  }

  private held(f: Fighter): Held {
    const k = f.keys;
    const p = f.pad;
    const h = { ...NONE };
    for (const key of Object.keys(NONE) as (keyof Held)[]) h[key] = k[key] || p[key];
    if (h.left && h.right) h.left = h.right = false;
    return h;
  }

  private pollPads() {
    const pads = [...(navigator.getGamepads?.() ?? [])].filter((p): p is Gamepad => !!p);
    for (const f of this.fighters) {
      if (this.mode === "cpu" && f.id === 1) continue;
      const pad = pads[f.id];
      if (!pad) {
        f.pad = { ...NONE };
        continue;
      }
      const b = (i: number) => !!pad.buttons[i]?.pressed;
      const [ax = 0, ay = 0] = pad.axes;
      const now: Held = {
        left: ax < -0.5 || b(14),
        right: ax > 0.5 || b(15),
        up: ay < -0.6 || b(12),
        down: ay > 0.6 || b(13),
        lp: b(2),
        hp: b(3),
        lk: b(0),
        hk: b(1),
        block: b(5) || b(7),
        run: b(4) || b(6),
      };
      const prev = this.padPrev[f.id];
      for (const key of Object.keys(now) as (keyof Held)[]) if (now[key] && !prev[key]) this.press(f, key);
      this.padPrev[f.id] = now;
      f.pad = now;
    }
  }

  private toward(f: Fighter, opp: Fighter, h: Held) {
    return opp.x > f.x ? h.right : h.left;
  }

  private away(f: Fighter, opp: Fighter, h: Held) {
    return opp.x > f.x ? h.left : h.right;
  }

  // ---------- match flow ----------

  private newFighter(id: 0 | 1, who: FighterId): Fighter {
    return {
      id, who, x: 0, alt: 0, vx: 0, vy: 0, face: id === 0 ? 1 : -1, air: false, flip: false,
      hp: MAX_HP, shownHp: MAX_HP, meter: MAX_METER, state: "idle", t: 0, move: null, moveHit: false,
      stun: 0, stunKind: "high", crouching: false, pushV: 0, invuln: 0, airAttacked: false, landFor: 0,
      ko: false, wallSplat: false, wins: 0, combo: 0, comboShow: 0, frozenAs: "stance0", alpha: 1,
      spear: null, keys: { ...NONE }, pad: { ...NONE },
      buf: { hp: 0, lp: 0, hk: 0, lk: 0, block: 0, run: 0 }, forced: null, tokens: [],
    };
  }

  private newMatch() {
    this.over = false;
    this.round = 1;
    this.stats = { hits: [0, 0], maxCombo: [0, 0], time: 0, fatality: false };
    for (const f of this.fighters) f.wins = 0;
    this.stains = [];
    window.scrollTo({ top: 0, behavior: "instant" });
    this.wreck.reset();
    this.newRound();
  }

  private newRound() {
    const [a, b] = this.fighters;
    for (const f of this.fighters) {
      Object.assign(f, {
        alt: 0, vx: 0, vy: 0, air: false, hp: MAX_HP, shownHp: MAX_HP, meter: MAX_METER, move: null, stun: 0,
        pushV: 0, invuln: 0, ko: false, combo: 0, comboShow: 0, forced: null, tokens: [], wallSplat: false,
        alpha: 1, spear: null,
      });
      this.setState(f, "idle");
    }
    a.x = this.arenaW * 0.3;
    b.x = this.arenaW * 0.7;
    a.face = 1;
    b.face = -1;
    this.iceballs = [];
    this.groundIce = [];
    this.sparks = [];
    this.drops = [];
    this.fatal = null;
    this.fatalityBanner = -1;
    this.nextBanner = null;
    this.dark = 0;
    this.clock = ROUND_TIME;
    this.phase = "intro";
    this.phaseT = 0;
    this.slow = 1;
    this.banner = { text: `ROUND ${this.round}` };
    this.say(this.round <= 3 ? (`round${this.round}` as Sound) : "round3");
    if (this.round > 1) this.goToSection(this.round - 1);
  }

  private goToSection(i: number) {
    const el = document.getElementById(SECTIONS[i % SECTIONS.length]);
    if (!el) return;
    window.scrollTo({ top: Math.max(0, docBox(el).y - this.headerBottom - 8), behavior: "smooth" });
  }

  /** Queues an announcer line, `delay` ticks from now. */
  private say(name: Sound, delay = 0) {
    this.voices.push({ name, at: this.tick + delay });
  }

  private updatePhase() {
    this.phaseT++;
    for (const v of this.voices) if (v.at <= this.tick) this.sfx.play(v.name, 0.9);
    this.voices = this.voices.filter((v) => v.at > this.tick);
    if (this.nextBanner && this.nextBanner.at <= this.tick) {
      this.banner = this.nextBanner.banner;
      this.nextBanner = null;
    }

    if (this.phase === "intro") {
      if (this.phaseT === 80) {
        this.wreck.measure();
        this.banner = { text: "FIGHT!" };
        this.say("fight");
      }
      if (this.phaseT >= 130) {
        this.phase = "fight";
        this.phaseT = 0;
        this.banner = null;
      }
    } else if (this.phase === "fight") {
      this.stats.time += TICK;
      if (this.phaseT % 60 === 0 && --this.clock <= 0) this.timeOver();
    } else if (this.phase === "finish") {
      // the loser sways; the winner has a few seconds to finish them
      if (this.phaseT >= FINISH_TIME) {
        const loser = this.fighters.find((f) => f.state === "dizzy");
        if (loser) this.topple(loser);
      }
    } else if (this.phase === "fatality") {
      this.updateFatality();
    } else if (this.phase === "ko") {
      if (this.phaseT === 40) this.slow = 1;
      const lying = this.fighters.every((f) => !f.ko || f.state === "dead");
      if (this.phaseT > 60 && lying && this.fighters.every((f) => !f.air)) this.endRound();
    } else if (this.phase === "over") {
      if (this.phaseT === 170) this.next();
    }
  }

  private timeOver() {
    const [a, b] = this.fighters;
    if (a.hp === b.hp) {
      a.wins++;
      b.wins++;
      this.finishRound(null);
    } else {
      const w = a.hp > b.hp ? a : b;
      w.wins++;
      this.finishRound(w);
    }
  }

  private endRound() {
    const [a, b] = this.fighters;
    const winner = a.ko && b.ko ? null : a.ko ? b : a;
    if (winner) winner.wins++;
    else {
      a.wins++;
      b.wins++;
    }
    this.finishRound(winner);
  }

  private finishRound(winner: Fighter | null) {
    this.phase = "over";
    this.phaseT = 0;
    this.slow = 1;
    if (!winner) {
      this.banner = { text: "DRAW" };
      return;
    }
    if (winner.state !== "fatality") this.setState(winner, "win");
    winner.face = winner.x < this.fighters[1 - winner.id].x ? 1 : -1;
    const flawless = winner.hp >= MAX_HP;
    this.banner = { text: `${NAMES[winner.who]} WINS`, sub: flawless ? "FLAWLESS VICTORY" : undefined };
    this.say(winner.who, 10);
    this.say("wins", 50);
    if (flawless) this.say("flawless", 100);
  }

  private next() {
    const [a, b] = this.fighters;
    if (a.wins >= ROUNDS_TO_WIN || b.wins >= ROUNDS_TO_WIN) {
      if (this.over) return;
      this.over = true;
      this.onEnd({
        winner: a.wins === b.wins ? null : a.wins > b.wins ? 0 : 1,
        rounds: [a.wins, b.wins],
        hits: [...this.stats.hits],
        maxCombo: [...this.stats.maxCombo],
        letters: this.wreck.destroyed,
        fatality: this.stats.fatality,
        time: this.stats.time,
      });
      return;
    }
    this.round++;
    this.newRound();
  }

  private tag(id: 0 | 1) {
    return id === 0 ? "1P" : this.mode === "cpu" ? "CPU" : "2P";
  }

  // ---------- loop ----------

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt * this.slow;
    while (this.acc >= TICK) {
      this.acc -= TICK;
      this.step();
    }
    this.wreck.update(dt * this.slow, window.scrollY + this.floorY);
    this.updateDrops(dt * this.slow);
    this.render();
    if (this.running) this.raf = requestAnimationFrame(this.frame);
  };

  private step() {
    this.tick++;
    this.pollPads();
    this.updatePhase();
    this.flash = Math.max(0, this.flash - 0.05);
    const darkTarget = this.phase === "fatality" ? 0.7 : this.phase === "finish" ? 0.25 : 0;
    this.dark += (darkTarget - this.dark) * 0.06;
    if (this.toasty >= 0 && ++this.toasty > 90) this.toasty = -1;
    if (this.fatalityBanner >= 0) this.fatalityBanner++;
    for (const f of this.fighters) {
      if (f.shownHp > f.hp && f.state !== "hit") f.shownHp = Math.max(f.hp, f.shownHp - 0.6);
      if (f.comboShow > 0) f.comboShow--;
    }
    if (this.freeze > 0) {
      this.freeze--;
      return;
    }
    if (this.mode === "cpu" && (this.phase === "fight" || this.phase === "finish")) this.think(this.fighters[1], this.fighters[0]);
    for (const f of this.fighters) this.updateFighter(f, this.fighters[1 - f.id]);
    this.separate();
    for (const f of this.fighters) this.checkHit(f, this.fighters[1 - f.id]);
    this.updateIceballs();
    this.updateGroundIce();
    for (const s of this.sparks) s.t++;
    this.sparks = this.sparks.filter((s) => s.t < (s.kind === "ice" ? 24 : s.kind === "explode" ? 30 : 14));
    for (const f of this.fighters) for (const b of BUTTONS) if (f.buf[b] > 0) f.buf[b]--;
  }

  // ---------- fighters ----------

  private setState(f: Fighter, s: State) {
    f.state = s;
    f.t = 0;
    if (s !== "attack") {
      f.move = null;
      f.spear = null;
    }
  }

  private startMove(f: Fighter, id: MoveId) {
    f.state = "attack";
    f.t = 0;
    f.move = id;
    f.moveHit = false;
    f.buf = { hp: 0, lp: 0, hk: 0, lk: 0, block: 0, run: 0 };
    if (MOVES[id].air) f.airAttacked = true;
    if (id === "spear") this.sfx.play("getOverHere");
    if (id === "teleport") {
      f.invuln = 14;
      this.sfx.play("teleport");
    }
    if (id === "slide") this.sfx.play("slide");
    if (id === "uppercut" || id === "roundhouse" || ((id === "freeze" || id === "spear") && chance(0.5))) this.sfx.play("attack", 0.7);
  }

  private pressed(f: Fighter): Btn | null {
    for (const b of ["hp", "lp", "hk", "lk"] as Btn[]) if (f.buf[b] > 0) return b;
    return null;
  }

  /** Specials from taps, then a dial-a-combo link, then normals. */
  private tryAttack(f: Fighter, opp: Fighter, h: Held, inAir: boolean) {
    if (this.phase !== "fight" && this.phase !== "finish") return false;
    if (f.forced) {
      const id = f.forced;
      f.forced = null;
      if (this.allowed(f, id)) this.startMove(f, id);
      return f.state === "attack";
    }
    const special = this.special(f, opp, h, inAir);
    if (special) {
      if (this.allowed(f, special)) this.startMove(f, special);
      return f.state === "attack";
    }
    if (inAir) return false;
    const b = this.pressed(f);
    if (!b) return false;
    const close = Math.abs(opp.x - f.x) <= THROW_RANGE && !opp.air && this.throwable(opp);
    let id: MoveId;
    if (b === "hp") id = h.down ? "uppercut" : close && this.toward(f, opp, h) ? "throw" : "hp";
    else if (b === "lp") id = h.down ? "crouchPunch" : close && this.toward(f, opp, h) ? "throw" : "lp";
    else if (b === "hk") id = h.down ? "crouchHighKick" : this.away(f, opp, h) ? "roundhouse" : "hk";
    else id = h.down ? "lowKick" : this.away(f, opp, h) ? "sweep" : "lk";
    if (id === "throw") return this.grab(f, opp);
    this.startMove(f, id);
    return true;
  }

  private special(f: Fighter, opp: Fighter, h: Held, inAir: boolean): MoveId | null {
    const tk = f.tokens;
    const now = this.tick;
    const w = SPECIAL_WINDOW;
    if (f.who === "scorpion") {
      if (f.buf.hp && tapped(tk, ["D", "B", "HP"], now, w)) return "teleport";
      if (inAir) {
        const near = opp.air && Math.abs(opp.x - f.x) < 70 && Math.abs(opp.alt - f.alt) < 70;
        return f.buf.block && near && !opp.invuln ? "airThrow" : null;
      }
      if (f.buf.lp && tapped(tk, ["B", "B", "LP"], now, w)) return "spear";
    } else {
      if (inAir) return null;
      if (f.buf.lp && f.buf.lk && this.away(f, opp, h)) return "slide";
      if (f.buf.lp && tapped(tk, ["D", "F", "LP"], now, w)) return "freeze";
      if (f.buf.lk && tapped(tk, ["D", "B", "LK"], now, w)) return "groundFreeze";
    }
    return null;
  }

  private allowed(f: Fighter, id: MoveId) {
    if (id === "freeze") return !this.iceballs.some((b) => b.owner === f.id);
    if (id === "groundFreeze") return !this.groundIce.some((g) => g.owner === f.id);
    return true;
  }

  private throwable(f: Fighter) {
    return f.state === "idle" || f.state === "walk" || f.state === "run" || f.state === "crouch" || f.state === "block" || f.state === "stagger";
  }

  private grab(a: Fighter, d: Fighter) {
    this.startMove(a, "throw");
    d.air = false;
    d.alt = 0;
    d.invuln = 0;
    this.setState(d, "thrown");
    return true;
  }

  private updateFighter(f: Fighter, opp: Fighter) {
    f.t++;
    if (f.invuln > 0) f.invuln--;
    const live = this.phase === "fight" || (this.phase === "finish" && f.state !== "dizzy");
    const h = live ? this.held(f) : NONE;
    const facing = (opp.x > f.x ? 1 : -1) as 1 | -1;
    if (f.state !== "run") f.meter = Math.min(MAX_METER, f.meter + 0.35);
    if (this.phase === "finish" && this.pressed(f) && this.tryFatality(f, opp)) return;

    switch (f.state) {
      case "idle":
      case "walk":
      case "run":
      case "crouch":
      case "block": {
        f.face = facing;
        f.crouching = h.down;
        if (f.state === "block" && f.stun > 0) {
          f.stun--;
          break;
        }
        if (live && this.tryAttack(f, opp, h, false)) break;
        if (h.block) {
          if (f.state !== "block") this.setState(f, "block");
        } else if (h.up && live) {
          this.setState(f, "jumpsquat");
          const dir = h.right ? 1 : h.left ? -1 : 0;
          f.vx = dir * JUMP_VX;
          f.flip = dir !== 0;
        } else if (h.down) {
          if (f.state !== "crouch") this.setState(f, "crouch");
        } else if (h.left || h.right) {
          const dir = h.right ? 1 : -1;
          const running = h.run && dir === f.face && f.meter > 0;
          f.x += dir * (running ? RUN : dir === f.face ? WALK_F : WALK_B);
          if (running) f.meter = Math.max(0, f.meter - 1);
          const s = running ? "run" : "walk";
          if (f.state !== s) this.setState(f, s);
          if (f.t % (running ? 4 : 6) === 0) this.scuff(f, dir * (running ? 220 : 110), 0);
        } else if (f.state !== "idle") this.setState(f, "idle");
        break;
      }
      case "jumpsquat":
        if (f.t >= 3) {
          f.air = true;
          f.vy = JUMP_V;
          f.airAttacked = false;
          this.setState(f, "air");
        }
        break;
      case "air":
        if (live && !this.tryAttack(f, opp, h, true) && !f.airAttacked) {
          const b = this.pressed(f);
          if (b === "hp" || b === "lp") this.startMove(f, "jumpPunch");
          else if (b === "hk" || b === "lk") this.startMove(f, f.flip ? "flipKick" : "jumpKick");
        }
        break;
      case "land":
        if (f.t >= f.landFor) this.setState(f, "idle");
        break;
      case "attack":
        this.updateMove(f, opp, h);
        break;
      case "hit":
        if (--f.stun <= 0) {
          opp.combo = 0;
          this.setState(f, f.crouching ? "crouch" : "idle");
        }
        break;
      case "stagger":
        // dragged in by a spear that got interrupted: don't stay stunned for good
        if (f.stun > 100 && opp.spear?.phase !== "pull") f.stun = 40;
        if (--f.stun <= 0) {
          opp.combo = 0;
          this.setState(f, "idle");
        }
        break;
      case "frozen":
        if (--f.stun <= 0) this.setState(f, "idle");
        break;
      case "down":
        if (f.t >= 40) this.setState(f, "getup");
        break;
      case "getup":
        f.invuln = 2;
        if (f.t >= 22) {
          f.face = facing;
          this.setState(f, "idle");
        }
        break;
      case "thrown":
        this.updateThrown(f, opp);
        break;
    }

    if (f.pushV) {
      f.x += f.pushV;
      f.pushV *= 0.82;
      if (Math.abs(f.pushV) < 0.1) f.pushV = 0;
    }
    if (f.air && f.state !== "thrown" && f.state !== "victim") this.updateAir(f);
    this.keepInArena(f);
  }

  private updateMove(f: Fighter, opp: Fighter, h: Held) {
    const id = f.move!;
    const def = MOVES[id];
    const t = f.t;

    // dial-a-combo: once a blow connects, the next button can cancel into the next link
    if (f.moveHit && def.chain && f.meter >= CHAIN_COST && (this.phase === "fight" || this.phase === "finish")) {
      const b = this.pressed(f);
      if (b) {
        const next = def.chain[`${h.down ? "D+" : this.away(f, opp, h) ? "B+" : ""}${b}`] ?? def.chain[b];
        if (next) {
          f.meter -= CHAIN_COST;
          this.startMove(f, next);
          return;
        }
      }
    }

    if (id === "throw") {
      if (t >= seqLength(def.seq)) this.setState(f, "idle");
      return;
    }
    if (id === "spear") return this.updateSpear(f, opp);
    if (id === "teleport") return this.updateTeleport(f, opp);
    if (id === "airThrow") return this.updateAirThrow(f, opp);
    if (id === "freeze" && t === 8) {
      this.iceballs.push({ owner: f.id, x: f.x + f.face * 62, alt: 64, dir: f.face, t: 0, dead: false });
      this.sfx.play("iceBlast");
    }
    if (id === "groundFreeze" && t === 8) {
      this.groundIce.push({ owner: f.id, x: f.x + f.face * 96, dir: f.face, t: 0, used: false });
      this.sfx.play("groundIce");
    }
    if (id === "slide" && t >= 4 && t < 28) {
      f.x += f.face * 6.5;
      if (t % 3 === 0) {
        this.scuff(f, f.face * 260, 60);
        this.wreckAt(f, def.box!, def.strike!, 0.5);
      }
    }
    if (def.active && t === def.active[0] && def.box && def.strike && id !== "slide") {
      this.sfx.play("whiff", 0.6);
      this.wreckAt(f, def.box, def.strike, 0.6);
    }
    if (!def.air && t >= seqLength(def.seq)) this.setState(f, f.crouching && def.crouching ? "crouch" : "idle");
  }

  /** Scorpion's spear: out on a rope, and if it sticks, the victim is dragged in, stunned. */
  private updateSpear(f: Fighter, opp: Fighter) {
    const t = f.t;
    const handX = f.x + f.face * 58;
    if (t === 9) f.spear = { x: handX, alt: 106, phase: "out", t: 0 };
    const s = f.spear;
    if (!s) return;
    s.t++;
    if (s.phase === "out") {
      s.x += f.face * 10;
      // the spear rips words out of the page and they fly back toward Scorpion
      if (s.t % 2 === 0) {
        const at = this.toDoc(s.x, s.alt);
        this.wreck.blast(at.x, at.y, 22 * this.scale(), 1, at.x + f.face * 120, at.y, 20);
      }
      const hurt = this.hurtbox(opp);
      const tip: Rect = [s.x - 10, s.x + 10, s.alt - 8, s.alt + 8];
      if (hurt && overlap(tip, hurt)) {
        if (this.blocking(opp, "mid")) {
          opp.hp = Math.max(1, opp.hp - 1);
          this.sfx.play("block");
          s.phase = "back";
        } else {
          this.sfx.play("spearHit");
          this.bleed(s.x, s.alt, f.face, 14);
          opp.hp = Math.max(1, opp.hp - 4);
          opp.shownHp = opp.hp;
          this.stats.hits[f.id]++;
          s.phase = "pull";
          this.setState(opp, "stagger");
          opp.stun = 999;
          opp.air = false;
          opp.alt = 0;
          this.freeze = 6;
        }
      } else if (Math.abs(s.x - handX) > 330 || s.x < 0 || s.x > this.arenaW) s.phase = "back";
    } else if (s.phase === "back") {
      s.x -= f.face * 14;
      if ((s.x - handX) * f.face <= 0) this.endSpear(f);
    } else {
      // GET OVER HERE: drag them in, along with whatever text is in the way
      opp.x -= f.face * 12;
      s.x = opp.x - f.face * 18;
      if (s.t % 2 === 0) {
        const at = this.toDoc(opp.x, 70);
        this.wreck.blast(at.x, at.y, 46 * this.scale(), 1, at.x + f.face * 160, at.y, 30);
      }
      if (Math.abs(opp.x - f.x) <= 60) {
        opp.stun = 75;
        this.endSpear(f);
      }
    }
  }

  private endSpear(f: Fighter) {
    f.spear = null;
    f.move = "spear";
    // pull back through the last two frames
    f.state = "land";
    f.t = 0;
    f.landFor = 10;
  }

  /** Scorpion vanishes in fire and drops in behind the opponent, punching. */
  private updateTeleport(f: Fighter, opp: Fighter) {
    const t = f.t;
    if (t < 10) {
      f.alpha = 1 - t / 10;
      if (t === 1) {
        const at = this.toDoc(f.x, f.alt + 64);
        this.wreck.ignite(at.x, at.y, 60 * this.scale());
      }
      f.vx = 0;
      f.vy = Math.max(f.vy, 0) * 0.5;
      return;
    }
    if (t === 10) {
      const side = opp.x > f.x ? 1 : -1;
      f.x = Math.max(WALL, Math.min(this.arenaW - WALL, opp.x + side * 84));
      f.alt = Math.max(f.alt, 60);
      f.air = true;
      f.vy = 1;
      f.face = (-side) as 1 | -1;
      f.vx = f.face * 4.5;
      f.alpha = 1;
      f.moveHit = false;
      const at = this.toDoc(f.x, f.alt + 40);
      this.wreck.ignite(at.x, at.y, 60 * this.scale());
      this.sfx.play("teleport");
    }
    if (!f.moveHit) {
      const box = this.place(f, MOVES.teleport.box!);
      const hurt = this.hurtbox(opp);
      if (hurt && overlap(box, hurt)) {
        f.moveHit = true;
        f.vx = 0;
        this.land(f, opp, MOVES.teleport.strike!, f.x, (box[0] + box[1]) / 2, (box[2] + box[3]) / 2);
      }
    }
    if (!f.air) {
      f.landFor = 12;
      this.setState(f, "land");
    }
  }

  /** Scorpion grabs an airborne opponent and slams them into the floor. */
  private updateAirThrow(f: Fighter, opp: Fighter) {
    if (f.t === 1) {
      this.setState(opp, "thrown");
      opp.air = true;
      f.moveHit = true;
      f.vy = Math.min(f.vy, 2);
    }
    opp.x = f.x + f.face * 30;
    opp.alt = f.alt + 20;
    if (!f.air) {
      opp.alt = 0;
      opp.air = false;
      this.land(f, opp, { ...THROW, damage: 14 }, f.x, opp.x, 30);
      f.landFor = 10;
      this.setState(f, "land");
    }
  }

  /** Being thrown: carried over the thrower's head to the other side. */
  private updateThrown(f: Fighter, by: Fighter) {
    if (by.move === "airThrow") return;
    const p = Math.min(1, f.t / 30);
    f.x = by.x + by.face * (44 - 108 * p);
    f.alt = Math.sin(Math.PI * p) * 100;
    if (p >= 1) {
      f.alt = 0;
      f.face = by.face;
      this.land(by, f, THROW, by.x, f.x, 30);
    }
  }

  private updateAir(f: Fighter) {
    if (f.move === "teleport" && f.t < 10) return;
    f.alt += f.vy;
    f.vy -= GRAVITY;
    f.x += f.vx;
    if (f.alt > 0) return;
    f.alt = 0;
    f.vy = 0;
    f.vx = 0;
    f.air = false;
    if (f.state === "frozen") return;
    if (f.state === "fall") {
      this.sfx.play("land");
      if (chance(0.5) || f.ko) this.sfx.play(f.ko ? "die" : "fall", 0.8);
      this.onShake(f.ko ? 14 : 6);
      const at = this.toDoc(f.x, 10);
      this.wreck.blast(at.x, at.y, (f.ko ? 130 : 60) * this.scale(), f.ko ? 3 : 1, at.x, at.y + 40);
      this.scuff(f, 0, 260, 80);
      this.setState(f, f.ko ? "dead" : "down");
      return;
    }
    if (f.state === "attack" && (f.move === "teleport" || f.move === "airThrow")) return;
    this.scuff(f, 0, 160, 50);
    f.landFor = 4;
    this.setState(f, "land");
  }

  private keepInArena(f: Fighter) {
    const min = WALL;
    const max = this.arenaW - WALL;
    if (f.x >= min && f.x <= max) return;
    const speed = Math.abs(f.pushV) + Math.abs(f.vx);
    const dir = Math.sign(f.pushV || f.vx);
    f.x = Math.max(min, Math.min(max, f.x));
    if ((f.state === "hit" || f.state === "fall") && speed > 2.5 && !f.wallSplat) {
      f.wallSplat = true;
      const at = this.toDoc(f.x + dir * PUSH_W, f.alt + 60);
      this.wreck.blast(at.x, at.y, 70 * this.scale(), 2, at.x - dir * 40, at.y);
      this.bleed(f.x + dir * PUSH_W, f.alt + 70, -dir, 10);
      this.onShake(8);
      this.sfx.play("land");
    }
    f.pushV = 0;
    if (f.state === "fall") f.vx = 0;
  }

  private separate() {
    const [a, b] = this.fighters;
    if (!this.solid(a) || !this.solid(b) || a.state === "thrown" || b.state === "thrown") return;
    if (Math.abs(a.alt - b.alt) > 90) return;
    const d = b.x - a.x;
    const gap = PUSH_W * 2 - Math.abs(d);
    if (gap <= 0) return;
    const dir = d === 0 ? (a.face > 0 ? 1 : -1) : Math.sign(d);
    a.x -= (dir * gap) / 2;
    b.x += (dir * gap) / 2;
    for (const f of [a, b]) {
      if (f.x < WALL || f.x > this.arenaW - WALL) {
        const over = f.x < WALL ? WALL - f.x : this.arenaW - WALL - f.x;
        a.x += over;
        b.x += over;
      }
    }
  }

  private solid(f: Fighter) {
    return !["fall", "down", "getup", "dead", "victim", "gone"].includes(f.state) && f.alpha > 0.5;
  }

  // ---------- hits ----------

  private place(f: Fighter, [x0, x1, y0, y1]: Rect): Rect {
    const a = f.x + f.face * x0;
    const b = f.x + f.face * x1;
    return [Math.min(a, b), Math.max(a, b), f.alt + y0, f.alt + y1];
  }

  private hurtbox(f: Fighter): Rect | null {
    if (!this.solid(f) || f.invuln > 0 || f.state === "win" || f.state === "thrown" || f.state === "fatality") return null;
    if (f.air) return this.place(f, AIRBORNE);
    const low = f.state === "attack" ? MOVES[f.move!].crouching : f.state === "crouch" || ((f.state === "block" || f.state === "hit") && f.crouching);
    return this.place(f, low ? CROUCH : STAND);
  }

  /** Holding block, on the ground, and the attack isn't one that beats this kind of block. */
  private blocking(d: Fighter, level: Level) {
    if (this.phase !== "fight" || d.air || d.state !== "block") return false;
    return level === "low" ? d.crouching : level === "overhead" ? !d.crouching : true;
  }

  private checkHit(a: Fighter, d: Fighter) {
    if (a.state !== "attack" || a.moveHit) return;
    const def = MOVES[a.move!];
    if (!def.active || !def.box || !def.strike) return;
    if (a.t < def.active[0] || a.t >= def.active[1]) return;
    const box = this.place(a, def.box);
    const hurt = this.hurtbox(d);
    if (!hurt || !overlap(box, hurt)) return;
    a.moveHit = true;
    const x = (Math.max(box[0], hurt[0]) + Math.min(box[1], hurt[1])) / 2;
    const y = (Math.max(box[2], hurt[2]) + Math.min(box[3], hurt[3])) / 2;
    this.land(a, d, def.strike, a.x, x, y);
  }

  private land(a: Fighter, d: Fighter, s: Strike, fromX: number, x: number, y: number) {
    const away = (d.x >= fromX ? 1 : -1) as 1 | -1;
    const from = this.toDoc(fromX, y + 10);
    const at = this.toDoc(x, y);

    if (this.blocking(d, s.level)) {
      d.hp = Math.max(1, d.hp - s.chip);
      d.shownHp = d.hp;
      d.stun = s.block;
      this.push(a, d, s.push * 0.7, away);
      this.sparks.push({ x, alt: y, t: 0, kind: "block" });
      this.sfx.play("block");
      this.freeze = 4;
      this.wreck.blast(at.x, at.y, s.wreck * 0.35 * this.scale(), 0, from.x, from.y, 10);
      return;
    }

    // the blow that decides the match leaves the loser swaying: FINISH HIM
    const lethal = d.hp - s.damage <= 0;
    if (lethal && this.phase === "fight" && a.wins + 1 >= ROUNDS_TO_WIN && d.state !== "thrown") {
      this.hurt(a, d, s, x, y, at, from);
      d.hp = 0;
      d.air = false;
      d.alt = 0;
      d.pushV = 0;
      this.setState(d, "dizzy");
      this.phase = "finish";
      this.phaseT = 0;
      this.banner = { text: "FINISH HIM!" };
      this.say("finishHim", 20);
      return;
    }

    const comboing = d.state === "hit" || d.state === "fall" || d.state === "stagger";
    a.combo = comboing ? a.combo + 1 : 1;
    if (a.combo > 1) a.comboShow = 80;
    if (a.combo === 4) this.say("excellent", 20);
    this.stats.hits[a.id]++;
    this.stats.maxCombo[a.id] = Math.max(this.stats.maxCombo[a.id], a.combo);
    const scaled = Math.max(1, Math.round(s.damage * Math.max(0.5, 1 - (a.combo - 1) * 0.12)));
    const wasDizzy = d.state === "dizzy";
    d.hp = Math.max(0, d.hp - scaled);
    d.wallSplat = false;
    this.hurt(a, d, s, x, y, at, from);

    if (wasDizzy || d.hp <= 0 || s.knockdown || s.launch || d.air || d.state === "frozen") {
      d.ko = d.hp <= 0 || wasDizzy;
      if (d.ko) d.hp = 0;
      d.air = true;
      d.vy = s.launch ? 13 : d.ko ? 8 : 7;
      d.vx = away * (s.launch ? 1.6 : 3);
      d.pushV = 0;
      d.face = (-away) as 1 | -1;
      this.setState(d, "fall");
      if (s.launch && chance(0.15)) this.toastyNow();
    } else {
      d.crouching = this.held(d).down && d.state !== "stagger";
      d.stunKind = d.crouching ? "crouch" : y > 96 ? "high" : "low";
      d.stun = s.stun;
      this.setState(d, "hit");
      this.push(a, d, s.push, away);
    }
    if (d.ko && this.phase !== "ko") this.knockout(wasDizzy);
  }

  /** The shared part of every clean hit: sound, sparks, blood, hit-pause, the page. */
  private hurt(a: Fighter, d: Fighter, s: Strike, x: number, y: number, at: { x: number; y: number }, from: { x: number; y: number }) {
    this.sparks.push({ x, alt: y, t: 0, kind: "hit" });
    this.sfx.play(s.sound);
    if (s.heavy && chance(0.5)) this.sfx.play("hurt", 0.7);
    this.bleed(x, y, a.face, s.heavy ? 12 : 5);
    this.freeze = s.heavy ? 9 : 6;
    this.onShake(s.heavy ? 7 : 3);
    this.wreck.blast(at.x, at.y, s.wreck * this.scale(), s.heavy ? 2 : 1, from.x, from.y);
    if (s.launch) {
      // an uppercut tears a column out of the page above the victim
      for (let i = 1; i <= 3; i++) {
        const up = this.toDoc(d.x, y + i * 50);
        this.wreck.blast(up.x, up.y, 40 * this.scale(), 1, up.x, up.y + 60, 40);
      }
    }
  }

  private push(a: Fighter, d: Fighter, v: number, away: 1 | -1) {
    const nearWall = away > 0 ? d.x > this.arenaW - WALL - 6 : d.x < WALL + 6;
    if (nearWall && !a.air) a.pushV = -away * v;
    else d.pushV = away * v;
  }

  private knockout(finished = false) {
    this.phase = "ko";
    this.phaseT = 0;
    this.slow = 0.35;
    this.flash = 0.6;
    this.banner = null;
    this.iceballs = [];
    if (!finished) this.onShake(14);
  }

  /** Nobody finished them in time: they keel over. */
  private topple(f: Fighter) {
    f.ko = true;
    f.air = true;
    f.vy = 3;
    f.vx = 0;
    this.setState(f, "fall");
    this.knockout(true);
  }

  private toastyNow() {
    this.toasty = 0;
    this.sfx.play("toasty");
  }

  // ---------- projectiles ----------

  private updateIceballs() {
    for (const b of this.iceballs) {
      if (b.dead) continue;
      b.t++;
      b.x += b.dir * 5.5;
      if (b.t % 2 === 0) {
        const at = this.toDoc(b.x, b.alt);
        this.wreck.freeze(at.x, at.y, 30 * this.scale(), 30);
      }
      const owner = this.fighters[b.owner];
      const target = this.fighters[1 - b.owner];
      const hurt = this.hurtbox(target);
      const box: Rect = [b.x - 26, b.x + 26, b.alt - 14, b.alt + 14];
      if (hurt && overlap(box, hurt)) {
        b.dead = true;
        this.iceHit(b);
        if (target.state === "frozen") {
          // freeze someone who's already frozen and the ice turns on you, as in the arcade
          this.freezeFighter(owner, 90);
        } else if (this.blocking(target, "mid")) {
          target.hp = Math.max(1, target.hp - 1);
          this.sfx.play("block");
        } else {
          target.hp = Math.max(1, target.hp - 3);
          target.shownHp = target.hp;
          this.stats.hits[b.owner]++;
          this.freezeFighter(target, 110);
        }
        continue;
      }
      if (b.x < 0 || b.x > this.arenaW) {
        b.dead = true;
        this.iceHit(b);
      }
    }
    this.iceballs = this.iceballs.filter((b) => !b.dead);
  }

  private iceHit(b: Iceball) {
    this.sparks.push({ x: b.x, alt: b.alt, t: 0, kind: "ice" });
    const at = this.toDoc(b.x, b.alt);
    this.wreck.freeze(at.x, at.y, 90 * this.scale(), 120);
  }

  private freezeFighter(f: Fighter, ticks: number) {
    f.frozenAs = this.sprite(f);
    f.stun = ticks;
    f.pushV = 0;
    f.vx = 0;
    if (f.spear) f.spear = null;
    this.setState(f, "frozen");
    this.sfx.play("frozen");
    this.freeze = 8;
    const at = this.toDoc(f.x, f.alt + 64);
    this.wreck.freeze(at.x, at.y, 80 * this.scale(), 120);
  }

  private updateGroundIce() {
    for (const g of this.groundIce) {
      g.t++;
      if (g.t === 12) {
        const at = this.toDoc(g.x, 6);
        this.wreck.freeze(at.x, at.y, 110 * this.scale(), 160);
      }
      const target = this.fighters[1 - g.owner];
      const live = g.t >= 12 && g.t < 162;
      if (live && !g.used && !target.air && target.state !== "frozen" && Math.abs(target.x - g.x) < 50 && this.solid(target)) {
        g.used = true;
        this.freezeFighter(target, 100);
      }
    }
    this.groundIce = this.groundIce.filter((g) => g.t < 186);
  }

  // ---------- fatalities ----------

  /** In FINISH HIM, the winner's taps are checked for their character's Fatality. */
  private tryFatality(f: Fighter, victim: Fighter) {
    if (this.phase !== "finish" || victim.state !== "dizzy" || f.state === "dizzy") return false;
    const code: Token[] = f.who === "scorpion" ? ["D", "D", "U", "HK"] : ["D", "D", "D", "F", "HP"];
    const last = code[code.length - 1];
    if (!f.buf[last.toLowerCase() as Btn] || !tapped(f.tokens, code, this.tick, FATALITY_WINDOW)) return false;
    this.phase = "fatality";
    this.phaseT = 0;
    this.banner = null;
    this.fatal = { by: f, victim, t: 0, fire: null };
    Object.assign(f, { air: false, alt: 0, vx: 0, vy: 0, pushV: 0, alpha: 1 });
    f.face = victim.x > f.x ? 1 : -1;
    this.setState(f, "fatality");
    this.setState(victim, "victim");
    this.iceballs = [];
    this.stats.fatality = true;
    return true;
  }

  private updateFatality() {
    const ft = this.fatal;
    if (!ft) return;
    const { by, victim } = ft;
    const t = ++ft.t;
    const vAt = this.toDoc(victim.x, 70);

    if (by.who === "scorpion") {
      // off with the mask, a skull underneath, and fire
      if (t === 60) {
        ft.fire = { x: by.x + by.face * 34, alt: 118, hit: false };
        this.sfx.play("fire");
      }
      const fire = ft.fire;
      if (fire && !fire.hit) {
        fire.x += by.face * 7;
        fire.alt += (70 - fire.alt) * 0.08;
        if (t % 2 === 0) {
          const at = this.toDoc(fire.x, fire.alt);
          this.wreck.ignite(at.x, at.y, 40 * this.scale(), 30);
        }
        if ((victim.x - fire.x) * by.face <= 10) {
          fire.hit = true;
          victim.t = 0;
          this.sparks.push({ x: victim.x, alt: 70, t: 0, kind: "explode" });
          this.sfx.play("fire");
          this.sfx.play("die", 0.8);
          this.onShake(10);
        }
      }
      // the whole page catches, spreading out from the victim
      if (fire?.hit && victim.t < 100) {
        this.wreck.ignite(vAt.x, vAt.y, victim.t * 14 * this.scale() + 60, 50);
      }
      if (fire?.hit && victim.t === 100) this.setState(victim, "gone");
      if (fire?.hit && victim.state === "gone" && victim.t === 20) this.fatalityDone(by);
    } else {
      // an ice geyser erupts under them, the page frosts over, then everything shatters
      if (t === 14) {
        victim.frozenAs = "dizzy0";
        this.sfx.play("groundIce");
      }
      if (t === 26) this.sfx.play("frozen");
      if (t > 20 && t < 100) this.wreck.freeze(vAt.x, vAt.y, (t - 20) * 16 * this.scale() + 60, 60);
      if (t === 100) this.setState(by, "fatality");
      if (t === 112) this.shatterVictim(victim);
      if (t === 132) this.fatalityDone(by);
    }
  }

  /** The frozen victim breaks apart, and so does every frosted letter on screen. */
  private shatterVictim(v: Fighter) {
    const atlas = this.art.ice[v.who];
    const m = atlas.frames[v.frozenAs];
    if (m) {
      // the same rectangle drawFrame puts the sprite in, mirrored when facing left
      const [sx, sy, w, h, ax, ay] = m;
      const { k } = this;
      const feet = this.toDoc(v.x, v.alt);
      const left = feet.x - (v.face < 0 ? w - ax : ax) * k;
      this.wreck.pieces(atlas.image, [sx, sy, w, h], { x: left, y: feet.y - ay * k, w: w * k, h: h * k }, 4, 6, v.face < 0);
    }
    this.setState(v, "gone");
    this.sfx.play("shatter");
    this.onShake(16);
    this.flash = 0.6;
    const c = this.toDoc(v.x, 70);
    this.wreck.shatterFrozen(c.x, c.y, Math.max(window.innerWidth, window.innerHeight) * 1.5, 3000);
  }

  private fatalityDone(by: Fighter) {
    this.fatalityBanner = 0;
    this.say("fatality");
    const victim = this.fighters[1 - by.id];
    victim.ko = true;
    by.wins++;
    this.setState(by, "win");
    this.phase = "over";
    this.phaseT = -60;
    this.banner = null;
    this.nextBanner = { banner: { text: `${NAMES[by.who]} WINS`, sub: "FATALITY" }, at: this.tick + 100 };
    this.say(by.who, 110);
    this.say("wins", 150);
  }

  // ---------- CPU ----------

  private think(me: Fighter, opp: Fighter) {
    const b = this.brain;
    const dist = Math.abs(opp.x - me.x);
    const fwd: keyof Held = opp.x > me.x ? "right" : "left";
    const back: keyof Held = opp.x > me.x ? "left" : "right";
    const free = me.state === "idle" || me.state === "walk" || me.state === "crouch" || me.state === "block";
    const tap = (btn: Btn) => (me.buf[btn] = 3);
    const hold = (h: Partial<Held>, ticks: number) => {
      b.hold = h;
      b.holdT = ticks;
    };
    if (b.holdT > 0) b.holdT--;
    else b.hold = {};

    if (this.phase === "finish") {
      // finish them, with style
      if (opp.state === "dizzy" && free && b.holdT === 0 && --b.wait <= 0) {
        this.cpuFatality(me, opp);
        b.wait = 60;
      }
      me.keys = { ...NONE, ...b.hold };
      return;
    }

    const incoming = this.iceballs.find((ib) => ib.owner !== me.id && Math.sign(me.x - ib.x) === ib.dir && Math.abs(ib.x - me.x) < 170);
    const spear = opp.spear?.phase === "out";
    if ((incoming && !b.seen.has(incoming)) || (spear && b.holdT === 0)) {
      if (incoming) b.seen.add(incoming);
      const r = Math.random();
      if (r < 0.45) hold({ block: true }, 40);
      else if (r < 0.8) hold({ up: true, [fwd]: true }, 6);
    } else if (opp.state === "attack" && dist < 130 && free && b.holdT === 0 && chance(0.12)) {
      const low = opp.move === "sweep" || opp.move === "lowKick";
      hold({ block: true, down: low || chance(0.3) }, 22);
    } else if (opp.air && opp.vy < 2 && dist < 100 && free && chance(0.08)) {
      me.forced = "uppercut";
    }
    if (me.air && !me.airAttacked && dist < 110 && me.vy < 4) tap(chance(0.6) ? "hk" : "hp");
    if (me.who === "scorpion" && me.air && opp.air && dist < 70 && chance(0.2)) tap("block");

    me.keys = { ...NONE, ...b.hold };
    if (opp.state === "frozen" || opp.state === "stagger") {
      // a free hit: walk in and uppercut
      if (free && dist > 60) hold({ [fwd]: true }, 4);
      else if (free) me.forced = chance(0.5) ? "uppercut" : "roundhouse";
      me.keys = { ...NONE, ...b.hold };
      return;
    }
    if (--b.wait > 0 || !free || b.holdT > 0) return;
    b.wait = Math.round(rand(8, 22));
    const r = Math.random();
    const special = (): MoveId => (me.who === "scorpion" ? (chance(0.6) ? "spear" : "teleport") : chance(0.6) ? "freeze" : chance(0.5) ? "groundFreeze" : "slide");
    if (dist > 200) {
      if (r < 0.3) me.forced = special();
      else if (r < 0.75) hold({ [fwd]: true, run: chance(0.4) }, Math.round(rand(14, 34)));
      else if (r < 0.88) hold({ up: true, [fwd]: true }, 6);
    } else if (dist > 80) {
      if (r < 0.35) hold({ [fwd]: true }, Math.round(rand(10, 24)));
      else if (r < 0.5) hold({ up: true, [fwd]: true }, 6);
      else if (r < 0.66) me.forced = special();
      else if (r < 0.76) hold({ [back]: true }, Math.round(rand(10, 20)));
      else if (r < 0.84) me.forced = "sweep";
    } else {
      if (r < 0.22) tap("hp");
      else if (r < 0.38) tap("lp");
      else if (r < 0.5) tap("hk");
      else if (r < 0.6) me.forced = "sweep";
      else if (r < 0.7) me.forced = "uppercut";
      else if (r < 0.78) me.forced = "roundhouse";
      else if (r < 0.86) {
        hold({ [fwd]: true }, 3);
        tap("lp");
      } else hold({ block: true }, 20);
    }
    me.keys = { ...NONE, ...b.hold };
  }

  private cpuFatality(me: Fighter, opp: Fighter) {
    const code: Token[] = me.who === "scorpion" ? ["D", "D", "U", "HK"] : ["D", "D", "D", "F", "HP"];
    for (const k of code) me.tokens.push({ k, t: this.tick });
    me.buf[code[code.length - 1].toLowerCase() as Btn] = 3;
    this.tryFatality(me, opp);
  }

  // ---------- page helpers ----------

  private scale() {
    return this.k / 2.2;
  }

  private toDoc(x: number, alt: number) {
    return { x: window.scrollX + x * this.k, y: window.scrollY + this.floorY - alt * this.k };
  }

  private wreckAt(f: Fighter, box: Rect, s: Strike, power: number) {
    const r = this.place(f, box);
    const at = this.toDoc(r[0] + (r[1] - r[0]) * (f.face > 0 ? 0.8 : 0.2), (r[2] + r[3]) / 2);
    const from = this.toDoc(f.x, f.alt + 70);
    this.wreck.blast(at.x, at.y, s.wreck * power * this.scale(), power >= 0.6 ? 1 : 0, from.x, from.y, 40);
  }

  private scuff(f: Fighter, vx: number, spread: number, width = 30) {
    const at = this.toDoc(f.x, 0);
    this.wreck.kick(at.x, width * this.k, at.y, vx, spread);
  }

  /** Blood spray from (x, alt), mostly in the direction of the blow. */
  private bleed(x: number, alt: number, dir: number, n: number) {
    const at = this.toDoc(x, alt);
    for (let i = 0; i < n; i++) {
      this.drops.push({
        x: at.x,
        y: at.y,
        vx: dir * rand(80, 420) + rand(-60, 60),
        vy: -rand(120, 520),
        r: rand(1, 2.4) * Math.max(1, this.k / 2),
        stick: chance(0.3) ? rand(0.15, 0.5) : 99,
      });
    }
  }

  private updateDrops(dt: number) {
    const floor = window.scrollY + this.floorY;
    for (const d of this.drops) {
      d.vy += 1800 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.stick -= dt;
      // some splash onto the page mid-flight, the rest land on the floor
      if (d.stick <= 0 || d.y >= floor) {
        this.stains.push({ x: d.x, y: Math.min(d.y, floor), r: d.r * rand(0.8, 1.3) });
        d.r = 0;
      }
    }
    this.drops = this.drops.filter((d) => d.r > 0);
    if (this.stains.length > 700) this.stains.splice(0, this.stains.length - 700);
  }

  // ---------- rendering ----------

  private sprite(f: Fighter): string {
    const t = f.t;
    switch (f.state) {
      case "idle":
        return `stance${Math.floor(t / 7) % 9}`;
      case "walk": {
        const fwd = (this.held(f).right ? 1 : -1) === f.face;
        const i = Math.floor(t / 5) % 9;
        return `walk${fwd ? i : 8 - i}`;
      }
      case "run":
        return `run${Math.floor(t / 3) % 12}`;
      case "crouch":
        return `crouch${Math.min(2, Math.floor(t / 2))}`;
      case "block":
        return `${f.crouching ? "crouchBlock" : "block"}${Math.min(2, Math.floor(t / 2))}`;
      case "jumpsquat":
        return "jump0";
      case "land":
        return f.move === "spear" ? `spear${t < 5 ? 6 : 7}` : "crouch0";
      case "air": {
        const p = Math.min(1, t / AIR_TICKS);
        if (f.flip) return `flip${Math.min(7, Math.floor(p * 8))}`;
        return `jump${p < 0.15 ? 0 : p < 0.7 ? 1 : 2}`;
      }
      case "attack": {
        const def = MOVES[f.move!];
        if (f.move === "spear" && f.spear) return f.spear.phase === "out" ? "spear3" : f.spear.phase === "pull" ? "spear6" : "spear5";
        if (f.move === "slide" && !f.air) return `slide${t < 4 ? 0 : 1}`;
        return `${def.anim}${frameAt(def.seq, t)}`;
      }
      case "hit": {
        const anim = f.stunKind === "crouch" ? "crouchHit" : f.stunKind === "low" ? "hitLow" : "hitHigh";
        return `${anim}${Math.min(2, Math.floor(t / 3))}`;
      }
      case "stagger":
        return `dizzy${Math.floor(t / 6) % 8}`;
      case "dizzy":
        return `dizzy${Math.floor(t / 7) % 8}`;
      case "frozen":
        return f.frozenAs;
      case "thrown":
        return `thrown${Math.min(5, Math.floor(t / 5))}`;
      case "fall":
        return `fall${Math.min(4, Math.floor(t / 4))}`;
      case "down":
        return `fall${Math.min(7, 5 + Math.floor(t / 5))}`;
      case "dead":
        return "fall7";
      case "getup":
        return `getup${Math.min(4, Math.floor(t / 5))}`;
      case "win":
        return `victory${Math.min(f.who === "scorpion" ? 5 : 2, Math.floor(t / 8))}`;
      case "fatality":
        return this.fatalitySprite(f);
      case "victim":
        return this.victimSprite(f);
      case "gone":
        return "";
    }
  }

  private fatalitySprite(f: Fighter) {
    const t = this.fatal?.t ?? 0;
    if (f.who === "scorpion") return `unmask${Math.min(6, Math.floor(t / 8))}`;
    if (t < 100) return `groundFreeze${Math.min(2, Math.floor(t / 4))}`;
    return `uppercut${Math.min(4, Math.floor((t - 100) / 3))}`;
  }

  private victimSprite(f: Fighter) {
    const ft = this.fatal;
    if (!ft) return "dizzy0";
    if (ft.by.who === "scorpion") {
      if (!ft.fire?.hit) return `dizzy${Math.floor(ft.t / 7) % 8}`;
      return f.t < 72 ? `burn${Math.min(11, Math.floor(f.t / 6))}` : "skeleton0";
    }
    return ft.t < 14 ? `dizzy${Math.floor(ft.t / 7) % 8}` : f.frozenAs;
  }

  private render() {
    const { ctx, k } = this;
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    ctx.imageSmoothingEnabled = false;

    // page damage and blood, in document coordinates, below the header
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.headerBottom, vw, vh - this.headerBottom);
    ctx.clip();
    ctx.translate(-window.scrollX, -window.scrollY);
    const top = window.scrollY - 200;
    const bottom = window.scrollY + vh + 200;
    this.wreck.draw(ctx, top, bottom);
    ctx.fillStyle = "#8b0000";
    for (const s of this.stains) {
      if (s.y < top || s.y > bottom) continue;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r * 1.4, s.r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#b91c1c";
    for (const d of this.drops) ctx.fillRect(d.x - d.r / 2, d.y - d.r / 2, d.r, d.r);
    ctx.restore();

    // the lights go out for FINISH HIM and the Fatality
    if (this.dark > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${this.dark})`;
      ctx.fillRect(0, this.headerBottom, vw, vh - this.headerBottom);
    }

    ctx.fillStyle = "#3f3f46";
    for (let x = 0; x < vw; x += 4) ctx.fillRect(x, this.floorY, 1.5, 1.5);

    const sx = (x: number) => x * k;
    const sy = (alt: number) => this.floorY - alt * k;
    const sub = this.art.atlas.subzero;

    for (const g of this.groundIce) {
      const frame = g.t < 12 ? Math.floor(g.t / 2) : g.t < 162 ? 6 : Math.min(12, 7 + Math.floor((g.t - 162) / 4));
      drawFrame(ctx, sub, `groundIce${frame}`, sx(g.x), sy(0), k, g.dir < 0);
    }

    for (const f of this.fighters) {
      if (f.state === "gone" || f.alpha < 0.05) continue;
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.ellipse(sx(f.x), this.floorY, 28 * k * Math.max(0.4, 1 - f.alt / 220), 3 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const shake = this.freeze > 0 ? (this.freeze % 2 ? 1.5 : -1.5) : 0;
    const order = [...this.fighters].sort((a, b) => Number(a.state === "attack") - Number(b.state === "attack"));
    for (const f of order) {
      const name = this.sprite(f);
      if (!name) continue;
      const iced = f.state === "frozen" || (f.state === "victim" && this.fatal?.by.who === "subzero" && this.fatal.t >= 14);
      const atlas = iced ? this.art.ice[f.who] : this.art.atlas[f.who];
      const skeleton = name === "skeleton0";
      ctx.save();
      ctx.globalAlpha = f.alpha;
      // the skeleton frame is drawn blue in the arcade (electrocution); burnt, it's amber
      if (skeleton) ctx.filter = "hue-rotate(170deg) saturate(0.7) brightness(1.3)";
      const hitShake = f.state === "hit" || f.state === "block" || f.state === "frozen" ? shake : 0;
      drawFrame(ctx, atlas, name, sx(f.x) + hitShake, sy(f.alt), k, f.face < 0);
      ctx.restore();
      if (f.state === "attack" && f.spear) this.drawRope(f);
    }

    if (this.fatal?.by.who === "subzero" && this.fatal.t >= 8 && this.fatal.t < 112) {
      const v = this.fatal.victim;
      drawFrame(ctx, sub, `geyser${Math.min(3, Math.floor((this.fatal.t - 8) / 6))}`, sx(v.x), sy(0), k);
    }
    const fire = this.fatal?.fire;
    if (fire && !fire.hit) {
      const sc = this.art.atlas.scorpion;
      this.drawCentred(sc, `fire${Math.min(3, Math.floor((this.fatal!.t - 60) / 4))}`, sx(fire.x), sy(fire.alt), this.fatal!.by.face < 0);
    }

    for (const b of this.iceballs) {
      const frame = b.t < 8 ? Math.min(3, Math.floor(b.t / 2)) : 4 + (Math.floor(b.t / 3) % 2);
      this.drawCentred(sub, `iceball${frame}`, sx(b.x), sy(b.alt), b.dir < 0);
    }
    for (const s of this.sparks) this.drawSpark(s, sx(s.x), sy(s.alt));

    ctx.font = `bold ${Math.max(10, Math.round(k * 4.5))}px ${this.font}`;
    ctx.textAlign = "center";
    for (const f of this.fighters) {
      if (["down", "dead", "gone", "victim", "fatality"].includes(f.state) || f.alpha < 0.5) continue;
      ctx.fillStyle = f.who === "scorpion" ? "#facc15" : "#67e8f9";
      ctx.fillText(this.tag(f.id), sx(f.x), sy(f.alt + 146));
    }

    if (this.toasty >= 0) this.drawToasty(vw, vh);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.35})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    this.drawHud(vw);
  }

  /** Draws a frame with its box centred on (x, y) rather than standing on it. */
  private drawCentred(atlas: Atlas, name: string, x: number, y: number, flip: boolean) {
    const m = atlas.frames[name];
    if (m) drawFrame(this.ctx, atlas, name, x, y + (m[3] * this.k) / 2, this.k, flip);
  }

  private drawRope(f: Fighter) {
    const s = f.spear!;
    const { ctx, k } = this;
    const x0 = (f.x + f.face * 56) * k;
    const y0 = this.floorY - 106 * k;
    const x1 = s.x * k;
    const y1 = this.floorY - s.alt * k;
    ctx.strokeStyle = "#a8a29e";
    ctx.lineWidth = Math.max(1.5, k);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    // a slack rope while it flies, taut when it pulls
    const slack = s.phase === "pull" ? 0 : 4 * k;
    for (let i = 1; i <= 24; i++) {
      const p = i / 24;
      ctx.lineTo(x0 + (x1 - x0) * p, y0 + (y1 - y0) * p + Math.sin(p * Math.PI * 6 + s.t) * slack * Math.sin(p * Math.PI));
    }
    ctx.stroke();
    const d = Math.sign(x1 - x0) || 1;
    ctx.fillStyle = "#e7e5e4";
    ctx.strokeStyle = "#57534e";
    ctx.beginPath();
    ctx.moveTo(x1 + d * 9 * k, y1);
    ctx.lineTo(x1 - d * 2 * k, y1 - 4 * k);
    ctx.lineTo(x1 - d * 2 * k, y1 + 4 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawSpark(s: Spark, x: number, y: number) {
    const { ctx, k } = this;
    if (s.kind === "ice") {
      this.drawCentred(this.art.atlas.subzero, `iceball${8 + Math.min(7, Math.floor(s.t / 3))}`, x, y, false);
      return;
    }
    if (s.kind === "explode") {
      this.drawCentred(this.art.atlas.scorpion, "fire4", x, y, false);
      return;
    }
    const p = s.t / 14;
    const len = (s.kind === "block" ? 12 : 18) * k * (0.4 + p);
    ctx.strokeStyle = s.kind === "block" ? `rgba(250,250,250,${1 - p})` : `rgba(254,240,138,${1 - p})`;
    ctx.lineWidth = Math.max(1, k * (1 - p) * 1.4);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      ctx.moveTo(x + Math.cos(a) * len * 0.25, y + Math.sin(a) * len * 0.25);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    }
    ctx.stroke();
  }

  /** Dan Forden pops in at the bottom corner: TOASTY! */
  private drawToasty(vw: number, vh: number) {
    const img = this.art.toasty;
    const t = this.toasty;
    const h = Math.min(160, vh * 0.22);
    const w = (img.naturalWidth / img.naturalHeight) * h;
    const p = t < 10 ? t / 10 : t > 75 ? 1 - (t - 75) / 15 : 1;
    this.ctx.drawImage(img, vw - w * p, vh - h, w, h);
  }

  private drawHud(vw: number) {
    const { ctx } = this;
    const top = this.headerBottom + 44;
    const cx = vw / 2;
    const barW = Math.min(420, vw / 2 - 56);
    const barH = vw < 640 ? 12 : 16;

    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(cx - 52 - barW, top - 14, (barW + 52) * 2, barH + 40);

    this.fighters.forEach((f, i) => {
      const x0 = i === 0 ? cx - 40 - barW : cx + 40;
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(x0, top, barW, barH);
      const fill = (hp: number, color: string) => {
        const w = (barW * hp) / MAX_HP;
        ctx.fillStyle = color;
        ctx.fillRect(i === 0 ? x0 : x0 + barW - w, top, w, barH);
      };
      fill(f.shownHp, "#dc2626");
      fill(f.hp, "#16a34a");
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 - 0.5, top - 0.5, barW + 1, barH + 1);
      ctx.font = `bold ${vw < 640 ? 9 : 11}px ${this.font}`;
      ctx.fillStyle = "#fde68a";
      ctx.textBaseline = "middle";
      ctx.textAlign = i === 0 ? "left" : "right";
      ctx.fillText(`${NAMES[f.who]} · ${this.tag(f.id)}`, i === 0 ? x0 + 4 : x0 + barW - 4, top + barH / 2 + 1);

      // run meter
      const mw = (barW * 0.6 * f.meter) / MAX_METER;
      ctx.fillStyle = "#1e3a8a";
      ctx.fillRect(i === 0 ? x0 : x0 + barW * 0.4, top + barH + 4, barW * 0.6, 4);
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(i === 0 ? x0 : x0 + barW - mw, top + barH + 4, mw, 4);

      for (let n = 0; n < ROUNDS_TO_WIN; n++) {
        const wx = i === 0 ? x0 + barW - 8 - n * 14 : x0 + 8 + n * 14;
        ctx.beginPath();
        ctx.arc(wx, top + barH + 18, 5, 0, Math.PI * 2);
        ctx.fillStyle = f.wins > n ? "#facc15" : "#000";
        ctx.fill();
        ctx.strokeStyle = "#fde68a";
        ctx.stroke();
      }
      if (f.comboShow > 0 && f.combo > 1) {
        ctx.font = `bold ${vw < 640 ? 14 : 20}px ${this.font}`;
        ctx.fillStyle = "#facc15";
        ctx.textBaseline = "top";
        ctx.fillText(`${f.combo} HIT COMBO`, i === 0 ? x0 : x0 + barW, top + barH + 30);
      }
    });

    ctx.font = `bold ${vw < 640 ? 22 : 30}px ${this.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#fde68a";
    ctx.fillText(String(Math.max(0, this.clock)).padStart(2, "0"), cx, top - 8);

    const y = this.headerBottom + (window.innerHeight - this.headerBottom) * 0.34;
    if (this.fatalityBanner >= 0) {
      // the dripping FATALITY from the arcade, frame by frame
      const img = this.art.fatality[Math.min(6, Math.floor(this.fatalityBanner / 6))];
      const w = Math.min(vw * 0.7, 171 * 4);
      const h = (w / 171) * 26;
      ctx.drawImage(img, cx - w / 2, y - h / 2, w, h);
    } else if (this.banner) {
      const size = Math.min(88, Math.max(32, vw / 13));
      ctx.font = `bold ${size}px ${this.font}`;
      ctx.textBaseline = "middle";
      ctx.lineWidth = Math.max(4, size / 9);
      ctx.strokeStyle = "#450a0a";
      ctx.strokeText(this.banner.text, cx, y);
      ctx.fillStyle = this.banner.text.startsWith("FINISH") ? "#dc2626" : "#facc15";
      ctx.fillText(this.banner.text, cx, y);
      if (this.banner.sub) {
        ctx.font = `bold ${size * 0.42}px ${this.font}`;
        ctx.strokeText(this.banner.sub, cx, y + size * 0.8);
        ctx.fillStyle = "#facc15";
        ctx.fillText(this.banner.sub, cx, y + size * 0.8);
      }
    }
    ctx.textBaseline = "alphabetic";
  }
}
