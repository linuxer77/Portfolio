import { loadSprites, type Sprites } from "./sprites";
import type { Sound } from "./sound";

// ==========================================
// Stack Runner engine: the portfolio page itself is the level.
// Platforms come from elements tagged with data-game, in document coordinates:
//   floor  – dotted rules, one-way; ↓ drops through
//   ledge  – headings, labels, links, one-way
//   solid  – image boxes, solid on every side
//   bump   – glyph buttons, solid; hitting one from below clicks it
//   goal   – the contact footer, landing on it wins
//   skill  – skill tags, collectibles (not platforms)
// The page scroll is the camera.
// ==========================================

const STEP = 1 / 120;
const GRAVITY = 2600;
const JUMP_V = 900; // ~155px high
const JUMP_CUT = 0.45;
const WALK = 230;
const RUN = 380;
const ACCEL_GROUND = 1700;
const ACCEL_AIR = 1100;
const FRICTION = 2200;
const MAX_FALL = 1200;
const COYOTE = 0.08;
const JUMP_BUFFER = 0.1;
const DROP_TIME = 0.25;
const STOMP_BOUNCE = 650;
const BUG_SPEED = 70;
const REMEASURE = 0.3;

export type Action = "left" | "right" | "jump" | "run" | "down";

export interface RunStats {
  score: number;
  skills: string[];
  totalSkills: number;
  lives: number;
  time: number;
}

export interface GameEvent {
  type: "win" | "gameover";
  stats: RunStats;
}

type Kind = "floor" | "ledge" | "solid" | "bump" | "goal";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Plat extends Rect {
  el: HTMLElement;
  kind: Kind;
}

interface Body extends Rect {
  vx: number;
  vy: number;
  onGround: boolean;
}

interface Player extends Body {
  face: 1 | -1;
  hp: 1 | 2;
  inv: number;
  jumpHeld: boolean;
  stride: number;
  combo: number;
}

interface Bug extends Rect {
  host: HTMLElement;
  off: number;
  dir: 1 | -1;
  vy: number;
  squash: number;
  flipped: boolean;
  dead: boolean;
}

interface Coffee extends Body {
  emerge: number;
  taken: boolean;
}

interface Skill extends Rect {
  el: HTMLElement;
  name: string;
}

const ONE_WAY = new Set<Kind>(["floor", "ledge", "goal"]);
const SOLID = new Set<Kind>(["solid", "bump"]);

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const skillName = (el: HTMLElement) => el.dataset.skill ?? el.textContent?.trim() ?? "";

