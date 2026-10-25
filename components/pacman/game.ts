import { PageWreck } from "../streetfighter/wreck";
import type { Sound } from "./sound";

// ==========================================
// PAC-MAN mode: the portfolio is the maze and its text is the dots. Pac-Man eats every letter
// he passes over and grows with each bite, so he can fit bigger things in his mouth: body
// text first, then headings, skill tags, glyph buttons, and at the end whole image boxes.
// The ghosts grow a little with him; once he's big enough they run from him and he can eat
// them. Flashing power pellets down the page turn them blue for a while. The camera follows
// him down the page. Everything eaten
// is a black hole on this canvas, so exiting restores the page.
// ==========================================

const START_R = 12;
const GROWTH = 0.4; // share of an eaten thing's area Pac-Man adds to his own
const MOUTH = 1.8; // tallest letter he can eat, in radii
const LIVES = 3;
const READY_TIME = 2.2;
const SCARED_TIME = 7;
const RESPAWN_TIME = 3;
const WIN_SHARE = 0.97;
const PELLET_R = 9;
const PELLET_GAP = 520; // document px between power pellets, top to bottom

export interface PacStats {
  won: boolean;
  score: number;
  letters: number;
  ghosts: number;
  size: number;
  time: number;
}

type Dir = "up" | "down" | "left" | "right";
const VEC: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const KEYS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

interface Ghost {
  name: "blinky" | "pinky" | "inky" | "clyde";
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: "wait" | "hunt" | "scared" | "eyes";
  t: number;
}

