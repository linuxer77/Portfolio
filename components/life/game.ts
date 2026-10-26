import { docBox, glyphOf, textNodes } from "../doom/page";
import { snapshotBox } from "../streetfighter/wreck";
import { record, unlock } from "@/lib/arcade";
import type { Sound } from "./sound";

// ==========================================
// GAME OF LIFE mode: the page as Conway's Game of Life. Every letter (and every bright pixel
// of the project images) is read into cells, but the page stays as it is until you click it:
// life ripples out from where you clicked, and only cells it has reached evolve. Newborn
// cells spread it further, so a glider crashing into a paragraph sets that paragraph off too.
// Known creatures (gliders, blinkers, blocks, beehives…) are found and labelled as they form.
// Nothing in the DOM changes: woken cells are drawn on this canvas, the rest is the real page.
// ==========================================

const CELL = 5; // px per cell
const BAND = 100; // rows simulated beyond the screen, above and below
const WAVE_SPEED = 26; // cells per second the ripple from a click spreads
const WAVE_MAX = 70; // cells: how far one click's ripple reaches
const SCAN_EVERY = 0.35; // seconds between pattern searches
const MAX_LABELS = 40;
const FADE_TIME = 0.6;
export const SPEEDS = [2, 4, 8, 12, 20, 30];

export type Kind = "ship" | "oscillator" | "still";

export interface LifeStats {
  generation: number;
  population: number;
  speed: number;
  paused: boolean;
  awake: boolean;
}

export interface LifeReport {
  generation: number;
  cells: number;
  creatures: { name: string; kind: Kind; count: number }[];
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

export const KIND_COLOUR: Record<Kind, string> = { ship: "#67e8f9", oscillator: "#c4b5fd", still: "#fbbf24" };

// ---------- the creatures it knows ----------

type Cells = [number, number][];

const parse = (rows: string[]): Cells =>
  rows.flatMap((row, y) => [...row].flatMap((c, x) => (c === "#" ? [[x, y] as [number, number]] : [])));

const normalise = (cells: Cells): Cells => {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my] as [number, number]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};

const keyOf = (cells: Cells) => normalise(cells).join(";");

// the eight ways a shape can be turned or mirrored
const TRANSFORMS: ((x: number, y: number) => [number, number])[] = [
  (x, y) => [x, y],
  (x, y) => [-x, y],
  (x, y) => [x, -y],
  (x, y) => [-x, -y],
  (x, y) => [y, x],
  (x, y) => [-y, x],
  (x, y) => [y, -x],
  (x, y) => [-y, -x],
];

/** The same key for a shape however it's turned. */
const canonical = (cells: Cells) =>
  TRANSFORMS.map((t) => keyOf(cells.map(([x, y]) => t(x, y)))).reduce((a, b) => (a < b ? a : b));

/** Runs a tiny Life board one step, for working out every phase of a creature. */
function stepCells(cells: Cells): Cells {
  const alive = new Set(cells.map(([x, y]) => `${x},${y}`));
  const counts = new Map<string, number>();
  for (const [x, y] of cells) {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const k = `${x + dx},${y + dy}`;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
  }
  const out: Cells = [];
  for (const [k, n] of counts) {
    if (n === 3 || (n === 2 && alive.has(k))) {
      const [x, y] = k.split(",").map(Number);
      out.push([x, y]);
    }
  }
  return out;
}

const KNOWN = new Map<string, { name: string; kind: Kind }>();
const remember = (name: string, kind: Kind, start: string[], phases = 1) => {
  let cells = parse(start);
  for (let i = 0; i < phases; i++) {
    KNOWN.set(canonical(cells), { name, kind });
    cells = stepCells(cells);
  }
};
remember("BLOCK", "still", ["##", "##"]);
remember("BEEHIVE", "still", [".##.", "#..#", ".##."]);
remember("LOAF", "still", [".##.", "#..#", ".#.#", "..#."]);
remember("BOAT", "still", ["##.", "#.#", ".#."]);
remember("TUB", "still", [".#.", "#.#", ".#."]);
remember("SHIP", "still", ["##.", "#.#", ".##"]);
remember("POND", "still", [".##.", "#..#", "#..#", ".##."]);
remember("BLINKER", "oscillator", ["###"], 2);
remember("TOAD", "oscillator", [".###", "###."], 2);
remember("BEACON", "oscillator", ["##..", "##..", "..##", "..##"], 2);
remember("GLIDER", "ship", [".#.", "..#", "###"], 4);

