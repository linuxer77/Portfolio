// ==========================================
// The pixel layer the moves are drawn on. The Pokémon are pixel art drawn k screen px per
// sprite px, so the effects are too: they're drawn into a small canvas, one pixel per sprite
// pixel, with nothing but whole pixels (no anti-aliasing, no soft glows: palettes, stepped
// colours and checkerboard dithering instead of transparency), then scaled up without
// smoothing. Every helper takes document coordinates.
// ==========================================

/** Colour ramps, brightest first. */
export const FIRE = ["#fffbe0", "#ffe25c", "#ffb020", "#f86818", "#d02c10", "#7c1408"];
export const WATER = ["#ffffff", "#c8f0ff", "#68c8f8", "#2890e8", "#1458b8", "#0c2c70"];
export const ICE = ["#ffffff", "#e0faff", "#a0e8f8", "#58c0e8", "#2c88c8"];
export const GHOST = ["#f4dcff", "#c890f8", "#9050e0", "#6028b0", "#3c1478", "#1c0838"];
export const SLUDGE = ["#e8b8ff", "#b860f0", "#8830c8", "#5c1890", "#34084c"];
export const DRAGON = ["#ffffff", "#c8d8ff", "#8090f8", "#5040d0"];
export const EARTH = ["#f0dcb0", "#c8a070", "#a07848", "#6c4c28", "#3c2810"];
export const AIR = ["#ffffff", "#e8f4ff", "#b8d8f0"];
export const PINK = ["#ffe0f4", "#ff9ce0", "#e860c8", "#a83098"];

/** A steady pseudo-random 0–1 for an integer, so flicker patterns hold still between calls. */
export const hash = (n: number) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/** A colour from a ramp: 0 is the brightest end, 1 the darkest. */
export const ramp = (r: string[], t: number) => r[Math.max(0, Math.min(r.length - 1, Math.floor(t * r.length)))];

export class PixelLayer {
  readonly canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d")!;
  /** screen px per layer pixel */
  p = 2;
  private ox = 0;
  private oy = 0;

  /** Clears the layer for a frame: p px per pixel, the viewport's top-left at (ox, oy). */
  begin(vw: number, vh: number, p: number, ox: number, oy: number) {
    this.p = p;
    this.ox = ox;
    this.oy = oy;
    const w = Math.ceil(vw / p) + 1;
    const h = Math.ceil(vh / p) + 1;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalAlpha = 1;
  }

  /** Draws the layer over the screen (ctx in screen px, no transform). */
  blit(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.canvas, 0, 0, this.canvas.width * this.p, this.canvas.height * this.p);
    ctx.restore();
  }

  /** Doc px → layer pixel. */
  X(x: number) {
    return Math.round((x - this.ox) / this.p);
  }
  Y(y: number) {
    return Math.round((y - this.oy) / this.p);
  }
  /** A length in doc px → whole layer pixels. */
  L(n: number) {
    return Math.max(0, Math.round(n / this.p));
  }

  set alpha(a: number) {
    this.ctx.globalAlpha = a;
  }

  dot(x: number, y: number, colour: string, size = 1) {
    this.ctx.fillStyle = colour;
    const s = Math.max(1, size);
    this.ctx.fillRect(this.X(x) - Math.floor(s / 2), this.Y(y) - Math.floor(s / 2), s, s);
  }

  /** A filled disc of radius r (doc px), squashed vertically by sy, in whole pixels. */
  disc(x: number, y: number, r: number, colour: string, sy = 1) {
    const R = r / this.p;
    if (R < 0.5) return this.dot(x, y, colour);
    const cx = this.X(x);
    const cy = this.Y(y);
    const ry = Math.max(0.5, R * sy);
    this.ctx.fillStyle = colour;
    for (let dy = -Math.floor(ry); dy <= Math.floor(ry); dy++) {
      const half = Math.floor(R * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))) + 0.25);
      this.ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
    }
  }

  /** A ring (ellipse outline) `thick` pixels wide; `gaps` breaks it up, for crackle. */
  ring(x: number, y: number, r: number, colour: string, sy = 1, thick = 1, gaps = 0, seed = 0) {
    const R = r / this.p;
    const n = Math.max(12, Math.round(R * 6));
    const cx = this.X(x);
    const cy = this.Y(y);
    this.ctx.fillStyle = colour;
    for (let i = 0; i < n; i++) {
      if (gaps && hash(i + seed * 97) < gaps) continue;
      const a = (i / n) * Math.PI * 2;
      this.ctx.fillRect(Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R * sy), thick, thick);
    }
  }

  /** A line `width` pixels thick, stepped one pixel at a time (no anti-aliasing). */
  line(x0: number, y0: number, x1: number, y1: number, colour: string, width = 1) {
    let X0 = this.X(x0);
    let Y0 = this.Y(y0);
    const X1 = this.X(x1);
    const Y1 = this.Y(y1);
    const dx = Math.abs(X1 - X0);
    const dy = Math.abs(Y1 - Y0);
    const sx = X0 < X1 ? 1 : -1;
    const sy = Y0 < Y1 ? 1 : -1;
    const w = Math.max(1, Math.round(width));
    const off = Math.floor(w / 2);
    // thickness goes across the line's main direction
    const steep = dy > dx;
    this.ctx.fillStyle = colour;
    let err = dx - dy;
    for (let guard = 0; guard < 4000; guard++) {
      if (steep) this.ctx.fillRect(X0 - off, Y0, w, 1);
      else this.ctx.fillRect(X0, Y0 - off, 1, w);
      if (X0 === X1 && Y0 === Y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        X0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        Y0 += sy;
      }
    }
  }

  /** Half-filled with a checkerboard: pixel art's way of being see-through. */
  dither(x: number, y: number, w: number, h: number, colour: string, phase = 0) {
    const X0 = this.X(x);
    const Y0 = this.Y(y);
    const W = this.L(w);
    const H = this.L(h);
    this.ctx.fillStyle = colour;
    for (let j = 0; j < H; j++) {
      for (let i = (j + phase) % 2; i < W; i += 2) this.ctx.fillRect(X0 + i, Y0 + j, 1, 1);
    }
  }

  /** A filled disc, dithered (every other pixel). */
  ditherDisc(x: number, y: number, r: number, colour: string, sy = 1, phase = 0) {
    const R = r / this.p;
    const cx = this.X(x);
    const cy = this.Y(y);
    const ry = Math.max(0.5, R * sy);
    this.ctx.fillStyle = colour;
    for (let dy = -Math.floor(ry); dy <= Math.floor(ry); dy++) {
      const half = Math.floor(R * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      for (let i = -half; i <= half; i++) if ((i + dy + phase) % 2 === 0) this.ctx.fillRect(cx + i, cy + dy, 1, 1);
    }
  }

  /** A raw rectangle in layer pixels, for hand-drawn shapes (the Night Shade grin). */
  raw(X: number, Y: number, W: number, H: number, colour: string) {
    this.ctx.fillStyle = colour;
    this.ctx.fillRect(X, Y, W, H);
  }
}
