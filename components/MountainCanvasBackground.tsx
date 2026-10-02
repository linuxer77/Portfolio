"use client";

import { useEffect, useRef } from "react";

interface MountainCanvasBackgroundProps {
  isActive: boolean;
}

export default function MountainCanvasBackground({
  isActive,
}: MountainCanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const DRIFT = 0.004;
    const PARALLAX = 1;
    const BIRDS = 8;
    const STRIPES = [
      "#4a6cf0",
      "#6a58ee",
      "#a55cf0",
      "#ff4fc0",
      "#ff6aa0",
      "#ff9a7a",
      "#ffc46a",
      "#ffe36a",
    ];

    let W = 0,
      H = 0,
      pines: Array<{ x: number; h: number; w: number }> = [],
      birds: Array<{
        x: number;
        y: number;
        sp: number;
        s: number;
        ph: number;
        c: string;
      }> = [];

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    const rng = (s: number) => () => (s = (s * 16807) % 2147483647, (s - 1) / 2147483646);

    function makeRidge(seed: number) {
      const r = rng(seed),
        f: number[] = [],
        p: number[] = [],
        a: number[] = [];
      for (let k = 0; k < 5; k++) {
        f.push(1.2 * Math.pow(1.95, k) * (0.85 + r() * 0.3));
        p.push(r() * 6.283);
        a.push(Math.pow(0.5, k));
      }
      const tot = a.reduce((s, v) => s + v, 0);
      return (x: number) => {
        let s = 0;
        for (let k = 0; k < 5; k++) s += a[k] * (1 - Math.abs(Math.sin(x * f[k] + p[k])));
        return s / tot;
      };
    }

    const R_PINK = makeRidge(11),
      R_MID = makeRidge(23),
      R_FAR = makeRidge(37),
      R_NEAR = makeRidge(51);

    // Fog sprite
    let fog: HTMLCanvasElement | null = null;
    if (typeof document !== "undefined") {
      fog = document.createElement("canvas");
      fog.width = fog.height = 256;
      const g = fog.getContext("2d");
      if (g) {
        const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        gr.addColorStop(0, "rgba(255,255,255,.9)");
        gr.addColorStop(0.5, "rgba(255,255,255,.35)");
        gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, 256, 256);
      }
    }

    const fogA = Array.from({ length: 5 }, (_, i) => ({
      x: i * 0.4,
      y: 0.86,
      s: 0.8 + (i % 3) * 0.25,
      sp: 0.006 + i * 0.002,
      a: 0.5,
    }));
    const fogB = Array.from({ length: 6 }, (_, i) => ({
      x: i * 0.33 + 0.1,
      y: 0.98,
      s: 1 + (i % 3) * 0.3,
      sp: 0.01 + i * 0.002,
      a: 0.75,
    }));

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const r = rng(7);
      pines = [];
      const n = Math.ceil(W / 13);
      for (let i = 0; i < n; i++) {
        pines.push({
          x: (i / n) * W + r() * 10,
          h: H * (0.035 + r() * 0.05),
          w: 9 + r() * 8,
        });
      }
      birds = Array.from({ length: BIRDS }, () => ({
        x: r() * 1.4,
        y: 0.12 + r() * 0.5,
        sp: 0.012 + r() * 0.02,
        s: 4 + r() * 5,
        ph: r() * 6.28,
        c: r() > 0.5 ? "#ff9a5a" : "#ff5fa8",
      }));
      if (reduceMotion) draw(8);
    }

    function ridge(
      fn: (x: number) => number,
      base: number,
      amp: number,
      off: number,
      top: string,
      bot: string,
      rim: string
    ) {
      if (!ctx) return;
      const step = 6,
        pts: [number, number][] = [];
      for (let x = 0; x <= W + step; x += step) {
        pts.push([x, base * H - amp * H * fn((x / W + off) * 6.283)]);
      }
      const g = ctx.createLinearGradient(0, (base - amp) * H, 0, base * H);
      g.addColorStop(0, top);
      g.addColorStop(1, bot);
      const fill = new Path2D(),
        line = new Path2D();
      fill.moveTo(0, H);
      line.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(([x, y]) => {
        fill.lineTo(x, y);
        line.lineTo(x, y);
      });
      fill.lineTo(W + step, H);
      fill.closePath();
      ctx.fillStyle = g;
      ctx.fill(fill);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 2;
      ctx.stroke(line);
    }

    function stripes(t: number) {
      if (!ctx) return;
      const sh = H * 0.034,
        T = sh * STRIPES.length,
        L = Math.hypot(W, H);
      ctx.save();
      ctx.translate(W * 0.5, H * 0.62 + Math.sin(t * 0.25) * H * 0.03);
      ctx.rotate(-0.4);
      STRIPES.forEach((c, i) => {
        if (!ctx) return;
        ctx.globalAlpha = 0.86 + 0.14 * Math.sin(t * 0.8 + i * 0.7);
        ctx.fillStyle = c;
        ctx.fillRect(-L, -T / 2 + i * sh, 2 * L, sh + 1);
      });
      ctx.restore();
    }

    function drawFog(
      list: Array<{ x: number; y: number; s: number; sp: number; a: number }>,
      t: number
    ) {
      if (!ctx || !fog) return;
      list.forEach((f) => {
        if (!ctx || !fog) return;
        const x = (((f.x + t * f.sp) % 2) - 0.5) * W,
          w = W * 0.75 * f.s,
          h = w * 0.3;
        ctx.globalAlpha = f.a;
        ctx.drawImage(fog, x - w / 2, f.y * H - h / 2, w, h);
      });
      ctx.globalAlpha = 1;
    }

    function drawPines() {
      if (!ctx) return;
      ctx.fillStyle = "#13113a";
      pines.forEach((p) => {
        if (!ctx) return;
        const by = H + 4;
        for (let k = 0; k < 3; k++) {
          const w = p.w * (1 - k * 0.28),
            top = by - p.h * (0.5 + k * 0.28),
            bot = by - p.h * (k * 0.28) * 0.5 - p.h * 0.1 * (k === 0 ? 0 : 1);
          ctx.beginPath();
          ctx.moveTo(p.x, top - p.h * 0.45);
          ctx.lineTo(p.x + w, top + p.h * 0.25);
          ctx.lineTo(p.x - w, top + p.h * 0.25);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillRect(p.x - 1, by - p.h * 0.3, 2, p.h * 0.3);
      });
    }

    function drawBirds(t: number) {
      if (!ctx) return;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      birds.forEach((b) => {
        if (!ctx) return;
        const x = (((b.x + t * b.sp) % 1.4) - 0.2) * W;
        const y = b.y * H + Math.sin(t * 0.7 + b.ph) * 12 - mouse.y * 14;
        const flap = Math.sin(t * 7 + b.ph) * b.s * 0.7;
        ctx.strokeStyle = b.c;
        ctx.beginPath();
        ctx.moveTo(x - b.s, y - flap);
        ctx.lineTo(x, y);
        ctx.lineTo(x + b.s, y - flap);
        ctx.stroke();
      });
    }

    function draw(t: number) {
      if (!ctx) return;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      const mx = mouse.x * 0.05 * PARALLAX;

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#fbe4f4");
      sky.addColorStop(0.28, "#f2a9dc");
      sky.addColorStop(0.5, "#9a5be8");
      sky.addColorStop(0.75, "#4a3fc4");
      sky.addColorStop(1, "#1a1760");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Glowing haze behind peaks
      const gx = W * 0.6,
        gy = H * 0.26;
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, H * 0.55);
      glow.addColorStop(0, `rgba(255,240,250,${0.55 + 0.1 * Math.sin(t * 0.6)})`);
      glow.addColorStop(1, "rgba(255,240,250,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      ridge(
        R_PINK,
        0.62,
        0.5,
        t * DRIFT * 0.6 + mx * 0.6,
        "#ff4f9f",
        "#7b3fd6",
        "rgba(255,200,230,.9)"
      );
      ridge(
        R_MID,
        0.76,
        0.3,
        t * DRIFT * 0.9 + mx * 1.0,
        "#9a52e6",
        "#3f35b8",
        "rgba(255,170,235,.55)"
      );

      stripes(t);

      ridge(
        R_FAR,
        0.92,
        0.32,
        t * DRIFT * 1.2 + mx * 1.6,
        "#6b6fe0",
        "#3a3fa8",
        "rgba(210,214,255,.8)"
      );
      drawFog(fogA, t);
      ridge(
        R_NEAR,
        1.03,
        0.28,
        t * DRIFT * 1.6 + mx * 2.4,
        "#4c52c4",
        "#1e1f6e",
        "rgba(160,168,255,.8)"
      );
      drawPines();
      drawFog(fogB, t);
      drawBirds(t);
    }

    let animId: number;
    function loop(now: number) {
      draw(now / 1000 + 8);
      animId = requestAnimationFrame(loop);
    }

    const handlePointerMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / window.innerWidth - 0.5;
      mouse.ty = e.clientY / window.innerHeight - 0.5;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    resize();
    if (!reduceMotion) {
      animId = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(animId);
    };
  }, [isActive]);

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
        isActive ? "opacity-65" : "opacity-0 pointer-events-none"
      }`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Deep shadows and vignette overlay ensuring high contrast on text */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 45%, rgba(5,2,14,0.45) 0%, rgba(5,2,14,0.85) 65%, #05020e 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(5,2,14,0.5) 0%, transparent 25%, rgba(5,2,14,0.75) 80%, #05020e 100%)",
        }}
      />
    </div>
  );
}
