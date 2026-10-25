import { drawFrame, type Atlas, type Hit, type Sfx } from "./assets";
import { PageWreck } from "./wreck";
import { docBox } from "../doom/page";

// ==========================================
// STREET FIGHTER mode: two Ryus fight on top of the portfolio. The viewport is the stage,
// its bottom edge the floor, and each round moves the fight to the next section of the page.
// Every blow, whiff, fireball, wall splat and knockdown also lands on the page (see wreck.ts).
// Simulation runs at a fixed 60 ticks per second; sizes are in sprite pixels ("art px").
// ==========================================

const TICK = 1 / 60;
const GRAVITY = 0.55;
const JUMP_V = 10.5;
const JUMP_VX = 3.2;
const AIR_TICKS = (2 * JUMP_V) / GRAVITY;
const WALK_F = 2.4;
const WALK_B = 1.9;
const PUSH_W = 20; // half-width of a fighter's push box
const WALL = 22; // closest a fighter's centre gets to the screen edge
const FLOOR_GAP = 26; // screen px between the floor and the bottom of the viewport
const MAX_HP = 100;
const ROUND_TIME = 99;
const ROUNDS_TO_WIN = 2;
const FIREBALL_SPEED = 4.2;
const INTRO = 150; // ticks of "ROUND n" + "FIGHT!"
const SECTIONS = ["intro", "experience", "projects", "stack", "contact"];

export type Mode = "cpu" | "versus";
export type Special = "hadouken" | "shoryuken" | "tatsu";

export interface FightStats {
  /** 0 or 1, or null for a draw */
  winner: 0 | 1 | null;
  rounds: [number, number];
  hits: [number, number];
  maxCombo: [number, number];
  letters: number;
  time: number;
}

/** x0, x1 along the arena (x forward of the anchor when used as a move box), y0, y1 above the floor */
type Rect = [number, number, number, number];
type Level = "mid" | "low" | "overhead";

interface Strike {
  damage: number;
  chip: number;
  stun: number;
  block: number;
  push: number;
  level: Level;
  knockdown?: boolean;
  heavy?: boolean;
  /** radius of the page damage, screen px at the default scale */
  wreck: number;
}

type MoveId = "punch" | "kick" | "crouchPunch" | "sweep" | "jumpPunch" | "jumpKick" | "hadouken" | "shoryuken" | "tatsu";

interface MoveDef {
  anim: string;
  /** [animation frame, ticks]; Infinity holds the frame until landing */
  seq: [number, number][];
  active?: [number, number];
  box?: Rect;
  strike?: Strike;
  air?: boolean;
  crouching?: boolean;
}

const SPIN: [number, number][] = [[1, 3], [2, 3], [3, 3], [4, 3]];

// Reach and heights come from the art (scripts/extract-sf2.py lines the frames up on the feet).
const MOVES: Record<MoveId, MoveDef> = {
  punch: {
    anim: "punch",
    seq: [[0, 3], [1, 7], [0, 5]],
    active: [3, 8],
    box: [28, 64, 64, 84],
    strike: { damage: 6, chip: 0, stun: 15, block: 10, push: 3.5, level: "mid", wreck: 34 },
  },
  kick: {
    anim: "kick",
    seq: [[0, 4], [1, 4], [2, 8], [1, 5], [0, 4]],
    active: [8, 15],
    box: [12, 52, 58, 98],
    strike: { damage: 9, chip: 0, stun: 18, block: 14, push: 4.5, level: "mid", heavy: true, wreck: 48 },
  },
  crouchPunch: {
    anim: "crouchPunch",
    seq: [[0, 3], [1, 6], [0, 4]],
    active: [3, 8],
    box: [18, 52, 20, 36],
    crouching: true,
    strike: { damage: 5, chip: 0, stun: 13, block: 8, push: 3, level: "mid", wreck: 30 },
  },
  sweep: {
    anim: "sweep",
    seq: [[0, 4], [1, 4], [2, 10], [1, 6], [0, 8]],
    active: [8, 17],
    box: [30, 96, 0, 16],
    crouching: true,
    strike: { damage: 9, chip: 0, stun: 0, block: 14, push: 3, level: "low", knockdown: true, heavy: true, wreck: 50 },
  },
  jumpPunch: {
    anim: "jumpPunch",
    seq: [[0, 3], [1, Infinity]],
    active: [3, Infinity],
    box: [4, 40, 34, 58],
    air: true,
    strike: { damage: 7, chip: 0, stun: 16, block: 12, push: 3, level: "overhead", wreck: 34 },
  },
  jumpKick: {
    anim: "jumpKick",
    seq: [[0, 4], [1, Infinity]],
    active: [4, Infinity],
    box: [10, 62, 46, 72],
    air: true,
    strike: { damage: 9, chip: 0, stun: 18, block: 14, push: 4, level: "overhead", heavy: true, wreck: 44 },
  },
  hadouken: {
    anim: "hadouken",
    seq: [[0, 3], [1, 4], [2, 4], [3, 28]],
  },
  shoryuken: {
    anim: "shoryuken",
    seq: [[0, 3], [1, 5], [2, 6], [3, 8], [4, Infinity]],
    active: [3, 15],
    box: [-4, 34, 30, 130],
    strike: { damage: 15, chip: 3, stun: 0, block: 18, push: 3, level: "mid", knockdown: true, heavy: true, wreck: 60 },
  },
  tatsu: {
    anim: "tatsu",
    seq: [[0, 5], ...SPIN, ...SPIN, ...SPIN, [5, Infinity]],
    active: [5, 41],
    box: [-62, 68, 46, 74],
    strike: { damage: 12, chip: 2, stun: 0, block: 16, push: 4, level: "mid", knockdown: true, heavy: true, wreck: 54 },
  },
};

const FIREBALL: Strike = { damage: 10, chip: 2, stun: 18, block: 14, push: 4, level: "mid", heavy: true, wreck: 56 };

