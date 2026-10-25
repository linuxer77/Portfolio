import { docBox, glyphOf, textNodes } from "../doom/page";
import { snapshotBox } from "../streetfighter/wreck";
import type { Sound } from "./sound";

// ==========================================
// GAME OF LIFE mode: the page becomes Conway's Game of Life. A scan line sweeps down and
// every letter (and every bright pixel of the project images) is rasterized into live cells
// in its own colour, so at first the page still reads, just made of cells. Then it evolves:
// new cells are born cyan, age through violet and pink, and still lifes settle amber, with a
// blue afterglow where cells die. Draw with the pointer, rain gliders, pause and step.
// Esc sweeps the page back. Nothing in the DOM changes; the board is drawn on this canvas.
// ==========================================

const CELL = 3; // px per cell
const BAND = 140; // rows simulated beyond the screen, above and below
const SWEEP_TIME = 1.1;
export const SPEEDS = [2, 4, 8, 12, 20, 30, 60];

export interface LifeStats {
  generation: number;
  population: number;
  speed: number;
  paused: boolean;
}

// age → colour: born cyan, then violet, pink, and amber once it has sat still for a while
const STOPS: [number, [number, number, number]][] = [
  [0, [103, 232, 249]],
  [6, [167, 139, 250]],
  [18, [244, 114, 182]],
  [48, [251, 191, 36]],
];
const PALETTE = Array.from({ length: 64 }, (_, age) => {
  let i = 0;
  while (i < STOPS.length - 2 && age > STOPS[i + 1][0]) i++;
  const [a0, c0] = STOPS[i];
  const [a1, c1] = STOPS[i + 1];
  const t = Math.min(1, Math.max(0, (age - a0) / (a1 - a0)));
  return c0.map((v, k) => Math.round(v + (c1[k] - v) * t)) as [number, number, number];
});

// a glider, heading down-right; mirrored for the other directions
const GLIDER = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
];

export class LifeGame {
  private ctx: CanvasRenderingContext2D;
  private headerBottom = 0;
  private font = "monospace";
  private W = 0;
  private H = 0;
  private cur = new Uint8Array(0);
  private next = new Uint8Array(0);
  private age = new Uint8Array(0);
  /** cells from the page itself keep the page's colour until they first die */
  private orig = new Uint8Array(0);
  private base = new Uint32Array(0);
  private trail = new Uint8Array(0);
  private frameCanvas = document.createElement("canvas");
  private frameCtx = this.frameCanvas.getContext("2d")!;
  private frameImg: ImageData | null = null;

  private phase: "in" | "life" | "out" = "in";
  private phaseT = 0;
  private generation = 0;
  private population = 0;
  private speedIndex = 3;
  private paused = false;
  private acc = 0;
  private painting = false;
  private pointer = { x: 0, y: 0 };
  private onDone: (() => void) | null = null;
  private statsT = 0;

