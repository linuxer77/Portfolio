import { PageWreck } from "../streetfighter/wreck";
import { playRewind } from "../arcade/rewindSound";
import { record, unlock } from "@/lib/arcade";
import { dirOf, drawMon, frameAt, timeOfFrame, type Dir, type Mon, type Species } from "./sprites";
import { effectiveness, MEGA_MOVES, MEGA_NAME, MOVES, SLOT_KEY, STATS, type Kind, type Slot } from "./moves";
import {
  AIR,
  BLUEFIRE,
  DARK,
  DRAGON,
  EARTH,
  FIRE,
  GHOST,
  hash,
  ICE,
  PINK,
  PixelLayer,
  ramp,
  SLUDGE,
  WATER,
} from "./pixels";
import type { Sound } from "./sound";

// ==========================================
// POKÉMON mode: a live 1v1 Pokémon battle on the page, seen from above. The portfolio is the
// arena floor: Charizard, Blastoise and Gengar run around on it, and their moves tear it up.
// Fire sets the text alight, Hydro Pump and Surf wash letters away, Ice Beam frosts them,
// Earthquake cracks the page, Sludge Bomb melts it, Fly and Phantom Force leave craters.
// Types matter in real time (water is super effective on Charizard, Rapid Spin passes right
// through Gengar, Ground can't touch a Flying type), and so do statuses: burn, poison,
// paralysis, sleep and freeze. Like the games, the battle opens with Poké Balls and ends with
// a faint and a recall. Every move is drawn in pixels on the sprites' own grid (pixels.ts),
// and each Pokémon's Burst is a full-screen finale with a cut-in: Blast Burn erupts the whole
// page in fire, Surf floods the screen, Night Shade turns out the lights and reaches for you.
// Moves collide, too: projectiles knock each other out of the air, water and fire meet in a
// cloud of steam, Surf sweeps everything away, and a spinning shell sends shots back.
// Low on HP, a Pokémon can Mega Evolve (E, once a battle): new moves on the same buttons, and
// a Mega Burst that wrecks every letter on the screen.
// You can fight the CPU, or sit back and watch two CPUs fight it out. Exit and the page flies
// back together.
// ==========================================

const TICK = 1 / 60;
const BODY = 15; // body radius, sprite px
const HIGH = 35; // above this (sprite px) a flyer is out of reach of ground moves
const DAMAGE = 0.6; // scales every move, so a battle lasts long enough to read
const CUTIN = 0.95; // how long a Burst's cut-in holds the battle, s
const FINALE: Record<Species, number> = { charizard: 2.2, blastoise: 2.7, gengar: 2.3 };
const MEGA_FINALE: Record<Species, number> = { charizard: 3.0, blastoise: 3.3, gengar: 3.3 };
const MEGA_AT = 0.4; // Mega Evolution unlocks below this much HP

type State =
  | "hidden"
  | "free"
  | "melee"
  | "stream"
  | "cast"
  | "fly"
  | "dive"
  | "spin"
  | "stomp"
  | "sink"
  | "lurk"
  | "rise"
  | "charge"
  | "ult"
  | "evolve"
  | "dash"
  | "buff"
  | "sneak"
  | "dodge"
  | "hurt"
  | "faint"
  | "recall"
  | "gone";

type Status = "brn" | "psn" | "par" | "slp" | "frz";

interface Fighter {
  id: 0 | 1;
  species: Species;
  mon: Mon;
  cpu: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  kx: number; // knockback, decays on its own
  ky: number;
  face: number; // angle
  aimAngle: number;
  hp: number;
  shownHp: number;
  meter: number;
  state: State;
  move: Slot;
  t: number; // time in state
  cd: Record<Slot | "dodge", number>;
  status: Status | null;
  statusT: number;
  statusTick: number;
  invuln: number;
  flash: number;
  grow: number;
  tint: number;
  tintColour: string;
  /** the move in progress has already hit / fired / shown its effectiveness */
  landed: boolean;
  fired: boolean;
  told: boolean;
  /** stream damage clock, and how many times this stream has hit */
  tick: number;
  hits: number;
  wreckT: number;
  slow: number; // standing in sludge
  /** how far a beam actually reaches this frame, once something has blocked it */
  reach: number;
  /** Mega Evolved (its Mega moves are on the buttons), and whether it's been used this battle */
  mega: boolean;
  megaUsed: boolean;
  /** Dragon Dance / Shell Smash: hits harder and moves faster while it lasts, s */
  boost: number;
  /** Shell Smash's price: takes more damage while it lasts, s */
  brittle: number;
  /** Curse: losing HP over time, s */
  curse: number;
  curseTick: number;
  /** Water Pulse: confused, controls reversed, s */
  confused: number;
  input: { x: number; y: number };
  trail: { x: number; y: number; z: number; a: number }[];
  ai: { think: number; strafe: number; strafeT: number; react: number; dive: number };
  stats: { dealt: number; supers: number };
}

type PKind = "flame" | "spark" | "drop" | "foam" | "smoke" | "rock" | "ice" | "wisp" | "bubble" | "zap" | "steam";

/** How much a projectile weighs in a collision: the lighter one is destroyed, equals both go. */
const MASS: Record<Shot["kind"], number> = {
  dragonpulse: 4,
  aura: 3,
  hex: 2,
  waterpulse: 2,
  fireblast: 3,
  shadowball: 3,
  sludge: 2,
  slash: 1,
  hypno: 0,
};

interface Particle {
  kind: PKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  r: number;
  owner?: 0 | 1;
  /** Mega Charizard X's fire burns blue */
  blue?: boolean;
}

/** Things in flight: Fire Blast, Air Slash blades, Shadow Balls, Sludge Bombs, Hypnosis rings. */
interface Shot {
  kind: "fireblast" | "slash" | "shadowball" | "sludge" | "hypno" | "dragonpulse" | "aura" | "hex" | "waterpulse";
  owner: 0 | 1;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  angle: number;
  t: number;
  life: number;
  // a lobbed Sludge Bomb flies from (x0, y0) to (tx, ty)
  x0: number;
  y0: number;
  tx: number;
  ty: number;
}

/** Explosions and shockwaves that play out over time. */
interface Burst {
  kind: "blastburn" | "daikanji" | "quake" | "shadow" | "darkpulse" | "sludgewave";
  owner: 0 | 1;
  x: number;
  y: number;
  t: number;
  max: number;
  hit: boolean;
  wreckT: number;
}

/** Sludge puddles left on the page. */
interface Zone {
  owner: 0 | 1;
  x: number;
  y: number;
  r: number;
  t: number;
  life: number;
  wreckT: number;
  seed: number;
}

interface Ball {
  owner: 0 | 1;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  back: boolean; // flying back to the trainer after a recall
}

interface Wave {
  owner: 0 | 1;
  axis: "x" | "y";
  sign: 1 | -1;
  /** where it set off from: everything between there and the front is under water */
  start: number;
  pos: number;
  end: number;
  hit: boolean;
  wreckT: number;
}

/** Melee flourishes: claw streaks, snapping fangs, a lick. */
interface Swipe {
  kind: "claw" | "fang" | "lick" | "tail" | "aqua" | "shadowclaw";
  x: number;
  y: number;
  angle: number;
  t: number;
  fromX: number;
  fromY: number;
}

export interface BattleStats {
  won: boolean;
  species: Species;
  foe: Species;
  time: number;
  dealt: number;
  taken: number;
  supers: number;
  letters: number;
  hpLeft: number;
  /** CPU vs CPU: nobody's "you", so it's just who won */
  watch: boolean;
}

const STATUS_NAME: Record<Status, string> = { brn: "BRN", psn: "PSN", par: "PAR", slp: "SLP", frz: "FRZ" };
const STATUS_COLOUR: Record<Status, string> = {
  brn: "#e8502c",
  psn: "#a050d0",
  par: "#d8b020",
  slp: "#8890a0",
  frz: "#58b0e0",
};

/** The 大 of Fire Blast: arm angles from the centre (up, left, right, and the two legs). */
const KANJI = [-Math.PI / 2, Math.PI, 0, (Math.PI * 2) / 3, Math.PI / 3];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const distToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
};

export class BattleGame {
  private ctx: CanvasRenderingContext2D;
  private wreck: PageWreck;
  private mons: Record<Species, Mon>;
  private f: [Fighter, Fighter] | null = null;
  private particles: Particle[] = [];
  private shots: Shot[] = [];
  private bursts: Burst[] = [];
  private zones: Zone[] = [];
  private balls: Ball[] = [];
  private waves: Wave[] = [];
  private swipes: Swipe[] = [];
  private flashes: { x: number; y: number; t: number; r: number; colour: string }[] = [];
  /** a Burst's cut-in: the battle holds still while the banner plays */
  private cutin: { owner: 0 | 1; t: number; evolve?: boolean } | null = null;
  /** a Burst in progress */
  private finale: {
    owner: 0 | 1;
    kind: Species;
    t: number;
    hits: number;
    hit: boolean;
    next: number;
    shake: number;
    wreckT: number;
    hands: { x: number; y: number }[];
    /** a Mega Burst: where it's aimed, and how far its sweep across the screen has got */
    mega: boolean;
    x: number;
    y: number;
    sweep: number;
  } | null = null;
  /** told the player Mega Evolution is ready */
  private megaHint = false;
  /** the page's own CSS filter, while Never-Ending Nightmare turns it negative */
  private pageFilter: string | null = null;
  /** someone Mega Evolved: the shell swaps the player's touch buttons */
  onMega: ((id: 0 | 1) => void) | null = null;
  /** Blast Burn's fire geysers */
  private geysers: { x: number; y: number; t: number }[] = [];
  /** how flooded the screen is after Surf, 0 to 1 */
  private flood = 0;
  private ground = new PixelLayer();
  private air = new PixelLayer();
  private keys = new Set<string>();
  private queued: Slot | "dodge" | "mega" | null = null;
  private queuedT = 0;
  private phase: "menu" | "intro" | "battle" | "ko" | "over" = "menu";
  private phaseT = 0;
  private time = 0;
  private clock = 0;
  private freeze = 0;
  private acc = 0;
  private k = 2;
  private headerBottom = 0;
  private font = "monospace";
  private touch = false;
  private messages: string[] = [];
  private message: { text: string; t: number } | null = null;
  private lowBeep = 0;
  private leaving = false;
  private running = false;
  private raf = 0;
  private last = 0;
  private screenFlash = 0;
  private clashSound = 0;
  private clashSaid = 0;
  private sentOut = false;
  /** CPU vs CPU: both sides play themselves */
  private watch = false;