export class PageGame {
  private ctx: CanvasRenderingContext2D;
  private sprites: Sprites;
  /** Pixel-art scale: sprites are drawn S css px per art pixel. */
  private S: number;
  private plats: Plat[] = [];
  private byEl = new Map<HTMLElement, Plat>();
  private skills: Skill[] = [];
  private player!: Player;
  private bugs: Bug[] = [];
  private coffees: Coffee[] = [];
  private popups: { x: number; y: number; text: string; t: number }[] = [];
  private bumped = new Set<HTMLElement>();
  private keys: Record<Action, boolean> = { left: false, right: false, jump: false, run: false, down: false };
  private jumpBuffer = 0;
  private dropBuffer = 0;
  private coyote = 0;
  private ground: Plat | null = null;
  private dropPlat: Plat | null = null;
  private dropT = 0;
  private checkpoint = { x: 0, y: 0 };
  private stats!: RunStats;
  private phase: "play" | "dying" | "won" | "over" = "play";
  private phaseT = 0;
  private cam = 0;
  private docH = 0;
  /** Bottom of the sticky header in viewport px; the game layer is clipped below it. */
  private headerBottom = 0;
  private remeasureT = 0;
  private clock = 0;
  private running = false;
  private raf = 0;
  private last = 0;
  private acc = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private sound: Sound,
    private font: string,
    private onStats: (s: RunStats) => void,
    private onEnd: (e: GameEvent) => void
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.sprites = loadSprites();
    this.S = window.innerWidth >= 768 ? 3 : 2;
    this.resize();
    this.reset();
  }

  // ---------- public API ----------

  start() {
    if (this.running || this.phase === "won" || this.phase === "over") return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    if (this.phase === "play") this.sound.music(true);
    this.raf = requestAnimationFrame(this.frame);
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.sound.music(false);
    this.keys = { left: false, right: false, jump: false, run: false, down: false };
  }

  restart() {
    this.pause();
    this.reset();
    this.start();
  }

  destroy() {
    this.pause();
    this.clearCollected();
  }

  setKey(action: Action, down: boolean) {
    // presses are buffered so a quick tap still registers on the next physics step
    if (action === "jump" && down && !this.keys.jump) this.jumpBuffer = JUMP_BUFFER;
    if (action === "down" && down && !this.keys.down) this.dropBuffer = JUMP_BUFFER;
    this.keys[action] = down;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.measure();
  }

  // ---------- state ----------

  private reset() {
    this.clearCollected();
    this.bumped.clear();
    window.scrollTo({ top: 0, behavior: "instant" });
    this.cam = 0;
    this.measure();
    this.stats = {
      score: 0,
      skills: [],
      totalSkills: new Set(this.skills.map((s) => s.name)).size,
      lives: 3,
      time: 0,
    };
    this.spawnBugs();
    this.coffees = [];
    this.popups = [];
    // drop in onto the first ledge on the page (the name in the hero)
    const first = this.plats.find((p) => p.kind === "ledge");
    const h = 15 * this.S;
    this.checkpoint = first ? { x: first.x + 8, y: first.y - h } : { x: 40, y: 0 };
    this.spawn(-140);
    this.emit();
  }

  private spawn(dropFrom = 0) {
    const S = this.S;
    this.player = {
      x: this.checkpoint.x,
      y: this.checkpoint.y + dropFrom,
      w: 10 * S,
      h: 15 * S,
      vx: 0,
      vy: 0,
      onGround: false,
      face: 1,
      hp: 1,
      inv: 0,
      jumpHeld: false,
      stride: 0,
      combo: 0,
    };
    this.phase = "play";
    this.ground = null;
    this.dropPlat = null;
    this.jumpBuffer = 0;
    this.dropBuffer = 0;
    this.coyote = 0;
  }

  private spawnBugs() {
    const S = this.S;
    const floors = this.plats.filter((p) => p.kind === "floor");
    const hosts = [
      ...this.plats.filter((p) => p.kind === "solid"),
      ...floors.filter((_, i) => i % 3 === 2),
    ];
    this.bugs = hosts.map((host, i) => ({
      host: host.el,
      off: Math.max(0, host.w - 14 * S) * (0.25 + ((i * 37) % 10) / 20),
      dir: i % 2 ? 1 : -1,
      x: 0,
      y: 0,
      w: 14 * S,
      h: 10 * S,
      vy: 0,
      squash: 0,
      flipped: false,
      dead: false,
    }));
  }

  /** Re-read every tagged element's position, so layout changes (reveals, resizes) are followed. */
  private measure() {
    const sy = window.scrollY;
    this.docH = document.documentElement.scrollHeight;
    this.headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    this.plats = [];
    this.byEl.clear();
    this.skills = [];
    document.querySelectorAll<HTMLElement>("[data-game]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const kind = el.dataset.game;
      // floors and the goal span the whole viewport so the page margins are never a bottomless gap
      const wide = kind === "floor" || kind === "goal";
      const rect = {
        x: wide ? 0 : r.left,
        y: r.top + sy,
        w: wide ? window.innerWidth : r.width,
        h: Math.max(1, r.height),
      };
      if (kind === "skill") this.skills.push({ ...rect, el, name: skillName(el) });
      else if (kind && (ONE_WAY.has(kind as Kind) || SOLID.has(kind as Kind))) {
        const plat = { ...rect, el, kind: kind as Kind };
        this.plats.push(plat);
        this.byEl.set(el, plat);
      }
    });
    // keep the ground reference pointing at the fresh rect
    if (this.ground) this.ground = this.byEl.get(this.ground.el) ?? null;
    if (this.dropPlat) this.dropPlat = this.byEl.get(this.dropPlat.el) ?? null;
  }

  private clearCollected() {
    document.querySelectorAll("[data-collected]").forEach((el) => el.removeAttribute("data-collected"));
  }

  private emit() {
    this.onStats({ ...this.stats, skills: [...this.stats.skills] });
  }

  // ---------- loop ----------

  private frame = (now: number) => {
    if (!this.running) return;
    this.acc += Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    while (this.acc >= STEP && this.running) {
      this.update(STEP);
      this.acc -= STEP;
    }
    this.render();
    if (this.running) this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.clock += dt;
    if ((this.remeasureT -= dt) <= 0) {
      this.measure();
      this.remeasureT = REMEASURE;
    }
    const p = this.player;

    if (this.phase === "play") {
      this.stats.time += dt;
      this.updatePlayer(dt);
    } else if (this.phase === "dying") {
      p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);
      p.y += p.vy * dt;
      if ((this.phaseT -= dt) <= 0) this.loseLife();
    } else if (this.phase === "won" && (this.phaseT -= dt) <= 0) {
      this.running = false;
      this.phase = "over";
      this.onEnd({ type: "win", stats: { ...this.stats, skills: [...this.stats.skills] } });
    }

    this.updateBugs(dt);
    this.updateCoffees(dt);
    this.updateEffects(dt);
    this.updateCamera(dt);
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    const k = this.keys;
    const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    const max = k.run ? RUN : WALK;

    if (dir) {
      const skid = p.onGround && p.vx * dir < 0 ? FRICTION : 0;
      p.vx += dir * ((p.onGround ? ACCEL_GROUND : ACCEL_AIR) + skid) * dt;
      p.face = dir > 0 ? 1 : -1;
    } else if (p.onGround) {
      p.vx = Math.sign(p.vx) * Math.max(0, Math.abs(p.vx) - FRICTION * dt);
    }
    if (Math.abs(p.vx) > max) p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(p.vx) - FRICTION * dt);

    // ↓ on a floor or ledge drops through it
    this.dropT -= dt;
    if (this.dropT <= 0) this.dropPlat = null;
    this.dropBuffer -= dt;
    if ((k.down || this.dropBuffer > 0) && p.onGround && this.ground && (this.ground.kind === "floor" || this.ground.kind === "ledge")) {
      this.dropPlat = this.ground;
      this.dropT = DROP_TIME;
      this.dropBuffer = 0;
      p.onGround = false;
      p.y += 2;
    }

    this.jumpBuffer -= dt;
    this.coyote = p.onGround ? COYOTE : this.coyote - dt;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      p.vy = -(JUMP_V + Math.abs(p.vx) * 0.1);
      p.jumpHeld = true;
      p.onGround = false;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.sound.sfx("jump");
    }
    if (p.jumpHeld && !k.jump) {
      if (p.vy < 0) p.vy *= JUMP_CUT;
      p.jumpHeld = false;
    }
    p.inv = Math.max(0, p.inv - dt);

    const { landed, head } = this.move(p, dt, true);
    if (head) this.bump(head);
    this.ground = landed;
    if (landed) {
      p.combo = 0;
      if (landed.kind === "goal") return this.win();
      if (landed.y - p.h > this.checkpoint.y) this.checkpoint = { x: p.x, y: landed.y - p.h };
    }
    p.stride += Math.abs(p.vx) * dt;

    this.collectSkills();
    this.checkBugs();
  }

  // ---------- physics ----------

  /** Gravity, then X and Y moves resolved against the page. Returns the platform landed on and any block hit from below. */
  private move(b: Body, dt: number, isPlayer: boolean) {
    b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL);
    let wall = false;

    b.x += b.vx * dt;
    for (const s of this.plats) {
      if (!SOLID.has(s.kind) || !overlap(b, s)) continue;
      const pushLeft = b.x + b.w - s.x;
      const pushRight = s.x + s.w - b.x;
      b.x = b.vx > 0 || (b.vx === 0 && pushLeft < pushRight) ? s.x - b.w : s.x + s.w;
      b.vx = 0;
      wall = true;
    }
    const maxX = window.innerWidth - b.w;
    if (b.x < 0 || b.x > maxX) {
      b.x = Math.max(0, Math.min(b.x, maxX));
      b.vx = 0;
      wall = true;
    }

    const prevBottom = b.y + b.h;
    b.y += b.vy * dt;
    b.onGround = false;
    let landed: Plat | null = null;
    let head: Plat | null = null;

    for (const s of this.plats) {
      if (!SOLID.has(s.kind) || !overlap(b, s)) continue;
      if (b.vy > 0) {
        b.y = s.y - b.h;
        landed = s;
      } else if (b.vy < 0) {
        b.y = s.y + s.h;
        head = s;
      }
      b.vy = 0;
    }

    if (!landed && b.vy >= 0) {
      for (const s of this.plats) {
        if (!ONE_WAY.has(s.kind) || (isPlayer && s === this.dropPlat)) continue;
        const crossing = prevBottom <= s.y + 2 && b.y + b.h >= s.y;
        if (crossing && b.x + b.w > s.x && b.x < s.x + s.w && (!landed || s.y < landed.y)) landed = s;
      }
      if (landed) {
        b.y = landed.y - b.h;
        b.vy = 0;
      }
    }

    if (b.y + b.h >= this.docH) {
      b.y = this.docH - b.h;
      b.vy = 0;
      b.onGround = true;
    }
    if (landed) b.onGround = true;
    return { wall, landed, head };
  }

  // ---------- interactions ----------

  private bump(plat: Plat) {
    const first = !this.bumped.has(plat.el);
    this.bumped.add(plat.el);
    plat.el.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(-6px)" }, { transform: "translateY(0)" }],
      { duration: 180, easing: "ease-out" }
    );

    if (plat.kind === "bump") {
      // same as clicking the glyph: it spins (and three quick bumps still find the Toasty egg)
      plat.el.click();
      if (first) {
        const S = this.S;
        this.coffees.push({
          x: plat.x + plat.w / 2 - 6 * S,
          y: plat.y,
          w: 12 * S,
          h: 11 * S,
          vx: 0,
          vy: 0,
          onGround: false,
          emerge: 0.5,
          taken: false,
        });
        this.sound.sfx("sprout");
      } else {
        this.sound.sfx("bump");
      }
    } else if (first) {
      this.addScore(100, plat.x + plat.w / 2, plat.y + plat.h + 20, "+100");
      this.sound.sfx("coin");
    } else {
      this.sound.sfx("bump");
    }

    // bugs walking on a bumped box get knocked off
    for (const g of this.bugs) {
      if (!g.dead && !g.flipped && !g.squash && g.host === plat.el) this.flipBug(g);
    }
  }

  private collectSkills() {
    const p = this.player;
    for (const s of this.skills) {
      if (s.el.hasAttribute("data-collected") || !overlap(p, s)) continue;
      s.el.setAttribute("data-collected", "");
      if (!this.stats.skills.includes(s.name)) this.stats.skills.push(s.name);
      this.addScore(250, s.x + s.w / 2, s.y, `+ ${s.name.toUpperCase()}`);
      this.sound.sfx("skill");
    }
  }

  private checkBugs() {
    const p = this.player;
    for (const g of this.bugs) {
      if (g.dead || g.squash > 0 || g.flipped || !overlap(p, g)) continue;
      if (p.vy > 0 && p.y + p.h - g.y < g.h * 0.7) {
        g.squash = 0.45;
        p.combo++;
        p.vy = -(this.keys.jump ? JUMP_V * 0.85 : STOMP_BOUNCE);
        p.jumpHeld = this.keys.jump;
        this.addScore(100 * p.combo, g.x + g.w / 2, g.y, String(100 * p.combo));
        this.sound.sfx("stomp");
      } else if (p.inv <= 0) {
        this.hurt();
      }
    }
  }

  private flipBug(g: Bug) {
    g.flipped = true;
    g.vy = -500;
    this.addScore(100, g.x + g.w / 2, g.y, "100");
    this.sound.sfx("stomp");
  }

  private hurt() {
    const p = this.player;
    if (p.hp === 2) {
      p.hp = 1;
      p.inv = 1.6;
      this.sound.sfx("hurt");
      return;
    }
    this.phase = "dying";
    this.phaseT = 1.8;
    p.vx = 0;
    p.vy = -700;
    this.sound.music(false);
    this.sound.sfx("die");
  }

  private loseLife() {
    this.stats.lives--;
    this.emit();
    if (this.stats.lives <= 0) {
      this.running = false;
      this.phase = "over";
      this.onEnd({ type: "gameover", stats: { ...this.stats, skills: [...this.stats.skills] } });
      return;
    }
    this.spawn(-60);
    this.player.inv = 2;
    this.sound.music(true);
  }

  private win() {
    this.phase = "won";
    this.phaseT = 1.2;
    this.player.vx = 0;
    this.sound.music(false);
    this.sound.sfx("win");
  }

  private addScore(points: number, x: number, y: number, text: string) {
    this.stats.score += points;
    this.popups.push({ x, y, text, t: 0 });
    this.emit();
  }

  private updateBugs(dt: number) {
    for (const g of this.bugs) {
      if (g.dead) continue;
      if (g.squash > 0) {
        if ((g.squash -= dt) <= 0) g.dead = true;
        continue;
      }
      if (g.flipped) {
        g.vy += GRAVITY * dt;
        g.y += g.vy * dt;
        if (g.y > this.cam + window.innerHeight + 200) g.dead = true;
        continue;
      }
      const host = this.byEl.get(g.host);
      if (!host) continue;
      const max = Math.max(0, host.w - g.w);
      g.off += g.dir * BUG_SPEED * dt;
      if (g.off <= 0) {
        g.off = 0;
        g.dir = 1;
      } else if (g.off >= max) {
        g.off = max;
        g.dir = -1;
      }
      g.x = host.x + g.off;
      g.y = host.y - g.h;
    }
  }

  private updateCoffees(dt: number) {
    for (const c of this.coffees) {
      if (c.emerge > 0) {
        c.y -= (c.h / 0.5) * dt;
        if ((c.emerge -= dt) <= 0) c.vx = 120 * this.player.face;
        continue;
      }
      const v = c.vx;
      if (this.move(c, dt, false).wall) c.vx = -v;
      if (c.y > this.docH) c.taken = true;
      else if (this.phase === "play" && overlap(c, this.player)) {
        c.taken = true;
        this.player.hp = 2;
        this.addScore(1000, c.x + c.w / 2, c.y, "+ CAFFEINE");
        this.sound.sfx("powerup");
      }
    }
    this.coffees = this.coffees.filter((c) => !c.taken);
  }

  private updateEffects(dt: number) {
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < 1.2);
  }

  /** The page scroll follows the player, keeping them a little above the middle of the viewport. */
  private updateCamera(dt: number) {
    const vh = window.innerHeight;
    const target = Math.max(0, Math.min(this.docH - vh, this.player.y + this.player.h / 2 - vh * 0.45));
    this.cam += (target - this.cam) * Math.min(1, dt * 8);
    const top = Math.round(this.cam);
    if (top !== Math.round(window.scrollY)) window.scrollTo({ top, behavior: "instant" });
  }

  // ---------- rendering ----------

  private render() {
    const { ctx, S } = this;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.headerBottom, window.innerWidth, window.innerHeight - this.headerBottom);
    ctx.clip();
    ctx.translate(0, -window.scrollY);

    const walk = Math.floor(this.clock * 6) % 2;
    for (const g of this.bugs) {
      if (g.dead) continue;
      const img = this.sprites.bug[g.squash > 0 ? 2 : walk];
      const x = Math.round(g.x - S);
      const y = Math.round(g.y - 2 * S);
      if (g.flipped) {
        ctx.save();
        ctx.translate(x, y + 12 * S);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0, 16 * S, 12 * S);
        ctx.restore();
      } else {
        ctx.drawImage(img, x, y, 16 * S, 12 * S);
      }
    }

    for (const c of this.coffees) ctx.drawImage(this.sprites.coffee, Math.round(c.x), Math.round(c.y), 12 * S, 11 * S);

    this.drawPlayer();

    ctx.font = `bold ${4 * S + 1}px ${this.font || "monospace"}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000";
    for (const p of this.popups) {
      ctx.globalAlpha = p.t > 0.8 ? Math.max(0, 1 - (p.t - 0.8) / 0.4) : 1;
      const y = p.y - p.t * 40;
      ctx.strokeText(p.text, p.x, y);
      ctx.fillStyle = "#fafafa";
      ctx.fillText(p.text, p.x, y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawPlayer() {
    const { ctx, S } = this;
    const p = this.player;
    if (this.phase === "over") return;
    if (p.inv > 0 && this.phase === "play" && Math.floor(this.clock * 20) % 2) return;
    let frame: "idle" | "run1" | "run2" | "jump" = "idle";
    if (this.phase === "dying" || !p.onGround) frame = "jump";
    else if (Math.abs(p.vx) > 20) frame = Math.floor(p.stride / (8 * S)) % 2 ? "run2" : "run1";
    const x = Math.round(p.x - S);
    const y = Math.round(p.y - S);
    ctx.drawImage(this.sprites.hero[frame][p.face === 1 ? 0 : 1], x, y, 12 * S, 16 * S);
    if (p.hp === 2) {
      // caffeinated: steam rises off the hero
      for (const offset of [0, 0.5]) {
        const s = (this.clock * 1.4 + offset) % 1;
        ctx.globalAlpha = 1 - s;
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(x + (4 + offset * 6) * S + Math.round(Math.sin(this.clock * 6 + offset * 3)) * S, y - (2 + s * 7) * S, S, 2 * S);
      }
      ctx.globalAlpha = 1;
    }
  }
}
