// ==========================================
// BLACK HOLE mode visuals: a glowing gas disk in the style of Interstellar's Gargantua and
// NASA's illustrations. Hundreds of gas particles orbit on a tilted disk (inner ones faster),
// drawn as additive streaks from white-hot to deep red, brighter and bluer on the side that
// swings toward you. The disk's far side is lensed into an arch over the hole, with a thin
// second image beneath; a photon ring, a warm haze, blue jets once it's heavy, and flares
// where things cross the horizon. Everything is batched by colour, so it stays fast.
// ==========================================

const INCLINE = 0.2; // how edge-on the disk is seen (0 = edge-on, 1 = face-on)
const TILT = -0.2; // radians the whole disk leans
const INNER = 1.55; // inner edge of the disk, in horizon radii
const SPAN = 4.8; // disk width, in horizon radii

// hottest to coolest; the first is the blue-white of the approaching inner edge
const COLOURS = [
  [205, 225, 255],
  [255, 250, 238],
  [255, 226, 168],
  [255, 184, 102],
  [255, 134, 62],
  [222, 84, 40],
  [150, 46, 26],
];

interface Gas {
  f: number; // 0 inner edge .. 1 outer edge
  a: number; // orbital angle
  speed: number;
  burst: { vx: number; vy: number; x: number; y: number } | null;
}

interface Flare {
  x: number;
  y: number;
  t: number;
  size: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const rgba = ([r, g, b]: number[], a: number) => `rgba(${r},${g},${b},${a})`;

export class Disk {
  private gas: Gas[] = [];
  private flares: Flare[] = [];
  private shock = -1;
  private burstT = -1;
  private time = 0;
  private cos = Math.cos(TILT);
  private sin = Math.sin(TILT);
  /** the lensed streaks from the last drawHalf, waiting to go on over the horizon */
  private pendingLens: { paths: Path2D[]; width: number; front: boolean } | null = null;

  constructor(count: number) {
    for (let i = 0; i < count; i++) {
      this.gas.push({ f: Math.random() ** 1.6, a: rand(0, Math.PI * 2), speed: rand(0.85, 1.15), burst: null });
    }
  }

  /** spin: 1 normally, more during the collapse */
  update(dt: number, spin: number) {
    this.time += dt;
    for (const g of this.gas) {
      if (g.burst) {
        g.burst.x += g.burst.vx * dt;
        g.burst.y += g.burst.vy * dt;
        g.burst.vx *= 1 - dt * 1.2;
        g.burst.vy *= 1 - dt * 1.2;
        continue;
      }
      // Kepler-ish: angular speed falls off as R^-1.5
      g.a += dt * 2.4 * spin * g.speed * (INNER / (INNER + g.f * SPAN)) ** 1.5;
    }
    for (const fl of this.flares) fl.t += dt;
    this.flares = this.flares.filter((fl) => fl.t < 0.55);
    if (this.shock >= 0) this.shock += dt;
    if (this.burstT >= 0) this.burstT += dt;
  }

  /** A blue-white flare where something just crossed the horizon. */
  flare(cx: number, cy: number, r: number, big: boolean) {
    if (this.flares.length > 40) return;
    const a = rand(0, Math.PI);
    const [x, y] = this.project(cx, cy, r * rand(1.1, 1.5), a);
    this.flares.push({ x, y, t: 0, size: r * (big ? rand(0.8, 1.3) : rand(0.25, 0.5)) });
  }

  /** The Big Bang: a shockwave, and the disk's gas blown outward. */
  explode(cx: number, cy: number, r: number) {
    this.shock = 0;
    this.burstT = 0;
    for (const g of this.gas) {
      const [x, y] = this.project(cx, cy, r * (INNER + g.f * SPAN), g.a);
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const v = rand(500, 1600);
      g.burst = { x, y, vx: (dx / d) * v, vy: (dy / d) * v };
    }
  }

  /** A fresh disk for a new hole. */
  reset() {
    this.shock = -1;
    this.burstT = -1;
    for (const g of this.gas) {
      g.burst = null;
      g.a = rand(0, Math.PI * 2);
    }
  }

  private project(cx: number, cy: number, R: number, a: number): [number, number] {
    const px = R * Math.cos(a);
    const py = R * Math.sin(a) * INCLINE;
    return [cx + px * this.cos - py * this.sin, cy + px * this.sin + py * this.cos];
  }

  /** The lensed image: light from the far side, bent up and over (or under) the hole. */
  private lensed(cx: number, cy: number, rho: number, a: number): [number, number] {
    const px = rho * Math.cos(a);
    const py = rho * Math.sin(a);
    return [cx + px * this.cos - py * this.sin, cy + px * this.sin + py * this.cos];
  }