// Hurtboxes, facing right, relative to the feet.
const STAND: Rect = [-22, 24, 0, 92];
const CROUCH: Rect = [-24, 30, 0, 62];
const AIRBORNE: Rect = [-20, 22, 6, 84];

type State =
  | "idle"
  | "walk"
  | "crouch"
  | "jumpsquat"
  | "air"
  | "land"
  | "attack"
  | "block"
  | "hit"
  | "fall"
  | "down"
  | "getup"
  | "ko"
  | "win";

interface Held {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  special: boolean;
}

const NONE: Held = { left: false, right: false, up: false, down: false, punch: false, kick: false, special: false };

interface Fighter {
  id: 0 | 1;
  atlas: Atlas;
  x: number;
  alt: number;
  vx: number;
  vy: number;
  face: 1 | -1;
  air: boolean;
  hp: number;
  /** the red part of the health bar catches up after a combo */
  shownHp: number;
  state: State;
  t: number;
  move: MoveId | null;
  moveHit: boolean;
  stun: number;
  stunKind: "high" | "gut" | "crouch";
  crouching: boolean;
  guarding: boolean;
  pushV: number;
  invuln: number;
  airAttacked: boolean;
  landFor: number;
  ko: boolean;
  wallSplat: boolean;
  wins: number;
  combo: number;
  comboShow: number;
  /** keyboard, gamepad and CPU input, merged */
  keys: Held;
  pad: Held;
  /** presses are remembered for a few ticks, so a tap between ticks still counts */
  buf: { punch: number; kick: number; special: number };
  forced: MoveId | null;
  dirs: { d: number; t: number }[];
}

interface Fireball {
  owner: 0 | 1;
  x: number;
  alt: number;
  dir: 1 | -1;
  t: number;
  dead: boolean;
}

interface Spark {
  x: number;
  alt: number;
  t: number;
  kind: "hit" | "heavy" | "block" | "splash";
}

interface Brain {
  wait: number;
  hold: Partial<Held>;
  holdT: number;
  seen: WeakSet<Fireball>;
}