  private running = false;
  private raf = 0;
  private last = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private sound: Sound,
    private onStats: (s: LifeStats) => void
  ) {
    this.ctx = canvas.getContext("2d")!;
    const root = document.querySelector("[data-page-root]") ?? document.body;
    this.font = getComputedStyle(root).fontFamily || "monospace";
    this.resize();
  }

  // ---------- public API ----------

  start() {
    this.build();
    this.population = this.countVisible();
    this.phase = "in";
    this.phaseT = 0;
    this.sound.sweep(true);
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
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
  }

  togglePause() {
    this.paused = !this.paused;
    this.emit();
  }

  step() {
    if (this.phase !== "life") return;
    this.paused = true;
    this.tick();
    this.emit();
  }

  faster(by: number) {
    this.speedIndex = Math.max(0, Math.min(SPEEDS.length - 1, this.speedIndex + by));
    this.emit();
  }

  /** Paints live cells under the pointer while it's down. */
  draw(clientX: number, clientY: number, down: boolean) {
    this.pointer = { x: clientX, y: clientY };
    this.painting = down;
    if (down) this.paint(clientX, clientY);
  }

  /** A rain of gliders across the screen, heading every which way. */
  gliders() {
    if (this.phase !== "life") return;
    const [top, bottom] = this.visibleRows();
    for (let n = 0; n < 14; n++) {
      const x0 = 4 + Math.floor(Math.random() * (this.W - 8));
      const y0 = top + Math.floor(Math.random() * (bottom - top - 4));
      const fx = Math.random() < 0.5;
      const fy = Math.random() < 0.5;
      for (const [dx, dy] of GLIDER) this.set(x0 + (fx ? 2 - dx : dx), y0 + (fy ? 2 - dy : dy));
    }
    this.sound.spark();
  }

  /** A sprinkle of random cells over the screen. */
  soup() {
    if (this.phase !== "life") return;
    const [top, bottom] = this.visibleRows();
    for (let y = top; y < bottom; y++) {
      for (let x = 1; x < this.W - 1; x++) if (Math.random() < 0.06) this.set(x, y);
    }
    this.sound.spark();
  }

  /** Leaving: sweep the page back in, then close. */
  exit(done: () => void) {
    if (this.phase === "out") return;
    this.onDone = done;
    this.phase = "out";
    this.phaseT = 0;
    this.sound.sweep(false);
  }

  // ---------- the board ----------

  /** Rasterizes the page, text and images, into the starting cells. */
  private build() {
    const docW = document.documentElement.clientWidth;
    const docH = document.documentElement.scrollHeight;
    const W = (this.W = Math.ceil(docW / CELL));
    const H = (this.H = Math.ceil(docH / CELL));
    const n = W * H;
    this.cur = new Uint8Array(n);
    this.next = new Uint8Array(n);
    this.age = new Uint8Array(n);
    this.orig = new Uint8Array(n);
    this.base = new Uint32Array(n);
    this.trail = new Uint8Array(n);
    this.generation = 0;

    const raster = document.createElement("canvas");
    raster.width = W;
    raster.height = H;
    const rc = raster.getContext("2d", { willReadFrequently: true })!;
    rc.scale(1 / CELL, 1 / CELL);
    // the project images first, so text drawn over them wins
    document.querySelectorAll<HTMLElement>('[data-game="solid"], [data-game="bump"]').forEach((el) => {
      const box = docBox(el);
      if (!box.w) return;
      const { snap } = snapshotBox(el, box);
      rc.drawImage(snap, box.x, box.y, box.w, box.h);
    });
    rc.textAlign = "center";
    rc.textBaseline = "middle";
    for (const node of textNodes()) {
      for (let i = 0; i < node.data.length; i++) {
        const g = glyphOf(node, i);
        if (!g) continue;
        rc.font = g.font;
        rc.fillStyle = g.color;
        rc.fillText(g.char, g.box.x + g.box.w / 2, g.box.y + g.box.h / 2 + 1);
      }
    }
    const px = rc.getImageData(0, 0, W, H).data;
    for (let i = 0; i < n; i++) {
      const r = px[i * 4];
      const g = px[i * 4 + 1];
      const b = px[i * 4 + 2];
      const a = px[i * 4 + 3];
      // lit pixels come alive; the black backgrounds of the image boxes don't
      if (a < 90 || Math.max(r, g, b) < 70) continue;
      this.cur[i] = 1;
      this.orig[i] = 1;
      this.age[i] = 40;
      // brighten a touch: a cell is a pixel of the letter, so it reads a little dimmer
      const k = Math.min(1.6, 255 / Math.max(r, g, b));
      this.base[i] = (Math.min(255, r * k) << 16) | (Math.min(255, g * k) << 8) | Math.min(255, b * k);
    }
  }

  private set(x: number, y: number) {
    if (x < 1 || y < 1 || x >= this.W - 1 || y >= this.H - 1) return;
    const i = y * this.W + x;
    this.cur[i] = 1;
    this.age[i] = 0;
    this.orig[i] = 0;
  }

  private paint(clientX: number, clientY: number) {
    if (this.phase !== "life") return;
    const cx = Math.floor((clientX + window.scrollX) / CELL);
    const cy = Math.floor((clientY + window.scrollY) / CELL);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (Math.random() < 0.75) this.set(cx + dx, cy + dy);
  }

  /** Live cells on screen right now. */
  private countVisible() {
    const [top, bottom] = this.visibleRows();
    let n = 0;
    for (let i = top * this.W; i < bottom * this.W; i++) n += this.cur[i];
    return n;
  }

  private visibleRows(): [number, number] {
    const top = Math.max(1, Math.floor((window.scrollY + this.headerBottom) / CELL));
    const bottom = Math.min(this.H - 1, Math.ceil((window.scrollY + window.innerHeight) / CELL));
    return [top, bottom];
  }

  /** One generation, B3/S23, on the rows around the screen; the rest of the page waits. */
  private tick() {
    const { W, cur, next, age, orig, trail } = this;
    const [top, bottom] = this.visibleRows();
    const y0 = Math.max(1, top - BAND);
    const y1 = Math.min(this.H - 2, bottom + BAND);
    next.set(cur);
    let births = 0;
    let deaths = 0;
    let population = 0;
    for (let y = y0; y <= y1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        const n =
          cur[i - W - 1] +
          cur[i - W] +
          cur[i - W + 1] +
          cur[i - 1] +
          cur[i + 1] +
          cur[i + W - 1] +
          cur[i + W] +
          cur[i + W + 1];
        const alive = cur[i];
        if (alive) {
          if (n === 2 || n === 3) {
            if (age[i] < 255) age[i]++;
            if (y >= top && y < bottom) population++;
          } else {
            next[i] = 0;
            orig[i] = 0;
            trail[i] = 150;
            deaths++;
          }
        } else {
          if (n === 3) {
            next[i] = 1;
            age[i] = 0;
            births++;
            if (y >= top && y < bottom) population++;
          } else if (trail[i]) trail[i] = trail[i] > 14 ? trail[i] - 14 : 0;
        }
      }
    }
    this.cur = next;
    this.next = cur;
    this.generation++;
    this.population = population;
    this.sound.generation(births, deaths);
  }

  // ---------- loop ----------

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.max(0, Math.min(0.1, (now - this.last) / 1000));
    this.last = now;
    this.update(dt);
    this.render();
    if (this.running) this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.phaseT += dt;
    if (this.phase === "in") {
      if (this.phaseT >= SWEEP_TIME + 0.5) {
        this.phase = "life";
        this.phaseT = 0;
      }
      return;
    }
    if (this.phase === "out") {
      if (this.phaseT >= SWEEP_TIME && this.onDone) {
        const done = this.onDone;
        this.onDone = null;
        done();
      }
      return;
    }
    if (this.painting) this.paint(this.pointer.x, this.pointer.y);
    if (!this.paused) {
      this.acc += dt * SPEEDS[this.speedIndex];
      // never more than a few generations per frame, so a slow device doesn't spiral
      for (let n = 0; this.acc >= 1 && n < 4; n++) {
        this.acc -= 1;
        this.tick();
      }
      if (this.acc > 1) this.acc = 0;
    }
    if ((this.statsT -= dt) <= 0) {
      this.statsT = 0.25;
      this.emit();
    }
  }

  private emit() {
    this.onStats({
      generation: this.generation,
      population: this.population,
      speed: SPEEDS[this.speedIndex],
      paused: this.paused,
    });
  }

  // ---------- rendering ----------

  /** How far down the screen the board reaches during a sweep, in viewport px. */
  private sweepLine() {
    const vh = window.innerHeight;
    const span = vh - this.headerBottom;
    const p = Math.min(1, this.phaseT / SWEEP_TIME);
    const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    if (this.phase === "in") return this.headerBottom + span * e;
    if (this.phase === "out") return this.headerBottom + span * (1 - e);
    return vh;
  }

  private render() {
    const { ctx, W } = this;
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    const line = this.sweepLine();
    if (line <= this.headerBottom + 0.5) return;

    // the board, from the header down to the sweep line, one pixel per cell, scaled up crisp
    const [top] = this.visibleRows();
    const rows = Math.min(this.H - top, Math.ceil((line - this.headerBottom) / CELL) + 2);
    if (rows <= 0) return;
    if (this.frameCanvas.width !== W || this.frameCanvas.height !== rows || !this.frameImg) {
      this.frameCanvas.width = W;
      this.frameCanvas.height = rows;
      this.frameImg = this.frameCtx.createImageData(W, rows);
    }
    const img = this.frameImg;
    const d = img.data;
    const { cur, age, orig, base, trail } = this;
    for (let y = 0; y < rows; y++) {
      const row = (top + y) * W;
      for (let x = 0; x < W; x++) {
        const i = row + x;
        const o = (y * W + x) * 4;
        d[o + 3] = 255;
        if (cur[i]) {
          if (orig[i]) {
            const c = base[i];
            d[o] = c >> 16;
            d[o + 1] = (c >> 8) & 255;
            d[o + 2] = c & 255;
          } else {
            const [r, g, b] = PALETTE[Math.min(63, age[i])];
            d[o] = r;
            d[o + 1] = g;
            d[o + 2] = b;
          }
        } else if (trail[i]) {
          // the afterglow of a cell that just died, fading through deep blue
          const t = trail[i];
          d[o] = t * 0.15;
          d[o + 1] = t * 0.25;
          d[o + 2] = t * 0.75;
        } else {
          // the buffer is reused frame to frame, so empty cells have to be cleared
          d[o] = d[o + 1] = d[o + 2] = 0;
        }
      }
    }
    this.frameCtx.putImageData(img, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.headerBottom, vw, line - this.headerBottom);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.frameCanvas, 0, top * CELL - window.scrollY, W * CELL, rows * CELL);
    ctx.restore();

    // the scan line, while it sweeps
    if (this.phase !== "life") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createLinearGradient(0, line - 24, 0, line + 2);
      glow.addColorStop(0, "rgba(103,232,249,0)");
      glow.addColorStop(1, "rgba(103,232,249,0.45)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, line - 24, vw, 26);
      ctx.fillStyle = "rgba(220,250,255,0.95)";
      ctx.fillRect(0, line - 1, vw, 2);
      ctx.restore();
    }

    if (this.phase === "life") {
      ctx.font = `bold ${vw < 640 ? 10 : 12}px ${this.font}`;
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(0, this.headerBottom + 8, vw < 640 ? 230 : 330, 24);
      ctx.fillStyle = "#67e8f9";
      ctx.fillText(
        `GEN ${this.generation.toLocaleString()} · POP ${this.population.toLocaleString()} · ${SPEEDS[this.speedIndex]}/s${this.paused ? " · PAUSED" : ""}`,
        16,
        this.headerBottom + 20
      );
      ctx.textBaseline = "alphabetic";
    }
  }
}
