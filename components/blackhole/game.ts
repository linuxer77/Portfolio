import { docBox, glyphOf, textNodes, type Box, type Glyph } from "../doom/page";
import { snapshotBox } from "../streetfighter/wreck";
import { record, unlock } from "@/lib/arcade";
import { Disk } from "./disk";
import { deflection, Lens } from "./lens";
import type { Sound } from "./sound";

// ==========================================
// BLACK HOLE mode: the cursor is a black hole. Letters near it peel off the page and fall
// into orbit, spiralling in as an accretion disk; they stretch as they cross the horizon,
// and everything swallowed makes the hole heavier, so its reach grows until it tears whole
// image boxes apart. Click and it collapses into a singularity, then a Big Bang throws every
// letter and shard back out to exactly where it came from. Nothing in the DOM changes: the
// missing pieces are black boxes on this canvas until they land home again.
//
// Spacetime bends around it too: the page behind the hole is lensed into an Einstein ring
// (lens.ts), a faint dotted grid shows space curving into the well, letters falling in slow
// down and redden as time dilates near the horizon, and the Big Bang sends a gravitational
// wave rippling out across the grid.
// ==========================================

const START_R = 7; // event horizon radius, px
const MAX_R = 120;
const MAX_ORBIT = 1400; // letters in flight at once; the oldest fall in beyond this
const MAX_DETACH = 30; // letters peeled off per frame
const FORM_TIME = 1.2;
const COLLAPSE_TIME = 0.8;
const GRID = 36; // spacing of the spacetime grid, px
// the Big Bang's gravitational wave: slow enough to outlast the flash
const WAVE_SPEED = 650; // px/s
const WAVE_LIFE = 3; // s
// how fast a clock just outside the horizon (at 1.1 r) runs: sqrt(1 - r / 1.1r)
const HORIZON_RATE = Math.sqrt(1 - 1 / 1.1);

export interface HoleStats {
  letters: number;
  images: number;
}

interface Entry {
  node: Text;
  box: Box;
  glyphs?: Glyph[];
}

interface Target {
  el: HTMLElement;
  box: Box;
  kind: string;
}

/** One piece of the page: a letter, or a shard of a torn image box. */
interface Bit {
  img: HTMLCanvasElement;
  w: number;
  h: number;
  home: Box;
  image: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  state: "orbit" | "inside" | "out" | "home";
  // the flight home after the Big Bang: a curve from (fx, fy) via (cx, cy)
  t: number;
  delay: number;
  dur: number;
  fx: number;
  fy: number;
  cx: number;
  cy: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class HoleGame {
  private ctx: CanvasRenderingContext2D;
  private headerBottom = 0;
  private font = "monospace";
  private text: Entry[] = [];
  private targets: Target[] = [];
  private taken = new WeakMap<Text, Set<number>>();
  private torn = new Set<HTMLElement>();
  private glyphCache = new Map<string, HTMLCanvasElement>();
  private bits: Bit[] = [];
  private disk: Disk;
  private lens: Lens | null;
  private snapshots = new Map<HTMLElement, HTMLCanvasElement | null>();
  private redshifted = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
  /** how bent spacetime is, 0 to 1: eases in as the hole opens and snaps back at the Big Bang */
  private bend = 0;
  private lensE = 0; // Einstein radius, px
  private lensR = 0; // how far out the bending reaches, px
  private wave: { x: number; y: number; t: number } | null = null;
  private clock = 0; // your time, s
  private horizonClock = 0; // a clock hovering just outside the horizon, s
  /** how hot it's burning: climbs through the collapse */
  private heat = 0;

  /** where the pointer is, in viewport px (the hole follows it, in document px) */
  private pointerX = window.innerWidth / 2;
  private pointerY = window.innerHeight / 2;
  private x = 0;
  private y = 0;
  private r = 0;
  private mass = 0;
  private stats: HoleStats = { letters: 0, images: 0 };
  private phase: "forming" | "feeding" | "collapse" | "bang" = "forming";
  private phaseT = 0;
  private flash = 0;
  private report: { text: string; t: number } | null = null;
  private onDone: (() => void) | null = null;
  /** the horizon's size when the collapse began */
  private rFrom: number | undefined;

  private running = false;
  private raf = 0;
  private last = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    lensCanvas: HTMLCanvasElement,
    private sound: Sound,
    private onShake: (strength: number) => void
  ) {
    this.ctx = canvas.getContext("2d")!;
    // fewer gas particles on small screens
    this.disk = new Disk(window.innerWidth < 700 ? 650 : 1400);
    this.lens = Lens.create(lensCanvas);
    const root = document.querySelector("[data-page-root]") ?? document.body;
    this.font = getComputedStyle(root).fontFamily || "monospace";
    this.resize();
    this.x = this.pointerX + window.scrollX;
    this.y = this.pointerY + window.scrollY;
  }

