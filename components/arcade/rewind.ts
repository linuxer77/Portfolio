import type { Box } from "../doom/page";

// ==========================================
// The rewind every page-wrecking mode plays on the way out: each piece that was knocked,
// burnt or bitten off the page flies home along a toss (up and over, no trails), staggered
// so the page knits itself back together over about a second and a half.
// ==========================================

/** A piece of the page: how it looked there, where it belongs, where it is now. */
export interface Stray {
  img: CanvasImageSource;
  home: Box;
  x: number;
  y: number;
  rot: number;
}

interface Flight {
  img: CanvasImageSource;
  w: number;
  h: number;
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  hx: number;
  hy: number;
  rot: number;
  delay: number;
  dur: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Rewind {
  private flights: Flight[] = [];
  private t = -1;
  private end = 0;
  private done: (() => void) | null = null;

  get active() {
    return this.t >= 0;
  }

  /** 0 → 1 over the rewind, for fading out the things that don't fly (frost, blood, dents). */
  get fade() {
    return this.t < 0 ? 1 : Math.max(0, 1 - this.t / (this.end * 0.7));
  }

  /** Starts the flights home; calls done when every piece has landed (right away if none). */
  start(strays: Stray[], done: () => void) {
    this.flights = strays.map((s) => {
      const hx = s.home.x + s.home.w / 2;
      const hy = s.home.y + s.home.h / 2;
      const d = Math.hypot(hx - s.x, hy - s.y);
      return {
        img: s.img,
        w: s.home.w,
        h: s.home.h,
        fx: s.x,
        fy: s.y,
        // a toss: up and over, higher for longer flights
        cx: (s.x + hx) / 2 + rand(-0.15, 0.15) * d,
        cy: Math.min(s.y, hy) - Math.min(260, 40 + d * 0.35),
        hx,
        hy,
        rot: s.rot,
        delay: rand(0, 0.4),
        dur: rand(0.7, 1.05),
      };
    });
    this.end = this.flights.reduce((m, f) => Math.max(m, f.delay + f.dur), 0.6) + 0.15;
    this.t = 0;
    this.done = done;
  }

  /** Returns true on the frame the rewind finishes. */
  update(dt: number) {
    if (this.t < 0) return false;
    this.t += dt;
    if (this.t < this.end) return false;
    this.t = -1;
    this.flights = [];
    const done = this.done;
    this.done = null;
    done?.();
    return true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.t < 0) return;
    for (const f of this.flights) {
      const p = Math.max(0, Math.min(1, (this.t - f.delay) / f.dur));
      const e = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
      const x = (1 - e) ** 2 * f.fx + 2 * (1 - e) * e * f.cx + e * e * f.hx;
      const y = (1 - e) ** 2 * f.fy + 2 * (1 - e) * e * f.cy + e * e * f.hy;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(f.rot * (1 - e));
      ctx.drawImage(f.img, -f.w / 2, -f.h / 2, f.w, f.h);
      ctx.restore();
    }
  }
}