const GHOSTS: [Ghost["name"], string][] = [
  ["blinky", "#ff0000"],
  ["pinky", "#ffb8ff"],
  ["inky", "#00ffff"],
  ["clyde", "#ffb852"],
];

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class PacGame {
  private ctx: CanvasRenderingContext2D;
  private wreck: PageWreck;
  private headerBottom = 0;
  private docW = 0;
  private docH = 0;
  private maxR = 200;
  private font = "monospace";

  private x = 0;
  private y = 0;
  private r = START_R;
  private dir: Dir = "right";
  private mouth = 0;
  private lives = LIVES;
  private invuln = 0;
  private ghosts: Ghost[] = [];
  private scared = 0;
  private ghostChain = 0;
  private popups: { text: string; x: number; y: number; t: number }[] = [];
  private pellets: { x: number; y: number }[] = [];
  /** swells on a big bite and settles back */
  private bite = 0;
  private phase: "ready" | "play" | "dying" | "won" | "over" = "ready";
  private phaseT = 0;
  private total = 0;
  private left = 0;
  private leftT = 0;
  private stats: PacStats = {
    won: false,
    score: 0,
    letters: 0,
    ghosts: 0,
    size: START_R,
    time: 0,
  };
  private hi = 0;
  private clock = 0;

  private running = false;
  private raf = 0;
  private last = 0;
  private ended = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private sound: Sound,
    private onEnd: (s: PacStats) => void,
    private onShake: (strength: number) => void
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.wreck = new PageWreck(() => {});
    const root = document.querySelector("[data-page-root]") ?? document.body;
    this.font = getComputedStyle(root).fontFamily || "monospace";
    try {
      this.hi = Number(localStorage.getItem("pacman-hi")) || 0;
    } catch {
      // storage blocked: no high score
    }
    this.resize();
  }

  // ---------- public API ----------

  start() {
    this.reset();
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.sound.setSiren(false, 0, false, 0);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    this.docW = document.documentElement.clientWidth;
    this.docH = document.documentElement.scrollHeight;
    this.maxR = Math.min(window.innerWidth, window.innerHeight - this.headerBottom) * 0.42;
    this.wreck.measure();
  }

  key(code: string, down: boolean) {
    const dir = KEYS[code];
    if (!dir) return false;
    if (down) {
      this.dir = dir;
      this.sound.unlock();
    }
    return true;
  }

  // ---------- flow ----------

  private reset() {
    this.ended = false;
    this.lives = LIVES;
    this.r = START_R;
    this.stats = {
      won: false,
      score: 0,
      letters: 0,
      ghosts: 0,
      size: START_R,
      time: 0,
    };
    window.scrollTo({ top: 0, behavior: "instant" });
    this.wreck.reset();
    this.docH = document.documentElement.scrollHeight;
    this.x = Math.min(this.docW * 0.12, 160);
    this.y = this.headerBottom + 150;
    this.dir = "right";
    this.total = 0;
    this.popups = [];
    this.ready();
    this.sound.start();
  }

  private ready() {
    this.phase = "ready";
    this.phaseT = 0;
    this.scared = 0;
    this.invuln = 0;
    this.spawnGhosts();
  }

  private spawnGhosts() {
    const vw = window.innerWidth;
    const top = window.scrollY + this.headerBottom;
    const bottom = window.scrollY + window.innerHeight;
    // one in each corner of the screen
    const corners = [
      [vw - 40, top + 40],
      [40, bottom - 40],
      [vw - 40, bottom - 40],
      [vw / 2, top + 40],
    ];
    this.ghosts = GHOSTS.map(([name, color], i) => ({
      name,
      color,
      x: corners[i][0],
      y: corners[i][1],
      vx: 0,
      vy: 0,
      state: "wait",
      // they leave one at a time, after a moment to get going
      t: -(1.5 + i * 2.5),
    }));
  }

  private finish(won: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.stats.won = won;
    this.stats.size = Math.round(this.r);
    if (this.stats.score > this.hi) {
      this.hi = this.stats.score;
      try {
        localStorage.setItem("pacman-hi", String(this.hi));
      } catch {
        // ignore
      }
    }
    this.sound.setSiren(false, 0, false, 0);
    this.onEnd({ ...this.stats });
  }

  // ---------- loop ----------

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
    this.last = now;
    this.clock += dt;
    this.update(dt);
    this.render();
    if (this.running) this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.phaseT += dt;
    // the bits he bites off fly into the front of his mouth
    const [mx, my] = VEC[this.dir];
    this.wreck.setMouth(this.x + mx * this.r * 0.25, this.y + my * this.r * 0.25);
    this.wreck.update(dt, window.scrollY + window.innerHeight);
    this.bite = Math.max(0, this.bite - dt * 3);
    this.popups = this.popups.filter((p) => (p.t += dt) < 1);
    const progress = this.total ? 1 - this.left / this.total : 0;
    this.sound.setSiren(this.phase === "play", progress, this.scared > 0, this.clock);

    if (this.phase === "ready") {
      // the page's reveal animations settle first; then count what there is to eat
      if (!this.total && this.phaseT > 1.2) {
        this.wreck.measure();
        this.total = this.left = this.wreck.lettersLeft();
        this.placePellets();
      }
      if (this.phaseT >= READY_TIME && this.total) {
        this.phase = "play";
        this.phaseT = 0;
      }
      this.follow(dt);
      return;
    }
    if (this.phase === "dying") {
      if (this.phaseT > 1.8) {
        if (this.lives <= 0) {
          this.phase = "over";
          this.finish(false);
        } else {
          this.ready();
          this.invuln = 2.5;
        }
      }
      return;
    }
    if (this.phase === "won") {
      this.r = Math.min(this.maxR * 1.6, this.r + dt * 60);
      if (this.phaseT > 2.2) this.finish(true);
      return;
    }
    if (this.phase === "over") return;

    this.stats.time += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.scared = Math.max(0, this.scared - dt);
    if (!this.scared) this.ghostChain = 0;
    this.move(dt);
    this.eat();
    this.updateGhosts(dt);
    this.follow(dt);

    if ((this.leftT -= dt) <= 0) {
      this.leftT = 0.4;
      this.left = this.wreck.lettersLeft();
      if (this.total && this.left <= this.total * (1 - WIN_SHARE)) {
        this.phase = "won";
        this.phaseT = 0;
        this.sound.win();
      }
    }
  }

  private speed() {
    return Math.min(430, 150 + this.r * 0.9);
  }

  private move(dt: number) {
    const [dx, dy] = VEC[this.dir];
    const s = this.speed();
    const top = this.headerBottom + this.r;
    this.x = Math.max(this.r, Math.min(this.docW - this.r, this.x + dx * s * dt));
    this.y = Math.max(top, Math.min(this.docH - this.r, this.y + dy * s * dt));
    this.mouth = (this.mouth + dt * 9) % 2;
  }

  private grow(area: number) {
    const a = Math.PI * this.r * this.r + area * GROWTH;
    this.r = Math.min(this.maxR, Math.sqrt(a / Math.PI));
  }

  private score(points: number, label?: string) {
    this.stats.score += points;
    if (label)
      this.popups.push({
        text: label,
        x: this.x,
        y: this.y - this.r - 10,
        t: 0,
      });
  }

  private eat() {
    const bite = this.wreck.eat(this.x, this.y, this.r * 0.92, this.r * MOUTH);
    if (bite.letters) {
      this.stats.letters += bite.letters;
      this.score(bite.letters * 10);
      this.grow(bite.area);
      this.sound.chomp();
      this.bite = Math.min(1, this.bite + bite.letters * 0.06);
    }
    // a power pellet turns the ghosts blue
    const before = this.pellets.length;
    this.pellets = this.pellets.filter((p) => Math.hypot(p.x - this.x, p.y - this.y) > this.r + PELLET_R);
    if (this.pellets.length < before) {
      this.scared = SCARED_TIME;
      this.ghostChain = 0;
      this.score(50, "POWER!");
      this.sound.pellet();
      this.bite = 1;
      for (const g of this.ghosts) if (g.state === "hunt") g.state = "scared";
    }
    // whole things, once they fit in his mouth
    const r = this.r;
    const boxes = this.wreck.eatBoxes(this.x, this.y, r, (b, kind) =>
      kind === "skill"
        ? b.h <= r * 1.6 && b.w <= r * 8
        : kind === "bump"
          ? Math.max(b.w, b.h) <= r * 1.8
          : Math.min(b.w, b.h) <= r * 1.7
    );
    for (const b of boxes) {
      const points = b.kind === "skill" ? 100 : b.kind === "bump" ? 200 : 1000;
      this.score(points, String(points));
      this.grow(b.area * (b.kind === "solid" ? 0.35 : 1));
      this.sound.gulp(Math.sqrt(b.area));
      this.bite = 1;
      if (b.kind === "solid") this.onShake(8);
    }
  }

  /** Power pellets, spread down the page where there's room, roughly one per screen. */
  private placePellets() {
    this.pellets = [];
    for (let y = this.headerBottom + 320; y < this.docH - 80; y += PELLET_GAP) {
      const side = this.pellets.length % 2 ? 0.85 : 0.15;
      this.pellets.push({
        x: this.docW * (side + rand(-0.06, 0.06)),
        y: y + rand(-60, 60),
      });
    }
  }

  /** Keeps Pac-Man in the middle of the screen as he roams the page. */
  private follow(dt: number) {
    const vh = window.innerHeight;
    const target = Math.max(0, Math.min(this.docH - vh, this.y - (vh + this.headerBottom) / 2));
    const y = window.scrollY + (target - window.scrollY) * Math.min(1, dt * 5);
    if (Math.abs(y - window.scrollY) > 0.5) window.scrollTo({ top: y, behavior: "instant" });
  }

  // ---------- ghosts ----------

  private ghostR() {
    return 13 + this.r * 0.3;
  }

  /** Bigger than a ghost by enough, Pac-Man eats it scared or not. */
  private dominant() {
    return this.r > this.ghostR() * 1.6;
  }

  private updateGhosts(dt: number) {
    const gr = this.ghostR();
    // no maze walls slow them down here, so they start slow and speed up as the page empties
    const progress = this.total ? 1 - this.left / this.total : 0;
    const base = this.speed() * (0.55 + 0.3 * progress);
    const [fx, fy] = VEC[this.dir];
    const blinky = this.ghosts[0];
    const vw = window.innerWidth;
    const top = window.scrollY + this.headerBottom;
    const bottom = window.scrollY + window.innerHeight;
    // they chase for 20 seconds, then scatter to their corners for 6
    const scatter = this.stats.time % 26 > 20;

    // Blinky hunts alone at first; another ghost joins for every tenth of the page eaten
    const awake = Math.min(GHOSTS.length, 1 + Math.floor(progress * 10));
    for (const [i, g] of this.ghosts.entries()) {
      g.t += dt;
      if (g.state === "wait") {
        if (g.t > 0 && i < awake) g.state = this.scared ? "scared" : "hunt";
        continue;
      }
      if (g.state === "scared" && !this.scared) g.state = "hunt";
      if (g.state === "eyes") {
        // eaten: the eyes fly off the top of the screen, then the ghost comes back
        const ty = top - 80;
        g.vx = 0;
        g.vy = -600;
        g.y = Math.max(ty, g.y + g.vy * dt);
        if (g.t > RESPAWN_TIME) {
          const fromLeft = this.x > vw / 2;
          g.x = fromLeft ? 30 : vw - 30;
          g.y = rand(top + 60, bottom - 60);
          g.state = "hunt";
          g.t = 0;
        }
        continue;
      }

      let tx = this.x;
      let ty = this.y;
      const corner = {
        blinky: [vw, top],
        pinky: [0, top],
        inky: [vw, bottom],
        clyde: [0, bottom],
      }[g.name];
      if (g.state === "scared" || this.dominant()) {
        // run away
        tx = g.x + (g.x - this.x);
        ty = g.y + (g.y - this.y);
      } else if (scatter) {
        [tx, ty] = corner;
      } else if (g.name === "pinky") {
        tx += fx * 120;
        ty += fy * 120;
      } else if (g.name === "inky") {
        // flanks: twice the vector from Blinky to a point ahead of Pac-Man
        tx = 2 * (this.x + fx * 40) - blinky.x;
        ty = 2 * (this.y + fy * 40) - blinky.y;
      } else if (g.name === "clyde" && Math.hypot(g.x - this.x, g.y - this.y) < 220) {
        [tx, ty] = corner;
      }
      const speed = g.state === "scared" ? base * 0.55 : this.dominant() ? base * 0.7 : base;
      const dx = tx - g.x;
      const dy = ty - g.y;
      const d = Math.hypot(dx, dy) || 1;
      // steer, with a little wobble so they don't move like homing missiles
      const wob = Math.sin(this.clock * 2 + g.name.length) * 0.35;
      const want = [
        (dx / d) * Math.cos(wob) - (dy / d) * Math.sin(wob),
        (dx / d) * Math.sin(wob) + (dy / d) * Math.cos(wob),
      ];
      g.vx += (want[0] * speed - g.vx) * Math.min(1, dt * 3);
      g.vy += (want[1] * speed - g.vy) * Math.min(1, dt * 3);
      g.x = Math.max(gr, Math.min(this.docW - gr, g.x + g.vx * dt));
      g.y = Math.max(this.headerBottom + gr, Math.min(this.docH - gr, g.y + g.vy * dt));

      if (Math.hypot(g.x - this.x, g.y - this.y) < this.r * 0.85 + gr * 0.55) {
        if (g.state === "scared" || this.dominant()) {
          // scared ghosts score the arcade's doubling chain; big Pac-Man just snacks on them
          const points = g.state === "scared" ? 200 * 2 ** this.ghostChain++ : 400;
          g.state = "eyes";
          g.t = 0;
          this.stats.ghosts++;
          this.score(points, String(points));
          this.sound.eatGhost();
        } else if (!this.invuln) {
          this.lives--;
          this.phase = "dying";
          this.phaseT = 0;
          this.sound.setSiren(false, 0, false, 0);
          this.sound.die();
          return;
        }
      }
    }
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
    ctx.translate(-window.scrollX, -window.scrollY);
    this.wreck.draw(ctx, window.scrollY - 200, window.scrollY + vh + 200);
    this.drawPellets();
    if (this.phase !== "ready" || this.phaseT > 0.4) {
      for (const g of this.ghosts) if (g.state !== "wait" || this.phase === "ready") this.drawGhost(g);
    }
    this.drawPac();
    ctx.font = `bold 12px ${this.font}`;
    ctx.textAlign = "center";
    for (const p of this.popups) {
      ctx.fillStyle = `rgba(0,255,255,${1 - p.t})`;
      ctx.fillText(p.text, p.x, p.y - p.t * 24);
    }
    ctx.restore();
    this.drawHud(vw, vh);
  }

  private drawPac() {
    const { ctx } = this;
    if (this.invuln > 0 && Math.floor(this.clock * 10) % 2) return;
    const angle = {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: -Math.PI / 2,
    }[this.dir];
    // the mouth chomps while he moves; dying, it opens all the way until he's gone
    let open =
      this.phase === "play" || this.phase === "won" ? Math.abs(1 - this.mouth) * 0.28 * Math.PI : 0.12 * Math.PI;
    if (this.phase === "dying") open = Math.min(Math.PI, (this.phaseT / 1.3) * Math.PI);
    if (this.phase === "dying" && open >= Math.PI) return;
    // a big bite makes him bulge for a moment
    const r = this.r * (1 + this.bite * 0.1);
    ctx.fillStyle = "#ffe600";
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, r, angle + open, angle - open + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  /** The power pellets blink, as in the arcade. */
  private drawPellets() {
    const { ctx } = this;
    if (Math.floor(this.clock * 4) % 2) return;
    ctx.fillStyle = "#ffb8ae";
    for (const p of this.pellets) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, PELLET_R, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawGhost(g: Ghost) {
    const { ctx } = this;
    const r = this.ghostR();
    const { x, y } = g;
    // blue only after a power pellet; fleeing a big Pac-Man, they keep their colours
    const scared = g.state === "scared";
    if (g.state !== "eyes") {
      const flash = this.scared > 0 && this.scared < 2 && Math.floor(this.clock * 6) % 2;
      ctx.fillStyle = scared ? (flash ? "#ffffff" : "#2121ff") : g.color;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.15, r, Math.PI, 0);
      // a skirt of three scallops that ripple as it moves
      const base = y + r * 0.85;
      ctx.lineTo(x + r, base);
      const wave = Math.floor(this.clock * 8) % 2 ? 0.18 : -0.18;
      for (let i = 0; i < 3; i++) {
        const x0 = x + r - (i * 2 * r) / 3;
        const x1 = x0 - (2 * r) / 3;
        ctx.quadraticCurveTo((x0 + x1) / 2, base - r * (0.3 + wave), x1, base);
      }
      ctx.closePath();
      ctx.fill();
      if (scared) {
        // the frightened face: two dots and a zigzag mouth
        ctx.fillStyle = flash ? "#ff0000" : "#ffb8ae";
        ctx.fillRect(x - r * 0.4, y - r * 0.35, r * 0.2, r * 0.2);
        ctx.fillRect(x + r * 0.2, y - r * 0.35, r * 0.2, r * 0.2);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) ctx.lineTo(x - r * 0.6 + (i * r * 1.2) / 6, y + r * (i % 2 ? 0.2 : 0.35));
        ctx.stroke();
        return;
      }
    }
    // eyes look the way the ghost is going
    const v = Math.hypot(g.vx, g.vy) || 1;
    const lx = (g.vx / v) * r * 0.12;
    const ly = (g.vy / v) * r * 0.12;
    for (const side of [-1, 1]) {
      const ex = x + side * r * 0.38;
      const ey = y - r * 0.25;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.26, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2121ff";
      ctx.beginPath();
      ctx.arc(ex + lx * 1.6, ey + ly * 1.6, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawHud(vw: number, vh: number) {
    const { ctx } = this;
    const top = this.headerBottom + 40;
    const small = vw < 640;
    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(0, top - 24, vw, small ? 46 : 52);
    ctx.font = `bold ${small ? 11 : 14}px ${this.font}`;
    ctx.textBaseline = "middle";

    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.fillText(`SCORE ${String(this.stats.score).padStart(6, "0")}`, 16, top - 6);
    ctx.fillStyle = "#a1a1aa";
    ctx.fillText(`HI ${String(Math.max(this.hi, this.stats.score)).padStart(6, "0")}`, 16, top + 12);

    // how much of the portfolio is gone
    const progress = this.total ? 1 - this.left / this.total : 0;
    const bw = Math.min(260, vw * 0.3);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe600";
    ctx.fillText(`PAGE EATEN ${Math.floor(progress * 100)}%`, vw / 2, top - 6);
    ctx.strokeStyle = "#52525b";
    ctx.strokeRect(vw / 2 - bw / 2 + 0.5, top + 7.5, bw, 6);
    ctx.fillStyle = "#ffe600";
    ctx.fillRect(vw / 2 - bw / 2 + 1, top + 8, (bw - 1) * progress, 5);

    // lives, as little Pac-Men
    for (let i = 0; i < this.lives; i++) {
      const x = vw - 28 - i * 22;
      ctx.fillStyle = "#ffe600";
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.arc(x, top, 8, Math.PI + 0.6, Math.PI - 0.6 + Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }

    if (this.phase === "ready") {
      ctx.font = `bold ${small ? 18 : 26}px ${this.font}`;
      ctx.fillStyle = "#ffe600";
      ctx.fillText("READY!", vw / 2, this.headerBottom + (vh - this.headerBottom) * 0.62);
    }
    ctx.textBaseline = "alphabetic";
  }
}