  // ---------- public API ----------

  start() {
    this.phase = "forming";
    this.phaseT = 0;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.sound.setDrone(0, false);
    this.lens?.destroy();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    this.lens?.resize();
  }

  pointer(clientX: number, clientY: number) {
    this.pointerX = clientX;
    this.pointerY = clientY;
  }

  /** Click / Space: crunch everything down to a point, then the Big Bang. */
  collapse() {
    this.sound.unlock();
    if (this.phase !== "feeding" || !this.bits.length) return;
    this.phase = "collapse";
    this.phaseT = 0;
    this.sound.collapse();
  }

  /** Leaving: if anything is missing from the page, put it back with a Big Bang first. */
  exit(done: () => void) {
    if (!this.bits.length) return done();
    this.onDone = done;
    if (this.phase === "feeding" || this.phase === "forming") {
      this.phase = "collapse";
      this.phaseT = 0;
      this.sound.collapse();
    }
  }

  // ---------- page ----------

  private measure() {
    this.text = textNodes().map((node) => ({ node, box: docBox(node.parentElement!) }));
    this.targets = [];
    document.querySelectorAll<HTMLElement>('[data-game="solid"], [data-game="bump"]').forEach((el) => {
      const box = docBox(el);
      if (box.w) this.targets.push({ el, box, kind: el.dataset.game ?? "" });
    });
  }

  private glyphsOf(e: Entry) {
    if (!e.glyphs) {
      e.glyphs = [];
      for (let i = 0; i < e.node.data.length; i++) {
        const g = glyphOf(e.node, i);
        if (g) e.glyphs.push(g);
      }
    }
    return e.glyphs;
  }

  private glyphImage(g: Glyph) {
    const key = `${g.font}|${g.color}|${g.char}`;
    let img = this.glyphCache.get(key);
    if (img) return img;
    const dpr = window.devicePixelRatio || 1;
    img = document.createElement("canvas");
    img.width = Math.ceil((g.box.w + 2) * dpr);
    img.height = Math.ceil((g.box.h + 2) * dpr);
    const c = img.getContext("2d")!;
    c.scale(dpr, dpr);
    c.font = g.font;
    c.fillStyle = g.color;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(g.char, (g.box.w + 2) / 2, (g.box.h + 2) / 2 + 1);
    this.glyphCache.set(key, img);
    return img;
  }

  /** Reach of the hole's pull, in px: grows with the horizon. */
  private reach() {
    return this.r * 5 + 50;
  }

  /** Tangential speed for a near-circular orbit; gravity falls off as 1/d, so it's flat. */
  private gravity() {
    return 26000 + this.r * 900;
  }

  // ---------- spacetime ----------

  /** Einstein radius for a hole of horizon r: the ring the page behind is bent into. */
  private einstein(r: number) {
    return r * 3 + 26;
  }

  /** How far out the page is visibly bent: well past the pull's reach, so you see it coming. */
  private lensReach(r: number) {
    return Math.min(Math.max(window.innerWidth, window.innerHeight) * 0.7, (r * 5 + 50) * 1.9 + 40);
  }

  /** Where a point of the page appears through the lens (its outer image), in doc coords. */
  private lensed(px: number, py: number): [number, number] {
    const dx = px - this.x;
    const dy = py - this.y;
    const b = Math.hypot(dx, dy);
    const e = this.lensE;
    if (e <= 0 || b < 0.01 || b > this.lensR) return [px, py];
    // the exact point-lens answer, then a few steps to account for the taper at the edge
    let th = (b + Math.sqrt(b * b + 4 * e * e)) / 2;
    for (let i = 0; i < 4; i++) th = b + deflection(th, e, this.lensR);
    return [this.x + (dx / b) * th, this.y + (dy / b) * th];
  }