const KEYS: Record<string, [0 | 1, keyof Held]> = {
  KeyA: [0, "left"],
  KeyD: [0, "right"],
  KeyW: [0, "up"],
  KeyS: [0, "down"],
  KeyF: [0, "punch"],
  KeyG: [0, "kick"],
  KeyE: [0, "special"],
  ArrowLeft: [1, "left"],
  ArrowRight: [1, "right"],
  ArrowUp: [1, "up"],
  ArrowDown: [1, "down"],
  KeyK: [1, "punch"],
  KeyL: [1, "kick"],
  KeyO: [1, "special"],
  Numpad1: [1, "punch"],
  Numpad2: [1, "kick"],
  Numpad3: [1, "special"],
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

export class FightGame {
  private ctx: CanvasRenderingContext2D;
  private wreck: PageWreck;
  /** screen px per art px */
  private k = 2.5;
  private arenaW = 500;
  private floorY = 0;
  private headerBottom = 0;
  private font = "monospace";

  private mode: Mode = "cpu";
  private fighters: [Fighter, Fighter];
  private fireballs: Fireball[] = [];
  private sparks: Spark[] = [];
  private brain: Brain = { wait: 30, hold: {}, holdT: 0, seen: new WeakSet() };
  private phase: "intro" | "fight" | "ko" | "over" = "intro";
  private phaseT = 0;
  private round = 1;
  private clock = ROUND_TIME;
  private tick = 0;
  private freeze = 0;
  private slow = 1;
  private flash = 0;
  private banner: { text: string; sub?: string } | null = null;
  private stats = { hits: [0, 0] as [number, number], maxCombo: [0, 0] as [number, number], time: 0 };
  private padPrev: [Held, Held] = [{ ...NONE }, { ...NONE }];
  /** a special tapped on the touch controls, for player 1, waiting a moment for them to be free */
  private queued: { id: Special; at: number } | null = null;

  private running = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private over = false;

  constructor(
    private canvas: HTMLCanvasElement,
    atlases: [Atlas, Atlas],
    private sfx: Sfx,
    private onEnd: (s: FightStats) => void,
    private onShake: (strength: number) => void
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.wreck = new PageWreck((s) => {
      this.onShake(s);
      this.sfx.hit("crumble");
    });
    this.fighters = [this.newFighter(0, atlases[0]), this.newFighter(1, atlases[1])];
    const root = document.querySelector("[data-page-root]") ?? document.body;
    this.font = getComputedStyle(root).fontFamily || "monospace";
    this.resize();
  }

  // ---------- public API ----------

  start(mode: Mode) {
    this.mode = mode;
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
    // Ryu stands about 30% of the screen tall, but the stage must stay at least 320 art px wide
    const k = Math.min((vh * 0.3) / 94, vw / 320);
    this.k = Math.max(1, Math.round(k * 4) / 4);
    this.arenaW = vw / this.k;
    this.floorY = vh - FLOOR_GAP;
    for (const f of this.fighters) f.x = Math.max(WALL, Math.min(this.arenaW - WALL, f.x));
    this.wreck.measure();
  }

  key(code: string, down: boolean) {
    let map = KEYS[code];
    if (!map) return false;
    // alone against the CPU, either half of the keyboard drives player 1
    if (this.mode === "cpu") map = [0, map[1]];
    const f = this.fighters[map[0]];
    const name = map[1];
    if (down && !f.keys[name] && (name === "punch" || name === "kick" || name === "special")) {
      f.buf[name] = 4;
      this.sfx.unlock();
    }
    f.keys[name] = down;
    return true;
  }

  releaseAll() {
    for (const f of this.fighters) f.keys = { ...NONE };
  }

  /** One-tap special for player 1 (the touch controls), without the motion. */
  tapSpecial(id: Special) {
    this.queued = { id, at: this.tick };
    this.sfx.unlock();
  }

  // ---------- match flow ----------

  private newFighter(id: 0 | 1, atlas: Atlas): Fighter {
    return {
      id,
      atlas,
      x: 0,
      alt: 0,
      vx: 0,
      vy: 0,
      face: id === 0 ? 1 : -1,
      air: false,
      hp: MAX_HP,
      shownHp: MAX_HP,
      state: "idle",
      t: 0,
      move: null,
      moveHit: false,
      stun: 0,
      stunKind: "high",
      crouching: false,
      guarding: false,
      pushV: 0,
      invuln: 0,
      airAttacked: false,
      landFor: 0,
      ko: false,
      wallSplat: false,
      wins: 0,
      combo: 0,
      comboShow: 0,
      keys: { ...NONE },
      pad: { ...NONE },
      buf: { punch: 0, kick: 0, special: 0 },
      forced: null,
      dirs: [],
    };
  }

  private newMatch() {
    this.over = false;
    this.round = 1;
    this.stats = { hits: [0, 0], maxCombo: [0, 0], time: 0 };
    for (const f of this.fighters) f.wins = 0;
    window.scrollTo({ top: 0, behavior: "instant" });
    this.wreck.reset();
    this.newRound();
  }

  private newRound() {
    const [a, b] = this.fighters;
    for (const f of this.fighters) {
      Object.assign(f, {
        alt: 0, vx: 0, vy: 0, air: false, hp: MAX_HP, shownHp: MAX_HP, move: null, stun: 0, pushV: 0, invuln: 0,
        ko: false, combo: 0, comboShow: 0, forced: null, dirs: [], wallSplat: false,
      });
      this.setState(f, "idle");
    }
    a.x = this.arenaW * 0.3;
    b.x = this.arenaW * 0.7;
    a.face = 1;
    b.face = -1;
    this.fireballs = [];
    this.sparks = [];
    this.clock = ROUND_TIME;
    this.phase = "intro";
    this.phaseT = 0;
    this.slow = 1;
    this.banner = { text: this.round === 1 ? "ROUND 1" : this.round === 5 ? "FINAL ROUND" : `ROUND ${this.round}` };
    if (this.round === 1) this.sfx.voice("fight", 0.8);
    else this.goToSection(this.round - 1);
  }

  /** Each round is fought over the next section of the portfolio. */
  private goToSection(i: number) {
    const el = document.getElementById(SECTIONS[i % SECTIONS.length]);
    if (!el) return;
    const top = Math.max(0, docBox(el).y - this.headerBottom - 8);
    window.scrollTo({ top, behavior: "smooth" });
  }

  private updatePhase() {
    this.phaseT++;
    if (this.phase === "intro") {
      if (this.phaseT === 100) {
        // the section has scrolled in and its reveal animations have settled
        this.wreck.measure();
        this.banner = { text: "FIGHT!" };
      }
      if (this.phaseT >= INTRO) {
        this.phase = "fight";
        this.phaseT = 0;
        this.banner = null;
      }
    } else if (this.phase === "fight") {
      this.stats.time += TICK;
      if (this.phaseT % 60 === 0 && --this.clock <= 0) this.timeOver();
    } else if (this.phase === "ko") {
      if (this.phaseT === 45) this.slow = 1;
      const lying = this.fighters.every((f) => !f.ko || f.state === "ko");
      const settled = this.fighters.every((f) => !f.air);
      if (this.phaseT > 70 && lying && settled) this.endRound();
    } else if (this.phase === "over") {
      if (this.phaseT === 150) this.next();
    }
  }

  private timeOver() {
    const [a, b] = this.fighters;
    this.phase = "ko";
    this.phaseT = 60;
    if (a.hp === b.hp) {
      a.wins++;
      b.wins++;
      this.finishRound(null, "TIME OVER");
    } else {
      const w = a.hp > b.hp ? a : b;
      w.wins++;
      this.finishRound(w, "TIME OVER");
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

  private finishRound(winner: Fighter | null, sub?: string) {
    this.phase = "over";
    this.phaseT = 0;
    if (winner) {
      this.setState(winner, "win");
      winner.face = winner.x < this.fighters[1 - winner.id].x ? 1 : -1;
      const perfect = winner.hp >= MAX_HP;
      this.banner = { text: `${this.tag(winner.id)} WINS`, sub: sub ?? (perfect ? "PERFECT" : undefined) };
    } else {
      this.banner = { text: "DRAW", sub };
    }
  }

  private next() {
    const [a, b] = this.fighters;
    if (a.wins >= ROUNDS_TO_WIN || b.wins >= ROUNDS_TO_WIN) {
      if (this.over) return;
      this.over = true;
      const winner = a.wins === b.wins ? null : a.wins > b.wins ? 0 : 1;
      this.onEnd({
        winner,
        rounds: [a.wins, b.wins],
        hits: [...this.stats.hits],
        maxCombo: [...this.stats.maxCombo],
        letters: this.wreck.destroyed,
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
    this.render();
    if (this.running) this.raf = requestAnimationFrame(this.frame);
  };

  private step() {
    this.tick++;
    this.pollPads();
    this.updatePhase();
    this.flash = Math.max(0, this.flash - 0.06);
    for (const f of this.fighters) {
      f.shownHp = f.shownHp > f.hp && (f.stun <= 0 || f.state !== "hit") ? Math.max(f.hp, f.shownHp - 0.6) : f.shownHp;
      if (f.comboShow > 0) f.comboShow--;
    }
    if (this.freeze > 0) {
      this.freeze--;
      return;
    }
    if (this.mode === "cpu" && this.phase === "fight") this.think(this.fighters[1], this.fighters[0]);
    for (const f of this.fighters) this.recordDir(f);
    for (const f of this.fighters) this.updateFighter(f, this.fighters[1 - f.id]);
    this.separate();
    for (const f of this.fighters) this.checkHit(f, this.fighters[1 - f.id]);
    this.updateFireballs();
    for (const s of this.sparks) s.t++;
    this.sparks = this.sparks.filter((s) => s.t < 14);
    for (const f of this.fighters) {
      for (const k of ["punch", "kick", "special"] as const) if (f.buf[k] > 0) f.buf[k]--;
    }
  }

  // ---------- input ----------

  private held(f: Fighter): Held {
    const k = f.keys;
    const p = f.pad;
    const h = {
      left: k.left || p.left,
      right: k.right || p.right,
      up: k.up || p.up,
      down: k.down || p.down,
      punch: k.punch || p.punch,
      kick: k.kick || p.kick,
      special: k.special || p.special,
    };
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
        punch: b(2) || b(3),
        kick: b(0) || b(1),
        special: b(4) || b(5),
      };
      const prev = this.padPrev[f.id];
      for (const k of ["punch", "kick", "special"] as const) {
        if (now[k] && !prev[k]) {
          f.buf[k] = 4;
          this.sfx.unlock();
        }
      }
      this.padPrev[f.id] = now;
      f.pad = now;
    }
  }

  /** Direction history in numpad notation relative to facing (6 = forward, 2 = down, 3 = down-forward). */
  private recordDir(f: Fighter) {
    const h = this.held(f);
    const fwd = f.face > 0 ? h.right : h.left;
    const back = f.face > 0 ? h.left : h.right;
    const d = 5 + (fwd ? 1 : back ? -1 : 0) + (h.up ? 3 : h.down ? -3 : 0);
    if (f.dirs[f.dirs.length - 1]?.d !== d) f.dirs.push({ d, t: this.tick });
    if (f.dirs.length > 24) f.dirs.shift();
  }

  /** Recent motion, e.g. "5236" for a quarter circle forward. */
  private motion(f: Fighter, window = 16) {
    return f.dirs
      .filter((e) => e.t >= this.tick - window)
      .map((e) => e.d)
      .join("");
  }

  private holdingBack(f: Fighter, fromX: number) {
    const h = this.held(f);
    return fromX > f.x ? h.left : h.right;
  }

  // ---------- fighters ----------

  private setState(f: Fighter, s: State) {
    f.state = s;
    f.t = 0;
    if (s !== "attack") f.move = null;
  }

  private startMove(f: Fighter, id: MoveId) {
    f.state = "attack";
    f.t = 0;
    f.move = id;
    f.moveHit = false;
    f.buf = { punch: 0, kick: 0, special: 0 };
    if (MOVES[id].air) f.airAttacked = true;
    if (id === "hadouken") this.sfx.voice("hadouken", 0.9);
    if (id === "shoryuken") {
      this.sfx.voice("shoryuken", 0.9);
      f.invuln = 8;
    }
    if (id === "tatsu") this.sfx.hit("whiff");
  }

  private canAct(f: Fighter) {
    return this.phase === "fight" && (f.state === "idle" || f.state === "walk" || f.state === "crouch");
  }

  /** Specials first (motion + button), then normals. */
  private tryAttack(f: Fighter, h: Held) {
    const q = this.queued;
    if (f.id === 0 && q) {
      this.queued = null;
      if (this.tick - q.at <= 12) f.forced = q.id;
    }
    if (f.forced) {
      const id = f.forced;
      f.forced = null;
      if (id !== "hadouken" || !this.fireballs.some((b) => b.owner === f.id)) this.startMove(f, id);
      return f.state === "attack";
    }
    // lenient for keyboards: a step or two may sit between the directions, and one after
    const m = this.motion(f);
    const hasFireball = this.fireballs.some((b) => b.owner === f.id);
    if (f.buf.punch && /6\d{0,2}2\d?[36]\d?$/.test(m)) {
      this.startMove(f, "shoryuken");
    } else if ((f.buf.punch && /2\d{0,2}6\d?$/.test(m)) || f.buf.special) {
      if (hasFireball) {
        f.buf.special = 0;
        return false;
      }
      this.startMove(f, "hadouken");
    } else if (f.buf.kick && /2\d{0,2}4\d?$/.test(m)) {
      this.startMove(f, "tatsu");
    } else if (f.buf.punch) {
      this.startMove(f, h.down ? "crouchPunch" : "punch");
    } else if (f.buf.kick) {
      this.startMove(f, h.down ? "sweep" : "kick");
    } else return false;
    return true;
  }

  /** Blocks automatically when holding back while something is coming. */
  private threatened(f: Fighter, opp: Fighter) {
    const d = Math.abs(opp.x - f.x);
    if (opp.state === "attack" && d < 150) return true;
    return this.fireballs.some((b) => b.owner !== f.id && Math.abs(b.x - f.x) < 180 && Math.sign(f.x - b.x) === b.dir);
  }

  private updateFighter(f: Fighter, opp: Fighter) {
    f.t++;
    if (f.invuln > 0) f.invuln--;
    const h = this.phase === "fight" ? this.held(f) : NONE;
    const facing = (opp.x > f.x ? 1 : -1) as 1 | -1;

    switch (f.state) {
      case "idle":
      case "walk":
      case "crouch": {
        f.face = facing;
        f.crouching = h.down;
        if (this.canAct(f) && this.tryAttack(f, h)) break;
        const back = this.holdingBack(f, opp.x);
        f.guarding = back && this.threatened(f, opp);
        if (h.up && this.phase === "fight") {
          this.setState(f, "jumpsquat");
          f.vx = (h.right ? 1 : h.left ? -1 : 0) * JUMP_VX;
        } else if (h.down) {
          if (f.state !== "crouch") this.setState(f, "crouch");
        } else if ((h.left || h.right) && !f.guarding) {
          const dir = h.right ? 1 : -1;
          f.x += dir * (dir === f.face ? WALK_F : WALK_B);
          if (f.state !== "walk") this.setState(f, "walk");
          if (f.t % 6 === 0) this.scuff(f, dir * 120, 0);
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
        if (!f.airAttacked && this.phase === "fight" && (f.buf.punch || f.buf.kick)) {
          this.startMove(f, f.buf.kick ? "jumpKick" : "jumpPunch");
        }
        break;
      case "land":
        if (f.t >= f.landFor) this.setState(f, "idle");
        break;
      case "attack":
        this.updateMove(f);
        break;
      case "block":
      case "hit":
        f.crouching = f.state === "block" ? h.down : f.crouching;
        if (--f.stun <= 0) {
          f.combo = 0;
          opp.combo = 0;
          this.setState(f, f.crouching ? "crouch" : "idle");
        }
        break;
      case "down":
        if (f.t >= 44) this.setState(f, "getup");
        break;
      case "getup":
        f.invuln = 2;
        if (f.t >= 20) {
          f.face = facing;
          this.setState(f, "idle");
        }
        break;
    }

    // knockback slide
    if (f.pushV) {
      f.x += f.pushV;
      f.pushV *= 0.82;
      if (Math.abs(f.pushV) < 0.1) f.pushV = 0;
    }

    if (f.air) this.updateAir(f);
    this.keepInArena(f);
  }

  private updateMove(f: Fighter) {
    const def = MOVES[f.move!];
    const t = f.t;
    if (f.move === "hadouken" && t === 11) {
      this.fireballs.push({ owner: f.id, x: f.x + f.face * 52, alt: 58, dir: f.face, t: 0, dead: false });
    }
    if (f.move === "shoryuken") {
      if (t === 3) {
        f.air = true;
        f.vy = 11;
        f.vx = 1.4 * f.face;
      }
      if (t >= 3 && t < 15 && t % 3 === 0) this.wreckAt(f, [0, 30, 60, 130], def.strike!, 0.6);
    }
    if (f.move === "tatsu") {
      if (t === 5) {
        f.air = true;
        f.vy = 0;
      }
      if (t >= 5 && t < 41) {
        f.alt += (34 - f.alt) * 0.3;
        f.vy = 0;
        f.x += 3.2 * f.face;
        if (t % 4 === 0) this.wreckAt(f, def.box!, def.strike!, 0.5);
        if (t % 12 === 5) this.sfx.hit("whiff");
      }
    }
    if (def.active && t === def.active[0] && def.box && def.strike && f.move !== "tatsu" && f.move !== "shoryuken") {
      // a whiff still hits the page
      this.sfx.hit("whiff");
      this.wreckAt(f, def.box, def.strike, 0.6);
    }
    if (!def.air && f.move !== "shoryuken" && f.move !== "tatsu" && t >= seqLength(def.seq)) {
      this.setState(f, f.crouching && def.crouching ? "crouch" : "idle");
    }
  }

  private updateAir(f: Fighter) {
    const spinning = f.move === "tatsu" && f.t >= 5 && f.t < 41;
    if (!spinning) {
      f.alt += f.vy;
      f.vy -= GRAVITY;
      f.x += f.vx;
    }
    if (f.alt > 0) return;
    // landing
    f.alt = 0;
    f.vy = 0;
    f.vx = 0;
    f.air = false;
    if (f.state === "fall") {
      this.sfx.hit("thud");
      this.onShake(f.ko ? 14 : 6);
      const at = this.toDoc(f.x, 10);
      this.wreck.blast(at.x, at.y, (f.ko ? 130 : 60) * this.scale(), f.ko ? 3 : 1, at.x, at.y + 40);
      this.scuff(f, 0, 260, 80);
      if (f.ko) this.flash = 0.5;
      this.setState(f, f.ko ? "ko" : "down");
      return;
    }
    this.scuff(f, 0, 160, 50);
    const recovery = f.move === "shoryuken" ? 16 : f.move === "tatsu" ? 8 : 3;
    f.landFor = recovery;
    this.setState(f, "land");
  }

  private keepInArena(f: Fighter) {
    const min = WALL;
    const max = this.arenaW - WALL;
    if (f.x >= min && f.x <= max) return;
    const speed = Math.abs(f.pushV) + Math.abs(f.vx);
    f.x = Math.max(min, Math.min(max, f.x));
    // knocked hard into the edge of the screen: the page around the wall cracks
    if ((f.state === "hit" || f.state === "fall") && speed > 2.5 && !f.wallSplat) {
      f.wallSplat = true;
      const dir = Math.sign(f.pushV || f.vx);
      const at = this.toDoc(f.x + dir * PUSH_W, f.alt + 50);
      this.wreck.blast(at.x, at.y, 70 * this.scale(), 2, at.x - dir * 40, at.y);
      this.onShake(8);
      this.sfx.hit("thud");
    }
    f.pushV = 0;
    if (f.state === "fall") f.vx = 0;
  }

  /** Fighters can't walk through each other. */
  private separate() {
    const [a, b] = this.fighters;
    if (!this.solid(a) || !this.solid(b)) return;
    if (Math.abs(a.alt - b.alt) > 70) return;
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
    return f.state !== "fall" && f.state !== "down" && f.state !== "ko" && f.state !== "getup";
  }

  // ---------- hits ----------

  private place(f: Fighter, [x0, x1, y0, y1]: Rect): Rect {
    const a = f.x + f.face * x0;
    const b = f.x + f.face * x1;
    return [Math.min(a, b), Math.max(a, b), f.alt + y0, f.alt + y1];
  }

  private hurtbox(f: Fighter): Rect | null {
    if (!this.solid(f) || f.invuln > 0 || f.state === "win") return null;
    if (f.air) return this.place(f, AIRBORNE);
    const low = f.state === "attack" ? MOVES[f.move!].crouching : f.state === "crouch" || f.crouching;
    return this.place(f, low ? CROUCH : STAND);
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

  /** A strike reaches the defender, from fromX, with the impact at (x, y). */
  private land(a: Fighter, d: Fighter, s: Strike, fromX: number, x: number, y: number) {
    const away = (d.x >= fromX ? 1 : -1) as 1 | -1;
    const canBlock = !d.air && (d.state === "idle" || d.state === "walk" || d.state === "crouch" || d.state === "block");
    const crouching = this.held(d).down;
    const levelOk = s.level === "mid" || (s.level === "low" ? crouching : !crouching);
    const blocked = this.phase === "fight" && canBlock && this.holdingBack(d, fromX) && levelOk;
    const from = this.toDoc(fromX, y + 10);
    const at = this.toDoc(x, y);

    if (blocked) {
      d.hp = Math.max(1, d.hp - s.chip);
      d.shownHp = d.hp;
      d.crouching = crouching;
      d.stun = s.block;
      this.setState(d, "block");
      this.push(a, d, s.push * 0.8, away);
      this.sparks.push({ x, alt: y, t: 0, kind: "block" });
      this.sfx.hit("block");
      this.freeze = 5;
      this.wreck.blast(at.x, at.y, s.wreck * 0.4 * this.scale(), 0, from.x, from.y, 12);
      return;
    }

    const comboing = d.state === "hit" || d.state === "fall";
    a.combo = comboing ? a.combo + 1 : 1;
    if (a.combo > 1) a.comboShow = 70;
    this.stats.hits[a.id]++;
    this.stats.maxCombo[a.id] = Math.max(this.stats.maxCombo[a.id], a.combo);
    const scaled = Math.max(1, Math.round(s.damage * Math.max(0.5, 1 - (a.combo - 1) * 0.15)));
    d.hp = Math.max(0, d.hp - scaled);
    d.wallSplat = false;

    if (d.hp <= 0 || s.knockdown || d.air) {
      d.ko = d.hp <= 0;
      d.air = true;
      d.vy = d.ko ? 7.5 : 6.5;
      d.vx = away * (d.ko ? 3.4 : 2.6);
      d.pushV = 0;
      d.face = (-away) as 1 | -1;
      this.setState(d, "fall");
    } else {
      d.crouching = crouching;
      d.stunKind = crouching ? "crouch" : y > 70 ? "high" : "gut";
      d.stun = s.stun;
      this.setState(d, "hit");
      this.push(a, d, s.push, away);
    }

    this.sparks.push({ x, alt: y, t: 0, kind: s.heavy ? "heavy" : "hit" });
    this.sfx.hit(s.heavy ? "heavy" : "light");
    this.freeze = s.heavy ? 9 : 6;
    this.onShake(s.heavy ? 7 : 3);
    this.wreck.blast(at.x, at.y, s.wreck * this.scale(), s.heavy ? 2 : 1, from.x, from.y);

    if (d.ko) this.knockout();
  }

  private push(a: Fighter, d: Fighter, v: number, away: 1 | -1) {
    const nearWall = away > 0 ? d.x > this.arenaW - WALL - 6 : d.x < WALL + 6;
    // against the wall the attacker takes the pushback, as in the arcade
    if (nearWall && !a.air) a.pushV = -away * v;
    else d.pushV = away * v;
  }

  private knockout() {
    if (this.phase !== "fight") return;
    this.phase = "ko";
    this.phaseT = 0;
    this.slow = 0.3;
    this.flash = 0.8;
    this.banner = { text: "K.O." };
    this.freeze = 0;
    this.fireballs = [];
    this.sfx.voice("ko", 0.9);
    this.onShake(16);
  }

  /** The page under a move's box takes a hit even if the opponent doesn't. */
  private wreckAt(f: Fighter, box: Rect, s: Strike, power: number) {
    const r = this.place(f, box);
    const at = this.toDoc(r[0] + (r[1] - r[0]) * (f.face > 0 ? 0.8 : 0.2), (r[2] + r[3]) / 2);
    const from = this.toDoc(f.x, f.alt + 60);
    this.wreck.blast(at.x, at.y, s.wreck * power * this.scale(), power >= 0.6 ? 1 : 0, from.x, from.y, 40);
  }

  /** Kicks the rubble at a fighter's feet: along with vx, out to both sides by spread. */
  private scuff(f: Fighter, vx: number, spread: number, width = 30) {
    const at = this.toDoc(f.x, 0);
    this.wreck.kick(at.x, width * this.k, at.y, vx, spread);
  }

  // ---------- fireballs ----------

  private updateFireballs() {
    for (const b of this.fireballs) {
      if (b.dead) continue;
      b.t++;
      b.x += b.dir * FIREBALL_SPEED;
      // plough a trench through the text it flies past
      if (b.t % 2 === 0) {
        const at = this.toDoc(b.x, b.alt);
        this.wreck.blast(at.x, at.y, 26 * this.scale(), 1, at.x - b.dir * 60, at.y, 30);
      }
      const box: Rect = [b.x - 22, b.x + 22, b.alt - 12, b.alt + 12];
      const target = this.fighters[1 - b.owner];
      const hurt = this.hurtbox(target);
      if (hurt && overlap(box, hurt)) {
        b.dead = true;
        this.splash(b);
        this.land(this.fighters[b.owner], target, FIREBALL, b.x - b.dir * 30, b.x + b.dir * 10, b.alt);
        continue;
      }
      if (b.x < 0 || b.x > this.arenaW) {
        // into the edge of the screen: it blows a crater in the page
        b.dead = true;
        this.splash(b);
        const at = this.toDoc(b.x, b.alt);
        this.wreck.blast(at.x, at.y, 80 * this.scale(), 2, at.x - b.dir * 80, at.y);
        this.onShake(6);
      }
    }
    // two fireballs cancel out
    const [p, q] = [this.fireballs.find((b) => b.owner === 0 && !b.dead), this.fireballs.find((b) => b.owner === 1 && !b.dead)];
    if (p && q && Math.abs(p.x - q.x) < 40) {
      p.dead = q.dead = true;
      this.splash(p);
      this.splash(q);
    }
    this.fireballs = this.fireballs.filter((b) => !b.dead);
  }

  private splash(b: Fireball) {
    this.sparks.push({ x: b.x, alt: b.alt, t: 0, kind: "splash" });
    this.sfx.hit("heavy");
    const at = this.toDoc(b.x, b.alt);
    this.wreck.blast(at.x, at.y, 50 * this.scale(), 2, at.x - b.dir * 50, at.y);
  }

  // ---------- CPU ----------

  /** A beatable opponent: reacts a little late, blocks some of the time, loves fireballs. */
  private think(me: Fighter, opp: Fighter) {
    const b = this.brain;
    const dist = Math.abs(opp.x - me.x);
    const fwd: keyof Held = opp.x > me.x ? "right" : "left";
    const back: keyof Held = opp.x > me.x ? "left" : "right";
    const free = me.state === "idle" || me.state === "walk" || me.state === "crouch";
    const press = (k: "punch" | "kick") => (me.buf[k] = 3);
    const hold = (h: Partial<Held>, ticks: number) => {
      b.hold = h;
      b.holdT = ticks;
    };

    if (b.holdT > 0) b.holdT--;
    else b.hold = {};

    // reactions, checked every tick
    const incoming = this.fireballs.find((f) => f.owner !== me.id && Math.sign(me.x - f.x) === f.dir && Math.abs(f.x - me.x) < 170);
    if (incoming && !b.seen.has(incoming) && free) {
      b.seen.add(incoming);
      const r = Math.random();
      if (r < 0.45) hold({ [back]: true }, 45);
      else if (r < 0.8) hold({ up: true, [fwd]: true }, 6);
    } else if (opp.state === "attack" && dist < 120 && free && b.holdT === 0 && chance(0.1)) {
      hold({ [back]: true, down: opp.move === "sweep" || chance(0.4) }, 20);
    } else if (opp.air && opp.vy < 2 && dist < 95 && free && chance(0.07)) {
      me.forced = "shoryuken";
    }
    if (me.air && !me.airAttacked && dist < 100 && me.vy < 3) press(chance(0.6) ? "kick" : "punch");

    me.keys = { ...NONE, ...b.hold };
    if (--b.wait > 0 || !free || b.holdT > 0) return;
    b.wait = Math.round(rand(8, 22));
    const r = Math.random();
    if (dist > 200) {
      if (r < 0.3) me.forced = "hadouken";
      else if (r < 0.75) hold({ [fwd]: true }, Math.round(rand(14, 34)));
      else if (r < 0.88) hold({ up: true, [fwd]: true }, 6);
    } else if (dist > 85) {
      if (r < 0.35) hold({ [fwd]: true }, Math.round(rand(10, 24)));
      else if (r < 0.52) hold({ up: true, [fwd]: true }, 6);
      else if (r < 0.66) me.forced = "hadouken";
      else if (r < 0.76) hold({ [back]: true }, Math.round(rand(10, 20)));
      else if (r < 0.84) me.forced = "tatsu";
    } else {
      if (r < 0.26) press("punch");
      else if (r < 0.46) press("kick");
      else if (r < 0.62) {
        hold({ down: true }, 8);
        press("punch");
      } else if (r < 0.76) {
        hold({ down: true }, 12);
        press("kick");
      } else if (r < 0.84) me.forced = "tatsu";
      else if (r < 0.9) me.forced = "shoryuken";
      else hold({ [back]: true }, 16);
    }
    me.keys = { ...NONE, ...b.hold };
  }

  // ---------- coordinates ----------

  private scale() {
    return this.k / 2.5;
  }

  /** Arena (art px, height above floor) to document px. */
  private toDoc(x: number, alt: number) {
    return { x: window.scrollX + x * this.k, y: window.scrollY + this.floorY - alt * this.k };
  }

  // ---------- rendering ----------

  private sprite(f: Fighter): string {
    const t = f.t;
    switch (f.state) {
      case "idle":
      case "walk":
        if (f.guarding) return "block0";
        if (f.state === "walk") {
          const fwd = (this.held(f).right ? 1 : -1) === f.face;
          return `${fwd ? "walkF" : "walkB"}${Math.floor(t / 5) % 6}`;
        }
        return `idle${[0, 1, 2, 3, 2, 1][Math.floor(t / 8) % 6]}`;
      case "crouch":
        return f.guarding ? "crouchBlock0" : "crouch0";
      case "jumpsquat":
      case "land":
        return "jump0";
      case "air": {
        const p = Math.min(1, t / AIR_TICKS);
        if (f.vx !== 0 && p > 0.15 && p < 0.85) return `flip${Math.min(3, Math.floor(((p - 0.15) / 0.7) * 4))}`;
        return `jump${1 + Math.min(5, Math.floor(p * 6))}`;
      }
      case "attack": {
        const def = MOVES[f.move!];
        return `${def.anim}${frameAt(def.seq, t)}`;
      }
      case "block":
        return f.crouching ? "crouchBlock0" : "block0";
      case "hit": {
        const anim = f.stunKind === "crouch" ? "crouchHit" : f.stunKind === "gut" ? "gutHit" : "hit";
        return `${anim}${t < 5 ? 0 : 1}`;
      }
      case "fall":
        return "knockdown0";
      case "down":
        return `knockdown${t < 6 ? 1 : t < 12 ? 2 : 3}`;
      case "ko":
        return t < 6 ? "knockdown2" : "ko0";
      case "getup":
        return `getup${Math.min(3, Math.floor(t / 5))}`;
      case "win":
        return `win${Math.min(2, Math.floor(t / 8))}`;
    }
  }

  private render() {
    const { ctx, k } = this;
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    ctx.imageSmoothingEnabled = false;

    // the page damage, in document coordinates, below the sticky header
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.headerBottom, vw, vh - this.headerBottom);
    ctx.clip();
    ctx.translate(-window.scrollX, -window.scrollY);
    this.wreck.draw(ctx, window.scrollY - 200, window.scrollY + vh + 200);
    ctx.restore();

    // floor: a dotted rule like the page's own
    ctx.fillStyle = "#3f3f46";
    for (let x = 0; x < vw; x += 4) ctx.fillRect(x, this.floorY, 1.5, 1.5);

    const sx = (x: number) => x * k;
    const sy = (alt: number) => this.floorY - alt * k;
    const shake = this.freeze > 0 ? (this.freeze % 2 ? 1.5 : -1.5) : 0;

    // shadows, then fighters: whoever is attacking draws on top
    for (const f of this.fighters) {
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.ellipse(sx(f.x), this.floorY, 26 * k * Math.max(0.5, 1 - f.alt / 200), 3 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const order = [...this.fighters].sort((a, b) => Number(a.state === "attack") - Number(b.state === "attack"));
    for (const f of order) {
      const hitShake = f.state === "hit" || f.state === "block" ? shake : 0;
      drawFrame(ctx, f.atlas, this.sprite(f), sx(f.x) + hitShake, sy(f.alt), k, f.face < 0);
    }

    for (const b of this.fireballs) {
      drawFrame(ctx, this.fighters[b.owner].atlas, `fireball${Math.floor(b.t / 4) % 4}`, sx(b.x), sy(b.alt - 16), k, b.dir < 0);
    }
    for (const s of this.sparks) this.drawSpark(s, sx(s.x), sy(s.alt));

    // name tags over heads
    ctx.font = `bold ${Math.max(10, Math.round(k * 4))}px ${this.font}`;
    ctx.textAlign = "center";
    for (const f of this.fighters) {
      if (f.state === "down" || f.state === "ko") continue;
      ctx.fillStyle = f.id === 0 ? "#fafafa" : "#94a3b8";
      ctx.fillText(this.tag(f.id), sx(f.x), sy(f.alt + 112));
    }

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.35})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    this.drawHud(vw);
  }

  private drawSpark(s: Spark, x: number, y: number) {
    const { ctx, k } = this;
    if (s.kind === "splash") {
      if (s.t < 12) drawFrame(ctx, this.fighters[0].atlas, `splash${s.t < 6 ? 0 : 1}`, x, y + 28 * k, k);
      return;
    }
    const p = s.t / 14;
    const len = (s.kind === "heavy" ? 26 : s.kind === "block" ? 14 : 18) * k * (0.4 + p);
    ctx.strokeStyle = s.kind === "block" ? `rgba(147,197,253,${1 - p})` : `rgba(255,${s.kind === "heavy" ? 200 : 240},120,${1 - p})`;
    ctx.lineWidth = Math.max(1, k * (1 - p) * 1.6);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + (s.kind === "heavy" ? 0.2 : 0);
      const r0 = len * 0.25;
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * len * (i % 2 ? 0.6 : 1), y + Math.sin(a) * len * (i % 2 ? 0.6 : 1));
    }
    ctx.stroke();
  }

  private drawHud(vw: number) {
    const { ctx } = this;
    const top = this.headerBottom + 44;
    const cx = vw / 2;
    const barW = Math.min(420, vw / 2 - 52);
    const barH = vw < 640 ? 10 : 14;

    // a dark plate so the bars and names stay readable over the page's own headings
    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(cx - 48 - barW, top - 14, (barW + 48) * 2, barH + 38);

    this.fighters.forEach((f, i) => {
      const x0 = i === 0 ? cx - 36 - barW : cx + 36;
      ctx.fillStyle = "#000";
      ctx.fillRect(x0, top, barW, barH);
      const fill = (hp: number, color: string) => {
        const w = (barW * hp) / MAX_HP;
        ctx.fillStyle = color;
        // health drains toward the timer, like the arcade
        ctx.fillRect(i === 0 ? x0 : x0 + barW - w, top, w, barH);
      };
      fill(f.shownHp, "#c81818");
      fill(f.hp, f.hp < MAX_HP * 0.25 && this.tick % 20 < 10 ? "#fde68a" : "#f8d030");
      ctx.strokeStyle = "#fafafa";
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 - 0.5, top - 0.5, barW + 1, barH + 1);

      ctx.font = `bold ${vw < 640 ? 10 : 12}px ${this.font}`;
      ctx.fillStyle = "#fafafa";
      ctx.textAlign = i === 0 ? "left" : "right";
      ctx.textBaseline = "top";
      ctx.fillText(`RYU · ${this.tag(f.id)}`, i === 0 ? x0 : x0 + barW, top + barH + 6);
      // round wins
      for (let n = 0; n < ROUNDS_TO_WIN; n++) {
        const wx = i === 0 ? x0 + barW - 10 - n * 14 : x0 + n * 14;
        ctx.strokeStyle = "#fafafa";
        ctx.strokeRect(wx + 0.5, top + barH + 7.5, 9, 9);
        if (f.wins > n) {
          ctx.fillStyle = "#f8d030";
          ctx.fillRect(wx + 2, top + barH + 9, 6, 6);
        }
      }
      if (f.comboShow > 0 && f.combo > 1) {
        ctx.font = `bold ${vw < 640 ? 16 : 22}px ${this.font}`;
        ctx.fillStyle = "#f8d030";
        ctx.fillText(`${f.combo} HITS`, i === 0 ? x0 : x0 + barW, top + barH + 28);
      }
    });

    ctx.font = `bold ${vw < 640 ? 22 : 30}px ${this.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#fafafa";
    ctx.fillText(String(Math.max(0, this.clock)).padStart(2, "0"), cx, top - 8);

    if (this.banner) {
      const size = Math.min(96, Math.max(36, vw / 12));
      ctx.font = `bold ${size}px ${this.font}`;
      ctx.textBaseline = "middle";
      const y = this.headerBottom + (window.innerHeight - this.headerBottom) * 0.36;
      ctx.lineWidth = Math.max(4, size / 10);
      ctx.strokeStyle = "#000";
      ctx.strokeText(this.banner.text, cx, y);
      ctx.fillStyle = this.banner.text === "K.O." ? "#f8d030" : "#fafafa";
      ctx.fillText(this.banner.text, cx, y);
      if (this.banner.sub) {
        ctx.font = `bold ${size * 0.45}px ${this.font}`;
        ctx.fillStyle = "#f8d030";
        ctx.strokeText(this.banner.sub, cx, y + size * 0.8);
        ctx.fillText(this.banner.sub, cx, y + size * 0.8);
      }
    }
    ctx.textBaseline = "alphabetic";
  }
}