  constructor(
    private canvas: HTMLCanvasElement,
    mons: Record<Species, Mon>,
    private megas: Partial<Record<Species, Mon>>,
    private sound: Sound,
    private onEnd: (stats: BattleStats) => void,
    private onShake: (strength: number) => void
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.mons = mons;
    this.wreck = new PageWreck((s) => this.onShake(s), true);
    const root = document.querySelector("[data-page-root]") ?? document.body;
    this.font = getComputedStyle(root).fontFamily || "monospace";
    this.resize();
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ---------- public API ----------

  setTouch(touch: boolean) {
    this.touch = touch;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    this.k = Math.max(1.5, Math.min(2.6, Math.min(window.innerWidth, window.innerHeight - this.headerBottom) / 330));
  }

  stop() {
    this.invertPage(false);
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** A battle: you send out `species`, the CPU sends out `foe` (or, watching, a CPU sends out each). */
  start(species: Species, foe: Species, watch = false) {
    this.watch = watch;
    this.sound.unlock();
    this.wreck.reset();
    this.particles = [];
    this.shots = [];
    this.bursts = [];
    this.zones = [];
    this.balls = [];
    this.waves = [];
    this.swipes = [];
    this.flashes = [];
    this.cutin = null;
    this.finale = null;
    this.geysers = [];
    this.flood = 0;
    this.megaHint = false;
    this.invertPage(false);
    this.messages = [];
    this.message = null;
    this.keys.clear();
    this.queued = null;
    const a = this.arena();
    this.f = [
      this.fighter(0, species, a.l + (a.r - a.l) * 0.28, a.t + (a.b - a.t) * 0.7),
      this.fighter(1, foe, a.l + (a.r - a.l) * 0.72, a.t + (a.b - a.t) * 0.32),
    ];
    this.f[0].cpu = watch;
    this.phase = "intro";
    this.phaseT = 0;
    this.time = 0;
    this.sentOut = false;
    this.say(`${watch ? "CPU 2" : "RIVAL"} sent out ${foe.toUpperCase()}!`);
    this.throwBall(1);
  }

  key(code: string, down: boolean) {
    const slot = SLOT_KEYS[code];
    const move = MOVE_KEYS.has(code);
    if (!slot && !move) return false;
    if (down) {
      if (!this.keys.has(code) && slot) this.press(slot);
      this.keys.add(code);
    } else this.keys.delete(code);
    return true;
  }

  /** One-tap moves for the touch buttons. */
  press(slot: Slot | "dodge" | "mega") {
    this.queued = slot;
    this.queuedT = 0.18;
  }

  releaseAll() {
    this.keys.clear();
  }

  /** Leaving: the page flies back together, then done(). */
  exit(done: () => void) {
    if (this.leaving) return;
    this.leaving = true;
    this.phase = "over";
    this.invertPage(false);
    playRewind(this.sound.muted);
    this.wreck.rewind(done);
  }

  // ---------- setup ----------

  private fighter(id: 0 | 1, species: Species, x: number, y: number): Fighter {
    const { hp } = STATS[species];
    return {
      id,
      species,
      mon: this.mons[species],
      cpu: id === 1,
      x,
      y,
      z: 0,
      vx: 0,
      vy: 0,
      kx: 0,
      ky: 0,
      face: id === 0 ? -Math.PI / 4 : (Math.PI * 3) / 4,
      aimAngle: 0,
      hp,
      shownHp: hp,
      meter: 0,
      state: "hidden",
      move: "melee",
      t: 0,
      cd: { melee: 0, s1: 0, s2: 0, s3: 0, s4: 0, burst: 0, dodge: 0 },
      status: null,
      statusT: 0,
      statusTick: 0,
      invuln: 0,
      flash: 0,
      grow: 1,
      tint: 0,
      tintColour: "#fff",
      landed: false,
      fired: false,
      told: false,
      tick: 0,
      hits: 0,
      wreckT: 0,
      slow: 0,
      reach: Infinity,
      mega: false,
      megaUsed: false,
      boost: 0,
      brittle: 0,
      curse: 0,
      curseTick: 0,
      confused: 0,
      input: { x: 0, y: 0 },
      trail: [],
      ai: { think: 0.5, strafe: 1, strafeT: 1, react: 0, dive: 0 },
      stats: { dealt: 0, supers: 0 },
    };
  }

  /** The battlefield: the part of the page on screen, in document px. */
  private arena() {
    const sx = window.scrollX;
    const sy = window.scrollY;
    const m = BODY * this.k + 8;
    return {
      l: sx + m,
      r: sx + window.innerWidth - m,
      t: sy + this.headerBottom + m + 20,
      b: sy + window.innerHeight - m - (this.touch ? 170 : 30),
    };
  }

  /** The corner a trainer throws from: yours bottom-left, the rival's top-right. */
  private corner(id: 0 | 1) {
    const sx = window.scrollX;
    const sy = window.scrollY;
    return id === 0
      ? { x: sx - 20, y: sy + window.innerHeight + 20 }
      : { x: sx + window.innerWidth + 20, y: sy + this.headerBottom - 20 };
  }

  private throwBall(id: 0 | 1) {
    const f = this.f![id];
    const c = this.corner(id);
    this.balls.push({ owner: id, x0: c.x, y0: c.y, x1: f.x, y1: f.y, t: 0, dur: 0.7, back: false });
    this.sound.throwBall();
  }

  private name(f: Fighter) {
    return `${f.id === 1 && !this.watch ? "Foe " : ""}${f.mega ? MEGA_NAME[f.species] : f.species.toUpperCase()}`;
  }

  private say(text: string) {
    if (this.messages[this.messages.length - 1] === text || this.message?.text === text) return;
    this.messages.push(text);
    // never let the box fall far behind the action
    if (this.messages.length > 3) this.messages.shift();
  }

  // ---------- loop ----------

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.max(0, Math.min(0.1, (now - this.last) / 1000));
    this.last = now;
    this.acc += dt;
    while (this.acc >= TICK) {
      this.acc -= TICK;
      this.step(TICK);
    }
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  private step(dt: number) {
    this.wreck.update(dt, 0);
    if (this.leaving || !this.f) return;
    this.clock += dt;
    this.updateMessages(dt);
    this.screenFlash = Math.max(0, this.screenFlash - dt * 3);
    if (this.freeze > 0) {
      this.freeze--;
      return;
    }
    if (this.cutin) {
      this.cutin.t += dt;
      if (this.cutin.t >= CUTIN) {
        const f = this.f[this.cutin.owner];
        const evolve = this.cutin.evolve;
        this.cutin = null;
        if (evolve) this.startEvolve(f);
        else this.startFinale(f);
      }
      return;
    }
    this.phaseT += dt;
    if (this.phase === "battle") this.time += dt;
    this.updateBalls(dt);
    if (this.phase === "intro") this.intro();
    for (const f of this.f) this.updateFighter(f, dt);
    this.collide();
    this.updateShots(dt);
    this.collideMoves();
    this.clashSound -= dt;
    this.clashSaid -= dt;
    this.updateBursts(dt);
    this.updateZones(dt);
    this.updateWaves(dt);
    this.updateFinale(dt);
    this.updateParticles(dt);
    for (const gy of this.geysers) gy.t += dt;
    this.geysers = this.geysers.filter((gy) => gy.t < 0.55);
    for (const s of this.swipes) s.t += dt;
    this.swipes = this.swipes.filter((s) => s.t < 0.22);
    for (const fl of this.flashes) fl.t += dt;
    this.flashes = this.flashes.filter((fl) => fl.t < 0.35);
    if (this.phase === "ko") this.koSequence();
    this.lowHpAlarm(dt);
  }

  private intro() {
    const [me] = this.f!;
    if (this.phaseT > 1.0 && !this.sentOut) {
      this.sentOut = true;
      this.say(this.watch ? `CPU 1 sent out ${me.species.toUpperCase()}!` : `Go! ${me.species.toUpperCase()}!`);
      this.throwBall(0);
    }
    if (this.phaseT > 2.3) {
      this.phase = "battle";
      this.phaseT = 0;
      for (const f of this.f!) if (f.state === "hidden") this.appear(f);
    }
  }

  private appear(f: Fighter) {
    f.state = "free";
    f.t = 0;
    f.grow = 0.2;
    f.tint = 1;
    f.tintColour = "#fff";
    this.sound.ballOpen();
    if (f.species === "gengar") this.sound.cackle();
    else this.sound.roar(f.species === "blastoise");
    this.flashes.push({ x: f.x, y: f.y, t: 0, r: 40 * this.k, colour: "#fff" });
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      this.spawn("spark", f.x, f.y, Math.cos(a) * 160 * this.k, Math.sin(a) * 160 * this.k, 0.4, 2 * this.k);
    }
  }

  private updateBalls(dt: number) {
    for (const b of this.balls) {
      b.t += dt;
      if (b.t >= b.dur && !b.back) {
        const f = this.f![b.owner];
        if (f.state === "hidden") this.appear(f);
      }
    }
    this.balls = this.balls.filter((b) => b.t < b.dur);
  }

  // ---------- fighters ----------

  private other(f: Fighter) {
    return this.f![f.id === 0 ? 1 : 0];
  }

  /** Asleep or frozen: can't move or act. */
  private helpless(f: Fighter) {
    return f.status === "slp" || f.status === "frz";
  }

  private canAct(f: Fighter) {
    return f.state === "free" && this.phase === "battle" && !this.helpless(f);
  }

  private updateFighter(f: Fighter, dt: number) {
    f.t += dt;
    f.flash = Math.max(0, f.flash - dt * 5);
    f.invuln = Math.max(0, f.invuln - dt);
    f.slow = Math.max(0, f.slow - dt);
    f.shownHp += (f.hp - f.shownHp) * Math.min(1, dt * 6);
    if (f.grow < 1 && f.state !== "recall") f.grow = Math.min(1, f.grow + dt * 2.5);
    if (f.tint > 0 && f.state !== "recall") f.tint = Math.max(0, f.tint - dt * 2.2);
    for (const s of Object.keys(f.cd) as (keyof Fighter["cd"])[]) f.cd[s] = Math.max(0, f.cd[s] - dt);
    if (f.state === "hidden" || f.state === "gone") return;
    this.updateStatus(f, dt);
    this.updateMegaStatus(f, dt);

    if (this.phase === "battle" || this.phase === "ko") {
      if (this.helpless(f)) f.input = { x: 0, y: 0 };
      else if (f.cpu) this.think(f, dt);
      else this.readInput(f);
    }
    this.act(f, dt);
    this.move(f, dt);
    if (
      f.z > 0 &&
      (f.state === "free" || f.state === "hurt") &&
      !(this.finale?.kind === "gengar" && f.state === "hurt")
    )
      f.z = Math.max(0, f.z - 300 * this.k * dt);

    // a dodge or a spin leaves afterimages
    if (f.state === "dodge" || f.state === "spin") f.trail.push({ x: f.x, y: f.y, z: f.z, a: 0.5 });
    for (const p of f.trail) p.a -= dt * 2.5;
    f.trail = f.trail.filter((p) => p.a > 0);
  }

  /** Burn and poison hurt over time, paralysis sparks, sleep and freeze wear off. */
  private updateStatus(f: Fighter, dt: number) {
    if (!f.status || f.hp <= 0) return;
    const k = this.k;
    f.statusT -= dt;
    f.statusTick -= dt;
    if (f.status === "brn" || f.status === "psn") {
      if (f.statusTick <= 0) {
        f.statusTick = f.status === "brn" ? 0.7 : 0.6;
        this.damage(f, STATS[f.species].hp * (f.status === "brn" ? 0.018 : 0.02), null);
        if (f.status === "brn") {
          this.sound.burned();
          this.spawn("flame", f.x + rand(-8, 8) * k, f.y, 0, -30 * k, 0.4, 3 * k, 14 * k);
        } else {
          for (let i = 0; i < 3; i++)
            this.spawn("bubble", f.x + rand(-10, 10) * k, f.y, 0, 0, 0.6, rand(1.5, 2.5) * k, rand(10, 26) * k);
        }
      }
    } else if (f.status === "par" && Math.random() < 0.08) {
      this.spawn("zap", f.x + rand(-12, 12) * k, f.y, 0, 0, 0.12, 1.5 * k, rand(6, 28) * k);
    }
    if (f.status && f.statusT <= 0) {
      const was = f.status;
      f.status = null;
      if (was === "slp") this.say(`${this.name(f)} woke up!`);
      else if (was === "frz") this.say(`${this.name(f)} thawed out!`);
    }
  }

  private inflict(o: Fighter, status: Status) {
    if (o.status || o.hp <= 0) return;
    // a Fire type can't be burned or frozen, nor a Poison type poisoned
    if ((status === "brn" || status === "frz") && o.species === "charizard") return;
    if (status === "psn" && o.species === "gengar") return;
    o.status = status;
    o.statusTick = 0.7;
    o.statusT = { brn: 4.5, psn: 5, par: 3.5, slp: 2.2, frz: 1.3 }[status];
    const n = this.name(o);
    this.say(
      {
        brn: `${n} was burned!`,
        psn: `${n} was poisoned!`,
        par: `${n} is paralyzed!`,
        slp: `${n} fell asleep!`,
        frz: `${n} was frozen solid!`,
      }[status]
    );
    if (status === "frz") this.sound.frozen();
    else if (status === "slp") this.sound.asleep();
    else if (status === "par") this.sound.zap();
    // asleep or frozen stops whatever it was doing (and brings a flyer down)
    if (this.helpless(o) && o.state !== "faint") {
      o.state = "free";
      o.t = 0;
      o.z = 0;
    }
  }

  private readInput(f: Fighter) {
    let x = 0;
    let y = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x--;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x++;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y--;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y++;
    const n = Math.hypot(x, y) || 1;
    // confused: everything's back to front
    const flip = f.confused > 0 ? -1 : 1;
    f.input = { x: (flip * x) / n, y: (flip * y) / n };
    if (this.queuedT > 0) {
      this.queuedT -= TICK;
      if (this.queued && this.tryMove(f, this.queued)) this.queued = null;
    } else this.queued = null;
  }

  /** Where a move goes: at the foe if they're roughly in front, else straight ahead. */
  private aim(f: Fighter) {
    const o = this.other(f);
    const to = Math.atan2(o.y - f.y, o.x - f.x);
    if (f.cpu) return to + rand(-0.18, 0.18);
    return Math.abs(wrap(to - f.face)) < 1.3 || (!f.input.x && !f.input.y) ? to : f.face;
  }

  /** Starts a move if it's ready. */
  private tryMove(f: Fighter, slot: Slot | "dodge" | "mega") {
    const k = this.k;
    // a second press ends Fly early (the dive) and Phantom Force (the strike)
    if (slot === "s2" && f.state === "fly" && f.t > 0.3) {
      this.dive(f);
      return true;
    }
    if (slot === "s2" && f.state === "lurk" && f.t > 0.25) {
      this.rise(f);
      return true;
    }
    if (!this.canAct(f)) return false;
    if (slot === "mega") return this.tryMega(f);
    if (slot === "dodge") {
      if (f.cd.dodge > 0) return false;
      f.cd.dodge = 0.75;
      const a = f.input.x || f.input.y ? Math.atan2(f.input.y, f.input.x) : this.aim(f) + Math.PI / 2;
      f.state = "dodge";
      f.t = 0;
      f.invuln = 0.3;
      f.vx = Math.cos(a) * 330 * k;
      f.vy = Math.sin(a) * 330 * k;
      f.face = a;
      this.sound.dodge();
      return true;
    }
    if (slot === "burst" ? f.meter < 1 : f.cd[slot] > 0) return false;
    // one Burst at a time: the other waits for the screen to be free
    if (slot === "burst" && (this.cutin || this.finale)) return false;
    const move = this.moves(f)[slot];
    f.cd[slot] = move.cooldown * (f.cpu ? 1.3 : 1);
    f.move = slot;
    f.t = 0;
    f.landed = false;
    f.fired = false;
    f.told = false;
    f.tick = 0;
    f.hits = 0;
    f.aimAngle = this.aim(f);
    f.face = f.aimAngle;
    if (slot !== "melee") this.say(`${this.name(f)} used ${move.name}!`);
    if (f.mega && slot !== "burst") {
      this.megaMove(f, slot);
      return true;
    }
    const sp = f.species;
    if (slot === "melee") {
      f.state = "melee";
      if (sp === "gengar") this.sound.lick();
      else this.sound.swipe();
    } else if (slot === "burst") {
      f.meter = 0;
      f.state = "charge";
      f.invuln = 99;
      this.cutin = { owner: f.id, t: 0 };
      this.sound.cutin();
      if (sp === "gengar") this.sound.cackle();
      else this.sound.roar(sp === "blastoise");
    } else if ((sp === "charizard" && slot === "s1") || (sp === "blastoise" && (slot === "s1" || slot === "s3"))) {
      f.state = "stream";
      if (sp === "charizard") this.sound.flame(0.95);
      else if (slot === "s1") this.sound.water(0.8);
      else this.sound.iceBeam(0.7);
    } else if (sp === "charizard" && slot === "s2") {
      f.state = "fly";
      f.ai.dive = rand(0.7, 1.3);
      this.sound.whoosh();
      this.wreck.scuff(f.x, f.y, 70 * k, 0, 0);
    } else if (sp === "blastoise" && slot === "s2") {
      f.state = "spin";
      this.sound.spin();
    } else if (sp === "blastoise" && slot === "s4") {
      f.state = "stomp";
    } else if (sp === "gengar" && slot === "s2") {
      f.state = "sink";
      f.invuln = 2;
      f.ai.dive = rand(0.6, 1.1);
      this.sound.sink();
    } else {
      f.state = "cast";
    }
    return true;
  }

  private dive(f: Fighter) {
    f.state = "dive";
    f.t = 0;
  }

  private rise(f: Fighter) {
    f.state = "rise";
    f.t = 0;
    f.invuln = 0.15;
    f.landed = false;
    this.sound.cackle();
  }

  /** The animation a cast plays, and when in it the move comes out. */
  private castAnim(f: Fighter) {
    if (f.mega) return this.megaCastAnim(f);
    const name =
      f.species === "charizard"
        ? f.move === "s3"
          ? "Shoot"
          : "Swing"
        : f.move === "s1"
          ? "Shoot"
          : f.move === "s3"
            ? "Swing"
            : "Twirl";
    const anim = f.mon.anims[name];
    return { name, anim, at: timeOfFrame(anim, anim.hitFrame ?? 2), len: anim.length + 0.08 };
  }

  /** Runs the move in progress. */
  private act(f: Fighter, dt: number) {
    const k = this.k;
    const o = this.other(f);
    switch (f.state) {
      case "melee": {
        if (f.mega) {
          this.megaMelee(f, o);
          break;
        }
        const anim = f.mon.anims[f.species === "gengar" ? "Lick" : "Attack"];
        const hitAt = timeOfFrame(anim, anim.hitFrame ?? 4);
        if (!f.landed && f.t >= hitAt) {
          f.landed = true;
          const reach = f.species === "gengar" ? 32 : 26;
          const px = f.x + Math.cos(f.aimAngle) * reach * k;
          const py = f.y + Math.sin(f.aimAngle) * reach * k;
          this.swipes.push({
            kind: f.species === "charizard" ? "claw" : f.species === "blastoise" ? "fang" : "lick",
            x: px,
            y: py,
            angle: f.aimAngle,
            t: 0,
            fromX: f.x,
            fromY: f.y,
          });
          this.wreck.blast(px, py, 16 * k, 2, f.x, f.y, 30);
          // a well-timed swipe knocks an incoming projectile out of the air
          for (const s of this.shots) {
            if (s.owner === f.id || s.t < 0 || s.life < 0 || this.lofted(s)) continue;
            if (Math.hypot(s.x - px, s.y - py) > 24 * k + this.shotRadius(s)) continue;
            this.pop(s, s.x, s.y);
            this.clashFx(s.x, s.y, "spark");
            this.tell(`${this.name(f)} knocked it away!`);
          }
          if (Math.hypot(o.x - px, o.y - py) < (BODY + 18) * k && o.z < HIGH * k && o.state !== "lurk") {
            this.strike(f, o, "melee", Math.cos(f.aimAngle), Math.sin(f.aimAngle), 220);
            // a Lick can leave the foe paralyzed
            if (f.species === "gengar" && Math.random() < 0.3) this.inflict(o, "par");
          }
        }
        if (f.t >= anim.length) this.toFree(f);
        break;
      }
      case "stream":
        this.stream(f, o, dt);
        break;
      case "evolve":
      case "dash":
      case "buff":
      case "sneak":
        this.megaAct(f, o, dt);
        break;
      case "cast": {
        const c = this.castAnim(f);
        if (!f.fired && f.t >= c.at) {
          f.fired = true;
          this.cast(f, o);
        }
        if (f.t >= c.len) this.toFree(f);
        break;
      }
      case "fly":
        // up out of reach; steer, then dive on them (or it dives on its own)
        f.z = Math.min(120 * k, f.z + 300 * k * dt);
        if (f.t > 1.7) this.dive(f);
        break;
      case "dive":
        f.z = Math.max(0, f.z - 900 * k * dt);
        if (f.z === 0) {
          this.slam(f, o, "s2", 50 * k, "#fde68a");
          f.state = "free";
          f.t = 0;
          f.cd.melee = 0.35;
        }
        break;
      case "spin": {
        // the spinning shell sends projectiles straight back at whoever threw them
        if (f.t > 0.14) {
          for (const s of this.shots) {
            if (s.owner === f.id || s.t < 0 || s.life < 0 || this.lofted(s)) continue;
            if (Math.hypot(s.x - f.x, s.y - f.y) > (BODY + 6) * k + this.shotRadius(s)) continue;
            const a = Math.atan2(s.y - f.y, s.x - f.x);
            const sp = Math.max(260 * k, Math.hypot(s.vx, s.vy));
            s.owner = f.id;
            s.vx = Math.cos(a) * sp;
            s.vy = Math.sin(a) * sp;
            s.angle = a;
            s.t = Math.min(s.t, 0.1);
            this.sound.ricochet();
            this.sparks(s.x, s.y, 6, "#fff");
            this.tell("It bounced off the shell!");
          }
        }
        // into the shell, then a spinning dash that bounces off the edges of the arena
        if (f.t < 0.14) break;
        if (f.t - dt < 0.14) {
          f.vx = Math.cos(f.aimAngle) * 330 * k;
          f.vy = Math.sin(f.aimAngle) * 330 * k;
        }
        f.wreckT -= dt;
        if (f.wreckT <= 0) {
          f.wreckT = 0.05;
          this.wreck.blast(f.x, f.y, 17 * k, 1, f.x - f.vx * 0.2, f.y - f.vy * 0.2, 10);
          this.wreck.scuff(f.x, f.y, 30 * k, f.vx * 0.6, f.vy * 0.6);
          this.spawn("smoke", f.x, f.y, -f.vx * 0.1, -f.vy * 0.1, 0.4, rand(3, 5) * k);
        }
        if (!f.landed && Math.hypot(o.x - f.x, o.y - f.y) < (BODY * 2 + 2) * k && o.z < HIGH * k) {
          const sp = Math.hypot(f.vx, f.vy) || 1;
          f.landed = true;
          this.strike(f, o, "s2", f.vx / sp, f.vy / sp, 320);
        }
        if (f.t >= 0.8) {
          f.vx *= 0.2;
          f.vy *= 0.2;
          this.toFree(f);
        }
        break;
      }
      case "stomp":
        // Blastoise heaves itself up, and the page shakes when it lands
        f.z = Math.sin(Math.min(1, f.t / 0.42) * Math.PI) * 22 * k;
        if (f.t >= 0.42) {
          f.z = 0;
          this.bursts.push({ kind: "quake", owner: f.id, x: f.x, y: f.y, t: 0, max: 200 * k, hit: false, wreckT: 0 });
          this.sound.quake();
          this.onShake(14);
          this.screenFlash = 0.2;
          this.wreck.crater(f.x, f.y, 10 * k);
          this.dust(f.x, f.y, 30);
          this.toFree(f);
          f.cd.melee = 0.3;
        }
        break;
      case "sink":
        // Gengar melts into its own shadow
        if (f.t >= 0.3) {
          f.state = "lurk";
          f.t = 0;
        }
        break;
      case "lurk":
        f.invuln = 1;
        if (f.t > 1.4) this.rise(f);
        break;
      case "rise":
        if (!f.landed && f.t >= 0.08) {
          f.landed = true;
          f.invuln = 0;
          this.slam(f, o, "s2", 40 * k, "#c890f8");
          for (let i = 0; i < 24; i++) {
            const a = rand(0, Math.PI * 2);
            const sp = rand(60, 160) * k;
            this.spawn("wisp", f.x, f.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.5, 2 * k, 6 * k);
          }
        }
        if (f.t >= 0.32) this.toFree(f);
        break;
      case "charge":
        // holding still for the cut-in; the finale takes over from there
        break;
      case "ult":
        f.invuln = 1;
        break;
      case "dodge":
        if (f.t >= 0.24) {
          f.vx *= 0.3;
          f.vy *= 0.3;
          this.toFree(f);
        }
        break;
      case "hurt":
        if (f.t >= 0.32) this.toFree(f);
        break;
      case "faint":
        f.z = Math.max(0, f.z - 600 * k * dt);
        break;
      case "recall":
        f.grow = Math.max(0, 1 - f.t / 0.45);
        f.tint = 1;
        f.tintColour = "#ef4444";
        if (f.t >= 0.45) {
          f.state = "gone";
          const c = this.corner(f.id);
          this.balls.push({ owner: f.id, x0: f.x, y0: f.y, x1: c.x, y1: c.y, t: 0, dur: 0.5, back: true });
        }
        break;
    }
  }

  /** A body slam from above or below: crater, debris, and a hit on anyone close. */
  private slam(f: Fighter, o: Fighter, slot: Slot, r: number, colour: string) {
    this.wreck.crater(f.x, f.y, 13 * this.k);
    this.wreck.blast(f.x, f.y, r * 0.9, 6, f.x, f.y, 160);
    this.sound.slam();
    this.onShake(10);
    this.flashes.push({ x: f.x, y: f.y, t: 0, r, colour });
    this.dust(f.x, f.y, 26);
    const d = Math.hypot(o.x - f.x, o.y - f.y);
    if (d < r + BODY * this.k && o.z < HIGH * this.k && o.state !== "lurk")
      this.strike(f, o, slot, (o.x - f.x) / (d || 1), (o.y - f.y) / (d || 1), 380);
  }

  private toFree(f: Fighter) {
    f.state = f.hp > 0 ? "free" : f.state;
    f.t = 0;
  }

  // ---------- streams: Flamethrower, Hydro Pump, Ice Beam ----------

  private streamLength(f: Fighter) {
    if (f.mega) return 0.75;
    return f.species === "charizard" ? 0.95 : f.move === "s1" ? 0.8 : 0.7;
  }

  private stream(f: Fighter, o: Fighter, dt: number) {
    const k = this.k;
    const len = this.streamLength(f);
    this.steer(f, dt, f.species === "charizard" ? 1.2 : 1.4);
    if (f.species === "charizard") {
      // a cone of fire: the particles do the hitting
      f.tick -= dt;
      if (f.t < len) {
        // Heat Wave fans out much wider, and burns blue
        const spread = f.mega ? 0.55 : 0.13;
        for (let i = 0; i < (f.mega ? 3 : 2); i++) {
          const sp = rand(260, 340) * k;
          const ang = f.aimAngle + rand(-spread, spread);
          const p = this.spawn(
            "flame",
            f.x + Math.cos(f.aimAngle) * 16 * k,
            f.y + Math.sin(f.aimAngle) * 16 * k,
            Math.cos(ang) * sp,
            Math.sin(ang) * sp,
            rand(0.42, 0.55),
            4 * k,
            12 * k
          );
          p.owner = f.id;
          p.blue = f.mega;
        }
      }
      if (f.t >= len + 0.2) this.toFree(f);
      return;
    }
    // Hydro Pump and Ice Beam: a beam that hits whatever stands on its line (unless the foe's
    // own attack is in the way)
    const ice = f.move === "s3";
    const dx = Math.cos(f.aimAngle);
    const dy = Math.sin(f.aimAngle);
    const sx = f.x + dx * 14 * k;
    const sy = f.y + dy * 14 * k;
    const beam = f.t < len ? this.beamClash(f, sx, sy, dx, dy, this.beamLength(f)) : this.beamLength(f);
    f.reach = beam;
    if (f.t < len) {
      const rx = o.x - sx;
      const ry = o.y - sy;
      const along = rx * dx + ry * dy;
      const off = Math.abs(rx * dy - ry * dx);
      f.tick -= dt;
      const onLine = along > 0 && along < beam && off < (BODY + 7) * k;
      if (onLine && o.z < HIGH * k && o.state !== "lurk" && f.tick <= 0) {
        f.tick = 0.12;
        this.strike(f, o, f.move, dx, dy, ice ? 60 : 150, true);
        f.hits++;
        // a long enough blast of ice freezes the target solid
        if (ice && f.hits >= 4) this.inflict(o, "frz");
      }
      f.wreckT -= dt;
      if (f.wreckT <= 0) {
        f.wreckT = 0.05;
        const p = rand(0.2, 1) * beam;
        if (ice) {
          this.wreck.freeze(sx + dx * beam, sy + dy * beam, 14 * k, 10);
          this.wreck.freeze(sx + dx * p, sy + dy * p, 9 * k, 6);
        } else {
          this.wreck.wash(sx + dx * beam, sy + dy * beam, 12 * k, dx, dy, 0, 8);
          this.wreck.wash(sx + dx * p, sy + dy * p, 8 * k, dx, dy, 0, 3);
        }
      }
      for (let i = 0; i < 2; i++) {
        if (ice) {
          const q = rand(0, beam);
          this.spawn("ice", sx + dx * q, sy + dy * q, rand(-30, 30) * k, rand(-30, 30) * k, 0.6, 1.5 * k, 10 * k);
        } else {
          this.spawn(
            "drop",
            sx + dx * beam,
            sy + dy * beam,
            dx * rand(40, 140) * k + rand(-90, 90) * k,
            dy * rand(40, 140) * k + rand(-90, 90) * k,
            0.5,
            rand(1.2, 2.4) * k,
            12 * k,
            rand(40, 160) * k
          );
        }
      }
    }
    if (f.t >= len + 0.15) this.toFree(f);
  }

  /** Turns a stream toward where the player pushes (or the CPU's target), slowly. */
  private steer(f: Fighter, dt: number, rate: number) {
    const turn = rate * (f.cpu ? 0.8 : 1) * dt;
    const o = this.other(f);
    const want = f.cpu
      ? Math.atan2(o.y - f.y, o.x - f.x)
      : f.input.x || f.input.y
        ? Math.atan2(f.input.y, f.input.x)
        : f.aimAngle;
    f.aimAngle += Math.max(-turn, Math.min(turn, wrap(want - f.aimAngle)));
    f.face = f.aimAngle;
  }

  // ---------- collisions between moves ----------

  /** How big a projectile is for hitting things (doc px). */
  private shotRadius(s: Shot) {
    const k = this.k;
    if (s.kind === "hypno") return (6 + s.t * 18) * k * 0.7;
    return (s.kind === "shadowball" ? 10 : s.kind === "fireblast" ? 8 : 7) * k;
  }

  /** A lobbed Sludge Bomb high in the air passes over everything until it comes down. */
  private lofted(s: Shot) {
    return s.kind === "sludge" && s.z > 30 * this.k;
  }

  /** A projectile destroyed in a collision: some go off where they are, the rest just break. */
  private pop(s: Shot, x: number, y: number, doused = false) {
    if (s.life < 0) return;
    s.life = -1;
    const k = this.k;
    const f = this.f![s.owner];
    if (doused) {
      // water puts the fire out
      this.clashFx(x, y, "steam");
      for (let i = 0; i < 8; i++) this.spawn("steam", x, y, rand(-60, 60) * k, rand(-60, 60) * k, 0.8, 5 * k, 6 * k);
    } else if (s.kind === "fireblast") {
      this.bursts.push({ kind: "daikanji", owner: s.owner, x, y, t: 0, max: 50 * k, hit: false, wreckT: 0 });
      this.sound.fireBlast();
      this.onShake(8);
    } else if (s.kind === "shadowball") {
      this.bursts.push({ kind: "shadow", owner: s.owner, x, y, t: 0, max: 32 * k, hit: false, wreckT: 0 });
      this.sound.burstDark();
    } else if (s.kind === "sludge") {
      this.splat(f, this.other(f), x, y);
    } else {
      this.clashFx(x, y, s.kind === "hypno" ? "dark" : "spark");
    }
  }

  /** Where two attacks meet: sparks, steam or dark energy, a crack, and a dent in the page. */
  private clashFx(x: number, y: number, kind: "spark" | "steam" | "dark") {
    const k = this.k;
    if (this.clashSound <= 0) {
      this.clashSound = 0.08;
      if (kind === "steam") this.sound.steam();
      else this.sound.clash();
    }
    if (kind === "steam") {
      for (let i = 0; i < 3; i++) this.spawn("steam", x, y, rand(-40, 40) * k, rand(-40, 40) * k, 0.7, 4 * k, 8 * k);
    } else {
      this.sparks(x, y - 8 * k, 10, kind === "dark" ? GHOST[1] : "#fde047");
      if (kind === "dark")
        for (let i = 0; i < 8; i++) {
          const a = rand(0, Math.PI * 2);
          this.spawn("wisp", x, y, Math.cos(a) * 140 * k, Math.sin(a) * 140 * k, 0.35, 2 * k, 8 * k);
        }
    }
    this.wreck.knock(x, y, 12 * k, x, y, 240, 6);
  }

  /** A battle message for collisions, at most every few seconds. */
  private tell(text: string) {
    if (this.clashSaid > 0) return;
    this.clashSaid = 3;
    this.say(text);
  }

  /**
   * A beam (Hydro Pump, Ice Beam) against whatever the foe has in its path: flames die in a
   * cloud of steam and hold the beam back where they meet; projectiles burst on it, except
   * Fire Blast, which water puts out but which melts straight through ice. Returns how far
   * the beam gets.
   */
  private beamClash(f: Fighter, sx: number, sy: number, dx: number, dy: number, len: number) {
    const k = this.k;
    const ice = f.move === "s3";
    let reach = len;
    const along = (x: number, y: number) => (x - sx) * dx + (y - sy) * dy;
    const off = (x: number, y: number) => Math.abs((x - sx) * dy - (y - sy) * dx);
    let clashed = false;
    for (const p of this.particles) {
      if (p.kind !== "flame" || p.owner === undefined || p.owner === f.id || p.life <= 0) continue;
      const a = along(p.x, p.y);
      if (a < 0 || a > reach + p.r || off(p.x, p.y) > 9 * k + p.r * 0.6) continue;
      p.life = 0;
      reach = Math.max(0, Math.min(reach, a - p.r * 0.5));
      clashed = true;
      if (Math.random() < 0.3) this.clashFx(p.x, p.y, "steam");
    }
    if (clashed) this.tell("The attacks collided!");
    for (const s of this.shots) {
      if (s.owner === f.id || s.t < 0 || s.life < 0 || this.lofted(s)) continue;
      const a = along(s.x, s.y);
      if (a < 0 || a > reach || off(s.x, s.y) > 9 * k + this.shotRadius(s)) continue;
      if (s.kind === "fireblast" && ice) {
        // fire melts through the ice: the beam is cut off
        this.pop(s, s.x, s.y);
        f.t = Math.max(f.t, this.streamLength(f));
        reach = Math.min(reach, a);
        this.tell("The fire melted the ice!");
      } else {
        this.pop(s, s.x, s.y, s.kind === "fireblast");
        this.tell(s.kind === "fireblast" ? "The water put out the fire!" : "The attacks collided!");
      }
    }
    return reach;
  }

  /** Projectiles against each other, and against the foe's flames. */
  private collideMoves() {
    const live = this.shots.filter((s) => s.t >= 0 && s.life > 0 && !this.lofted(s));
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        if (a.owner === b.owner || a.life < 0 || b.life < 0) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) > this.shotRadius(a) + this.shotRadius(b)) continue;
        const x = (a.x + b.x) / 2;
        const y = (a.y + b.y) / 2;
        // the heavier one carries on; equals knock each other out
        if (MASS[a.kind] >= MASS[b.kind]) this.pop(b, x, y);
        if (MASS[b.kind] >= MASS[a.kind]) this.pop(a, x, y);
        this.clashFx(x, y, a.kind === "shadowball" || b.kind === "shadowball" ? "dark" : "spark");
        this.onShake(5);
        this.tell("The attacks collided!");
      }
    }
    // flames burn up light projectiles; heavy ones push through and eat the flames
    for (const s of live) {
      if (s.life < 0) continue;
      const r = this.shotRadius(s);
      for (const p of this.particles) {
        if (p.kind !== "flame" || p.owner === undefined || p.owner === s.owner || p.life <= 0) continue;
        if (Math.hypot(p.x - s.x, p.y - s.y) > r + p.r * 0.6) continue;
        if (MASS[s.kind] <= 2) {
          this.pop(s, s.x, s.y);
          this.tell("The flames burned it up!");
          break;
        }
        p.life = 0;
      }
    }
  }

  private beamLength(f: Fighter) {
    return Math.min(175 * this.k, f.t * 1400 * this.k);
  }

  // ---------- casts: things thrown ----------

  private cast(f: Fighter, o: Fighter) {
    if (f.mega) return this.megaCast(f, o);
    const k = this.k;
    const a = f.aimAngle;
    const mx = f.x + Math.cos(a) * 16 * k;
    const my = f.y + Math.sin(a) * 16 * k;
    const shot = (kind: Shot["kind"], speed: number, life: number, angle = a): Shot => ({
      kind,
      owner: f.id,
      x: mx,
      y: my,
      z: 12 * k,
      vx: Math.cos(angle) * speed * k,
      vy: Math.sin(angle) * speed * k,
      angle,
      t: 0,
      life,
      x0: mx,
      y0: my,
      tx: 0,
      ty: 0,
    });
    if (f.species === "charizard" && f.move === "s3") {
      this.shots.push(shot("fireblast", 300, 0.8));
      this.sound.flame(0.4);
    } else if (f.species === "charizard") {
      for (const off of [-0.24, 0, 0.24]) this.shots.push(shot("slash", 430, 0.55, a + off));
      this.sound.airSlash();
    } else if (f.move === "s1") {
      this.shots.push(shot("shadowball", 260, 1.2));
      this.sound.shadowBall();
    } else if (f.move === "s3") {
      // lobbed where the foe is heading (or straight ahead, if they're not in front)
      const facingFoe = f.cpu || Math.abs(wrap(Math.atan2(o.y - f.y, o.x - f.x) - a)) < 1.3;
      let tx = facingFoe ? o.x + (o.vx + o.kx) * 0.45 : f.x + Math.cos(a) * 180 * k;
      let ty = facingFoe ? o.y + (o.vy + o.ky) * 0.45 : f.y + Math.sin(a) * 180 * k;
      const d = Math.hypot(tx - f.x, ty - f.y);
      const max = 260 * k;
      if (d > max) {
        tx = f.x + ((tx - f.x) / d) * max;
        ty = f.y + ((ty - f.y) / d) * max;
      }
      this.shots.push({ ...shot("sludge", 0, 0.6), tx, ty });
      this.sound.whoosh();
    } else {
      for (let i = 0; i < 3; i++) {
        const s = shot("hypno", 200, 1.2);
        s.t = -i * 0.14;
        this.shots.push(s);
      }
      this.sound.hypnosis();
    }
  }

  private updateShots(dt: number) {
    const k = this.k;
    const a = this.arena();
    for (const s of this.shots) {
      s.t += dt;
      if (s.t < 0) continue;
      const f = this.f![s.owner];
      const o = this.other(f);
      const reach = (BODY + 8) * k;
      const touching = (r: number) => Math.hypot(o.x - s.x, o.y - s.y) < r && o.z < HIGH * k && o.state !== "lurk";
      if (s.kind === "sludge") {
        // a lob: an arc from the thrower to the target spot
        const p = Math.min(1, s.t / s.life);
        s.x = s.x0 + (s.tx - s.x0) * p;
        s.y = s.y0 + (s.ty - s.y0) * p;
        s.z = Math.sin(p * Math.PI) * 70 * k + (1 - p) * 12 * k;
        if (Math.random() < 0.5)
          this.spawn("bubble", s.x, s.y, rand(-20, 20) * k, rand(-20, 20) * k, 0.3, 1.5 * k, s.z);
        if (p >= 1) {
          s.life = -1;
          this.splat(f, o, s.x, s.y);
        }
        continue;
      }
      if (s.kind === "shadowball") {
        // curves after its target, a little
        const want = Math.atan2(o.y - s.y, o.x - s.x);
        const cur = Math.atan2(s.vy, s.vx);
        const turn = Math.max(-1.3 * dt, Math.min(1.3 * dt, wrap(want - cur)));
        const sp = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(cur + turn) * sp;
        s.vy = Math.sin(cur + turn) * sp;
        if (Math.random() < 0.7) this.spawn("wisp", s.x, s.y, rand(-30, 30) * k, rand(-30, 30) * k, 0.35, 2 * k, s.z);
      }
      if (s.kind === "aura" || s.kind === "hex") {
        // Aura Sphere hunts its target down; Hex drifts after it
        const want = Math.atan2(o.y - s.y, o.x - s.x);
        const cur = Math.atan2(s.vy, s.vx);
        const rate = (s.kind === "aura" ? 4 : 1.6) * dt;
        const turn = Math.max(-rate, Math.min(rate, wrap(want - cur)));
        const sp = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(cur + turn) * sp;
        s.vy = Math.sin(cur + turn) * sp;
        if (Math.random() < 0.6)
          this.spawn(
            s.kind === "hex" ? "wisp" : "ice",
            s.x,
            s.y,
            rand(-30, 30) * k,
            rand(-30, 30) * k,
            0.3,
            2 * k,
            s.z
          );
      }
      if (s.kind === "dragonpulse" && Math.random() < 0.8)
        this.spawn("spark", s.x, s.y - s.z, rand(-80, 80) * k, rand(-80, 80) * k, 0.25, 1.6 * k);
      if (s.kind === "fireblast" && Math.random() < 0.9)
        this.spawn(
          "flame",
          s.x,
          s.y,
          -s.vx * 0.15 + rand(-40, 40) * k,
          -s.vy * 0.15 + rand(-40, 40) * k,
          0.3,
          3 * k,
          s.z
        );
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const out = s.x < a.l - 40 || s.x > a.r + 40 || s.y < a.t - 60 || s.y > a.b + 60;
      if (s.kind === "slash") {
        // the blades slice through the text they pass over
        this.wreck.knock(s.x, s.y, 6 * k, s.x - s.vx, s.y - s.vy, 200, 3);
        if (touching(reach)) {
          s.life = -1;
          this.strike(f, o, "s4", Math.cos(s.angle), Math.sin(s.angle), 120);
        }
      } else if (s.kind === "dragonpulse" || s.kind === "aura" || s.kind === "hex") {
        // Dragon Pulse ploughs a furrow through the text as it goes
        if (s.kind === "dragonpulse") this.wreck.knock(s.x, s.y, 12 * k, s.x - s.vx, s.y - s.vy, 300, 6);
        if (touching(reach + (s.kind === "dragonpulse" ? 8 : 2) * k)) {
          s.life = -1;
          const dir = Math.atan2(s.vy, s.vx);
          // Hex hits twice as hard on a foe that's already suffering
          const cursed = s.kind === "hex" && (!!o.status || o.curse > 0);
          if (cursed) this.tell("It hit twice as hard on a suffering foe!");
          this.strike(
            f,
            o,
            "s3",
            Math.cos(dir),
            Math.sin(dir),
            s.kind === "dragonpulse" ? 360 : 220,
            false,
            0,
            cursed ? 2 : 1
          );
          this.clashFx(s.x, s.y, s.kind === "hex" ? "dark" : "spark");
        } else if (s.t >= s.life || out) {
          s.life = -1;
          this.sparks(s.x, s.y - 8 * k, 6, "#fff");
        }
      } else if (s.kind === "waterpulse") {
        const r = (6 + s.t * 18) * k;
        if (touching(reach + r * 0.6) && o.invuln <= 0) {
          for (const other of this.shots) if (other.kind === "waterpulse" && other.owner === s.owner) other.life = -1;
          this.strike(f, o, "s1", Math.cos(s.angle), Math.sin(s.angle), 200);
          if (Math.random() < 0.35 && o.confused <= 0 && o.hp > 0) {
            o.confused = 3;
            this.say(`${this.name(o)} became confused!`);
          }
        }
      } else if (s.kind === "hypno") {
        const r = (6 + s.t * 18) * k;
        if (touching(reach + r * 0.6) && o.invuln <= 0) {
          s.life = -1;
          if (o.status) {
            if (!f.told) this.say(`${this.name(o)} wasn't affected…`);
          } else this.inflict(o, "slp");
          f.told = true;
          for (const other of this.shots) if (other.kind === "hypno" && other.owner === s.owner) other.life = -1;
        }
      } else if (touching(reach + 4 * k) || s.t >= s.life || out) {
        // Fire Blast and Shadow Ball explode on contact or at the end of their flight
        s.life = -1;
        if (s.kind === "fireblast") {
          this.bursts.push({
            kind: "daikanji",
            owner: s.owner,
            x: s.x,
            y: s.y,
            t: 0,
            max: 58 * k,
            hit: false,
            wreckT: 0,
          });
          this.sound.fireBlast();
          this.onShake(9);
        } else {
          this.bursts.push({
            kind: "shadow",
            owner: s.owner,
            x: s.x,
            y: s.y,
            t: 0,
            max: 36 * k,
            hit: false,
            wreckT: 0,
          });
          this.sound.burstDark();
          this.onShake(5);
        }
      }
    }
    this.shots = this.shots.filter((s) => s.t < s.life);
  }

  /** A Sludge Bomb lands: a splash, and a poison puddle that eats the page under it. */
  private splat(f: Fighter, o: Fighter, x: number, y: number) {
    const k = this.k;
    this.sound.splat();
    this.wreck.dissolve(x, y, 30 * k, 50);
    this.zones.push({ owner: f.id, x, y, r: 34 * k, t: 0, life: 4.5, wreckT: 0, seed: Math.random() * 100 });
    for (let i = 0; i < 20; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(60, 200) * k;
      this.spawn("bubble", x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.45, rand(1.5, 3) * k, 4 * k, rand(60, 160) * k);
    }
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < (BODY + 14) * k && o.z < HIGH * k && o.state !== "lurk") {
      this.strike(f, o, "s3", (o.x - x) / (d || 1), (o.y - y) / (d || 1), 160);
      if (Math.random() < 0.3) this.inflict(o, "psn");
    }
  }

  private updateZones(dt: number) {
    const k = this.k;
    for (const z of this.zones) {
      z.t += dt;
      const o = this.f![z.owner === 0 ? 1 : 0];
      if (Math.hypot(o.x - z.x, o.y - z.y) < z.r && o.z < 6 * k && o.state !== "lurk") {
        o.slow = 0.2;
        if (z.t > 0.2) this.inflict(o, "psn");
      }
      z.wreckT -= dt;
      if (z.wreckT <= 0) {
        z.wreckT = 0.3;
        this.wreck.dissolve(z.x + rand(-1, 1) * z.r * 0.6, z.y + rand(-1, 1) * z.r * 0.6, 12 * k, 3);
      }
    }
    this.zones = this.zones.filter((z) => z.t < z.life);
  }

  // ---------- bursts: explosions and shockwaves ----------

  /** After the cut-in, the Burst itself: a finale that takes over the whole screen. */
  private startFinale(f: Fighter) {
    if (f.mega) return this.startMegaFinale(f);
    const k = this.k;
    f.state = "ult";
    f.t = 0;
    f.told = false;
    f.invuln = 1;
    this.finale = {
      owner: f.id,
      kind: f.species,
      t: 0,
      hits: 0,
      hit: false,
      next: 0,
      shake: 0,
      wreckT: 0,
      hands: [],
      mega: false,
      x: 0,
      y: 0,
      sweep: 0,
    };
    this.sound.rumble(FINALE[f.species]);
    if (f.species === "charizard") {
      this.sound.boom();
      this.wreck.crater(f.x, f.y, 14 * k);
      this.wreck.blast(f.x, f.y, 40 * k, 6, f.x, f.y, 120);
    } else if (f.species === "blastoise") {
      this.sound.water(0.6);
    } else {
      this.sound.nightShade();
      // shadow hands reach in from every edge of the screen toward the foe
      const sx = window.scrollX;
      const sy = window.scrollY + this.headerBottom;
      const w = window.innerWidth;
      const h = window.innerHeight - this.headerBottom;
      for (let i = 0; i < 7; i++) {
        const side = i % 4;
        const along = (i + 0.5) / 7 + rand(-0.05, 0.05);
        this.finale.hands.push(
          side === 0
            ? { x: sx + along * w, y: sy - 10 }
            : side === 1
              ? { x: sx + w + 10, y: sy + along * h }
              : side === 2
                ? { x: sx + along * w, y: sy + h + 10 }
                : { x: sx - 10, y: sy + along * h }
        );
      }
    }
  }

  private endFinale(f: Fighter) {
    this.finale = null;
    f.invuln = 0;
    if (f.state === "ult") this.toFree(f);
  }

  private updateFinale(dt: number) {
    const fin = this.finale;
    this.flood = Math.max(0, this.flood - (this.waves.length ? 0 : dt / 0.9));
    if (!fin) return;
    const k = this.k;
    const f = this.f![fin.owner];
    const o = this.other(f);
    fin.t += dt;
    if (fin.mega) return this.updateMegaFinale(fin, f, o, dt);
    const t = fin.t;
    const len = FINALE[fin.kind];
    // the screen never stops shaking while it lasts
    fin.shake -= dt;
    if (fin.shake <= 0 && t < len - 0.3) {
      fin.shake = 0.11;
      this.onShake(fin.kind === "gengar" ? 4 : 7);
    }
    const reachable = () => o.invuln <= 0 && o.state !== "lurk" && o.hp > 0;

    if (fin.kind === "charizard") {
      // Charizard rises, blazing, and the whole page erupts in fire around it
      f.z = Math.min(55 * k, f.z + 160 * k * dt);
      if (Math.random() < 0.8) {
        const a = rand(0, Math.PI * 2);
        const d = rand(14, 28) * k;
        this.spawn("flame", f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.5, 0, 0, 0.35, 4 * k, f.z * 0.6, 60 * k);
      }
      const a = this.arena();
      const far = Math.hypot(Math.max(f.x - a.l, a.r - f.x), Math.max(f.y - a.t, a.b - f.y)) + 60 * k;
      if (t > 0.2 && t < 1.45) {
        const reach = ((t - 0.2) / 1.25) * far;
        fin.next -= dt;
        if (fin.next <= 0) {
          fin.next = 0.05;
          for (let i = 0; i < 3; i++) {
            const ang = rand(0, Math.PI * 2);
            const x = f.x + Math.cos(ang) * reach;
            const y = f.y + Math.sin(ang) * reach * 0.8;
            if (x > a.l - 40 && x < a.r + 40 && y > a.t - 60 && y < a.b + 60) this.erupt(f, o, x, y);
          }
          // the ring of eruptions always catches up with the foe
          const dist = Math.hypot(o.x - f.x, o.y - f.y);
          if (Math.abs(dist - reach) < 30 * k) this.erupt(f, o, o.x + rand(-12, 12) * k, o.y + rand(-12, 12) * k);
        }
      }
      if (t >= 1.5 && !fin.hit) {
        // and it all comes down on the foe in one last blast
        fin.hit = true;
        this.bursts.push({ kind: "blastburn", owner: f.id, x: o.x, y: o.y, t: 0, max: 120 * k, hit: true, wreckT: 0 });
        this.wreck.crater(o.x, o.y, 20 * k);
        this.wreck.blast(o.x, o.y, 80 * k, 8, o.x, o.y, 220);
        this.sound.boom();
        this.onShake(24);
        this.screenFlash = 1;
        for (let i = 0; i < 70; i++) {
          const ang = rand(0, Math.PI * 2);
          const sp = rand(160, 360) * k;
          this.spawn(
            "flame",
            o.x,
            o.y,
            Math.cos(ang) * sp,
            Math.sin(ang) * sp,
            rand(0.4, 0.7),
            5 * k,
            6 * k,
            rand(0, 120) * k
          );
        }
        if (reachable() && o.z < HIGH * k) {
          const d = Math.hypot(o.x - f.x, o.y - f.y) || 1;
          this.strike(f, o, "burst", (o.x - f.x) / d, (o.y - f.y) / d, 460, false, 0, 0.6);
          if (Math.random() < 0.5) this.inflict(o, "brn");
        }
      }
      if (t > 1.7) f.z = Math.max(0, f.z - 200 * k * dt);
    } else if (fin.kind === "blastoise") {
      // cannons to the sky, then a wave the height of the screen, then the flood
      if (t < 0.5) {
        for (const side of [-1, 1]) {
          const x = f.x + side * 9 * k;
          const sp = rand(260, 420) * k;
          this.spawn("drop", x, f.y, rand(-40, 40) * k, rand(-20, 20) * k, 0.8, rand(1.5, 2.5) * k, 24 * k, sp);
          if (Math.random() < 0.4)
            this.spawn("foam", x, f.y, rand(-30, 30) * k, rand(-30, 30) * k, 0.7, 2.5 * k, 24 * k, sp);
        }
      }
      if (t >= 0.5 && !fin.hit) {
        fin.hit = true;
        this.surf(f);
        this.flood = 1;
      }
    } else {
      // Gengar: the lights go out, a grin fills the screen, the dark eats the page,
      // and shadow hands grab the foe
      fin.wreckT -= dt;
      if (t > 0.3 && t < 1.7 && fin.wreckT <= 0) {
        fin.wreckT = 0.05;
        const sx = window.scrollX;
        const sy = window.scrollY + this.headerBottom;
        for (let i = 0; i < 3; i++)
          this.wreck.dissolve(
            sx + rand(0, window.innerWidth),
            sy + rand(0, window.innerHeight - this.headerBottom),
            16 * k,
            4
          );
      }
      if (t > 0.4 && t < 1.1 && Math.random() < 0.9) {
        const ang = rand(0, Math.PI * 2);
        const d = rand(120, 240) * k;
        this.spawn(
          "wisp",
          o.x + Math.cos(ang) * d,
          o.y + Math.sin(ang) * d,
          -Math.cos(ang) * d * 2.2,
          -Math.sin(ang) * d * 2.2,
          0.45,
          3 * k,
          14 * k
        );
      }
      if (t >= 1.05 && !fin.hit) {
        fin.hit = true;
        if (!reachable()) {
          this.say(`${this.name(o)} slipped out of its grasp!`);
          fin.hits = -1;
        } else {
          // caught: hoisted up into the dark…
          o.state = "hurt";
          o.t = -0.6;
          this.sound.cackle();
        }
      }
      if (fin.hit && fin.hits === 0) o.z = Math.min(46 * k, o.z + 150 * k * dt);
      if (t >= 1.5 && fin.hits === 0) {
        // …and slammed back down onto the page
        fin.hits = 1;
        o.z = 0;
        o.state = "free";
        this.strike(f, o, "burst", 0, 0, 0, false, o.status === "slp" ? 1.5 : 1);
        this.wreck.blast(o.x, o.y, 60 * k, 8, o.x, o.y, 160);
        this.wreck.crater(o.x, o.y, 16 * k);
        this.sound.slam();
        this.onShake(22);
        this.screenFlash = 0.6;
        this.flashes.push({ x: o.x, y: o.y, t: 0, r: 70 * k, colour: GHOST[1] });
        for (let i = 0; i < 40; i++) {
          const ang = rand(0, Math.PI * 2);
          const sp = rand(80, 260) * k;
          this.spawn("wisp", o.x, o.y, Math.cos(ang) * sp, Math.sin(ang) * sp, 0.5, 3 * k, 8 * k);
        }
      }
    }
    if (t >= len) this.endFinale(f);
  }

  /** One fire geyser out of the page: it burns what's there, and whoever is standing on it. */
  private erupt(f: Fighter, o: Fighter, x: number, y: number) {
    const k = this.k;
    this.geysers.push({ x, y, t: 0 });
    this.wreck.ignite(x, y, 16 * k, 8);
    this.wreck.knock(x, y, 10 * k, x, y + 20, 260, 6);
    if (Math.random() < 0.25) this.wreck.crater(x, y, rand(5, 8) * k);
    if (Math.random() < 0.3) this.sound.eruption();
    for (let i = 0; i < 6; i++)
      this.spawn(
        "flame",
        x + rand(-6, 6) * k,
        y,
        rand(-20, 20) * k,
        rand(-10, 10) * k,
        rand(0.35, 0.55),
        4 * k,
        2 * k,
        rand(160, 300) * k
      );
    const fin = this.finale!;
    if (
      fin.hits < 5 &&
      Math.hypot(o.x - x, o.y - y) < 28 * k &&
      o.z < HIGH * k &&
      o.invuln <= 0 &&
      o.state !== "lurk"
    ) {
      fin.hits++;
      this.strike(
        f,
        o,
        "burst",
        (o.x - f.x) / (Math.hypot(o.x - f.x, o.y - f.y) || 1),
        (o.y - f.y) / (Math.hypot(o.x - f.x, o.y - f.y) || 1),
        140,
        false,
        0,
        0.16
      );
    }
  }

  /** Blastoise's Burst: a wave the height of the screen sweeps toward its foe. */
  private surf(f: Fighter) {
    const o = this.other(f);
    const a = this.arena();
    const axis = Math.abs(o.x - f.x) * 0.6 > Math.abs(o.y - f.y) ? "x" : "y";
    const sign = (axis === "x" ? o.x - f.x : o.y - f.y) >= 0 ? 1 : -1;
    const lo = axis === "x" ? a.l : a.t;
    const hi = axis === "x" ? a.r : a.b;
    const pad = 60 * this.k;
    const from = sign > 0 ? lo - pad * 2 : hi + pad * 2;
    this.waves.push({
      owner: f.id,
      axis,
      sign,
      start: from,
      pos: from,
      end: sign > 0 ? hi + pad * 3 : lo - pad * 3,
      hit: false,
      wreckT: 0,
    });
    this.sound.wave();
    this.onShake(12);
  }

  private updateBursts(dt: number) {
    const k = this.k;
    for (const b of this.bursts) {
      b.t += dt;
      const f = this.f![b.owner];
      const o = this.other(f);
      const dist = Math.hypot(o.x - b.x, o.y - b.y);
      const ux = (o.x - b.x) / (dist || 1);
      const uy = (o.y - b.y) / (dist || 1);
      const grounded = o.z < HIGH * k && o.state !== "lurk";
      if (b.kind === "blastburn" || b.kind === "quake") {
        const len = b.kind === "quake" ? 0.55 : 0.5;
        const rad = Math.min(1, b.t / len) * b.max;
        // Earthquake only reaches what's standing on the ground
        const reached = b.kind === "quake" ? o.z < 4 * k && o.state !== "lurk" : grounded;
        if (!b.hit && dist < rad + BODY * k && reached) {
          b.hit = true;
          this.strike(f, o, b.kind === "quake" ? "s4" : "burst", ux, uy, 420);
        }
        b.wreckT -= dt;
        if (b.t < len && b.wreckT <= 0) {
          b.wreckT = 0.04;
          for (let i = 0; i < 7; i++) {
            const a = rand(0, Math.PI * 2);
            const x = b.x + Math.cos(a) * rad;
            const y = b.y + Math.sin(a) * rad * 0.8;
            if (b.kind === "blastburn") this.wreck.ignite(x, y, 14 * k, 6);
            else {
              this.wreck.knock(x, y, 12 * k, b.x, b.y, 260, 5);
              if (Math.random() < 0.3)
                this.spawn(
                  "rock",
                  x,
                  y,
                  Math.cos(a) * 60 * k,
                  Math.sin(a) * 60 * k,
                  0.5,
                  rand(1.5, 3) * k,
                  0,
                  rand(80, 200) * k
                );
            }
          }
          if (b.kind === "quake") {
            this.wreck.scuff(b.x, b.y, rad, 0, 0);
            if (Math.random() < 0.25)
              this.wreck.crater(b.x + rand(-1, 1) * rad * 0.7, b.y + rand(-1, 1) * rad * 0.5, rand(4, 7) * k);
          }
        }
      } else if (b.kind === "daikanji") {
        // Fire Blast's 大: five arms of fire that grow out and burn
        const grow = Math.min(1, b.t / 0.16) * b.max;
        if (!b.hit && b.t < 0.5 && grounded) {
          const onArm = KANJI.some(
            (a) =>
              distToSegment(o.x, o.y, b.x, b.y, b.x + Math.cos(a) * grow, b.y + Math.sin(a) * grow) < (BODY + 10) * k
          );
          if (onArm || dist < (BODY + 14) * k) {
            b.hit = true;
            this.strike(f, o, "s3", ux, uy, 300);
            if (Math.random() < 0.3) this.inflict(o, "brn");
          }
        }
        b.wreckT -= dt;
        if (b.t < 0.4 && b.wreckT <= 0) {
          b.wreckT = 0.05;
          for (const a of KANJI) {
            const p = rand(0.2, 1) * grow;
            this.wreck.ignite(b.x + Math.cos(a) * p, b.y + Math.sin(a) * p, 10 * k, 6);
          }
          if (b.t < 0.06) {
            this.wreck.blast(b.x, b.y, 24 * k, 4, b.x, b.y, 60);
            this.wreck.crater(b.x, b.y, 8 * k);
          }
        }
      } else if (b.kind === "darkpulse" || b.kind === "sludgewave") {
        // a ring rolling out across the page
        const rad = Math.min(1, b.t / 0.45) * b.max;
        if (!b.hit && dist < rad + BODY * k && dist > rad - 40 * k && grounded) {
          b.hit = true;
          this.strike(f, o, b.kind === "darkpulse" ? "s2" : "s1", ux, uy, 300);
          if (b.kind === "sludgewave" && Math.random() < 0.3) this.inflict(o, "psn");
        }
        b.wreckT -= dt;
        if (b.t < 0.45 && b.wreckT <= 0) {
          b.wreckT = 0.04;
          for (let i = 0; i < 8; i++) {
            const a = rand(0, Math.PI * 2);
            const x = b.x + Math.cos(a) * rad;
            const y = b.y + Math.sin(a) * rad * 0.8;
            if (b.kind === "darkpulse") this.wreck.knock(x, y, 12 * k, b.x, b.y, 300, 5);
            else this.wreck.dissolve(x, y, 12 * k, 5);
          }
        }
      } else {
        // Shadow Ball's dark burst
        if (!b.hit && b.t < 0.15 && dist < b.max + BODY * k && grounded) {
          b.hit = true;
          this.strike(f, o, "s1", ux, uy, 260);
        }
        if (b.t - dt <= 0) {
          this.wreck.blast(b.x, b.y, 26 * k, 3, b.x, b.y, 50);
          for (let i = 0; i < 22; i++) {
            const a = rand(0, Math.PI * 2);
            const sp = rand(80, 220) * k;
            this.spawn("wisp", b.x, b.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.45, 2.5 * k, 10 * k);
          }
        }
      }
    }
    this.bursts = this.bursts.filter((b) => b.t < (b.kind === "daikanji" ? 0.75 : b.kind === "shadow" ? 0.4 : 0.9));
  }

  private updateWaves(dt: number) {
    const k = this.k;
    const a = this.arena();
    for (const w of this.waves) {
      w.pos += w.sign * 560 * k * dt;
      const o = this.f![w.owner === 0 ? 1 : 0];
      const p = w.axis === "x" ? o.x : o.y;
      const thick = 46 * k;
      const inWave = (p - w.pos) * w.sign < 0 && (p - w.pos) * w.sign > -thick;
      if (!w.hit && inWave && o.z < HIGH * k && o.state !== "lurk") {
        w.hit = true;
        this.strike(this.f![w.owner], o, "burst", w.axis === "x" ? w.sign : 0, w.axis === "y" ? w.sign : 0, 620);
      }
      // behind the front it's all water: the undertow drags at anyone in it
      if ((p - w.pos) * w.sign < 0 && o.z < HIGH * k) o.slow = 0.25;
      // and the wave sweeps away the foe's attacks in its path
      const inBand = (x: number, y: number) => {
        const q = ((w.axis === "x" ? x : y) - w.pos) * w.sign;
        return q < 0 && q > -thick * 1.5;
      };
      for (const s of this.shots) {
        if (s.owner === w.owner || s.t < 0 || s.life < 0 || this.lofted(s) || !inBand(s.x, s.y)) continue;
        this.pop(s, s.x, s.y, s.kind === "fireblast");
        if (s.kind !== "fireblast") this.clashFx(s.x, s.y, "spark");
      }
      for (const fp of this.particles) {
        if (fp.kind !== "flame" || fp.owner === undefined || fp.owner === w.owner || !inBand(fp.x, fp.y)) continue;
        fp.life = 0;
        if (Math.random() < 0.15) this.clashFx(fp.x, fp.y, "steam");
      }
      // the wave washes the page along with it
      w.wreckT -= dt;
      if (w.wreckT <= 0) {
        w.wreckT = 0.05;
        const lo = w.axis === "x" ? a.t : a.l;
        const hi = w.axis === "x" ? a.b : a.r;
        const dx = w.axis === "x" ? w.sign : 0;
        const dy = w.axis === "y" ? w.sign : 0;
        for (let s = lo - 40; s <= hi + 40; s += 46) {
          const x = w.axis === "x" ? w.pos : s + rand(-10, 10);
          const y = w.axis === "y" ? w.pos : s + rand(-10, 10);
          this.wreck.wash(x, y, 24 * k, dx, dy, 2, 8);
          if (Math.random() < 0.35) {
            const sp = rand(200, 400) * k;
            this.spawn(
              "foam",
              x,
              y,
              dx * sp + rand(-40, 40),
              dy * sp + rand(-40, 40),
              0.6,
              rand(1.5, 3) * k,
              20 * k,
              rand(80, 220) * k
            );
          }
        }
      }
    }
    this.waves = this.waves.filter((w) => (w.end - w.pos) * w.sign > 0);
  }

  // ---------- movement ----------

  private move(f: Fighter, dt: number) {
    const k = this.k;
    const speed =
      STATS[f.species].speed *
      k *
      (f.status === "par" ? 0.55 : 1) *
      (f.slow > 0 ? 0.6 : 1) *
      (f.state === "lurk" ? 1.6 : f.state === "fly" ? 1.35 : 1) *
      (f.boost > 0 ? 1.25 : 1) *
      (f.mega ? 1.08 : 1);
    const free = (f.state === "free" && !this.helpless(f)) || f.state === "fly" || f.state === "lurk";
    if (free) {
      const ease = Math.min(1, dt * 14);
      f.vx += (f.input.x * speed - f.vx) * ease;
      f.vy += (f.input.y * speed - f.vy) * ease;
      if (f.input.x || f.input.y) f.face = Math.atan2(f.input.y, f.input.x);
      else if (f.state === "free") f.face = Math.atan2(this.other(f).y - f.y, this.other(f).x - f.x);
    } else if (f.state !== "dodge" && f.state !== "spin" && f.state !== "dash") {
      const drag = Math.exp(-10 * dt);
      f.vx *= drag;
      f.vy *= drag;
    }
    const kd = Math.exp(-6 * dt);
    f.kx *= kd;
    f.ky *= kd;
    f.x += (f.vx + f.kx) * dt;
    f.y += (f.vy + f.ky) * dt;
    const a = this.arena();
    // the arena's edges: a spinning shell bounces off them, everything else stops
    if (f.x < a.l || f.x > a.r) {
      f.x = Math.max(a.l, Math.min(a.r, f.x));
      if (f.state === "spin") f.vx = -f.vx;
      f.kx = -f.kx * 0.3;
    }
    if (f.y < a.t || f.y > a.b) {
      f.y = Math.max(a.t, Math.min(a.b, f.y));
      if (f.state === "spin") f.vy = -f.vy;
      f.ky = -f.ky * 0.3;
    }
    // walking through debris kicks it about (a lurking shadow slides under it)
    const sp = Math.hypot(f.vx + f.kx, f.vy + f.ky);
    if (f.z < 4 && sp > 40 && f.state === "free") {
      f.wreckT -= dt;
      if (f.wreckT <= 0) {
        f.wreckT = 0.08;
        this.wreck.scuff(f.x, f.y, 16 * k, (f.vx + f.kx) * 0.6, (f.vy + f.ky) * 0.6);
      }
    }
  }

  /** The two can't stand in the same spot (a flyer or a shadow passes by). */
  private collide() {
    const [a, b] = this.f!;
    const solid = (f: Fighter) => f.state !== "gone" && f.state !== "hidden" && f.state !== "lurk";
    if (!solid(a) || !solid(b)) return;
    if (Math.abs(a.z - b.z) > HIGH * this.k) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const min = BODY * 2 * this.k;
    if (d >= min) return;
    const push = (min - d) / 2;
    a.x -= (dx / d) * push;
    a.y -= (dy / d) * push;
    b.x += (dx / d) * push;
    b.y += (dy / d) * push;
  }

  // ---------- hits ----------

  /**
   * f's move lands on o, pushing it along (dx, dy). Streams call this every tick, so they
   * don't crit or stun as hard. `fixed` is for Night Shade, which ignores power and type.
   */
  private strike(
    f: Fighter,
    o: Fighter,
    slot: Slot,
    dx: number,
    dy: number,
    knock: number,
    stream = false,
    fixed = 0,
    mult = 1
  ) {
    if (o.invuln > 0 || o.hp <= 0 || o.state === "hidden" || o.state === "gone") return;
    const move = this.moves(f)[slot];
    const eff = fixed ? 1 : this.eff(move.kind, o);
    if (eff === 0) {
      if (!f.told) this.say(`It doesn't affect ${this.name(o)}…`);
      f.told = true;
      return;
    }
    const crit = !stream && !fixed && Math.random() < 0.0625;
    let dmg = fixed ? move.power * fixed : move.power * mult * DAMAGE * eff * rand(0.85, 1) * (crit ? 1.5 : 1);
    // tucked into its shell, Blastoise shrugs off half
    if (o.state === "spin" || (o.state === "charge" && o.species === "blastoise")) dmg *= 0.5;
    // a Mega hits harder, more so after a Dragon Dance or Shell Smash; Shell Smash leaves it soft
    if (f.mega) dmg *= 1.15;
    if (f.boost > 0) dmg *= 1.3;
    if (o.brittle > 0) dmg *= 1.25;
    this.damage(o, dmg, f);
    f.stats.dealt += dmg;
    if (eff > 1) f.stats.supers++;
    f.meter = Math.min(1, f.meter + (dmg / STATS[o.species].hp) * 1.3);
    o.meter = Math.min(1, o.meter + (dmg / STATS[o.species].hp) * 0.9);
    const k = this.k;
    const push = knock * k * (eff > 1 ? 1.4 : eff < 1 ? 0.7 : 1);
    o.kx += dx * push;
    o.ky += dy * push;
    o.flash = 1;
    // a real blow wakes a sleeper; a blow (or any fire) cracks the ice
    if (o.status === "slp" && !stream) {
      o.status = null;
      this.say(`${this.name(o)} woke up!`);
    } else if (o.status === "frz" && (!stream || move.kind === "fire")) {
      o.status = null;
      this.say(`${this.name(o)} thawed out!`);
      for (let i = 0; i < 12; i++)
        this.spawn("ice", o.x, o.y, rand(-120, 120) * k, rand(-120, 120) * k, 0.5, 2 * k, 14 * k, rand(60, 140) * k);
    }
    // a stream only staggers; real blows interrupt whatever o was doing
    const busy = ["charge", "ult", "evolve", "fly", "dive", "lurk", "sink", "rise", "stomp", "dash", "sneak"].includes(
      o.state
    );
    if (!this.helpless(o) && (!stream || o.state === "free") && o.hp > 0 && !busy) {
      o.state = "hurt";
      o.t = stream ? 0.2 : 0;
    }
    this.sound.hit(eff, crit);
    this.sparks(o.x, o.y - 12 * k, eff > 1 ? 14 : 8, eff > 1 ? "#fde047" : "#fff");
    this.wreck.scuff(o.x, o.y, 26 * k, dx * 200 * k, dy * 200 * k);
    if (!stream) {
      this.freeze = eff > 1 ? 7 : 4;
      this.onShake(eff > 1 ? 8 : 4);
    }
    if (!f.told) {
      f.told = true;
      if (eff > 1) this.say("It's super effective!");
      else if (eff < 1) this.say("It's not very effective…");
    }
    if (crit) this.say("A critical hit!");
    // fire can leave a burn
    if (move.kind === "fire" && Math.random() < (stream ? 0.03 : 0.25)) this.inflict(o, "brn");
  }

  private damage(o: Fighter, dmg: number, by: Fighter | null) {
    if (o.hp <= 0) return;
    o.hp = Math.max(0, o.hp - dmg);
    if (o.hp > 0 || this.phase !== "battle") return;
    // fainted
    o.state = "faint";
    o.t = 0;
    o.status = null;
    this.phase = "ko";
    this.phaseT = 0;
    this.freeze = 14;
    if (this.finale) {
      // the battle's over: whoever was mid-Burst comes back down
      const f = this.f![this.finale.owner];
      this.finale = null;
      f.invuln = 0;
      if (f.state === "ult") this.toFree(f);
    }
    this.invertPage(false);
    this.onShake(12);
    this.sound.faint();
    this.messages = [];
    this.say(`${this.name(o)} fainted!`);
    if (by) by.meter = 0;
  }

  // ---------- particles ----------

  private spawn(kind: PKind, x: number, y: number, vx: number, vy: number, life: number, r: number, z = 0, vz = 0) {
    const p: Particle = { kind, x, y, z, vx, vy, vz, life, max: life, r };
    this.particles.push(p);
    return p;
  }

  private sparks(x: number, y: number, n: number, colour: string) {
    this.flashes.push({ x, y, t: 0, r: 22 * this.k, colour });
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(120, 280) * this.k;
      this.spawn("spark", x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.25, 1.6 * this.k);
    }
  }

  private dust(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(60, 200) * this.k;
      this.spawn("smoke", x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.4, 0.8), rand(4, 8) * this.k);
    }
  }

  private updateParticles(dt: number) {
    const k = this.k;
    const [a, b] = this.f!;
    let burnT = 0;
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "flame") {
        const age = 1 - p.life / p.max;
        p.r += dt * 18 * k;
        p.vx *= Math.exp(-1.5 * dt);
        p.vy *= Math.exp(-1.5 * dt);
        if (p.vz) {
          p.z += p.vz * dt;
          p.vz *= Math.exp(-2.5 * dt);
        }
        // Flamethrower's fire burns whoever it reaches (and the page under it)
        if (p.owner !== undefined && age < 0.85) {
          const f = p.owner === 0 ? a : b;
          const o = p.owner === 0 ? b : a;
          const reached = Math.hypot(o.x - p.x, o.y - p.y) < BODY * k + p.r * 0.6;
          if (reached && o.z < HIGH * k && o.state !== "lurk" && f.tick <= 0 && f.state === "stream") {
            f.tick = 0.1;
            this.strike(f, o, "s1", Math.cos(f.aimAngle), Math.sin(f.aimAngle), 70, true);
          }
          if (burnT <= 0 && Math.random() < 0.06) {
            burnT = 1;
            this.wreck.ignite(p.x, p.y, 12 * k, 5);
          }
        }
      } else if (p.kind === "steam") {
        p.vx *= Math.exp(-3 * dt);
        p.vy *= Math.exp(-3 * dt);
        p.z += dt * 40 * k;
        p.r += dt * 14 * k;
      } else if (p.kind === "smoke" || p.kind === "wisp") {
        p.vx *= Math.exp(-3 * dt);
        p.vy *= Math.exp(-3 * dt);
        if (p.kind === "smoke") p.r += dt * 10 * k;
      } else if (p.kind === "bubble" && !p.vz) {
        // poison bubbles drift up and pop
        p.z += dt * 20 * k;
      } else if (p.vz || p.z > 0) {
        p.vz -= 900 * k * dt;
        p.z = Math.max(0, p.z + p.vz * dt);
        if (p.z === 0 && p.vz < 0) p.life = Math.min(p.life, 0.06);
      } else {
        p.vx *= Math.exp(-4 * dt);
        p.vy *= Math.exp(-4 * dt);
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.particles.length > 1600) this.particles.splice(0, this.particles.length - 1600);
  }

  // ---------- Mega Evolution ----------

  /** The moves on a Pokémon's buttons right now. */
  private moves(f: Fighter) {
    return (f.mega ? MEGA_MOVES : MOVES)[f.species];
  }

  /** Type effectiveness against o, whose types may have changed with Mega Evolution. */
  private eff(kind: Kind, o: Fighter) {
    return effectiveness(kind, o.species, o.mega);
  }

  /** Once a battle, below MEGA_AT of its HP, when the screen is free. */
  private canMega(f: Fighter) {
    return (
      !f.megaUsed && f.hp > 0 && f.hp / STATS[f.species].hp < MEGA_AT && this.canAct(f) && !this.cutin && !this.finale
    );
  }

  /** E: the Key Stone reacts, a rainbow cut-in, then the evolution itself. */
  private tryMega(f: Fighter) {
    if (!this.canMega(f)) return false;
    f.megaUsed = true;
    f.state = "charge";
    f.t = 0;
    f.invuln = 99;
    this.cutin = { owner: f.id, t: 0, evolve: true };
    this.sound.cutin();
    this.say(`${this.name(f)} is reacting to the Key Stone!`);
    return true;
  }

  private startEvolve(f: Fighter) {
    f.state = "evolve";
    f.t = 0;
    f.invuln = 99;
    this.sound.megaEvolve();
    this.sound.rumble(1.3);
  }

  /** The Mega move a button starts. */
  private megaMove(f: Fighter, slot: Slot) {
    const k = this.k;
    const sp = f.species;
    if (slot === "melee") {
      f.state = "melee";
      this.sound.swipe();
    } else if (sp === "charizard" && slot === "s1") {
      f.state = "stream";
      this.sound.flame(0.8);
    } else if (sp === "charizard" && slot === "s2") {
      f.state = "dash";
      this.sound.fireBlast();
    } else if (slot === "s4" && sp !== "gengar") {
      f.state = "buff";
      this.sound.whoosh();
    } else if (sp === "gengar" && slot === "s2") {
      f.state = "sneak";
      f.invuln = 0.35;
      this.sound.sink();
      for (let i = 0; i < 14; i++) {
        const a = rand(0, Math.PI * 2);
        this.spawn("wisp", f.x, f.y, Math.cos(a) * 90 * k, Math.sin(a) * 90 * k, 0.4, 2.5 * k, 10 * k);
      }
    } else {
      f.state = "cast";
    }
  }

  /** A sheet's animation, or Idle if this form doesn't have it. */
  private anim(f: Fighter, name: string) {
    return f.mon.anims[name] ? name : "Idle";
  }

  private megaCastAnim(f: Fighter) {
    const charge = (f.species === "blastoise" && f.move === "s2") || (f.species === "gengar" && f.move !== "s3");
    const name = this.anim(f, charge ? "Charge" : "Shoot");
    const anim = f.mon.anims[name];
    const at = charge ? 0.25 : timeOfFrame(anim, anim.hitFrame ?? 2);
    return { name, anim, at, len: Math.max(anim.length, at + 0.15) + 0.05 };
  }

  /** Dragon Tail sweeps all the way round; Aqua Tail and Shadow Claw strike in front. */
  private megaMelee(f: Fighter, o: Fighter) {
    const k = this.k;
    const name = this.anim(f, f.species === "charizard" ? "Swing" : f.species === "gengar" ? "Strike" : "Attack");
    const anim = f.mon.anims[name];
    const hitAt = timeOfFrame(anim, anim.hitFrame ?? 3);
    if (!f.landed && f.t >= hitAt) {
      f.landed = true;
      if (f.species === "charizard") {
        const r = 44 * k;
        this.swipes.push({ kind: "tail", x: f.x, y: f.y, angle: f.aimAngle, t: 0, fromX: f.x, fromY: f.y });
        this.wreck.blast(f.x, f.y, r * 0.9, 3, f.x, f.y, 60);
        this.parry(f, f.x, f.y, r);
        const d = Math.hypot(o.x - f.x, o.y - f.y);
        if (d < r + BODY * k && o.z < HIGH * k && o.state !== "lurk")
          this.strike(f, o, "melee", (o.x - f.x) / (d || 1), (o.y - f.y) / (d || 1), 420);
      } else {
        const reach = f.species === "gengar" ? 34 : 30;
        const px = f.x + Math.cos(f.aimAngle) * reach * k;
        const py = f.y + Math.sin(f.aimAngle) * reach * k;
        const kind = f.species === "gengar" ? "shadowclaw" : "aqua";
        this.swipes.push({ kind, x: px, y: py, angle: f.aimAngle, t: 0, fromX: f.x, fromY: f.y });
        if (kind === "aqua") this.wreck.wash(px, py, 20 * k, Math.cos(f.aimAngle), Math.sin(f.aimAngle), 3, 30);
        else this.wreck.blast(px, py, 20 * k, 3, f.x, f.y, 40);
        this.parry(f, px, py, 24 * k);
        if (Math.hypot(o.x - px, o.y - py) < (BODY + 20) * k && o.z < HIGH * k && o.state !== "lurk")
          this.strike(f, o, "melee", Math.cos(f.aimAngle), Math.sin(f.aimAngle), 260);
      }
    }
    if (f.t >= anim.length) this.toFree(f);
  }

  /** Knocks the foe's projectiles within r of (x, y) out of the air. */
  private parry(f: Fighter, x: number, y: number, r: number) {
    for (const s of this.shots) {
      if (s.owner === f.id || s.t < 0 || s.life < 0 || this.lofted(s)) continue;
      if (Math.hypot(s.x - x, s.y - y) > r + this.shotRadius(s)) continue;
      this.pop(s, s.x, s.y);
      this.clashFx(s.x, s.y, "spark");
      this.tell(`${this.name(f)} knocked it away!`);
    }
  }

  /** The Mega-only states: evolving, Flare Blitz, Dragon Dance / Shell Smash, Shadow Sneak. */
  private megaAct(f: Fighter, o: Fighter, dt: number) {
    const k = this.k;
    switch (f.state) {
      case "evolve": {
        // wrapped in a rainbow of light, then out it bursts
        if (f.t < 0.9 && Math.random() < 0.8) {
          const a = rand(0, Math.PI * 2);
          const d = rand(40, 70) * k;
          this.spawn(
            "spark",
            f.x + Math.cos(a) * d,
            f.y - 14 * k + Math.sin(a) * d,
            -Math.cos(a) * d * 3,
            -Math.sin(a) * d * 3,
            0.3,
            2 * k
          );
        }
        if (f.t >= 0.9 && !f.mega) {
          const before = this.name(f);
          f.mega = true;
          f.mon = this.megas[f.species] ?? f.mon;
          f.hp = Math.min(STATS[f.species].hp, f.hp + STATS[f.species].hp * 0.15);
          for (const s of ["melee", "s1", "s2", "s3", "s4"] as const) f.cd[s] = 0;
          f.tint = 1;
          f.tintColour = "#fff";
          this.flashes.push({ x: f.x, y: f.y, t: 0, r: 120 * k, colour: "#fff" });
          this.wreck.crater(f.x, f.y, 12 * k);
          this.wreck.blast(f.x, f.y, 80 * k, 6, f.x, f.y, 200);
          this.onShake(18);
          this.screenFlash = 0.7;
          if (f.species === "gengar") this.sound.cackle();
          else this.sound.roar(f.species === "blastoise");
          this.sound.boom();
          this.say(`${before} has Mega Evolved into ${MEGA_NAME[f.species]}!`);
          for (let i = 0; i < 40; i++) {
            const a = rand(0, Math.PI * 2);
            const sp = rand(160, 320) * k;
            this.spawn("spark", f.x, f.y - 14 * k, Math.cos(a) * sp, Math.sin(a) * sp, 0.5, 2 * k);
          }
          this.onMega?.(f.id);
        }
        if (f.t >= 1.35) {
          f.invuln = 0;
          this.toFree(f);
        }
        break;
      }
      case "dash": {
        // Flare Blitz: wreathed in blue fire, a charge that burns a trench through the page
        const wind = 0.15;
        for (let i = 0; i < 3; i++)
          this.blueFlame(
            f.x + rand(-10, 10) * k,
            f.y + rand(-6, 6) * k,
            -f.vx * 0.2,
            -f.vy * 0.2,
            0.4,
            4 * k,
            rand(4, 24) * k
          );
        if (f.t < wind) break;
        if (f.t - dt < wind) {
          f.vx = Math.cos(f.aimAngle) * 440 * k;
          f.vy = Math.sin(f.aimAngle) * 440 * k;
        }
        f.wreckT -= dt;
        if (f.wreckT <= 0) {
          f.wreckT = 0.04;
          this.wreck.ignite(f.x, f.y, 16 * k, 8);
          this.wreck.knock(f.x, f.y, 14 * k, f.x - f.vx * 0.2, f.y - f.vy * 0.2, 300, 8);
        }
        f.trail.push({ x: f.x, y: f.y, z: f.z, a: 0.5 });
        if (
          !f.landed &&
          Math.hypot(o.x - f.x, o.y - f.y) < (BODY * 2 + 6) * k &&
          o.z < HIGH * k &&
          o.state !== "lurk"
        ) {
          f.landed = true;
          const sp = Math.hypot(f.vx, f.vy) || 1;
          const before = o.hp;
          this.strike(f, o, "s2", f.vx / sp, f.vy / sp, 460);
          // Flare Blitz hurts the user too
          const dealt = before - o.hp;
          if (dealt > 0) {
            this.damage(f, dealt * 0.25, null);
            this.say(`${this.name(f)} is damaged by recoil!`);
          }
        }
        if (f.t >= wind + 0.45) {
          f.vx *= 0.2;
          f.vy *= 0.2;
          this.toFree(f);
        }
        break;
      }
      case "buff":
        // Dragon Dance (a whirl of blue fire) or Shell Smash (the shell cracks open)
        if (!f.fired && f.t >= 0.35) {
          f.fired = true;
          f.boost = 8;
          if (f.species === "blastoise") f.brittle = 8;
          this.say(
            f.species === "blastoise"
              ? `${this.name(f)} broke its shell! Its power and speed rose sharply!`
              : `${this.name(f)}'s attack and speed rose!`
          );
          this.sound.megaEvolve();
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            if (f.species === "blastoise")
              this.spawn(
                "rock",
                f.x,
                f.y,
                Math.cos(a) * 160 * k,
                Math.sin(a) * 160 * k,
                0.6,
                2.5 * k,
                10 * k,
                rand(80, 180) * k
              );
            else
              this.blueFlame(f.x + Math.cos(a) * 26 * k, f.y + Math.sin(a) * 14 * k, 0, 0, 0.5, 4 * k, 4 * k, 120 * k);
          }
        }
        if (f.t >= 0.6) this.toFree(f);
        break;
      case "sneak":
        // Shadow Sneak: gone, then up out of the foe's own shadow, behind it
        if (f.t < 0.15) break;
        if (!f.fired) {
          f.fired = true;
          const d = Math.hypot(o.x - f.x, o.y - f.y) || 1;
          const a = this.arena();
          f.x = Math.max(a.l, Math.min(a.r, o.x + ((o.x - f.x) / d) * 30 * k));
          f.y = Math.max(a.t, Math.min(a.b, o.y + ((o.y - f.y) / d) * 30 * k));
          f.aimAngle = f.face = Math.atan2(o.y - f.y, o.x - f.x);
          this.sound.cackle();
          for (let i = 0; i < 14; i++) {
            const ang = rand(0, Math.PI * 2);
            this.spawn("wisp", f.x, f.y, Math.cos(ang) * 90 * k, Math.sin(ang) * 90 * k, 0.4, 2.5 * k, 10 * k);
          }
        }
        if (!f.landed && f.t >= 0.27) {
          f.landed = true;
          f.invuln = 0;
          const px = f.x + Math.cos(f.aimAngle) * 26 * k;
          const py = f.y + Math.sin(f.aimAngle) * 26 * k;
          this.swipes.push({ kind: "shadowclaw", x: px, y: py, angle: f.aimAngle, t: 0, fromX: f.x, fromY: f.y });
          this.wreck.blast(px, py, 18 * k, 3, f.x, f.y, 30);
          if (Math.hypot(o.x - px, o.y - py) < (BODY + 22) * k && o.z < HIGH * k && o.state !== "lurk")
            this.strike(f, o, "s2", Math.cos(f.aimAngle), Math.sin(f.aimAngle), 280);
        }
        if (f.t >= 0.5) this.toFree(f);
        break;
    }
  }

  private megaCast(f: Fighter, o: Fighter) {
    const k = this.k;
    const a = f.aimAngle;
    const mx = f.x + Math.cos(a) * 16 * k;
    const my = f.y + Math.sin(a) * 16 * k;
    const shot = (kind: Shot["kind"], speed: number, life: number, angle = a): Shot => ({
      kind,
      owner: f.id,
      x: mx,
      y: my,
      z: 12 * k,
      vx: Math.cos(angle) * speed * k,
      vy: Math.sin(angle) * speed * k,
      angle,
      t: 0,
      life,
      x0: mx,
      y0: my,
      tx: 0,
      ty: 0,
    });
    const ring = (kind: Burst["kind"], max: number) =>
      this.bursts.push({ kind, owner: f.id, x: f.x, y: f.y, t: 0, max, hit: false, wreckT: 0 });
    if (f.species === "charizard") {
      this.shots.push(shot("dragonpulse", 330, 0.9));
      this.sound.shadowBall();
      this.onShake(5);
    } else if (f.species === "blastoise") {
      if (f.move === "s1") {
        for (let i = 0; i < 3; i++) {
          const s = shot("waterpulse", 230, 1);
          s.t = -i * 0.12;
          this.shots.push(s);
        }
        this.sound.water(0.4);
      } else if (f.move === "s2") {
        ring("darkpulse", 140 * k);
        this.sound.burstDark();
        this.onShake(8);
      } else {
        this.shots.push(shot("aura", 250, 1.8));
        this.sound.iceBeam(0.3);
      }
    } else if (f.move === "s1") {
      ring("sludgewave", 150 * k);
      this.sound.splat();
      this.sound.wave();
      this.onShake(8);
    } else if (f.move === "s3") {
      this.shots.push(shot("hex", 280, 1.2));
      this.sound.shadowBall();
    } else {
      // Curse: Gengar pays with its own HP to lay a curse on the foe
      f.hp = Math.max(1, f.hp - STATS[f.species].hp * 0.15);
      o.curse = 6;
      o.curseTick = 0.5;
      f.flash = 1;
      this.flashes.push({ x: o.x, y: o.y, t: 0, r: 40 * k, colour: GHOST[1] });
      this.say(`${this.name(f)} cut its own HP and laid a curse on ${this.name(o)}!`);
      this.sound.cackle();
    }
  }

  /** Boosts and Shell Smash wear off; a curse drains HP; confusion clears. */
  private updateMegaStatus(f: Fighter, dt: number) {
    const k = this.k;
    f.boost = Math.max(0, f.boost - dt);
    f.brittle = Math.max(0, f.brittle - dt);
    f.confused = Math.max(0, f.confused - dt);
    if (f.curse > 0 && f.hp > 0) {
      f.curse -= dt;
      f.curseTick -= dt;
      if (f.curseTick <= 0) {
        f.curseTick = 0.5;
        this.damage(f, STATS[f.species].hp * 0.025, null);
        this.spawn("wisp", f.x + rand(-8, 8) * k, f.y, 0, 0, 0.5, 2.5 * k, rand(10, 30) * k);
      }
    }
    // tell the player when the Key Stone is ready
    if (!this.megaHint && f.id === 0 && !this.watch && !f.megaUsed && this.canMega(f)) {
      this.megaHint = true;
      this.say(this.touch ? "Tap MEGA to Mega Evolve!" : "Press E to Mega Evolve!");
    }
  }

  private blueFlame(x: number, y: number, vx: number, vy: number, life: number, r: number, z = 0, vz = 0) {
    const p = this.spawn("flame", x, y, vx, vy, life, r, z, vz);
    p.blue = true;
    return p;
  }

  /** The visible part of the page, in document px. */
  private view() {
    return {
      x: window.scrollX,
      y: window.scrollY + this.headerBottom,
      w: window.innerWidth,
      h: window.innerHeight - this.headerBottom,
    };
  }

  /** How far it is from (x, y) to the farthest corner of the screen. */
  private farthest(x: number, y: number) {
    const v = this.view();
    return Math.max(
      Math.hypot(x - v.x, y - v.y),
      Math.hypot(x - v.x - v.w, y - v.y),
      Math.hypot(x - v.x, y - v.y - v.h),
      Math.hypot(x - v.x - v.w, y - v.y - v.h)
    );
  }

  /** Never-Ending Nightmare turns the real page negative for a few seconds. */
  private invertPage(on: boolean) {
    const root = document.querySelector<HTMLElement>("[data-page-root]");
    if (!root) return;
    if (on && this.pageFilter === null) {
      this.pageFilter = root.style.filter;
      root.style.filter = "invert(1) hue-rotate(180deg)";
    } else if (!on && this.pageFilter !== null) {
      root.style.filter = this.pageFilter;
      this.pageFilter = null;
    }
  }

  private startMegaFinale(f: Fighter) {
    const k = this.k;
    const o = this.other(f);
    f.state = "ult";
    f.t = 0;
    f.told = false;
    f.invuln = 1;
    this.finale = {
      owner: f.id,
      kind: f.species,
      t: 0,
      hits: 0,
      hit: false,
      next: 0,
      shake: 0,
      wreckT: 0,
      hands: [],
      mega: true,
      x: o.x,
      y: o.y,
      sweep: 0,
    };
    this.sound.rumble(MEGA_FINALE[f.species]);
    if (f.species === "charizard") {
      this.sound.whoosh();
      this.wreck.crater(f.x, f.y, 14 * k);
    } else if (f.species === "blastoise") {
      this.sound.water(0.7);
    } else {
      this.sound.nightShade();
      this.sound.cackle();
      // shadow hands, everywhere on the page
      const v = this.view();
      for (let i = 0; i < 12; i++) this.finale.hands.push({ x: v.x + rand(0, v.w), y: v.y + rand(0, v.h) });
    }
  }

  /** Where Inferno Overdrive's meteor is, falling out of the sky onto (fin.x, fin.y). */
  private meteorAt(fin: NonNullable<BattleGame["finale"]>) {
    const p = Math.max(0, Math.min(1, (fin.t - 0.6) / 0.65)) ** 2;
    const sx = fin.x + 160 * this.k;
    const sy = this.view().y - 120 * this.k;
    return { x: sx + (fin.x - sx) * p, y: sy + (fin.y - sy) * p, p };
  }

  private updateMegaFinale(fin: NonNullable<BattleGame["finale"]>, f: Fighter, o: Fighter, dt: number) {
    const k = this.k;
    const t = fin.t;
    const len = MEGA_FINALE[fin.kind];
    fin.shake -= dt;
    if (fin.shake <= 0 && t < len - 0.3) {
      fin.shake = 0.09;
      this.onShake(fin.kind === "gengar" ? 6 : 9);
    }
    const reachable = () => o.invuln <= 0 && o.state !== "lurk" && o.hp > 0;
    const sweep = (from: number, dur: number) => {
      // grows from nothing to the far corner of the screen
      const rad = Math.min(1, Math.max(0, (t - from) / dur)) * this.farthest(fin.x, fin.y);
      fin.sweep = rad;
      return rad;
    };

    if (fin.kind === "charizard") {
      // INFERNO OVERDRIVE: off the top of the screen, a lock-on, a meteor of blue fire, and
      // a firestorm that burns the whole page
      if (t < 0.6) {
        f.z = Math.min(700 * k, f.z + 1400 * k * dt);
        this.blueFlame(f.x + rand(-8, 8) * k, f.y, 0, 0, 0.5, 5 * k, f.z * 0.9, -200 * k);
      }
      if (t < 0.9) {
        fin.x = o.x;
        fin.y = o.y;
      }
      if (t >= 0.6 && !fin.next) {
        fin.next = 1;
        this.sound.incoming(0.65);
      }
      if (t >= 0.6 && t < 1.25) {
        const m = this.meteorAt(fin);
        for (let i = 0; i < 3; i++)
          this.blueFlame(m.x + rand(-14, 14) * k, m.y + rand(-14, 14) * k, rand(-40, 40) * k, -200 * k, 0.4, 7 * k);
      }
      if (t >= 1.25 && !fin.hit) {
        fin.hit = true;
        this.sound.boom();
        this.sound.fireBlast();
        this.onShake(30);
        this.screenFlash = 1;
        this.wreck.crater(fin.x, fin.y, 26 * k);
        for (let i = 0; i < 90; i++) {
          const a = rand(0, Math.PI * 2);
          const sp = rand(160, 420) * k;
          this.blueFlame(
            fin.x,
            fin.y,
            Math.cos(a) * sp,
            Math.sin(a) * sp,
            rand(0.4, 0.8),
            6 * k,
            6 * k,
            rand(0, 160) * k
          );
        }
        if (reachable() && Math.hypot(o.x - fin.x, o.y - fin.y) < 90 * k) {
          const d = Math.hypot(o.x - fin.x, o.y - fin.y) || 1;
          this.strike(f, o, "burst", (o.x - fin.x) / d, (o.y - fin.y) / d, 540, false, 0, 1);
          if (Math.random() < 0.5) this.inflict(o, "brn");
        }
        // Charizard X lands back behind the blast
        f.z = 160 * k;
      }
      if (fin.hit) {
        const rad = sweep(1.25, 0.8);
        fin.wreckT -= dt;
        if (fin.wreckT <= 0 && t < 2.2) {
          fin.wreckT = 0.03;
          this.wreck.blast(fin.x, fin.y, rad, 9, fin.x, fin.y, 500);
          for (let i = 0; i < 10; i++) {
            const a = rand(0, Math.PI * 2);
            const x = fin.x + Math.cos(a) * rad;
            const y = fin.y + Math.sin(a) * rad;
            this.wreck.ignite(x, y, 18 * k, 6);
            if (Math.random() < 0.5) this.blueFlame(x, y, 0, 0, 0.5, 6 * k, 2 * k, rand(100, 240) * k);
          }
        }
        // embers rising all over the screen
        const v = this.view();
        if (Math.random() < 0.9)
          this.blueFlame(v.x + rand(0, v.w), v.y + rand(0, v.h), 0, 0, 0.6, 3 * k, 0, rand(60, 160) * k);
        f.z = Math.max(0, f.z - 400 * k * dt);
      }
    } else if (fin.kind === "blastoise") {
      // HYDRO VORTEX: the cannon fires into the sky, a whirlpool swallows the screen, and
      // everything on the page spins round the foe until it erupts
      if (t < 0.6) {
        for (let i = 0; i < 3; i++)
          this.spawn(
            "foam",
            f.x + rand(-6, 6) * k,
            f.y,
            rand(-30, 30) * k,
            rand(-30, 30) * k,
            0.8,
            3 * k,
            30 * k,
            rand(400, 600) * k
          );
      }
      if (t >= 0.6 && !fin.next) {
        fin.next = 1;
        fin.x = o.x;
        fin.y = o.y;
        this.flood = 1;
        this.sound.wave();
      }
      if (t >= 0.6 && t < 2.6) {
        this.flood = 1;
        const rad = sweep(0.6, 1.3);
        // the undertow drags the foe into the middle and spins it round
        if (reachable() && o.z < HIGH * k) {
          o.x += (fin.x - o.x) * Math.min(1, dt * 2.5);
          o.y += (fin.y - o.y) * Math.min(1, dt * 2.5);
          o.face += dt * 14;
        }
        // pummelled as it spins: a hit every 0.35 s, five at most
        const due = Math.min(5, Math.floor((t - 0.6) / 0.35));
        if (fin.hits < due) {
          fin.hits = due;
          if (reachable() && Math.hypot(o.x - fin.x, o.y - fin.y) < 70 * k)
            this.strike(f, o, "burst", 0, 0, 0, false, 0, 0.09);
        }
        // every letter on the screen is torn loose and swept round the whirlpool
        fin.wreckT -= dt;
        if (fin.wreckT <= 0) {
          fin.wreckT = 0.035;
          for (let i = 0; i < 26; i++) {
            const a = (i / 26) * Math.PI * 2 + t;
            const r = rad * rand(0.55, 1);
            const x = fin.x + Math.cos(a) * r;
            const y = fin.y + Math.sin(a) * r;
            this.wreck.wash(x, y, 34 * k, -Math.sin(a), Math.cos(a), 9, 14);
          }
        }
      }
      if (t >= 2.6 && !fin.hit) {
        // the vortex erupts in a pillar of water
        fin.hit = true;
        this.sound.boom();
        this.onShake(28);
        this.screenFlash = 0.8;
        this.wreck.crater(fin.x, fin.y, 22 * k);
        this.wreck.blast(fin.x, fin.y, 80 * k, 9, fin.x, fin.y, 300);
        for (let i = 0; i < 90; i++) {
          const a = rand(0, Math.PI * 2);
          const sp = rand(40, 200) * k;
          this.spawn(
            i % 3 ? "drop" : "foam",
            fin.x,
            fin.y,
            Math.cos(a) * sp,
            Math.sin(a) * sp,
            rand(0.8, 1.3),
            rand(2, 4) * k,
            10 * k,
            rand(400, 800) * k
          );
        }
        if (reachable() && Math.hypot(o.x - fin.x, o.y - fin.y) < 80 * k) {
          this.strike(f, o, "burst", 0, -1, 300, false, 0, 0.35);
        }
      }
    } else {
      // NEVER-ENDING NIGHTMARE: the page goes negative, Mega Gengar's third eye opens, the
      // dark eats every letter on the screen, and hands come up out of the page for the foe
      if (t >= 0.2 && t < len - 0.25) this.invertPage(true);
      if (t >= len - 0.25) this.invertPage(false);
      if (t < 0.5) {
        fin.x = o.x;
        fin.y = o.y;
      }
      if (t > 0.5 && t < 2) {
        const rad = sweep(0.5, 1.2);
        fin.wreckT -= dt;
        if (fin.wreckT <= 0) {
          fin.wreckT = 0.04;
          this.wreck.dissolve(fin.x, fin.y, rad, 600);
          this.wreck.blast(fin.x, fin.y, rad, 9, fin.x, fin.y, 0);
        }
      }
      if (Math.random() < 0.7) {
        const v = this.view();
        this.spawn("wisp", v.x + rand(0, v.w), v.y + rand(0, v.h), 0, 0, 0.6, 3 * k, 0);
      }
      if (t >= 2.05 && !fin.hit) {
        fin.hit = true;
        if (!reachable()) {
          this.say(`${this.name(o)} slipped out of the nightmare!`);
          fin.hits = -1;
        } else {
          o.state = "hurt";
          o.t = -0.8;
          this.sound.cackle();
        }
      }
      if (fin.hit && fin.hits === 0) o.z = Math.min(56 * k, o.z + 160 * k * dt);
      if (t >= 2.6 && fin.hits === 0) {
        fin.hits = 1;
        o.z = 0;
        o.state = "free";
        this.strike(f, o, "burst", 0, 0, 0, false, 0, o.status === "slp" ? 1.4 : 1);
        this.wreck.crater(o.x, o.y, 22 * k);
        this.sound.slam();
        this.sound.boom();
        this.onShake(28);
        this.screenFlash = 0.8;
        this.flashes.push({ x: o.x, y: o.y, t: 0, r: 110 * k, colour: GHOST[1] });
        for (let i = 0; i < 60; i++) {
          const a = rand(0, Math.PI * 2);
          const sp = rand(80, 300) * k;
          this.spawn("wisp", o.x, o.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.6, 3.5 * k, 8 * k);
        }
      }
    }
    if (t >= len) {
      this.invertPage(false);
      this.endFinale(f);
    }
  }

  /** The CPU's pick from its Mega moves. */
  private cpuMegaMove(f: Fighter, o: Fighter, d: number, away: boolean): Slot | null {
    const k = this.k;
    const ready = (s: Slot) => f.cd[s] <= 0;
    const chance = (p: number) => Math.random() < p;
    const eff = (s: Slot) => this.eff(this.moves(f)[s].kind, o);
    if (d < 50 * k && ready("melee") && eff("melee") > 0 && !away && chance(0.75)) return "melee";
    if (f.species === "charizard") {
      if (f.boost <= 0 && ready("s4") && chance(0.3)) return "s4";
      if (away) return null;
      if (d < 130 * k && ready("s1") && chance(0.5)) return "s1";
      if (d < 280 * k && ready("s3") && chance(0.4)) return "s3";
      if (d > 60 * k && d < 260 * k && ready("s2") && chance(0.3)) return "s2";
    } else if (f.species === "blastoise") {
      if (f.boost <= 0 && ready("s4") && chance(0.25)) return "s4";
      if (away) return null;
      if (d < 130 * k && ready("s2") && chance(0.45)) return "s2";
      if (d < 220 * k && ready("s1") && chance(0.4)) return "s1";
      if (d < 320 * k && ready("s3") && eff("s3") > 0 && chance(0.4)) return "s3";
    } else {
      if (o.curse <= 0 && f.hp / STATS[f.species].hp > 0.25 && ready("s4") && chance(0.25)) return "s4";
      if (away) return null;
      if (d < 140 * k && ready("s1") && chance(0.45)) return "s1";
      if (d < 300 * k && ready("s3") && chance(0.45)) return "s3";
      if (d > 60 * k && ready("s2") && chance(0.25)) return "s2";
    }
    return null;
  }

  // ---------- the CPU ----------

  private think(f: Fighter, dt: number) {
    const k = this.k;
    const o = this.other(f);
    const dx = o.x - f.x;
    const dy = o.y - f.y;
    const d = Math.hypot(dx, dy) || 1;
    const ai = f.ai;
    ai.think -= dt;
    ai.react -= dt;
    ai.strafeT -= dt;
    if (ai.strafeT <= 0) {
      ai.strafe = Math.random() < 0.5 ? -1 : 1;
      ai.strafeT = rand(0.8, 2.2);
    }
    if (this.phase !== "battle") {
      f.input = { x: 0, y: 0 };
      return;
    }

    // low on HP: Mega Evolve (after a moment's thought)
    if (this.canMega(f) && Math.random() < 0.03) {
      this.tryMega(f);
      return;
    }

    // airborne or underground: chase them, then drop on them / burst out under them
    if (f.state === "fly" || f.state === "lurk") {
      f.input = { x: dx / d, y: dy / d };
      ai.dive -= dt;
      if (d < 18 * k || ai.dive <= 0) {
        if (f.state === "fly") this.dive(f);
        else this.rise(f);
      }
      return;
    }

    // something nasty coming? get out of the way (not every time)
    if (this.canAct(f) && ai.react <= 0 && this.threatened(f)) {
      ai.react = 0.7;
      if (Math.random() < 0.5) {
        if (f.species === "charizard" && f.cd.s2 <= 0 && Math.random() < 0.4) this.tryMove(f, "s2");
        else if (f.species === "gengar" && f.cd.s2 <= 0 && Math.random() < 0.5) this.tryMove(f, "s2");
        else {
          f.input = { x: (-dy / d) * ai.strafe, y: (dx / d) * ai.strafe };
          this.tryMove(f, "dodge");
        }
        return;
      }
    }

    // keep a distance that suits its moves, circling
    const want =
      f.species === "blastoise"
        ? (f.cd.s1 <= 0 || f.cd.s3 <= 0 ? 150 : 90) * k
        : f.species === "gengar"
          ? (f.cd.s1 <= 0 ? 170 : 110) * k
          : (f.cd.s1 <= 0 ? 95 : 40) * k;
    const radial = Math.max(-1, Math.min(1, (d - want) / (40 * k)));
    const mx = (dx / d) * radial + (-dy / d) * ai.strafe * 0.7;
    const my = (dy / d) * radial + (dx / d) * ai.strafe * 0.7;
    const mn = Math.hypot(mx, my) || 1;
    f.input = mn > 0.2 ? { x: mx / mn, y: my / mn } : { x: 0, y: 0 };
    // confused, it stumbles off sideways
    if (f.confused > 0) f.input = { x: -f.input.y, y: f.input.x };

    if (ai.think > 0 || !this.canAct(f)) return;
    ai.think = rand(0.22, 0.45);
    const pick = this.cpuMove(f, o, d);
    if (pick) this.tryMove(f, pick);
  }

  /** Which move the CPU fancies right now, if any. */
  private cpuMove(f: Fighter, o: Fighter, d: number): Slot | null {
    const k = this.k;
    const ready = (s: Slot) => f.cd[s] <= 0;
    const away = o.z >= HIGH * k || o.state === "lurk";
    const chance = (p: number) => Math.random() < p;
    const eff = (s: Slot) => this.eff(this.moves(f)[s].kind, o);
    if (f.meter >= 1 && !away) return "burst";
    if (f.mega) return this.cpuMegaMove(f, o, d, away);
    if (d < 52 * k && ready("melee") && eff("melee") > 0 && chance(0.75)) return "melee";
    if (away) return null;
    if (f.species === "charizard") {
      if (d < 120 * k && ready("s1") && chance(eff("s1") < 1 ? 0.2 : 0.5)) return "s1";
      if (d > 80 * k && d < 230 * k && ready("s3") && chance(eff("s3") < 1 ? 0.12 : 0.35)) return "s3";
      if (d < 260 * k && ready("s4") && chance(0.35)) return "s4";
      if (d > 90 * k && ready("s2") && chance(0.18)) return "s2";
    } else if (f.species === "blastoise") {
      if (d < 150 * k && ready("s4") && eff("s4") > 0 && o.z < 4 && chance(0.35)) return "s4";
      if (d < 175 * k && ready("s1") && chance(0.45)) return "s1";
      if (d < 175 * k && ready("s3") && chance(0.3)) return "s3";
      if (d > 70 * k && d < 260 * k && ready("s2") && eff("s2") > 0 && chance(0.25)) return "s2";
    } else {
      if (d < 200 * k && ready("s4") && !o.status && chance(0.3)) return "s4";
      if (d < 300 * k && ready("s1") && chance(0.45)) return "s1";
      if (d > 60 * k && d < 260 * k && ready("s3") && chance(0.35)) return "s3";
      if (d > 80 * k && ready("s2") && chance(0.15)) return "s2";
    }
    return null;
  }

  /** Is a move about to land on f? */
  private threatened(f: Fighter) {
    const o = this.other(f);
    const d = Math.hypot(f.x - o.x, f.y - o.y);
    const k = this.k;
    if (o.state === "stream" && o.t < 0.3) {
      const to = Math.atan2(f.y - o.y, f.x - o.x);
      return Math.abs(wrap(to - o.aimAngle)) < 0.35 && d < 190 * k;
    }
    if (o.state === "melee" && o.t < 0.12 && d < 60 * k) return true;
    if (o.state === "spin" && d < 140 * k) return true;
    if (o.state === "stomp" || (this.finale && this.finale.owner === o.id)) return true;
    if (this.waves.some((w) => w.owner === o.id)) return true;
    // a shot heading this way
    return this.shots.some(
      (s) =>
        s.owner === o.id &&
        s.t >= 0 &&
        Math.hypot(s.x - f.x, s.y - f.y) < 120 * k &&
        (s.kind === "sludge" || (f.x - s.x) * s.vx + (f.y - s.y) * s.vy > 0)
    );
  }

  // ---------- KO ----------

  private koSequence() {
    const [me, foe] = this.f!;
    const loser = me.hp <= 0 ? me : foe;
    const winner = loser === me ? foe : me;
    if (this.phaseT > 1.3 && loser.state === "faint") {
      loser.state = "recall";
      loser.t = 0;
      this.sound.recall();
    }
    if (this.phaseT > 2.1 && this.phaseT - TICK <= 2.1) {
      const won = loser === foe;
      if (this.watch) this.say(`${winner.species.toUpperCase()} wins!`);
      else this.say(won ? "Player defeated RIVAL!" : "Player is out of usable POKéMON!");
      if (won || this.watch) this.sound.win();
      else this.sound.lose();
      winner.face = Math.PI / 2;
    }
    if (this.phaseT > 4 && this.phase === "ko") {
      this.phase = "over";
      const won = loser === foe;
      const stats: BattleStats = {
        won,
        species: me.species,
        foe: foe.species,
        time: this.time,
        dealt: Math.round(me.stats.dealt),
        taken: Math.round(foe.stats.dealt),
        supers: me.stats.supers,
        letters: this.wreck.destroyed,
        hpLeft: me.hp / STATS[me.species].hp,
        watch: this.watch,
      };
      // records and achievements are for battles you fought yourself
      if (won && !this.watch) {
        unlock("poke-win");
        if (me.species === "charizard" && foe.species === "blastoise") unlock("poke-underdog");
        if (me.species === "gengar") unlock("poke-haunted");
        if (stats.hpLeft > 0.5) unlock("poke-untouchable");
        record("pokemon", this.time);
      }
      this.onEnd(stats);
    }
  }

  private lowHpAlarm(dt: number) {
    const me = this.f![0];
    if (this.watch || this.phase !== "battle" || me.hp <= 0 || me.hp / STATS[me.species].hp > 0.2) return;
    this.lowBeep -= dt;
    if (this.lowBeep <= 0) {
      this.lowBeep = 0.25;
      this.sound.lowHp(Math.floor(this.time * 4) % 2 === 0);
    }
  }

  private updateMessages(dt: number) {
    if (this.message) {
      this.message.t += dt;
      const read = Math.max(1.1, this.message.text.length * 0.035 + 0.6);
      if ((this.messages.length && this.message.t > read) || this.message.t > read + 1.6) this.message = null;
    }
    if (!this.message && this.messages.length) this.message = { text: this.messages.shift()!, t: 0 };
  }

  // ---------- rendering ----------

  private render() {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.headerBottom, vw, vh - this.headerBottom);
    ctx.clip();
    ctx.save();
    ctx.translate(-window.scrollX, -window.scrollY);
    this.wreck.draw(ctx, window.scrollY - 200, window.scrollY + vh + 200);
    ctx.restore();
    if (this.leaving || !this.f) {
      ctx.restore();
      return;
    }
    // effects are drawn on the sprites' own pixel grid
    const p = Math.max(2, Math.round(this.k));
    this.ground.begin(vw, vh, p, window.scrollX, window.scrollY);
    this.air.begin(vw, vh, p, window.scrollX, window.scrollY);
    this.drawGround(this.ground);
    this.ground.blit(ctx);
    const fin = this.finale;
    if (fin) {
      // a Burst colours the whole screen: fire's glow, deep water, or the dark
      const len = fin.mega ? MEGA_FINALE[fin.kind] : FINALE[fin.kind];
      const tt = fin.t;
      const env = Math.min(1, tt / 0.3) * Math.min(1, (len - tt) / 0.4);
      const pulse = 0.85 + Math.sin(tt * 18) * 0.15;
      ctx.fillStyle = fin.mega
        ? fin.kind === "gengar"
          ? `rgba(40,0,60,${env * 0.4})`
          : fin.kind === "charizard"
            ? `rgba(0,12,48,${env * 0.55 * pulse})`
            : `rgba(0,24,70,${env * 0.35})`
        : fin.kind === "gengar"
          ? `rgba(10,2,22,${env * 0.86})`
          : fin.kind === "charizard"
            ? `rgba(120,24,0,${env * 0.35 * pulse})`
            : `rgba(4,30,70,${env * 0.3})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    ctx.save();
    ctx.translate(-window.scrollX, -window.scrollY);
    for (const f of [...this.f].sort((a, b) => a.y - b.y)) this.drawFighter(f);
    ctx.restore();
    this.drawAir(this.air);
    this.air.blit(ctx);
    if (fin?.kind === "charizard") {
      // heat: a hot wash over everything, flickering (blue, for Charizard X)
      const heat = 0.1 + Math.sin(fin.t * 30) * 0.04;
      ctx.fillStyle = fin.mega ? `rgba(60,150,255,${heat})` : `rgba(255,120,20,${heat})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    ctx.restore();

    if (this.screenFlash > 0) {
      ctx.fillStyle = `rgba(255,214,140,${this.screenFlash * 0.4})`;
      ctx.fillRect(0, this.headerBottom, vw, vh - this.headerBottom);
    }
    this.drawHud(vw, vh);
    if (this.cutin) this.drawCutin(this.cutin, vw, vh);
  }

  /**
   * A Burst's cut-in: the screen dims and a slanted banner sweeps across with speed lines,
   * the Pokémon's portrait blown up in pixels, and the move's name.
   */
  private drawCutin(c: { owner: 0 | 1; t: number; evolve?: boolean }, vw: number, vh: number) {
    const { ctx } = this;
    const f = this.f![c.owner];
    const t = c.t;
    const inT = Math.min(1, t / 0.14);
    const outT = Math.max(0, (t - (CUTIN - 0.16)) / 0.16);
    const ease = (q: number) => 1 - (1 - q) ** 3;
    const slide = (1 - ease(inT)) * vw - ease(outT) * vw;
    const hue = (t * 360) % 360;
    const theme = c.evolve
      ? { band: `hsl(${hue},70%,22%)`, light: `hsl(${(hue + 60) % 360},90%,60%)`, text: "#ffffff" }
      : f.species === "charizard"
        ? f.mega
          ? { band: "#101860", light: "#40c8ff", text: "#e0faff" }
          : { band: "#7c1408", light: "#f86818", text: "#ffe25c" }
        : f.species === "blastoise"
          ? { band: "#0c2c70", light: "#2890e8", text: "#c8f0ff" }
          : { band: "#1c0838", light: "#9050e0", text: "#f4dcff" };
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.55 * (1 - outT)})`;
    ctx.fillRect(0, 0, vw, vh);
    const h = Math.min(170, vh * 0.3);
    const cy = this.headerBottom + (vh - this.headerBottom) * 0.48;
    const skew = h * 0.35;
    ctx.translate(slide, 0);
    const band = (y0: number, y1: number, colour: string) => {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(-skew, y0 + skew);
      ctx.lineTo(vw + skew, y0 - skew);
      ctx.lineTo(vw + skew, y1 - skew);
      ctx.lineTo(-skew, y1 + skew);
      ctx.closePath();
      ctx.fill();
    };
    band(cy - h / 2 - 6, cy + h / 2 + 6, "#f4f4f5");
    band(cy - h / 2, cy + h / 2, theme.band);
    band(cy - h / 2, cy - h / 2 + 10, theme.light);
    band(cy + h / 2 - 10, cy + h / 2, theme.light);
    // speed lines racing across
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 26; i++) {
      const ly = cy - h / 2 + 14 + hash(i * 3.1) * (h - 28);
      const lw = 60 + hash(i * 7.7) * 220;
      const travel = hash(i) * vw - t * (1600 + hash(i * 2) * 1400);
      const lx = (((travel % (vw + lw)) + vw + lw) % (vw + lw)) - lw;
      ctx.fillRect(lx, ly, lw, 2);
    }
    // the portrait, big and pixelated, in a frame
    const size = Math.round(h * 0.82);
    const px = Math.max(16, vw * 0.12);
    const py = cy - size / 2;
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(px - 5, py - 5, size + 10, size + 10);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage((c.evolve ? this.megas[f.species] : f.mon)?.portrait ?? f.mon.portrait, px, py, size, size);
    // the move's name
    const name = c.evolve ? "MEGA EVOLUTION" : this.moves(f).burst.name;
    const big = Math.min(72, Math.max(24, vw / (name.length > 16 ? 22 : 16)));
    const tx = px + size + Math.max(20, vw * 0.04);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `bold ${Math.round(big * 0.32)}px ${this.font}`;
    ctx.fillStyle = theme.light;
    ctx.fillText(
      c.evolve
        ? `${f.species.toUpperCase()} → ${MEGA_NAME[f.species]}`
        : `${f.mega ? MEGA_NAME[f.species] : f.species.toUpperCase()}'S BURST`,
      tx,
      cy - big * 0.62
    );
    ctx.font = `bold ${Math.round(big)}px ${this.font}`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#000";
    ctx.strokeText(name, tx, cy + big * 0.1);
    ctx.fillStyle = theme.text;
    ctx.fillText(name, tx, cy + big * 0.1);
    ctx.restore();
  }

  /** On the page, under the Pokémon: shadows, puddles, shockwaves, Surf's body, a lurking Gengar. */
  private drawGround(g: PixelLayer) {
    const k = this.k;
    const t = this.clock;
    for (const z of this.zones) {
      // a sludge puddle: a lumpy blob that shrinks away at the end, with popping bubbles
      const fade = Math.min(1, (z.life - z.t) / 0.6) * Math.min(1, z.t / 0.12);
      const r = z.r * fade;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + z.seed;
        const rr = r * (0.45 + hash(i + z.seed) * 0.25);
        g.disc(z.x + Math.cos(a) * r * 0.45, z.y + Math.sin(a) * r * 0.3, rr, SLUDGE[3], 0.6);
      }
      g.disc(z.x, z.y, r * 0.75, SLUDGE[2], 0.55);
      g.disc(z.x - r * 0.2, z.y - r * 0.1, r * 0.3, SLUDGE[1], 0.5);
      for (let i = 0; i < 4; i++) {
        const ph = (t * 1.5 + hash(i * 7 + z.seed)) % 1;
        const bx = z.x + (hash(i * 3 + z.seed) - 0.5) * r * 1.2;
        const by = z.y + (hash(i * 5 + z.seed) - 0.5) * r * 0.6;
        if (ph < 0.8) g.ring(bx, by, (1 + ph * 3) * k, SLUDGE[0], 0.7);
      }
    }
    for (const b of this.bursts) {
      if (b.kind !== "quake") continue;
      // Earthquake: a ring of heaving earth, with cracks spidering out behind it
      const rad = Math.min(1, b.t / 0.55) * b.max;
      const fade = b.t < 0.55 ? 1 : 1 - (b.t - 0.55) / 0.35;
      if (fade <= 0) continue;
      g.alpha = fade;
      const flick = Math.floor(t * 20);
      g.ring(b.x, b.y, rad, EARTH[2], 0.8, 3, 0.15, flick);
      g.ring(b.x, b.y, rad * 0.97, EARTH[0], 0.8, 1, 0.4, flick + 3);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + hash(i) * 0.4;
        let x = b.x;
        let y = b.y;
        for (let s = 1; s <= 5; s++) {
          const j = (hash(i * 9 + s) - 0.5) * 0.5;
          const nx = b.x + Math.cos(a + j) * rad * (s / 5);
          const ny = b.y + Math.sin(a + j) * rad * (s / 5) * 0.8;
          g.line(x, y, nx, ny, EARTH[4], 1);
          x = nx;
          y = ny;
        }
      }
      g.alpha = 1;
    }
    for (const w of this.waves) this.drawWaveBody(g, w);
    if (this.flood > 0) this.drawFlood(g, this.flood);
    if (this.finale?.mega) this.drawMegaGround(g, this.finale);
    for (const f of this.f!) {
      if (f.state === "hidden" || f.state === "gone") continue;
      if (f.state === "lurk") {
        // Gengar is just a shadow on the page now, eyes and grin showing
        g.ditherDisc(f.x, f.y, 20 * k, "#1c0838", 0.45, Math.floor(t * 8) % 2);
        g.disc(f.x, f.y, 14 * k, "#1c0838", 0.45);
        g.dot(f.x - 5 * k, f.y - 2 * k, "#ff5068", 2);
        g.dot(f.x + 5 * k, f.y - 2 * k, "#ff5068", 2);
        g.line(f.x - 5 * k, f.y + 2 * k, f.x + 5 * k, f.y + 2 * k, "#f4f4f5", 1);
        continue;
      }
      const s = (1 / (1 + f.z / (90 * k))) * f.grow;
      g.ditherDisc(f.x, f.y, 14 * k * s, "#000", 0.38, 0);
      g.disc(f.x, f.y, 10 * k * s, "#000", 0.38);
      // your Pokémon gets a dotted marker ring, so you never lose it in a busy fight
      if (f.id === 0 && !this.watch && this.phase === "battle")
        g.ring(f.x, f.y, 18 * k * s, "#38bdf8", 0.42, 1, 0.5, 1);
    }
    for (const fl of this.flashes) {
      const p = fl.t / 0.35;
      g.alpha = 1 - p;
      g.ring(fl.x, fl.y, fl.r * (0.3 + p), fl.colour, 0.5, 2);
      g.alpha = 1;
    }
  }

  /** Inferno Overdrive's lock-on, and Hydro Vortex's whirlpool, on the page. */
  private drawMegaGround(g: PixelLayer, fin: NonNullable<BattleGame["finale"]>) {
    const k = this.k;
    const t = this.clock;
    if (fin.kind === "charizard" && fin.t >= 0.55 && fin.t < 1.25) {
      // a red crosshair closing in on the foe
      const p = (fin.t - 0.55) / 0.7;
      const r = (70 - p * 40) * k;
      const blink = Math.floor(t * 12) % 2 ? "#ff3048" : "#ffd0d8";
      g.ring(fin.x, fin.y, r, blink, 0.5, 2);
      g.ring(fin.x, fin.y, r * 0.5, blink, 0.5, 1, 0.5, 1);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + t * 2;
        g.line(
          fin.x + Math.cos(a) * r * 0.7,
          fin.y + Math.sin(a) * r * 0.35,
          fin.x + Math.cos(a) * r * 1.2,
          fin.y + Math.sin(a) * r * 0.6,
          blink,
          2
        );
      }
    }
    if (fin.kind === "blastoise" && fin.t >= 0.6 && fin.t < 2.9) {
      // the whirlpool: spiral arms of water reaching to every corner of the screen
      const reach = Math.max(60 * k, fin.sweep);
      const fade = Math.min(1, (2.9 - fin.t) / 0.3);
      g.alpha = fade;
      for (let arm = 0; arm < 6; arm++) {
        for (let r = 8 * k; r < reach; r += 9 * k) {
          const a = (arm / 6) * Math.PI * 2 + r / (60 * k) - t * 4;
          const x = fin.x + Math.cos(a) * r;
          const y = fin.y + Math.sin(a) * r * 0.8;
          const w = (2 + (r / reach) * 5) * k;
          g.disc(x, y, w, r / reach > 0.6 ? WATER[2] : WATER[1]);
          if (hash(r + arm) > 0.7) g.dot(x, y, WATER[0], 2);
        }
      }
      g.disc(fin.x, fin.y, 14 * k, WATER[5], 0.8);
      g.ring(fin.x, fin.y, 18 * k, WATER[0], 0.8, 2, 0.3, Math.floor(t * 20));
      g.alpha = 1;
    }
  }

  /** Surf's body of water: everything it has swept over is under water, deepest far behind. */
  private drawWaveBody(g: PixelLayer, w: Wave) {
    const k = this.k;
    const sx = window.scrollX;
    const sy = window.scrollY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const span = (from: number, to: number, colour: string, phase: number, solid = false) => {
      const lo = Math.min(from, to);
      const len = Math.abs(to - from);
      if (len <= 0) return;
      if (w.axis === "x") solid ? g.rect(lo, sy, len, vh, colour) : g.dither(lo, sy, len, vh, colour, phase);
      else solid ? g.rect(sx, lo, vw, len, colour) : g.dither(sx, lo, vw, len, colour, phase);
    };
    const back = w.start;
    const front = w.pos;
    const depth = front - back;
    // deep water far behind the crest, getting lighter toward it
    span(back, back + depth * 0.55, WATER[5], 0, true);
    span(back + depth * 0.55, front - w.sign * 70 * k, WATER[5], 0);
    span(back + depth * 0.55, front - w.sign * 70 * k, WATER[4], 1);
    span(front - w.sign * 70 * k, front - w.sign * 30 * k, WATER[3], 0);
    span(front - w.sign * 30 * k, front, WATER[2], 1, true);
  }

  /** After Surf: the screen stays flooded for a moment, then drains. */
  private drawFlood(g: PixelLayer, level: number) {
    if (this.waves.length) return;
    const sx = window.scrollX;
    const sy = window.scrollY;
    g.dither(sx, sy, window.innerWidth, window.innerHeight, WATER[4], 0);
    if (level > 0.45) g.dither(sx, sy, window.innerWidth, window.innerHeight, WATER[5], 1);
    this.drawCaustics(g, level);
  }

  /** Light rippling through water: wavy bright lines drifting across the screen. */
  private drawCaustics(g: PixelLayer, level: number) {
    const k = this.k;
    const t = this.clock;
    const sx = window.scrollX;
    const sy = window.scrollY + this.headerBottom;
    const vw = window.innerWidth;
    const vh = window.innerHeight - this.headerBottom;
    const rows = Math.round(10 * level);
    for (let i = 0; i < rows; i++) {
      const y0 = sy + ((hash(i * 4.3) * vh + t * 30 * k) % vh);
      let px = sx;
      let py = y0;
      for (let x = sx; x <= sx + vw; x += 14 * k) {
        const y = y0 + Math.sin(x * 0.02 + t * 3 + i) * 6 * k;
        if (hash(i * 31 + Math.floor(x / (14 * k))) > 0.35) g.line(px, py, x, y, i % 3 ? WATER[2] : WATER[1], 1);
        px = x;
        py = y;
      }
    }
  }

  private drawFighter(f: Fighter) {
    if (f.state === "hidden" || f.state === "gone" || f.state === "lurk") return;
    const { ctx } = this;
    const k = this.k;
    // a form without an animation (Mega Gengar has no Lick) falls back to Idle
    const a = new Proxy(f.mon.anims, { get: (t, n: string) => t[n] ?? t.Idle });
    if (f.state === "sneak" && f.t < 0.15) return;
    let d: Dir = dirOf(Math.cos(f.face), Math.sin(f.face));
    let anim = "Idle";
    let frame = 0;
    switch (f.state) {
      case "free":
        if (f.status === "slp") {
          anim = "Sleep";
          frame = frameAt(a.Sleep, f.t);
        } else if (f.status !== "frz") {
          anim = Math.hypot(f.vx, f.vy) > 20 ? "Walk" : "Idle";
          frame = frameAt(a[anim], f.t + f.id * 0.3);
        }
        break;
      case "melee":
        anim = f.mega
          ? this.anim(f, f.species === "charizard" ? "Swing" : f.species === "gengar" ? "Strike" : "Attack")
          : f.species === "gengar"
            ? "Lick"
            : "Attack";
        frame = frameAt(a[anim], f.t, false);
        break;
      case "stream":
        // mouth (or cannons) open for as long as the stream lasts
        anim = "Shoot";
        frame = Math.min(frameAt(a.Shoot, f.t, false), (a.Shoot.hitFrame ?? 2) + (f.t > this.streamLength(f) ? 2 : 0));
        break;
      case "cast": {
        const c = this.castAnim(f);
        anim = c.name;
        frame = frameAt(c.anim, f.t, false);
        break;
      }
      case "fly":
      case "dive":
        anim = "Walk";
        frame = frameAt(a.Walk, f.t * 2.2);
        break;
      case "spin":
        anim = "Withdraw";
        frame = frameAt(a.Withdraw, f.t, false);
        // the shell spins round
        if (f.t > 0.14) d = (Math.floor(f.t * 30) % 8) as Dir;
        break;
      case "stomp":
        anim = "Hop";
        frame = frameAt(a.Hop, (f.t / 0.42) * a.Hop.length, false);
        break;
      case "sink":
        anim = "Sink";
        frame = frameAt(a.Sink, f.t * 4, false);
        break;
      case "rise":
        anim = "Attack";
        frame = frameAt(a.Attack, f.t * 1.3, false);
        break;
      case "charge":
        anim = "Charge";
        frame = frameAt(a.Charge, f.t);
        break;
      case "ult":
        // Charizard hovers, wings beating; Blastoise aims its cannons; Gengar strikes a pose
        anim = f.species === "charizard" ? "Walk" : f.species === "blastoise" ? (f.t < 0.6 ? "Shoot" : "Idle") : "Pose";
        frame =
          f.species === "charizard"
            ? frameAt(a.Walk, f.t * 2.5)
            : f.species === "blastoise" && f.t < 0.6
              ? Math.min(frameAt(a.Shoot, f.t, false), (a.Shoot.hitFrame ?? 1) + 1)
              : frameAt(a[anim], f.t);
        if (f.species !== "gengar") d = 0;
        break;
      case "dodge":
        anim = "Hop";
        frame = frameAt(a.Hop, (f.t / 0.24) * a.Hop.length, false);
        break;
      case "evolve":
        anim = "Charge";
        frame = frameAt(a.Charge, f.t);
        d = 0;
        break;
      case "dash":
        anim = f.t < 0.15 ? "Charge" : "Walk";
        frame = frameAt(a[anim], f.t * 3);
        break;
      case "buff":
        anim = this.anim(f, "Rotate");
        frame = frameAt(a[anim], (f.t / 0.6) * a[anim].length, false);
        break;
      case "sneak":
        anim = "Attack";
        frame = frameAt(a.Attack, (f.t - 0.15) * 1.4, false);
        break;
      case "hurt":
        anim = "Hurt";
        frame = frameAt(a.Hurt, f.t);
        break;
      case "faint":
      case "recall":
        anim = a.Faint ? "Faint" : "Sleep";
        frame = a.Faint ? frameAt(a.Faint, f.t, false) : 0;
        break;
    }
    const trailColour =
      f.species === "charizard" ? (f.mega ? BLUEFIRE[2] : FIRE[3]) : f.species === "blastoise" ? WATER[3] : GHOST[2];
    for (const p of f.trail) {
      drawMon(ctx, f.mon, anim, d, frame, p.x, p.y - p.z, k, { alpha: p.a * 0.6, tint: 1, tintColour: trailColour });
    }
    const frozen = f.status === "frz";
    // evolving: turning to pure light before it bursts out in its new form
    const glow = f.state === "evolve" && !f.mega ? Math.min(1, f.t / 0.9) : 0;
    drawMon(ctx, f.mon, anim, d, frame, f.x, f.y - f.z, k, {
      grow: f.grow * (1 + f.z / (400 * k)) * (f.state === "evolve" && !f.mega ? 1 + glow * 0.15 : 1),
      tint: frozen ? 0.35 : Math.max(f.tint, f.flash * 0.8, glow),
      tintColour: frozen ? ICE[2] : f.tint > 0 || glow > 0 ? f.tintColour : "#fff",
      alpha: f.invuln > 0 && f.state === "dodge" ? 0.7 : 1,
    });
  }

  /** Over the Pokémon: every move's effect, in pixels. */
  private drawAir(g: PixelLayer) {
    const k = this.k;
    const t = this.clock;
    for (const p of this.particles) this.drawParticle(g, p);
    for (const s of this.swipes) this.drawSwipe(g, s);
    // Hydro Pump and Ice Beam
    for (const f of this.f!) {
      if (f.state !== "stream" || f.species === "charizard" || f.t >= this.streamLength(f)) continue;
      const ice = f.move === "s3";
      const len = Math.min(this.beamLength(f), f.reach);
      const dx = Math.cos(f.aimAngle);
      const dy = Math.sin(f.aimAngle);
      const lift = 10 * k;
      const sx = f.x + dx * 14 * k;
      const sy = f.y + dy * 14 * k - lift;
      const ex = sx + dx * len;
      const ey = sy + dy * len + lift * 0.7;
      const pal = ice ? ICE : WATER;
      const wob = Math.floor(t * 30) % 2;
      g.line(sx, sy, ex, ey, pal[4], (ice ? 6 : 7) + wob);
      g.line(sx, sy, ex, ey, pal[3], (ice ? 4 : 5) + wob);
      g.line(sx, sy, ex, ey, pal[1], 2);
      g.line(sx, sy, ex, ey, pal[0], 1);
      g.disc(ex, ey, (ice ? 5 : 6) * k * (0.8 + 0.2 * wob), pal[2]);
      g.disc(ex, ey, (ice ? 3 : 4) * k, pal[0]);
      if (ice) {
        // crystals forming along the beam
        for (let i = 0; i < 5; i++) {
          const q = hash(i + Math.floor(t * 12)) * len;
          const cx = sx + dx * q;
          const cy = sy + dy * q;
          g.line(cx - 3 * k, cy, cx + 3 * k, cy, ICE[0], 1);
          g.line(cx, cy - 3 * k, cx, cy + 3 * k, ICE[0], 1);
        }
      }
    }
    for (const s of this.shots) this.drawShot(g, s);
    for (const b of this.bursts) this.drawBurst(g, b);
    // Surf's foaming crest
    for (const w of this.waves) {
      const a = this.arena();
      const lo = w.axis === "x" ? a.t - 60 : a.l - 60;
      const hi = w.axis === "x" ? a.b + 60 : a.r + 60;
      for (let s = lo; s < hi; s += 8 * k) {
        const bump = (Math.sin(s * 0.05 + w.pos * 0.04) * 5 + Math.sin(s * 0.13) * 3) * k;
        const r = (4 + Math.abs(Math.sin(s * 0.31 + w.pos * 0.02)) * 4) * k;
        const along = w.pos + w.sign * bump;
        const x = w.axis === "x" ? along : s;
        const y = w.axis === "x" ? s : along;
        g.disc(x, y, r, WATER[2]);
        g.disc(x + (w.axis === "x" ? w.sign * k : 0), y + (w.axis === "y" ? w.sign * k : 0), r * 0.7, WATER[0]);
      }
    }
    // statuses: ice blocks, sleep's Zs
    for (const f of this.f!) {
      if (f.state === "hidden" || f.state === "gone") continue;
      if (f.status === "frz") {
        const top = f.y - f.z - 34 * k;
        g.dither(f.x - 16 * k, top, 32 * k, 36 * k, ICE[2], 0);
        g.line(f.x - 16 * k, top, f.x + 16 * k, top, ICE[0], 1);
        g.line(f.x - 16 * k, top, f.x - 16 * k, top + 36 * k, ICE[1], 1);
        g.line(f.x + 16 * k, top, f.x + 16 * k, top + 36 * k, ICE[4], 1);
        g.line(f.x - 10 * k, top + 6 * k, f.x - 4 * k, top + 12 * k, ICE[0], 1);
      } else if (f.status === "slp") {
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.8 + i / 3) % 1;
          this.drawZ(g, f.x + (10 + ph * 10) * k, f.y - (24 + ph * 26) * k, 1 + Math.floor(ph * 2));
        }
      }
    }
    for (const gy of this.geysers) this.drawGeyser(g, gy);
    if (this.finale?.kind === "gengar" && !this.finale.mega) {
      this.drawGrin(g, this.finale.t);
      this.drawHands(g, this.finale);
    }
    this.drawMega(g);
    for (const b of this.balls) this.drawBall(g, b);
  }

  private drawParticle(g: PixelLayer, p: Particle) {
    const k = this.k;
    const life = Math.max(0, p.life / p.max);
    const age = 1 - life;
    const y = p.y - p.z;
    switch (p.kind) {
      case "flame": {
        // layered blobs, dark rim to white-hot core, stepping through the fire palette; dying
        // flames break up into see-through embers instead of growing into blobs
        const r = Math.min(p.r * (0.6 + age * 0.4), 9 * k);
        const pal = p.blue ? BLUEFIRE : FIRE;
        if (age > 0.7) {
          g.ditherDisc(p.x, y, r * 0.7, age > 0.85 ? pal[5] : pal[4], 1, Math.round(p.x) % 2);
          break;
        }
        g.disc(p.x, y, r, ramp(pal, 0.45 + age * 0.55));
        if (age < 0.6) g.disc(p.x, y, r * 0.6, ramp(pal, 0.15 + age * 0.6));
        if (age < 0.25) g.disc(p.x, y, r * 0.3, pal[0]);
        break;
      }
      case "steam":
        g.ditherDisc(p.x, y, p.r, life > 0.5 ? "#f4f4f5" : "#a1a1aa", 0.9, Math.floor(this.clock * 12) % 2);
        if (life > 0.6) g.disc(p.x, y, p.r * 0.4, "#ffffff");
        break;
      case "smoke":
        g.ditherDisc(p.x, y, p.r, life > 0.5 ? "#71717a" : "#3f3f46", 0.8, Math.floor(this.clock * 10) % 2);
        break;
      case "spark":
        g.line(p.x, y, p.x - p.vx * 0.025, y - p.vy * 0.025, life > 0.5 ? "#fff" : "#fde047", 1);
        break;
      case "drop":
        g.dot(p.x, y, ramp(WATER, age * 0.7 + 0.1), p.r > 1.8 * k ? 2 : 1);
        break;
      case "foam":
        g.disc(p.x, y, p.r, life > 0.4 ? WATER[0] : WATER[1]);
        break;
      case "rock":
        g.disc(p.x, y, p.r, EARTH[2]);
        g.dot(p.x - p.r * 0.3, y - p.r * 0.3, EARTH[0]);
        break;
      case "ice": {
        // a little four-point sparkle
        const c = ramp(ICE, age);
        g.dot(p.x, y, c, 1);
        if (life > 0.4) {
          g.dot(p.x - g.p, y, c);
          g.dot(p.x + g.p, y, c);
          g.dot(p.x, y - g.p, c);
          g.dot(p.x, y + g.p, c);
        }
        break;
      }
      case "wisp":
        g.disc(p.x, y, p.r * (1 - age * 0.5), ramp(GHOST, 0.2 + age * 0.8));
        break;
      case "bubble":
        if (life > 0.25) g.ring(p.x, y, p.r, SLUDGE[0]);
        else g.dot(p.x, y, SLUDGE[1], 2);
        break;
      case "zap":
        g.line(p.x, y, p.x + (hash(p.x) - 0.5) * 12 * k, y - (2 + hash(p.y) * 6) * k, "#fde047", 1);
        break;
    }
  }

  /** Melee flourishes: dragon-claw streaks, snapping fangs, a long pink tongue. */
  private drawSwipe(g: PixelLayer, s: Swipe) {
    const k = this.k;
    const p = s.t / 0.22;
    if (s.kind === "tail") {
      // Dragon Tail: a sweep of dragon-blue streaks all the way round
      const sweep = Math.min(1, p * 2.5) * Math.PI * 2;
      for (let i = 0; i < 18; i++) {
        const a = s.angle + (i / 18) * sweep;
        const r = 40 * k;
        const c = i % 3 === 0 ? DRAGON[0] : DRAGON[2];
        g.line(
          s.x + Math.cos(a) * r * 0.55,
          s.y - 10 * k + Math.sin(a) * r * 0.4,
          s.x + Math.cos(a) * r,
          s.y - 10 * k + Math.sin(a) * r * 0.75,
          c,
          2
        );
      }
      return;
    }
    if (s.kind === "aqua") {
      // Aqua Tail: an arc of water slapping across, throwing spray
      for (let i = 0; i < 12; i++) {
        const a = s.angle - 1 + (i / 11) * 2 * Math.min(1, p * 3);
        const r = 22 * k;
        g.disc(
          s.x + Math.cos(a) * r * 0.6,
          s.y - 10 * k + Math.sin(a) * r * 0.5,
          (3 - Math.abs(i - 6) * 0.25) * k,
          i % 2 ? WATER[2] : WATER[0]
        );
      }
      return;
    }
    if (s.kind === "shadowclaw") {
      // Shadow Claw: three huge raking claws of shadow
      const nx = -Math.sin(s.angle);
      const ny = Math.cos(s.angle);
      const len = 30 * k * Math.min(1, p * 3);
      const ax = Math.cos(s.angle + 0.9);
      const ay = Math.sin(s.angle + 0.9);
      for (let i = -1; i <= 1; i++) {
        const ox = s.x + nx * i * 10 * k;
        const oy = s.y - 12 * k + ny * i * 10 * k;
        g.line(ox - ax * len, oy - ay * len, ox + ax * len, oy + ay * len, GHOST[4], 5);
        g.line(ox - ax * len, oy - ay * len, ox + ax * len, oy + ay * len, p < 0.5 ? GHOST[0] : GHOST[2], 2);
      }
      return;
    }
    const nx = -Math.sin(s.angle);
    const ny = Math.cos(s.angle);
    const lift = 12 * k;
    if (s.kind === "claw") {
      const len = 18 * k * Math.min(1, p * 3);
      const ax = Math.cos(s.angle + 0.9);
      const ay = Math.sin(s.angle + 0.9);
      for (let i = -1; i <= 1; i++) {
        const ox = s.x + nx * i * 6 * k;
        const oy = s.y - lift + ny * i * 6 * k;
        g.line(ox - ax * len, oy - ay * len, ox + ax * len, oy + ay * len, p < 0.5 ? DRAGON[0] : DRAGON[2], 2);
      }
    } else if (s.kind === "fang") {
      const gap = 10 * k * (1 - Math.min(1, p * 3));
      for (const side of [-1, 1]) {
        for (let i = -1; i <= 1; i++) {
          const bx = s.x + nx * i * 6 * k;
          const by = s.y - lift + side * gap;
          g.line(bx + nx * i * 2 * k, by, bx, by - side * 7 * k, "#fff", 2);
        }
      }
    } else {
      const ext = Math.min(1, p * 4);
      const fx = s.fromX + Math.cos(s.angle) * 6 * k;
      const fy = s.fromY - lift + Math.sin(s.angle) * 6 * k;
      const tx = fx + (s.x - fx) * ext;
      const ty = fy + (s.y - lift - fy) * ext;
      g.line(fx, fy, tx, ty, PINK[2], 3);
      g.line(fx, fy, tx, ty, PINK[1], 1);
      g.disc(tx, ty, 3 * k, PINK[1]);
    }
  }

  private drawShot(g: PixelLayer, s: Shot) {
    if (s.t < 0) return;
    const k = this.k;
    const t = this.clock;
    const y = s.y - s.z;
    if (s.kind === "dragonpulse") {
      // a surging dragon's head of blue energy, with a wake of rings behind it
      const dx = Math.cos(s.angle);
      const dy = Math.sin(s.angle);
      for (let i = 3; i >= 1; i--)
        g.ring(s.x - dx * i * 12 * k, y - dy * i * 12 * k, (14 - i * 2) * k, DRAGON[i], 0.8, 2);
      g.disc(s.x, y, 13 * k, DRAGON[3]);
      g.disc(s.x, y, 9 * k, DRAGON[2]);
      g.disc(s.x + dx * 3 * k, y + dy * 3 * k, 4 * k, DRAGON[0]);
      // jaws and horns
      for (const side of [-1, 1]) {
        const a = s.angle + side * 0.5;
        g.line(s.x, y, s.x + Math.cos(a) * 18 * k, y + Math.sin(a) * 18 * k, DRAGON[1], 2);
        const h = s.angle + Math.PI + side * 0.4;
        g.line(s.x, y, s.x + Math.cos(h) * 16 * k, y + Math.sin(h) * 16 * k - 6 * k, DRAGON[2], 2);
      }
      return;
    }
    if (s.kind === "aura") {
      // Aura Sphere: a pulsing ball of blue aura
      const pulse = 1 + Math.sin(t * 30) * 0.12;
      g.ring(s.x, y, 12 * k * pulse, "#7dd3fc", 1, 1, 0.4, Math.floor(t * 20));
      g.disc(s.x, y, 9 * k, "#1d6fd8");
      g.disc(s.x, y, 6 * k, "#7dd3fc");
      g.disc(s.x - 1.5 * k, y - 1.5 * k, 2.5 * k, "#ffffff");
      return;
    }
    if (s.kind === "hex") {
      // Hex: a cursed, flickering purple flame
      const fl = Math.floor(t * 20) % 2;
      g.disc(s.x, y, 7 * k, GHOST[3]);
      g.disc(s.x, y - 3 * k, 5 * k, GHOST[2]);
      g.disc(s.x + (fl ? k : -k), y - 7 * k, 3 * k, GHOST[1]);
      g.dot(s.x, y - 11 * k, GHOST[0], 2);
      return;
    }
    if (s.kind === "waterpulse") {
      const r = (6 + s.t * 18) * k;
      g.ring(s.x, y, r, ramp(WATER, 0.2 + (s.t / s.life) * 0.6), 0.6, 2);
      g.ring(s.x, y, r * 0.6, WATER[0], 0.6, 1, 0.3, 3);
      return;
    }
    if (s.kind === "fireblast") {
      g.disc(s.x, y, 8 * k, FIRE[4]);
      g.disc(s.x, y, 6 * k, FIRE[2]);
      g.disc(s.x, y, 3.5 * k, FIRE[1]);
      g.disc(s.x - k, y - k, 1.5 * k, FIRE[0]);
    } else if (s.kind === "slash") {
      // a crescent blade of air
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = s.angle - 1.1 + (i / (n - 1)) * 2.2;
        const r = 9 * k;
        const px = s.x + Math.cos(a) * r - Math.cos(s.angle) * r * 0.6;
        const py = y + Math.sin(a) * r - Math.sin(s.angle) * r * 0.6;
        g.dot(px, py, i === 0 || i === n - 1 ? AIR[2] : AIR[0], i > 1 && i < n - 2 ? 2 : 1);
      }
    } else if (s.kind === "shadowball") {
      // a dark orb with crackling purple energy around it
      g.disc(s.x, y, 10 * k, GHOST[3]);
      g.disc(s.x, y, 8 * k, GHOST[5]);
      g.disc(s.x - 2 * k, y - 2 * k, 3 * k, GHOST[2]);
      g.ring(s.x, y, 11 * k, GHOST[1], 1, 1, 0.55, Math.floor(t * 24));
    } else if (s.kind === "sludge") {
      g.disc(s.x, s.y, 5 * k, "#000", 0.4);
      g.disc(s.x, y, 7 * k, SLUDGE[3]);
      g.disc(s.x, y, 5 * k, SLUDGE[2]);
      g.disc(s.x - 2 * k, y - 2 * k, 2 * k, SLUDGE[0]);
    } else {
      // Hypnosis: rings rippling out, pink fading to violet
      const r = (6 + s.t * 18) * k;
      g.ring(s.x, y, r, ramp(PINK, s.t / s.life), 0.6, 2);
      g.ring(s.x, y, r * 0.6, PINK[0], 0.6, 1, 0.3, 7);
    }
  }

  private drawBurst(g: PixelLayer, b: Burst) {
    const k = this.k;
    const t = this.clock;
    const flick = Math.floor(t * 30);
    if (b.kind === "darkpulse" || b.kind === "sludgewave") {
      const p = Math.min(1, b.t / 0.45);
      const rad = p * b.max;
      const fade = b.t < 0.45 ? 1 : 1 - (b.t - 0.45) / 0.45;
      if (fade <= 0) return;
      const pal = b.kind === "darkpulse" ? DARK : SLUDGE;
      g.alpha = fade;
      g.ring(b.x, b.y, rad, pal[3], 0.8, 6, 0.08, flick);
      g.ring(b.x, b.y, rad * 0.97, pal[1], 0.8, 3, 0.2, flick + 1);
      g.ring(b.x, b.y, rad * 0.94, pal[0], 0.8, 1, 0.5, flick + 2);
      g.alpha = 1;
      return;
    }
    if (b.kind === "blastburn") {
      const rad = Math.min(1, b.t / 0.5) * b.max;
      const fade = b.t < 0.5 ? 1 : 1 - (b.t - 0.5) / 0.4;
      if (fade <= 0) return;
      g.alpha = fade;
      g.ring(b.x, b.y, rad, FIRE[4], 0.75, 5, 0.1, flick);
      g.ring(b.x, b.y, rad * 0.98, FIRE[2], 0.75, 3, 0.25, flick + 1);
      g.ring(b.x, b.y, rad * 0.96, FIRE[1], 0.75, 1, 0.4, flick + 2);
      g.alpha = 1;
    } else if (b.kind === "daikanji") {
      // 大, written in fire
      const grow = Math.min(1, b.t / 0.16) * b.max;
      const fade = b.t < 0.45 ? 1 : 1 - (b.t - 0.45) / 0.3;
      if (fade <= 0) return;
      const lift = 10 * k;
      for (const a of KANJI) {
        const steps = Math.max(4, Math.round(grow / (3 * k)));
        for (let i = 0; i <= steps; i++) {
          const q = i / steps;
          const px = b.x + Math.cos(a) * grow * q;
          const py = b.y - lift + Math.sin(a) * grow * q;
          const w = (7 - q * 3) * k * (0.85 + hash(i + flick + a * 10) * 0.3) * fade;
          g.disc(px, py, w, FIRE[4]);
          g.disc(px, py, w * 0.7, FIRE[2]);
          g.disc(px, py, w * 0.35, FIRE[0]);
        }
      }
      g.disc(b.x, b.y - lift, 12 * k * fade, FIRE[1]);
    } else if (b.kind === "shadow") {
      const p = b.t / 0.4;
      g.ring(b.x, b.y - 8 * k, b.max * (0.4 + p), ramp(GHOST, p), 0.8, 3, 0.2, flick);
      if (p < 0.4) g.disc(b.x, b.y - 8 * k, b.max * 0.5 * (1 - p), GHOST[5]);
    }
  }

  /** Mega bits over everything: the evolving orb, boosts, curses, confusion, the Mega Bursts. */
  private drawMega(g: PixelLayer) {
    const k = this.k;
    const t = this.clock;
    for (const f of this.f!) {
      if (f.state === "hidden" || f.state === "gone") continue;
      const top = f.y - f.z - 34 * k;
      if (f.state === "evolve") {
        // a rainbow orb of light closing in, then bursting
        const p = Math.min(1, f.t / 0.9);
        const r = (54 - p * 30) * k;
        for (let i = 0; i < 4; i++)
          g.ring(
            f.x,
            f.y - 14 * k,
            r + i * 5 * k,
            `hsl(${(t * 400 + i * 70) % 360},90%,62%)`,
            1,
            2,
            0.15,
            Math.floor(t * 20) + i
          );
      }
      if (f.boost > 0) {
        // Dragon Dance's blue flames, or a smashed shell's sparks, circling its feet
        for (let i = 0; i < 6; i++) {
          const a = t * 4 + (i / 6) * Math.PI * 2;
          const c = f.species === "charizard" ? BLUEFIRE[1 + (i % 3)] : i % 2 ? "#fde047" : "#7dd3fc";
          g.disc(f.x + Math.cos(a) * 18 * k, f.y + Math.sin(a) * 7 * k, 2 * k, c);
        }
      }
      if (f.confused > 0) {
        // stars going round its head
        for (let i = 0; i < 3; i++) {
          const a = t * 6 + (i / 3) * Math.PI * 2;
          g.dot(f.x + Math.cos(a) * 10 * k, top - 4 * k + Math.sin(a) * 3 * k, "#fde047", 2);
        }
      }
      if (f.curse > 0) {
        // a nail driven into its shadow, and a dark wisp
        g.line(f.x + 12 * k, f.y - 2 * k, f.x + 12 * k, f.y - 12 * k, "#a1a1aa", 2);
        g.line(f.x + 9 * k, f.y - 12 * k, f.x + 15 * k, f.y - 12 * k, "#a1a1aa", 2);
        g.dot(f.x + 12 * k, top - 6 * k - Math.sin(t * 5) * 3 * k, GHOST[1], 2);
      }
    }
    const fin = this.finale;
    if (!fin?.mega) return;
    if (fin.kind === "charizard") {
      if (fin.t >= 0.6 && fin.t < 1.25) {
        // the meteor, falling
        const m = this.meteorAt(fin);
        const r = (18 + m.p * 16) * k;
        g.disc(m.x, m.y, r * 1.25, BLUEFIRE[5]);
        g.disc(m.x, m.y, r, BLUEFIRE[3]);
        g.disc(m.x, m.y, r * 0.7, BLUEFIRE[2]);
        g.disc(m.x - r * 0.2, m.y - r * 0.2, r * 0.35, BLUEFIRE[0]);
      }
      if (fin.hit && fin.t < 2.4) {
        // the firestorm's front, sweeping out to the edges of the screen
        const fade = Math.min(1, (2.4 - fin.t) / 0.4);
        g.alpha = fade;
        const flick = Math.floor(t * 30);
        g.ring(fin.x, fin.y, fin.sweep, BLUEFIRE[4], 1, 7, 0.08, flick);
        g.ring(fin.x, fin.y, fin.sweep * 0.98, BLUEFIRE[2], 1, 4, 0.2, flick + 1);
        g.ring(fin.x, fin.y, fin.sweep * 0.96, BLUEFIRE[0], 1, 1, 0.4, flick + 2);
        g.alpha = 1;
      }
    } else if (fin.kind === "gengar") {
      this.drawThirdEye(g, fin.t);
      this.drawGrin(g, fin.t, MEGA_FINALE.gengar);
      this.drawHands(g, fin, 1.4, 0.6, MEGA_FINALE.gengar);
    }
  }

  /** Mega Gengar's third eye, opening over the whole screen. */
  private drawThirdEye(g: PixelLayer, t: number) {
    const len = MEGA_FINALE.gengar;
    const open = Math.min(1, Math.max(0, (t - 0.25) / 0.5)) * Math.min(1, (len - t) / 0.3);
    if (open <= 0) return;
    const vw = window.innerWidth;
    const cx = window.scrollX + vw / 2;
    const cy = window.scrollY + this.headerBottom + (window.innerHeight - this.headerBottom) * 0.16;
    const w = vw * 0.11;
    g.disc(cx, cy, w * 1.08, "#1c0838", open * 0.5);
    g.disc(cx, cy, w, "#fff7d6", open * 0.45);
    if (open > 0.3) {
      g.disc(cx, cy, w * 0.42, "#f8c030", Math.min(1, open));
      g.disc(cx, cy, w * 0.3, "#e83838", Math.min(1, open));
      // a slit pupil
      g.disc(cx, cy, w * 0.07, "#120c1a", 3.2 * Math.min(1, open));
      g.dot(cx - w * 0.14, cy - w * 0.1, "#ffffff", 3);
    }
  }

  /** A pixel Z, for sleep. */
  private drawZ(g: PixelLayer, x: number, y: number, s: number) {
    const X = g.X(x);
    const Y = g.Y(y);
    g.raw(X, Y, 3 * s, s, "#f4f4f5");
    g.raw(X + 2 * s, Y + s, s, s, "#f4f4f5");
    g.raw(X + s, Y + 2 * s, s, s, "#f4f4f5");
    g.raw(X, Y + 3 * s, 3 * s, s, "#f4f4f5");
  }

  /** Gengar's grin, filling the screen: big red eyes and a jagged white smile in the dark. */
  private drawGrin(g: PixelLayer, t: number, len = FINALE.gengar) {
    const appear = Math.min(1, Math.max(0, (t - 0.15) / 0.35)) * Math.min(1, (len - 0.1 - t) / 0.3);
    // it flickers on, like a bad bulb
    if (appear <= 0 || (t < 0.5 && hash(Math.floor(t * 30)) < 0.35)) return;
    const vw = window.innerWidth;
    const s = Math.max(2, Math.round((vw * 0.62) / 30 / g.p));
    const cx = Math.round(vw / 2 / g.p);
    const cy = Math.round((this.headerBottom + (window.innerHeight - this.headerBottom) * 0.42) / g.p);
    g.alpha = Math.min(1, appear * 1.2) * 0.92;
    const glow = 0.5 + Math.sin(t * 14) * 0.5;
    // two slanted, angry eyes
    for (const [ox, slant] of [
      [-12, 1],
      [5, -1],
    ]) {
      for (let row = 0; row < 4; row++) {
        const w = 7 - row;
        const shift = slant > 0 ? row : 0;
        g.raw(
          cx + (ox + shift) * s,
          cy + (row - 10) * s,
          w * s,
          s,
          row === 0 ? "#ffb0c0" : glow > 0.5 ? "#ff2850" : "#e01040"
        );
      }
      g.raw(cx + (ox + 2) * s, cy - 9 * s, s, s, "#fff");
    }
    // the grin: a wide jagged band of teeth
    const half = 15;
    for (let i = -half; i <= half; i++) {
      const curve = Math.round(((i * i) / (half * half)) * -4);
      g.raw(cx + i * s, cy + (1 + curve) * s, s, 4 * s, "#2a0a38");
      g.raw(cx + i * s, cy + (1 + curve + (i % 2 === 0 ? 0 : 2)) * s, s, 2 * s, "#f4f4f5");
    }
    g.alpha = 1;
  }

  /** Night Shade's shadow hands: jagged arms of dark reaching from the edges for the foe. */
  private drawHands(
    g: PixelLayer,
    fin: NonNullable<BattleGame["finale"]>,
    from = 0.45,
    span = 0.6,
    len = FINALE.gengar
  ) {
    const k = this.k;
    const o = this.other(this.f![fin.owner]);
    const grab = Math.min(1, Math.max(0, (fin.t - from) / span));
    const fade = Math.min(1, (len - fin.t) / 0.4);
    if (grab <= 0 || fade <= 0) return;
    const tx = o.x;
    const ty = o.y - o.z - 14 * k;
    fin.hands.forEach((h, i) => {
      const ex = h.x + (tx - h.x) * grab;
      const ey = h.y + (ty - h.y) * grab;
      const nx = -(ey - h.y);
      const ny = ex - h.x;
      const nl = Math.hypot(nx, ny) || 1;
      let px = h.x;
      let py = h.y;
      const steps = 14;
      for (let sI = 1; sI <= steps; sI++) {
        const q = sI / steps;
        const wob = Math.sin(q * 9 + fin.t * 12 + i) * 10 * k * (1 - q);
        const x = h.x + (ex - h.x) * q + (nx / nl) * wob;
        const y = h.y + (ey - h.y) * q + (ny / nl) * wob;
        g.line(px, py, x, y, GHOST[5], Math.round(6 - q * 3));
        g.line(px, py, x, y, GHOST[3], Math.round(3 - q * 1.5));
        px = x;
        py = y;
      }
      // a clawed hand at the end
      const ang = Math.atan2(ey - h.y, ex - h.x);
      for (const off of [-0.6, 0, 0.6]) {
        const cx = ex + Math.cos(ang + off) * 9 * k;
        const cy = ey + Math.sin(ang + off) * 9 * k;
        g.line(ex, ey, cx, cy, GHOST[2], 2);
      }
    });
  }

  /** A fire geyser: a column of flame shooting up out of the page and dying back down. */
  private drawGeyser(g: PixelLayer, gy: { x: number; y: number; t: number }) {
    const k = this.k;
    const p = gy.t / 0.55;
    if (p >= 1) return;
    const height = (p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75) * 70 * k;
    const flick = Math.floor(this.clock * 24);
    g.ditherDisc(gy.x, gy.y, 14 * k * (1 - p * 0.5), FIRE[5], 0.45, flick % 2);
    for (let h = 0; h < height; h += 5 * k) {
      const q = h / Math.max(1, height);
      const w = (9 - q * 5) * k * (0.8 + hash(h + flick + gy.x) * 0.4);
      const x = gy.x + Math.sin(h * 0.1 + this.clock * 20) * 2 * k;
      g.disc(x, gy.y - h, w, FIRE[4]);
      g.disc(x, gy.y - h, w * 0.65, FIRE[2]);
      if (q < 0.7) g.disc(x, gy.y - h, w * 0.3, FIRE[0]);
    }
  }

  /** A Poké Ball in flight: an arc through the air, spinning, in pixels. */
  private drawBall(g: PixelLayer, b: Ball) {
    const k = this.k;
    const p = Math.min(1, b.t / b.dur);
    const x = b.x0 + (b.x1 - b.x0) * p;
    const y = b.y0 + (b.y1 - b.y0) * p;
    const z = Math.sin(p * Math.PI) * 90 * k;
    g.disc(x, y, 5 * k, "#000", 0.4);
    const by = y - z - 5 * k;
    const r = 5 * k;
    const spin = Math.floor(b.t * 18) % 4;
    g.disc(x, by, r + g.p, "#18181b");
    g.disc(x, by, r, "#f4f4f5");
    // the red half turns as it spins
    const X = g.X(x);
    const Y = g.Y(by);
    const R = Math.round(r / g.p);
    for (let dy = -R; dy <= R; dy++) {
      const half = Math.floor(Math.sqrt(Math.max(0, R * R - dy * dy)));
      for (let dx = -half; dx <= half; dx++) {
        const red = spin === 0 ? dy < 0 : spin === 1 ? dx > 0 : spin === 2 ? dy > 0 : dx < 0;
        if (red) g.raw(X + dx, Y + dy, 1, 1, "#e83838");
      }
    }
    if (spin % 2 === 0) g.raw(X - R, Y, R * 2 + 1, 1, "#18181b");
    else g.raw(X, Y - R, 1, R * 2 + 1, "#18181b");
    g.raw(X - 1, Y - 1, 3, 3, "#18181b");
    g.raw(X, Y, 1, 1, "#f4f4f5");
  }

  // ---------- HUD ----------

  private drawHud(vw: number, vh: number) {
    const [me, foe] = this.f!;
    const small = vw < 640;
    const w = small ? Math.min(176, (vw - 40) / 2) : 250;
    const top = this.headerBottom + 12;
    if (me.state !== "hidden" || this.phase !== "intro") this.hudBox(me, 16, top, w, true);
    if (foe.state !== "hidden" || this.phase !== "intro") this.hudBox(foe, vw - w - 16, top + 34, w, false);

    if (this.message) {
      const { ctx } = this;
      const bw = Math.min(560, vw - 32);
      const bh = 50;
      const x = (vw - bw) / 2;
      const y = this.touch ? top + (small ? 96 : 104) : vh - bh - 34;
      ctx.fillStyle = "rgba(24,32,48,0.94)";
      roundRect(ctx, x, y, bw, bh, 8);
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      roundRect(ctx, x + 3, y + 3, bw - 6, bh - 6, 6);
      ctx.stroke();
      ctx.strokeStyle = "#c2410c";
      ctx.lineWidth = 1;
      roundRect(ctx, x + 6, y + 6, bw - 12, bh - 12, 4);
      ctx.stroke();
      ctx.fillStyle = "#f8fafc";
      ctx.font = `bold ${small ? 12 : 14}px ${this.font}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(this.message.text.slice(0, Math.floor(this.message.t * 45)), x + 18, y + bh / 2);
    }
  }

  /** A Gen 3 style status box: name, level, status, HP bar, and (yours) HP numbers and moves. */
  private hudBox(f: Fighter, x: number, y: number, w: number, mine: boolean) {
    const { ctx } = this;
    const small = w < 200;
    const max = STATS[f.species].hp;
    const h = mine ? (small ? 70 : 84) : small ? 50 : 56;
    ctx.save();
    ctx.fillStyle = "#f8f8e8";
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = "#283840";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();

    const pad = 8;
    const icon = small ? 26 : 34;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(f.mon.portrait, x + pad, y + pad, icon, icon);
    const tx = x + pad + icon + 8;
    ctx.fillStyle = "#283840";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.font = `bold ${small ? 10 : 12}px ${this.font}`;
    ctx.fillText(f.mega ? MEGA_NAME[f.species] : f.species.toUpperCase(), tx, y + pad);
    // ready to Mega Evolve: a rainbow pill (with the key, for you)
    if (!f.mega && this.canMega(f)) {
      const label = mine && !this.watch ? (this.touch ? "MEGA!" : "E MEGA!") : "MEGA!";
      ctx.font = `bold ${small ? 7 : 8}px ${this.font}`;
      const pw = ctx.measureText(label).width + 10;
      const px = x + w - pad - 32 - pw;
      ctx.fillStyle = `hsl(${(performance.now() / 3) % 360},85%,50%)`;
      roundRect(ctx, px, y + pad - 1, pw, small ? 12 : 13, 3);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText(label, px + pw / 2, y + pad + 1);
      ctx.textAlign = "left";
      ctx.font = `bold ${small ? 10 : 12}px ${this.font}`;
    }
    ctx.textAlign = "right";
    ctx.fillText("Lv50", x + w - pad, y + pad);
    if (f.status) {
      const sw = small ? 22 : 28;
      const sx = x + w - pad - (small ? 34 : 40) - sw;
      ctx.fillStyle = STATUS_COLOUR[f.status];
      roundRect(ctx, sx, y + pad - 1, sw, small ? 12 : 14, 3);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = `bold ${small ? 8 : 9}px ${this.font}`;
      ctx.fillText(STATUS_NAME[f.status], sx + sw / 2, y + pad + 1);
    }

    // HP bar
    const by = y + pad + (small ? 15 : 19);
    const bx = tx + (small ? 18 : 22);
    const bw = x + w - pad - bx;
    ctx.textAlign = "left";
    ctx.fillStyle = "#e07a1f";
    ctx.font = `bold ${small ? 8 : 9}px ${this.font}`;
    ctx.fillText("HP", tx, by - 1);
    ctx.fillStyle = "#3a4a40";
    roundRect(ctx, bx, by, bw, 7, 3);
    ctx.fill();
    const ratio = Math.max(0, f.shownHp / max);
    ctx.fillStyle = ratio > 0.5 ? "#48d048" : ratio > 0.2 ? "#f8c030" : "#f85838";
    if (ratio > 0) {
      roundRect(ctx, bx + 1, by + 1, Math.max(2, (bw - 2) * ratio), 5, 2);
      ctx.fill();
    }

    // Burst meter, filling as you trade blows
    const my = by + 11;
    ctx.fillStyle = "#cbd5e1";
    roundRect(ctx, bx, my, bw, 4, 2);
    ctx.fill();
    const full = f.meter >= 1;
    ctx.fillStyle = full ? `hsl(${(performance.now() / 4) % 360},90%,55%)` : "#6366f1";
    if (f.meter > 0) {
      roundRect(ctx, bx, my, bw * f.meter, 4, 2);
      ctx.fill();
    }
    ctx.fillStyle = full ? "#6366f1" : "#64748b";
    ctx.font = `bold ${small ? 6 : 7}px ${this.font}`;
    ctx.fillText("PWR", tx, my - 1);

    if (mine) {
      ctx.fillStyle = "#283840";
      ctx.textAlign = "right";
      ctx.font = `bold ${small ? 10 : 12}px ${this.font}`;
      ctx.fillText(`${Math.ceil(f.hp)}/${max}`, x + w - pad, my + 7);
      // your moves and how soon each is ready
      const moves = this.moves(f);
      const slots: Slot[] = ["s1", "s2", "s3", "s4", "burst"];
      const gap = 3;
      const cw = (w - pad * 2 - gap * (slots.length - 1)) / slots.length;
      const chH = small ? 12 : 14;
      slots.forEach((slot, i) => {
        const cx = x + pad + i * (cw + gap);
        const cy = y + h - chH - 4;
        const ready = slot === "burst" ? f.meter >= 1 : f.cd[slot] <= 0;
        const left = slot === "burst" ? 1 - f.meter : f.cd[slot] / moves[slot].cooldown;
        ctx.fillStyle = ready ? (slot === "burst" ? "#b91c1c" : "#283840") : "#94a3b8";
        roundRect(ctx, cx, cy, cw, chH, 3);
        ctx.fill();
        if (!ready) {
          ctx.fillStyle = "#475569";
          roundRect(ctx, cx, cy, cw * Math.max(0, 1 - left), chH, 3);
          ctx.fill();
        }
        ctx.fillStyle = "#f8fafc";
        ctx.textAlign = "center";
        ctx.font = `bold ${small ? 6 : 7}px ${this.font}`;
        const label = this.touch || small ? moves[slot].short : `${SLOT_KEY[slot]} ${moves[slot].short}`;
        ctx.fillText(label, cx + cw / 2, cy + (small ? 3 : 4));
      });
    }
    ctx.restore();
  }
}

/** Keys that start a move: J K L U O I, and Space to dodge. */
const SLOT_KEYS: Record<string, Slot | "dodge" | "mega"> = {
  KeyE: "mega",
  KeyJ: "melee",
  KeyK: "s1",
  KeyL: "s2",
  KeyU: "s3",
  KeyO: "s4",
  KeyI: "burst",
  Space: "dodge",
  ShiftLeft: "dodge",
  ShiftRight: "dodge",
};

const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