  /** An image box drawn the way the page shows it, once; null for boxes with no image. */
  private snapshot(t: Target) {
    if (!this.snapshots.has(t.el)) {
      const { snap, image } = snapshotBox(t.el, t.box);
      this.snapshots.set(t.el, image ? snap : null);
    }
    return this.snapshots.get(t.el)!;
  }

  /** Measures letters around the lens a few at a time, so repainting its copy never stalls. */
  private warm() {
    if (!this.lens) return;
    const R = this.lensR * 1.05 + 640;
    let budget = 300;
    for (const e of this.text) {
      if (e.glyphs) continue;
      const b = e.box;
      if (b.x > this.x + R || b.x + b.w < this.x - R || b.y > this.y + R || b.y + b.h < this.y - R) continue;
      budget -= this.glyphsOf(e).length + 1;
      if (budget <= 0) return;
    }
  }

  /** Repaints the lens's copy of the page around the hole: every letter and image still on it. */
  private paintLens(lens: Lens) {
    const R = this.lensR * 1.05 + 320;
    const area = { x: this.x - R, y: this.y - R, w: R * 2, h: R * 2 };
    const c = lens.begin(area);
    const overlaps = (b: Box) =>
      b.x < area.x + area.w && b.x + b.w > area.x && b.y < area.y + area.h && b.y + b.h > area.y;
    for (const t of this.targets) {
      if (this.torn.has(t.el) || !overlaps(t.box)) continue;
      const snap = this.snapshot(t);
      if (snap) c.drawImage(snap, t.box.x, t.box.y, t.box.w, t.box.h);
    }
    for (const e of this.text) {
      if (!overlaps(e.box)) continue;
      const set = this.taken.get(e.node);
      for (const g of this.glyphsOf(e)) {
        if (set?.has(g.index)) continue;
        c.drawImage(this.glyphImage(g), g.box.x - 1, g.box.y - 1, g.box.w + 2, g.box.h + 2);
      }
    }
  }

  private launch(
    bit: Omit<Bit, "x" | "y" | "vx" | "vy" | "state" | "t" | "delay" | "dur" | "fx" | "fy" | "cx" | "cy">
  ) {
    // letters peel off from where you see them: through the lens, when the page is bent
    const hx = bit.home.x + bit.home.w / 2;
    const hy = bit.home.y + bit.home.h / 2;
    const [x, y] = this.lens ? this.lensed(hx, hy) : [hx, hy];
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    // counter-clockwise, a little slower than a stable orbit so it spirals in
    const v = Math.sqrt(this.gravity()) * rand(0.55, 0.8);
    this.bits.push({
      ...bit,
      x,
      y,
      vx: (-dy / d) * v - (dx / d) * 30,
      vy: (dx / d) * v - (dy / d) * 30,
      state: "orbit",
      t: 0,
      delay: 0,
      dur: 0,
      fx: 0,
      fy: 0,
      cx: 0,
      cy: 0,
    });
  }

  /** Letters within reach peel off, the nearest first. */
  private pull(dt: number) {
    const reach = this.reach();
    let n = 0;
    for (const e of this.text) {
      if (n >= MAX_DETACH) break;
      const b = e.box;
      if (this.x + reach < b.x || this.x - reach > b.x + b.w || this.y + reach < b.y || this.y - reach > b.y + b.h)
        continue;
      let set = this.taken.get(e.node);
      for (const g of this.glyphsOf(e)) {
        if (n >= MAX_DETACH) break;
        if (set?.has(g.index)) continue;
        const d = Math.hypot(g.box.x + g.box.w / 2 - this.x, g.box.y + g.box.h / 2 - this.y);
        if (d > reach) continue;
        const p = d < this.r * 2 ? 1 : dt * 10 * (1 - d / reach) ** 2;
        if (Math.random() > p) continue;
        if (!set) this.taken.set(e.node, (set = new Set()));
        set.add(g.index);
        this.lens?.erase(g.box);
        this.launch({
          img: this.glyphImage(g),
          w: g.box.w,
          h: g.box.h,
          home: g.box,
          image: false,
          rot: 0,
          vr: rand(-6, 6),
        });
        n++;
      }
    }
    // a heavy enough hole rips whole image boxes off the page
    for (const t of this.targets) {
      if (this.torn.has(t.el)) continue;
      const need = t.kind === "solid" ? 45 : 20;
      const cx = t.box.x + t.box.w / 2;
      const cy = t.box.y + t.box.h / 2;
      if (this.r < need || Math.hypot(cx - this.x, cy - this.y) > reach * 0.7 + Math.max(t.box.w, t.box.h) / 2)
        continue;
      this.tear(t);
    }
  }

