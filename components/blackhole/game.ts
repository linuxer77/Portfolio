import { docBox, glyphOf, textNodes, type Box, type Glyph } from "../doom/page";
import { snapshotBox } from "../streetfighter/wreck";
import { Disk } from "./disk";
import type { Sound } from "./sound";

// ==========================================
// BLACK HOLE mode: the cursor is a black hole. Letters near it peel off the page and fall
// into orbit, spiralling in as an accretion disk; they stretch as they cross the horizon,
// and everything swallowed makes the hole heavier, so its reach grows until it tears whole
// image boxes apart. Click and it collapses into a singularity, then a Big Bang throws every
// letter and shard back out to exactly where it came from. Nothing in the DOM changes: the
// missing pieces are black boxes on this canvas until they land home again.
// ==========================================

const START_R = 7; // event horizon radius, px
const MAX_R = 120;
const MAX_ORBIT = 1400; // letters in flight at once; the oldest fall in beyond this
const MAX_DETACH = 30; // letters peeled off per frame
const FORM_TIME = 1.2;
const COLLAPSE_TIME = 0.8;

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
    private sound: Sound,
    private onShake: (strength: number) => void
  ) {
    this.ctx = canvas.getContext("2d")!;
    // fewer gas particles on small screens
    this.disk = new Disk(window.innerWidth < 700 ? 650 : 1400);
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
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
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

  private launch(
    bit: Omit<Bit, "x" | "y" | "vx" | "vy" | "state" | "t" | "delay" | "dur" | "fx" | "fy" | "cx" | "cy">
  ) {
    const x = bit.home.x + bit.home.w / 2;
    const y = bit.home.y + bit.home.h / 2;
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
    this.torn.add(t.el);
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
    this.sound.setDrone(Math.max(0, size), this.phase === "feeding" || this.phase === "collapse");

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

  private orbit(dt: number, pullBoost: number) {
    const G = this.gravity() * pullBoost;
    let flying = 0;
    for (const b of this.bits) {
      if (b.state !== "orbit") continue;
      const dx = this.x - b.x;
      const dy = this.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
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

  private swallow(b: Bit) {
    b.state = "inside";
    if (!b.image) this.stats.letters++;
    this.mass += b.w * b.h * (b.image ? 0.3 : 1);
    if (this.phase === "feeding") this.r = Math.min(MAX_R, START_R + Math.sqrt(this.mass) * 0.18);
    this.sound.swallow(b.image);
    if (b.image || Math.random() < 0.25) this.disk.flare(this.x, this.y, this.r, b.image);
  }

  /** The Big Bang: everything is thrown back out along a curve to where it came from. */
  private bang() {
    this.disk.explode(this.x, this.y, this.rFrom ?? this.r);
    this.phase = "bang";
    this.phaseT = 0;
    this.rFrom = undefined;
    this.flash = 1;
    this.onShake(16);
    this.sound.bang();
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

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.headerBottom, vw, vh - this.headerBottom);
    ctx.clip();
    ctx.translate(-window.scrollX, -window.scrollY);
    const top = window.scrollY - 200;
    const bottom = window.scrollY + vh + 200;

    // the gaps where pieces used to be
    ctx.fillStyle = "#000";
    for (const b of this.bits) {
      if (b.state === "home") continue;
      const h = b.home;
      if (h.y + h.h < top || h.y > bottom) continue;
      ctx.fillRect(h.x - 0.5, h.y - 0.5, h.w + 1, h.h + 1);
    }

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

  /** Hot streaks behind letters in orbit and on their way home, in one additive pass. */
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
      } else if (b.state === "out" && b.t > b.delay) {
        const p = Math.min(1, (b.t - b.delay) / b.dur);
        if (p > 0.85) continue;
        const [x0, y0] = this.flightAt(b, Math.max(0, p - 0.08));
        const [x1, y1] = this.flightAt(b, p);
        near.moveTo(x0, y0);
        near.lineTo(x1, y1);
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
    ctx.save();
    // torn image shards glow like heated debris: their black background adds no light
    if (b.image) ctx.globalCompositeOperation = "lighter";
    ctx.translate(b.x, b.y);
    ctx.globalAlpha = 1 - s * 0.6;
    if (s > 0) {
      ctx.rotate(Math.atan2(dy, dx));
      ctx.scale(1 + s * 2.2, 1 - s * 0.7);
    } else ctx.rotate(b.rot);
    ctx.drawImage(b.img, -b.w / 2, -b.h / 2, b.w, b.h);
    ctx.restore();
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
      ctx.fillRect(0, y - 12, 300, 24);
      ctx.fillStyle = "#fafafa";
      const images = this.stats.images ? ` · ${this.stats.images} IMG` : "";
      ctx.fillText(`MASS ${this.stats.letters.toLocaleString()} LETTERS${images}`, 16, y);
    }
    if (this.report) {
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(250,250,250,${Math.min(1, 3 - this.report.t)})`;
      ctx.fillText(this.report.text, vw / 2, this.headerBottom + (vh - this.headerBottom) * 0.5);
    }
    ctx.textBaseline = "alphabetic";
  }
}