  /** Warm haze around the hole, under everything else. */
  drawHaze(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, heat: number) {
    if (r < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const haze = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 10);
    haze.addColorStop(0, `rgba(255,150,70,${0.2 + heat * 0.15})`);
    haze.addColorStop(0.35, `rgba(200,80,30,${0.08 + heat * 0.06})`);
    haze.addColorStop(1, "rgba(120,30,10,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(cx - r * 10, cy - r * 10, r * 20, r * 20);
    ctx.restore();
  }

  /**
   * The disk's glowing body: a smooth ring of light under the streaks, so it reads as hot gas.
   * The front half is drawn again over the hole, where the disk passes in front of it.
   */
  drawBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, front: boolean, heat: number) {
    if (r < 2 || this.burstT >= 0) return;
    const outer = r * (INNER + SPAN);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, cy);
    ctx.rotate(TILT);
    ctx.scale(1, INCLINE);
    if (front) {
      ctx.beginPath();
      ctx.rect(-outer, 0, outer * 2, outer);
      ctx.clip();
    }
    const body = ctx.createRadialGradient(0, 0, r * 1.2, 0, 0, outer);
    const a = (front ? 0.55 : 0.7) + heat * 0.3;
    body.addColorStop(0, "rgba(255,240,215,0)");
    body.addColorStop(0.04, `rgba(255,236,200,${a})`);
    body.addColorStop(0.18, `rgba(255,180,100,${a * 0.7})`);
    body.addColorStop(0.45, `rgba(230,100,45,${a * 0.35})`);
    body.addColorStop(1, "rgba(140,40,20,0)");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, outer, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** The arch of light bent over the top of the shadow: the far side of the disk, lensed. */
  private drawArch(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, heat: number) {
    const outer = r * 2.9;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, cy);
    ctx.rotate(TILT);
    ctx.beginPath();
    ctx.rect(-outer, -outer, outer * 2, outer);
    ctx.clip();
    const arch = ctx.createRadialGradient(0, 0, r * 1.02, 0, 0, outer);
    const a = 0.6 + heat * 0.3;
    arch.addColorStop(0, `rgba(255,245,228,${a})`);
    arch.addColorStop(0.12, `rgba(255,214,150,${a * 0.75})`);
    arch.addColorStop(0.4, `rgba(240,120,55,${a * 0.3})`);
    arch.addColorStop(1, "rgba(150,45,20,0)");
    ctx.fillStyle = arch;
    ctx.beginPath();
    ctx.arc(0, 0, outer, 0, Math.PI * 2);
    ctx.arc(0, 0, r * 1.02, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();
  }