  private tear(t: Target) {
    unlock("hole-image");
    this.torn.add(t.el);
    this.lens?.erase(t.box);
    const { snap, image } = snapshotBox(t.el, t.box);
    const cols = t.kind === "solid" ? 6 : 2;
    const rows = t.kind === "solid" ? 4 : 2;
    const pw = t.box.w / cols;
    const ph = t.box.h / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const piece = document.createElement("canvas");
        piece.width = Math.ceil(snap.width / cols);
        piece.height = Math.ceil(snap.height / rows);
        piece
          .getContext("2d")!
          .drawImage(
            snap,
            (i * snap.width) / cols,
            (j * snap.height) / rows,
            snap.width / cols,
            snap.height / rows,
            0,
            0,
            piece.width,
            piece.height
          );
        const home = { x: t.box.x + i * pw, y: t.box.y + j * ph, w: pw, h: ph };
        this.launch({ img: piece, w: pw, h: ph, home, image: true, rot: 0, vr: rand(-2, 2) });
      }
    }
    if (image) this.stats.images++;
    this.onShake(image ? 7 : 3);
  }

  // ---------- loop ----------

  private frame = (now: number) => {
    if (!this.running) return;
    // the first frame's timestamp can land a hair before start(): never step backwards
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
    this.last = now;
    this.update(dt);
    this.render();
    if (this.running) this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.phaseT += dt;
    this.flash = Math.max(0, this.flash - dt * 1.6);
    if (this.report && (this.report.t += dt) > 3) this.report = null;

    // the hole drifts after the pointer, a little heavy
    const tx = this.pointerX + window.scrollX;
    const ty = this.pointerY + window.scrollY;
    const follow = Math.min(1, dt * (this.phase === "collapse" ? 1 : 9));
    this.x += (tx - this.x) * follow;
    this.y += (ty - this.y) * follow;

    const collapsing = this.phase === "collapse" ? Math.min(1, this.phaseT / COLLAPSE_TIME) : 0;
    this.heat = collapsing;
    this.disk.update(dt, 1 + collapsing * 6);
    const size = (this.r - START_R) / (MAX_R - START_R);
    const active = this.phase === "feeding" || this.phase === "collapse";
    this.sound.setDrone(Math.max(0, size), active);

    // spacetime follows the mass; a collapsing hole keeps its mass, so its lens holds until the bang
    this.bend += ((active ? 1 : 0) - this.bend) * Math.min(1, dt * (active ? 2.5 : 8));
    const mass = this.phase === "collapse" ? (this.rFrom ?? this.r) : this.r;
    this.lensE = this.einstein(mass) * this.bend;
    this.lensR = this.lensReach(mass);
    if (this.wave && (this.wave.t += dt) > WAVE_LIFE) this.wave = null;
    if (active) {
      this.clock += dt;
      this.horizonClock += dt * HORIZON_RATE;
    }

    if (this.phase === "forming") {
      // the page's reveal animations settle while the hole opens
      this.r = START_R * Math.max(0.05, Math.min(1, this.phaseT / FORM_TIME));
      if (this.phaseT >= FORM_TIME) {
        this.measure();
        this.phase = "feeding";
        this.phaseT = 0;
      }
      return;
    }
    if (this.phase === "feeding") {
      this.warm();
      this.pull(dt);
      this.orbit(dt, 1);
    } else if (this.phase === "collapse") {
      // everything falls in at once and the horizon crunches down to a point
      const p = Math.min(1, this.phaseT / COLLAPSE_TIME);
      this.orbit(dt, 1 + p * 14);
      this.rFrom ??= this.r;
      this.r = Math.max(1.5, this.rFrom * (1 - p));
      if (p >= 1) this.bang();
    } else {
      this.fly(dt);
    }
  }

  private orbit(frameDt: number, pullBoost: number) {
    const G = this.gravity() * pullBoost;
    // the slowest a letter's clock may run, so they do still fall in (faster when collapsing)
    const slowest = this.phase === "collapse" ? 0.4 : 0.12;
    let flying = 0;
    for (const b of this.bits) {
      if (b.state !== "orbit") continue;
      const dx = this.x - b.x;
      const dy = this.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      // time dilation: seen from outside, a clock at d runs at sqrt(1 - r/d), so letters crawl,
      // nearly frozen, as they reach the horizon
      const dt = frameDt * Math.max(slowest, this.timeRate(d));
      const a = G / Math.max(d, this.r);
      b.vx += (dx / d) * a * dt;
      b.vy += (dy / d) * a * dt;
      // drag bleeds off the orbit, so it spirals inward
      const drag = 1 - Math.min(0.9, (0.55 + pullBoost * 0.3) * dt);
      b.vx *= drag;
      b.vy *= drag;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      if (d < this.r * 0.9 || (this.phase === "collapse" && d < 6)) this.swallow(b);
      else flying++;
    }
    // too many in flight: the oldest go straight in
    if (flying > MAX_ORBIT) {
      for (const b of this.bits) {
        if (flying <= MAX_ORBIT) break;
        if (b.state !== "orbit") continue;
        this.swallow(b);
        flying--;
      }
    }
  }

  /** How fast time runs at distance d from the hole, as seen from far away. */
  private timeRate(d: number) {
    return Math.sqrt(Math.max(0, 1 - this.r / Math.max(d, this.r)));
  }

  private swallow(b: Bit) {
    b.state = "inside";
    if (!b.image) this.stats.letters++;
    if (this.stats.letters >= 500) unlock("hole-500");
    this.mass += b.w * b.h * (b.image ? 0.3 : 1);
    if (this.phase === "feeding") this.r = Math.min(MAX_R, START_R + Math.sqrt(this.mass) * 0.18);
    this.sound.swallow(b.image);
    if (b.image || Math.random() < 0.25) this.disk.flare(this.x, this.y, this.r, b.image);
  }

  /** The Big Bang: everything is thrown back out along a curve to where it came from. */
  private bang() {
    unlock("hole-bang");
    record("blackhole", this.stats.letters);
    this.disk.explode(this.x, this.y, this.rFrom ?? this.r);
    this.phase = "bang";
    this.phaseT = 0;
    this.rFrom = undefined;
    this.flash = 1;
    this.onShake(16);
    this.sound.bang();
    // spacetime snaps back: a gravitational wave rolls out across the grid
    this.wave = { x: this.x, y: this.y, t: 0 };
    this.lens?.invalidate();
    for (const b of this.bits) {
      const hx = b.home.x + b.home.w / 2;
      const hy = b.home.y + b.home.h / 2;
      const dx = hx - this.x;
      const dy = hy - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const bend = rand(-0.35, 0.35) * d;
      b.state = "out";
      b.t = 0;
      b.delay = Math.min(0.9, (d / 2600) * rand(0.7, 1.3));
      b.dur = rand(0.7, 1.15);
      b.fx = this.x;
      b.fy = this.y;
      b.cx = this.x + dx * 0.5 - (dy / d) * bend;
      b.cy = this.y + dy * 0.5 + (dx / d) * bend;
      b.rot = rand(-6, 6);
    }
  }

  private fly(dt: number) {
    let out = 0;
    for (const b of this.bits) {
      if (b.state !== "out") continue;
      b.t += dt;
      if (b.t >= b.delay + b.dur) {
        b.state = "home";
        this.sound.land();
      } else out++;
    }
    if (out || this.phaseT < 0.4) return;
    // the page is whole again: a fresh, tiny hole
    this.report = {
      text: `THE PAGE IS BACK · ${this.stats.letters.toLocaleString()} letters${this.stats.images ? ` and ${this.stats.images} image${this.stats.images > 1 ? "s" : ""}` : ""} swallowed`,
      t: 0,
    };
    this.bits = [];
    this.taken = new WeakMap();
    this.torn.clear();
    this.mass = 0;
    this.stats = { letters: 0, images: 0 };
    this.clock = 0;
    this.horizonClock = 0;
    // a new hole opens from nothing, so the rebuilt page gets a moment
    this.r = 0;
    this.disk.reset();
    this.phase = "forming";
    this.phaseT = -1.2;
    if (this.onDone) {
      const done = this.onDone;
      this.onDone = null;
      done();
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

    // the page behind the hole, bent (on its own WebGL canvas just under this one)
    const lensing = !!this.lens && (this.phase === "feeding" || this.phase === "collapse") && this.lensE > 1;
    if (this.lens) {
      if (lensing) {
        if (!this.lens.covers(this.x, this.y, this.lensR * 1.05)) this.paintLens(this.lens);
        this.lens.draw(this.x, this.y, this.r, this.lensE, this.lensR, this.headerBottom, this.bend);
      } else this.lens.hide();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.headerBottom, vw, vh - this.headerBottom);
    ctx.clip();
    ctx.translate(-window.scrollX, -window.scrollY);
    const top = window.scrollY - 200;
    const bottom = window.scrollY + vh + 200;

    // the gaps where pieces used to be (under the lens, its bent copy already shows them)
    ctx.fillStyle = "#000";
    const hidden = lensing ? this.lensR * 0.85 : 0;
    for (const b of this.bits) {
      if (b.state === "home") continue;
      const h = b.home;
      if (h.y + h.h < top || h.y > bottom) continue;
      if (hidden && Math.hypot(h.x + h.w / 2 - this.x, h.y + h.h / 2 - this.y) < hidden) continue;
      ctx.fillRect(h.x - 0.5, h.y - 0.5, h.w + 1, h.h + 1);
    }
    this.drawFabric(top + 200, bottom - 200);

    const { x, y, r, heat, disk } = this;
    const hole = this.phase !== "bang";
    if (hole) {
      disk.drawHaze(ctx, x, y, r, heat);
      disk.drawBody(ctx, x, y, r, false, heat);
      disk.drawHalf(ctx, x, y, r, false, heat);
      this.drawHole();
      disk.drawPhotonRing(ctx, x, y, r, heat);
      disk.drawLens(ctx, x, y, r, heat);
      disk.drawBody(ctx, x, y, r, true, heat);
      disk.drawHalf(ctx, x, y, r, true, heat);
      disk.drawLens(ctx, x, y, r, heat);
      disk.drawJets(ctx, x, y, r, heat);
    }
    this.drawTrails();
    for (const b of this.bits) {
      if (b.state === "orbit") this.drawOrbiting(b);
      else if (b.state === "out" || b.state === "home") this.drawFlying(b);
    }
    disk.drawEffects(ctx, x, y);
    ctx.restore();

    if (this.flash > 0) {
      // the Big Bang's flash: white, cooling to orange
      ctx.fillStyle = `rgba(255,${200 + this.flash * 55},${140 + this.flash * 115},${this.flash * 0.85})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    this.drawHud(vw, vh);
  }

  /** Spacetime as a faint dotted grid: straight lines bent around the hole the way light is. */
  private drawFabric(top: number, bottom: number) {
    const { ctx, wave } = this;
    const left = window.scrollX;
    const right = left + window.innerWidth;
    const waveR = wave ? wave.t * WAVE_SPEED : 0;
    const waveA = wave ? 28 * (1 - wave.t / WAVE_LIFE) : 0;
    const warp = (px: number, py: number): [number, number] => {
      let [x, y] = this.lensed(px, py);
      if (wave) {
        // a gravitational wave: a ring of stretch and squeeze rolling outward
        const dx = x - wave.x;
        const dy = y - wave.y;
        const d = Math.hypot(dx, dy) || 1;
        const k = (d - waveR) / 50;
        const off = waveA * Math.sin(k * 2.2) * Math.exp(-k * k);
        x += (dx / d) * off;
        y += (dy / d) * off;
      }
      return [x, y];
    };
    // grid lines through a region, broken where they pass right over the hole
    const lines = (x0: number, y0: number, x1: number, y1: number) => {
      const path = new Path2D();
      const gap = Math.max(12, this.lensE * 0.3);
      const run = (sample: (i: number) => [number, number], n: number) => {
        let pen = false;
        for (let i = 0; i <= n; i++) {
          const [px, py] = sample(i);
          if (this.lensE > 0 && Math.hypot(px - this.x, py - this.y) < gap) {
            pen = false;
            continue;
          }
          const [x, y] = warp(px, py);
          if (pen) path.lineTo(x, y);
          else path.moveTo(x, y);
          pen = true;
        }
      };
      const ny = Math.ceil((y1 - y0) / 10);
      const nx = Math.ceil((x1 - x0) / 10);
      for (let gx = Math.ceil(x0 / GRID) * GRID; gx <= x1; gx += GRID) run((i) => [gx, y0 + (i * (y1 - y0)) / ny], ny);
      for (let gy = Math.ceil(y0 / GRID) * GRID; gy <= y1; gy += GRID) run((i) => [x0 + (i * (x1 - x0)) / nx, gy], nx);
      return path;
    };
    const ink = (a: number) => `rgba(148,163,184,${a.toFixed(3)})`;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([1.5, 5]);
    if (this.bend > 0.02 && this.lensE > 1) {
      // around the hole: faint far out, brightest where the lines crowd onto the Einstein ring
      const R = this.lensR;
      const e = this.lensE / R;
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, R);
      const a = 0.38 * this.bend;
      g.addColorStop(0, ink(0));
      g.addColorStop(Math.min(0.97, e * 0.92), ink(0));
      g.addColorStop(Math.min(0.98, e * 1.12), ink(a));
      g.addColorStop(Math.min(0.99, Math.max(e * 1.2, 0.55)), ink(a * 0.45));
      g.addColorStop(1, ink(0));
      ctx.strokeStyle = g;
      ctx.stroke(
        lines(
          Math.max(left, this.x - R),
          Math.max(top, this.y - R),
          Math.min(right, this.x + R),
          Math.min(bottom, this.y + R)
        )
      );
    }
    if (wave && waveA > 0) {
      const R = waveR + 140;
      const g = ctx.createRadialGradient(wave.x, wave.y, 0, wave.x, wave.y, R);
      const a = 0.9 * (1 - wave.t / WAVE_LIFE);
      g.addColorStop(0, ink(0));
      g.addColorStop(Math.max(0, (waveR - 140) / R), ink(0));
      g.addColorStop(Math.max(0, (waveR - 50) / R), ink(a * 0.6));
      g.addColorStop(waveR / R, ink(a));
      g.addColorStop((waveR + 50) / R, ink(a * 0.6));
      g.addColorStop(1, ink(0));
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.4;
      ctx.stroke(lines(left, top, right, bottom));
    }
    ctx.restore();
  }

  /** Hot streaks behind letters in orbit, in one additive pass (the flight home stays clean). */
  private drawTrails() {
    const { ctx } = this;
    const near = new Path2D();
    const far = new Path2D();
    for (const b of this.bits) {
      if (b.state === "orbit") {
        // hotter the closer they are to the horizon
        const d = Math.hypot(b.x - this.x, b.y - this.y);
        const path = d < this.r * 3 ? near : far;
        path.moveTo(b.x - b.vx * 0.06, b.y - b.vy * 0.06);
        path.lineTo(b.x, b.y);
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(255,170,80,0.55)";
    ctx.stroke(near);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,120,50,0.28)";
    ctx.stroke(far);
    ctx.restore();
  }

  /** Where a piece is on its curved flight home, p from 0 to 1. */
  private flightAt(b: Bit, p: number): [number, number] {
    const e = 1 - (1 - p) ** 3;
    const hx = b.home.x + b.home.w / 2;
    const hy = b.home.y + b.home.h / 2;
    return [
      (1 - e) ** 2 * b.fx + 2 * (1 - e) * e * b.cx + e * e * hx,
      (1 - e) ** 2 * b.fy + 2 * (1 - e) * e * b.cy + e * e * hy,
    ];
  }

  /** A letter in orbit, stretched along the radius as it nears the horizon. */
  private drawOrbiting(b: Bit) {
    const { ctx } = this;
    const dx = b.x - this.x;
    const dy = b.y - this.y;
    const d = Math.hypot(dx, dy);
    const s = Math.max(0, Math.min(1, 1 - (d - this.r) / (this.r * 1.6)));
    // redshift: as time slows near the horizon its light stretches red and dims
    const red = 1 - Math.min(1, this.timeRate(d) / 0.7);
    ctx.save();
    // torn image shards glow like heated debris: their black background adds no light
    if (b.image) ctx.globalCompositeOperation = "lighter";
    ctx.translate(b.x, b.y);
    const alpha = (1 - s * 0.6) * (1 - red * 0.45);
    if (s > 0) {
      ctx.rotate(Math.atan2(dy, dx));
      ctx.scale(1 + s * 2.2, 1 - s * 0.7);
    } else ctx.rotate(b.rot);
    ctx.globalAlpha = alpha * (1 - red);
    if (red < 1) ctx.drawImage(b.img, -b.w / 2, -b.h / 2, b.w, b.h);
    if (red > 0) {
      ctx.globalAlpha = alpha * red;
      ctx.drawImage(this.redshift(b.img), -b.w / 2, -b.h / 2, b.w, b.h);
    }
    ctx.restore();
  }

  /** A piece's image shifted red, for its last moments outside the horizon. */
  private redshift(img: HTMLCanvasElement) {
    let red = this.redshifted.get(img);
    if (red) return red;
    red = document.createElement("canvas");
    red.width = img.width;
    red.height = img.height;
    const c = red.getContext("2d")!;
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = "rgba(255,72,24,0.85)";
    c.fillRect(0, 0, red.width, red.height);
    this.redshifted.set(img, red);
    return red;
  }

  /** A piece on its way home after the Big Bang (or already there, for the frame it lands). */
  private drawFlying(b: Bit) {
    if (b.state === "home" || b.t < b.delay) return;
    const { ctx } = this;
    const p = Math.min(1, (b.t - b.delay) / b.dur);
    const e = 1 - (1 - p) ** 3;
    const [x, y] = this.flightAt(b, p);
    const scale = 0.3 + 0.7 * e;
    ctx.save();
    // shards glow on the way out and only turn solid as they settle back into the box
    if (b.image && e < 0.85) ctx.globalCompositeOperation = "lighter";
    ctx.translate(x, y);
    ctx.rotate(b.rot * (1 - e));
    ctx.drawImage(b.img, (-b.w / 2) * scale, (-b.h / 2) * scale, b.w * scale, b.h * scale);
    ctx.restore();
  }

  /** The shadow: pure black, the photon ring and lensed light go on top of it. */
  private drawHole() {
    const { ctx } = this;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHud(vw: number, vh: number) {
    const { ctx } = this;
    const small = vw < 640;
    ctx.font = `bold ${small ? 10 : 12}px ${this.font}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const y = this.headerBottom + 20;
    if (this.phase === "feeding" || this.phase === "collapse") {
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(0, y - 12, small ? 290 : 360, 44);
      ctx.fillStyle = "#fafafa";
      const images = this.stats.images ? ` · ${this.stats.images} IMG` : "";
      ctx.fillText(`MASS ${this.stats.letters.toLocaleString()} LETTERS${images}`, 16, y);
      // time dilation: a clock hovering just outside the horizon falls behind yours
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(`TIME  YOU ${this.clock.toFixed(1)}s · NEAR HORIZON ${this.horizonClock.toFixed(1)}s`, 16, y + 20);
    }
    if (this.report) {
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(250,250,250,${Math.min(1, 3 - this.report.t)})`;
      ctx.fillText(this.report.text, vw / 2, this.headerBottom + (vh - this.headerBottom) * 0.5);
    }
    ctx.textBaseline = "alphabetic";
  }
}