// gliders: every phase in every orientation, mapped to the way it's heading
const GLIDER_SE = [".#.", "..#", "###"];
const HEADING = new Map<string, string>();
{
  let phase = parse(GLIDER_SE);
  for (let p = 0; p < 4; p++) {
    for (const t of TRANSFORMS) {
      const [dx, dy] = t(1, 1);
      HEADING.set(keyOf(phase.map(([x, y]) => t(x, y))), dy > 0 ? (dx > 0 ? "↘" : "↙") : dx > 0 ? "↗" : "↖");
    }
    phase = stepCells(phase);
  }
}

interface Label {
  text: string;
  kind: Kind;
  x: number; // centre, document px
  y: number; // top of the creature
}

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
  /** cells life has reached; the rest of the page stays as it is */
  private awake = new Uint8Array(0);
  private waves: { x: number; y: number; r: number }[] = [];
  private labels: Label[] = [];
  private counts = new Map<string, { kind: Kind; count: number }>();
  private seen = new Uint8Array(0);
  private frameCanvas = document.createElement("canvas");
  private frameCtx = this.frameCanvas.getContext("2d")!;
  private frameImg: ImageData | null = null;

  private ready = false;
  private leaving = 0;
  private generation = 0;
  private population = 0;
  private woken = 0;
  private speedIndex = 1;
  /** the speed creeps up on its own until the visitor picks one */
  private autoSpeed = true;
  private rampT = 0;
  private paused = false;
  private acc = 0;
  private scanT = 0;
  private statsT = 0;
  private press: { x: number; y: number; moved: boolean } | null = null;
  private onDone: (() => void) | null = null;

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
    this.ready = true;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.emit();
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

  setPaused(paused: boolean) {
    this.paused = paused;
    this.emit();
  }

  togglePause() {
    this.setPaused(!this.paused);
  }

  step() {
    if (!this.ready) return;
    this.paused = true;
    this.tick();
    this.emit();
  }

  faster(by: number) {
    this.autoSpeed = false;
    this.speedIndex = Math.max(0, Math.min(SPEEDS.length - 1, this.speedIndex + by));
    this.emit();
  }

  /** Pointer down: a click wakes the page here; a drag draws new cells. */
  down(clientX: number, clientY: number) {
    this.press = { x: clientX, y: clientY, moved: false };
  }

  move(clientX: number, clientY: number) {
    const p = this.press;
    if (!p) return;
    if (!p.moved && Math.hypot(clientX - p.x, clientY - p.y) > 6) p.moved = true;
    if (p.moved) {
      p.x = clientX;
      p.y = clientY;
      this.paint(clientX, clientY);
    }
  }

  up(clientX: number, clientY: number) {
    const p = this.press;
    this.press = null;
    if (p && !p.moved) this.wake(clientX, clientY);
  }

  /** A rain of gliders across the screen, heading every which way. */
  gliders() {
    if (!this.ready) return;
    const [top, bottom] = this.visibleRows();
    const shape = parse(GLIDER_SE);
    for (let n = 0; n < 12; n++) {
      const x0 = 6 + Math.floor(Math.random() * (this.W - 12));
      const y0 = top + 3 + Math.floor(Math.random() * Math.max(1, bottom - top - 8));
      const t = TRANSFORMS[Math.floor(Math.random() * 4)];
      for (const [x, y] of shape) {
        const [tx, ty] = t(x - 1, y - 1);
        this.set(x0 + tx, y0 + ty);
      }
      this.wakeArea(x0, y0, 3);
    }
    this.sound.spark();
  }

  /** A sprinkle of random cells over the screen. */
  soup() {
    if (!this.ready) return;
    const [top, bottom] = this.visibleRows();
    for (let y = top; y < bottom; y++) {
      for (let x = 1; x < this.W - 1; x++) {
        this.awakeCell(y * this.W + x);
        if (Math.random() < 0.08) this.set(x, y);
      }
    }
    this.sound.spark();
  }

  /** What the page turned into, for the report card. */
  report(): LifeReport {
    const creatures = [...this.counts.entries()]
      .map(([name, { kind, count }]) => ({ name, kind, count }))
      .sort((a, b) => b.count - a.count);
    return { generation: this.generation, cells: this.woken, creatures };
  }

  /** Leaving: the woken cells fade out over the real page, then close. */
  exit(done: () => void) {
    record("life", this.generation);
    if (this.onDone) return;
    if (!this.woken) return done();
    this.onDone = done;
    this.leaving = 0.0001;
    this.sound.sweep(false);
  }

  // ---------- the board ----------

  /** Rasterizes the page, text and images, into cells. Nothing moves until it's woken. */
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
    this.awake = new Uint8Array(n);
    this.generation = 0;
    this.woken = 0;

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
      // lit pixels become cells; the black backgrounds of the image boxes don't
      if (a < 70 || Math.max(r, g, b) < 60) continue;
      this.cur[i] = 1;
      this.orig[i] = 1;
      this.age[i] = 40;
      const k = Math.min(1.6, 255 / Math.max(r, g, b));
      this.base[i] = (Math.min(255, r * k) << 16) | (Math.min(255, g * k) << 8) | Math.min(255, b * k);
    }
  }

  private awakeCell(i: number) {
    if (this.awake[i]) return;
    this.awake[i] = 1;
    this.woken++;
  }

  private wakeArea(cx: number, cy: number, r: number) {
    for (let y = Math.max(1, cy - r); y <= Math.min(this.H - 2, cy + r); y++) {
      for (let x = Math.max(1, cx - r); x <= Math.min(this.W - 2, cx + r); x++) this.awakeCell(y * this.W + x);
    }
  }

  /** A click: life ripples out from here. */
  private wake(clientX: number, clientY: number) {
    if (!this.ready || this.leaving) return;
    unlock("life-awake");
    const x = Math.floor((clientX + window.scrollX) / CELL);
    const y = Math.floor((clientY + window.scrollY) / CELL);
    this.waves.push({ x, y, r: 0 });
    this.sound.spark();
    this.emit();
  }

  /** Grows each ripple, waking the ring of cells it passes over. */
  private spreadWaves(dt: number) {
    for (const w of this.waves) {
      const r0 = w.r;
      const r1 = Math.min(WAVE_MAX, r0 + WAVE_SPEED * dt);
      for (let dy = -Math.ceil(r1); dy <= Math.ceil(r1); dy++) {
        const y = w.y + dy;
        if (y < 1 || y > this.H - 2) continue;
        const outer = r1 * r1 - dy * dy;
        if (outer < 0) continue;
        const xo = Math.floor(Math.sqrt(outer));
        const inner = r0 * r0 - dy * dy;
        const xi = inner > 0 ? Math.ceil(Math.sqrt(inner)) : 0;
        for (const side of [-1, 1]) {
          for (let dx = xi; dx <= xo; dx++) {
            const x = w.x + side * dx;
            if (x > 0 && x < this.W - 1) this.awakeCell(y * this.W + x);
          }
        }
      }
      w.r = r1;
    }
    this.waves = this.waves.filter((w) => w.r < WAVE_MAX);
  }

  private set(x: number, y: number) {
    if (x < 1 || y < 1 || x >= this.W - 1 || y >= this.H - 1) return;
    const i = y * this.W + x;
    this.cur[i] = 1;
    this.age[i] = 0;
    this.orig[i] = 0;
  }

  private paint(clientX: number, clientY: number) {
    if (!this.ready) return;
    const cx = Math.floor((clientX + window.scrollX) / CELL);
    const cy = Math.floor((clientY + window.scrollY) / CELL);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (Math.random() < 0.7) this.set(cx + dx, cy + dy);
    this.wakeArea(cx, cy, 3);
  }

  private visibleRows(): [number, number] {
    const top = Math.max(1, Math.floor((window.scrollY + this.headerBottom) / CELL));
    const bottom = Math.min(this.H - 1, Math.ceil((window.scrollY + window.innerHeight) / CELL));
    return [top, bottom];
  }

  /**
   * One generation, B3/S23, on woken cells in the rows around the screen. Cells still asleep
   * hold still but count as neighbours; a birth next to them wakes them, so life spreads.
   */
  private tick() {
    const { W, cur, next, age, orig, trail, awake } = this;
    const [top, bottom] = this.visibleRows();
    const y0 = Math.max(1, top - BAND);
    const y1 = Math.min(this.H - 2, bottom + BAND);
    next.set(cur);
    const spread: number[] = [];
    let births = 0;
    let deaths = 0;
    let population = 0;
    for (let y = y0; y <= y1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        if (!awake[i]) continue;
        const n =
          cur[i - W - 1] +
          cur[i - W] +
          cur[i - W + 1] +
          cur[i - 1] +
          cur[i + 1] +
          cur[i + W - 1] +
          cur[i + W] +
          cur[i + W + 1];
        if (cur[i]) {
          if (n === 2 || n === 3) {
            if (age[i] < 255) age[i]++;
            if (y >= top && y < bottom) population++;
          } else {
            next[i] = 0;
            orig[i] = 0;
            trail[i] = 150;
            deaths++;
          }
        } else if (n === 3) {
          next[i] = 1;
          age[i] = 0;
          births++;
          spread.push(i);
          if (y >= top && y < bottom) population++;
        } else if (trail[i]) trail[i] = trail[i] > 14 ? trail[i] - 14 : 0;
      }
    }
    for (const i of spread) {
      this.awakeCell(i - W - 1);
      this.awakeCell(i - W);
      this.awakeCell(i - W + 1);
      this.awakeCell(i - 1);
      this.awakeCell(i + 1);
      this.awakeCell(i + W - 1);
      this.awakeCell(i + W);
      this.awakeCell(i + W + 1);
    }
    this.cur = next;
    this.next = cur;
    this.generation++;
    if (this.generation === 1000) unlock("life-1000");
    this.population = population;
    this.sound.generation(births, deaths);
  }

  /** Finds small known creatures on screen and labels them. */
  private scan() {
    const { W, cur, awake } = this;
    const [top, bottom] = this.visibleRows();
    const size = (bottom - top) * W;
    if (this.seen.length < size) this.seen = new Uint8Array(size);
    else this.seen.fill(0, 0, size);
    const labels: Label[] = [];
    const counts = new Map<string, { kind: Kind; count: number }>();
    const stack: number[] = [];
    for (let y = top; y < bottom; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const s = (y - top) * W + x;
        if (!cur[i] || !awake[i] || this.seen[s]) continue;
        // flood-fill one clump of touching cells; give up on anything big
        const cells: Cells = [];
        let big = false;
        stack.push(i);
        this.seen[s] = 1;
        while (stack.length) {
          const j = stack.pop()!;
          const jx = j % W;
          const jy = (j - jx) / W;
          if (cells.length < 16) cells.push([jx, jy]);
          else big = true;
          for (let dy = -1; dy <= 1; dy++) {
            const ny = jy + dy;
            if (ny < top || ny >= bottom) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const k = ny * W + jx + dx;
              const ks = (ny - top) * W + jx + dx;
              if (cur[k] && awake[k] && !this.seen[ks]) {
                this.seen[ks] = 1;
                stack.push(k);
              }
            }
          }
        }
        if (big) continue;
        const found = KNOWN.get(canonical(cells));
        if (!found) continue;
        const text = found.name === "GLIDER" ? `GLIDER ${HEADING.get(keyOf(cells)) ?? ""}`.trim() : found.name;
        const tally = counts.get(found.name) ?? { kind: found.kind, count: 0 };
        tally.count++;
        counts.set(found.name, tally);
        if (labels.length < MAX_LABELS) {
          const cx = cells.reduce((a, c) => a + c[0], 0) / cells.length;
          const cy = Math.min(...cells.map((c) => c[1]));
          labels.push({ text, kind: found.kind, x: (cx + 0.5) * CELL, y: cy * CELL });
        }
      }
    }
    this.labels = labels;
    if ((counts.get("GLIDER")?.count ?? 0) >= 15) unlock("life-gliders");
    // the report keeps the most of each creature seen at once
    for (const [name, c] of counts) {
      const best = this.counts.get(name);
      if (!best || c.count > best.count) this.counts.set(name, c);
    }
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
    if (this.leaving) {
      this.leaving += dt;
      if (this.leaving >= FADE_TIME && this.onDone) {
        const done = this.onDone;
        this.onDone = null;
        done();
      }
      return;
    }
    this.spreadWaves(dt);
    if (this.press?.moved) this.paint(this.press.x, this.press.y);
    if (!this.paused && this.woken) {
      // a gentle start, so the first generations can be followed, then it picks up
      if (this.autoSpeed && this.speedIndex < 3 && (this.rampT += dt) > 6) {
        this.rampT = 0;
        this.speedIndex++;
      }
      this.acc += dt * SPEEDS[this.speedIndex];
      for (let n = 0; this.acc >= 1 && n < 4; n++) {
        this.acc -= 1;
        this.tick();
      }
      if (this.acc > 1) this.acc = 0;
    }
    if ((this.scanT -= dt) <= 0) {
      this.scanT = SCAN_EVERY;
      if (this.woken) this.scan();
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
      awake: this.woken > 0 || this.waves.length > 0,
    });
  }

  // ---------- rendering ----------

  private render() {
    const { ctx, W } = this;
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    if (!this.ready || !this.woken) {
      this.drawWaves();
      return;
    }

    // woken cells only, one pixel per cell, scaled up crisp; asleep, the real page shows through
    const [top, bottom] = this.visibleRows();
    const rows = bottom - top + 1;
    if (this.frameCanvas.width !== W || this.frameCanvas.height !== rows || !this.frameImg) {
      this.frameCanvas.width = W;
      this.frameCanvas.height = rows;
      this.frameImg = this.frameCtx.createImageData(W, rows);
    }
    const d = this.frameImg.data;
    const { cur, age, orig, base, trail, awake } = this;
    for (let y = 0; y < rows; y++) {
      const row = (top + y) * W;
      for (let x = 0; x < W; x++) {
        const i = row + x;
        const o = (y * W + x) * 4;
        if (!awake[i]) {
          d[o + 3] = 0;
          continue;
        }
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
          d[o] = d[o + 1] = d[o + 2] = 0;
        }
      }
    }
    this.frameCtx.putImageData(this.frameImg, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.headerBottom, vw, vh - this.headerBottom);
    ctx.clip();
    ctx.globalAlpha = this.leaving ? Math.max(0, 1 - this.leaving / FADE_TIME) : 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.frameCanvas, 0, top * CELL - window.scrollY, W * CELL, rows * CELL);
    if (!this.leaving) this.drawLabels();
    ctx.restore();
    this.drawWaves();
  }

  /** The ripples spreading from each click. */
  private drawWaves() {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const w of this.waves) {
      const p = w.r / WAVE_MAX;
      ctx.strokeStyle = `rgba(103,232,249,${0.85 * (1 - p)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        (w.x + 0.5) * CELL - window.scrollX,
        (w.y + 0.5) * CELL - window.scrollY,
        Math.max(1, w.r * CELL),
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Names over the creatures it recognises, without letting labels pile up on each other. */
  private drawLabels() {
    const { ctx } = this;
    ctx.font = `bold 10px ${this.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const placed: [number, number, number][] = [];
    for (const l of this.labels) {
      const x = l.x - window.scrollX;
      const y = l.y - window.scrollY - 3;
      if (y < this.headerBottom + 12) continue;
      const w = ctx.measureText(l.text).width + 6;
      if (placed.some(([px, py, pw]) => Math.abs(px - x) < (pw + w) / 2 && Math.abs(py - y) < 13)) continue;
      placed.push([x, y, w]);
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(x - w / 2, y - 12, w, 12);
      ctx.fillStyle = KIND_COLOUR[l.kind];
      ctx.fillText(l.text, x, y);
    }
    ctx.textBaseline = "alphabetic";
  }
}