  /**
   * One half of the disk: the back half (behind the hole) or the front half (over it).
   * Streaks are batched into one path per colour.
   */
  drawHalf(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, front: boolean, heat: number) {
    if (r < 2 || this.burstT >= 0) return;
    const paths = COLOURS.map(() => new Path2D());
    const lensPaths = COLOURS.map(() => new Path2D());
    const tail = 0.18 + heat * 0.1;
    for (const g of this.gas) {
      const inFront = Math.sin(g.a) > 0;
      if (inFront !== front) continue;
      const R = r * (INNER + g.f * SPAN);
      // the side swinging toward the viewer is brighter and bluer
      const doppler = -Math.cos(g.a);
      const hot = (1 - g.f) * 0.75 + doppler * 0.3 + heat * 0.3;
      const bucket = hot > 0.95 ? 0 : Math.max(1, Math.min(COLOURS.length - 1, Math.round((1 - hot) * 6.5)));
      const back = g.a - tail * g.speed * (INNER / (INNER + g.f * SPAN)) ** 1.5 * 6;
      const [x0, y0] = this.project(cx, cy, R, back);
      const [x1, y1] = this.project(cx, cy, R, g.a);
      paths[bucket].moveTo(x0, y0);
      paths[bucket].lineTo(x1, y1);
      if (!front) {
        // the far side lensed into an arch over the top of the hole
        const rho = r * 1.12 + (R - r * INNER) * 0.42;
        const [lx0, ly0] = this.lensed(cx, cy, rho, back);
        const [lx1, ly1] = this.lensed(cx, cy, rho, g.a);
        lensPaths[bucket].moveTo(lx0, ly0);
        lensPaths[bucket].lineTo(lx1, ly1);
      } else if (g.f < 0.35) {
        // and a thin second image hugging the bottom of the shadow
        const rho = r * 1.05 + (R - r * INNER) * 0.06;
        const [lx0, ly0] = this.lensed(cx, cy, rho, back);
        const [lx1, ly1] = this.lensed(cx, cy, rho, g.a);
        lensPaths[bucket].moveTo(lx0, ly0);
        lensPaths[bucket].lineTo(lx1, ly1);
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const width = Math.max(0.8, r * 0.022);
    COLOURS.forEach((c, i) => {
      ctx.strokeStyle = rgba(c, i < 2 ? 0.8 : 0.62 - i * 0.05);
      ctx.lineWidth = width * (i < 3 ? 1.5 : 1);
      ctx.stroke(paths[i]);
    });
    // the lensed light runs over the shadow, so it's drawn by the caller after the horizon
    this.pendingLens = { paths: lensPaths, width, front };
    ctx.restore();
  }

  /** The lensed arches, drawn over the black horizon. */
  drawLens(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, heat: number) {
    const lens = this.pendingLens;
    if (!lens) return;
    this.pendingLens = null;
    if (!lens.front) this.drawArch(ctx, cx, cy, r, heat);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    COLOURS.forEach((c, i) => {
      ctx.strokeStyle = rgba(c, (lens.front ? 0.5 : 0.85) - i * 0.06);
      ctx.lineWidth = lens.width * (lens.front ? 0.8 : 1.4);
      ctx.stroke(lens.paths[i]);
    });
    ctx.restore();
  }

  /** The bright ring of light orbiting just outside the horizon, with a soft bloom. */
  drawPhotonRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, heat: number) {
    if (r < 1) return;
    ctx.save();
    // the bloom only spills outward: the shadow stays pitch black
    ctx.beginPath();
    ctx.rect(cx - r * 4, cy - r * 4, r * 8, r * 8);
    ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    for (const [w, a] of [
      [r * 0.42, 0.06],
      [r * 0.2, 0.14],
      [r * 0.08, 0.45],
      [Math.max(1.6, r * 0.045), 0.95],
    ]) {
      ctx.strokeStyle = `rgba(255,${220 + heat * 30},${180 + heat * 60},${a})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Twisting blue-white jets along the disk's axis, once the hole is heavy. */
  drawJets(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, heat: number) {
    const power = Math.min(1, Math.max(0, (r - 22) / 45)) + heat * 0.6;
    if (power <= 0.02 || this.burstT >= 0) return;
    const ux = Math.sin(-TILT);
    const uy = -Math.cos(TILT);
    const length = r * (6 + 8 * Math.min(1, power));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const dir of [1, -1]) {
      const ax = ux * dir;
      const ay = uy * dir;
      // a bright core fading out along the beam
      const core = ctx.createLinearGradient(cx, cy, cx + ax * length, cy + ay * length);
      core.addColorStop(0, `rgba(240,246,255,${0.5 * power})`);
      core.addColorStop(0.2, `rgba(160,200,255,${0.22 * power})`);
      core.addColorStop(1, "rgba(80,120,255,0)");
      ctx.strokeStyle = core;
      ctx.lineCap = "round";
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.moveTo(cx + ax * r, cy + ay * r);
      ctx.lineTo(cx + ax * length, cy + ay * length);
      ctx.stroke();
      // and plasma strands twisting round it
      ctx.lineWidth = Math.max(0.8, r * 0.018);
      for (let s = 0; s < 6; s++) {
        ctx.strokeStyle = `rgba(175,210,255,${0.22 * power})`;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          const along = r + (length - r) * t;
          const spread = r * (0.12 + t * 0.9);
          const side = Math.sin(t * 9 - this.time * 3 * dir + s * 1.3) * spread;
          const x = cx + ax * along - ay * side;
          const y = cy + ay * along + ax * side;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** Flares, the Big Bang's shockwave and its blown-out gas. */
  drawEffects(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const fl of this.flares) {
      const p = fl.t / 0.55;
      const s = fl.size * (0.6 + p * 0.8);
      const glow = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, s);
      glow.addColorStop(0, `rgba(240,248,255,${0.9 * (1 - p)})`);
      glow.addColorStop(0.4, `rgba(150,190,255,${0.45 * (1 - p)})`);
      glow.addColorStop(1, "rgba(90,130,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(fl.x - s, fl.y - s, s * 2, s * 2);
    }
    if (this.burstT >= 0 && this.burstT < 1.6) {
      const fade = 1 - this.burstT / 1.6;
      // the blown-out gas as glowing sparks, shrinking as they cool
      const paths = COLOURS.map(() => new Path2D());
      const size = 1 + fade * 2;
      for (const g of this.gas) {
        const b = g.burst;
        if (!b) continue;
        const i = Math.min(COLOURS.length - 1, 1 + Math.floor(g.f * 5));
        paths[i].rect(b.x - size / 2, b.y - size / 2, size, size);
      }
      COLOURS.forEach((c, i) => {
        ctx.fillStyle = rgba(c, 0.85 * fade);
        ctx.fill(paths[i]);
      });
    }
    if (this.shock >= 0 && this.shock < 1.4) {
      const p = this.shock / 1.4;
      for (const [k, c] of [
        [1, [255, 245, 230]],
        [0.8, [255, 170, 80]],
        [0.6, [255, 100, 40]],
      ] as [number, number[]][]) {
        ctx.strokeStyle = rgba(c, (1 - p) * 0.6);
        ctx.lineWidth = 2 + (1 - p) * 16 * k;
        ctx.beginPath();
        ctx.arc(cx, cy, p * 2200 * k, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
