"use client";

import { useEffect, useRef } from "react";
import { ThemeConfig } from "@/lib/themes";

interface LedCanvasBackgroundProps {
  theme: ThemeConfig;
}

export default function LedCanvasBackground({ theme }: LedCanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const SPEED = 0.35;
    const CELL_DESKTOP = 20;
    const CELL_MOBILE = 16;
    const LEVELS = 5;
    const HUE_STEPS = 16;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const smooth = (a: number, b: number, v: number) => {
      const t = clamp((v - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    };

    function paletteAt(h: number, pal: [number, number, number][]) {
      const p = clamp(h, 0, 0.9999) * (pal.length - 1);
      const i = Math.floor(p);
      const f = p - i;
      const a = pal[i];
      const b = pal[i + 1];
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
    }

    // Pre-bake palette RGB strings to completely eliminate GC and string allocations
    let cachedThemeId = "";
    let colorTable: string[][] = [];
    let bgStyle = "";

    function updateColorTable(currentTheme: ThemeConfig) {
      if (cachedThemeId === currentTheme.id && colorTable.length > 0) return;
      cachedThemeId = currentTheme.id;
      const BG = currentTheme.bgRGB;
      const PAL = currentTheme.palette;
      bgStyle = `rgb(${BG[0]},${BG[1]},${BG[2]})`;

      const baked = Array.from({ length: HUE_STEPS }, (_, i) =>
        paletteAt(i / (HUE_STEPS - 1), PAL)
      );

      colorTable = [];
      for (let lvlIdx = 0; lvlIdx < LEVELS; lvlIdx++) {
        const lvl = lvlIdx / (LEVELS - 1);
        const k = 0.1 + 0.9 * lvl;
        colorTable[lvlIdx] = [];
        for (let hIdx = 0; hIdx < HUE_STEPS; hIdx++) {
          const c = baked[hIdx];
          const r = Math.round(BG[0] + (c[0] - BG[0]) * k);
          const g = Math.round(BG[1] + (c[1] - BG[1]) * k);
          const b = Math.round(BG[2] + (c[2] - BG[2]) * k);
          colorTable[lvlIdx][hIdx] = `rgb(${r},${g},${b})`;
        }
      }
    }

    let W = 0,
      H = 0,
      cell = CELL_DESKTOP,
      cols = 0,
      rows = 0,
      aspect = 1;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = W < 700 ? CELL_MOBILE : CELL_DESKTOP;
      cols = Math.ceil(W / cell) + 1;
      rows = Math.ceil(H / cell) + 1;
      aspect = W / H;
      if (reduceMotion) draw(8);
    }

    function draw(time: number) {
      if (!ctx) return;
      const currentTheme = themeRef.current;
      updateColorTable(currentTheme);

      const t = time * SPEED;
      ctx.fillStyle = bgStyle;
      ctx.fillRect(0, 0, W, H);

      const maxR = cell * 0.43;
      const mr = 160;
      const mrSq = mr * mr;

      for (let j = 0; j < rows; j++) {
        const y = j * cell + cell / 2;
        const ny = y / H;
        const dy = y - mouse.y;
        const dySq = dy * dy;

        // Precompute row-invariant sine terms
        const nyTerm = 0.35 * Math.sin(ny * 5 + t * 0.6) + 0.2 * Math.sin(ny * 11 - t * 0.4);
        const nyWarmth = 0.5 * (1 - ny);

        for (let i = 0; i < cols; i++) {
          const x = i * cell + cell / 2;
          const nx = (x / W) * aspect;
          const wx = nx + nyTerm;
          const wy = ny + 0.25 * Math.sin(nx * 4 + t * 0.5);

          const a =
            (Math.sin(wx * 5 + Math.sin(wy * 3 + t * 0.3) * 1.5) +
              Math.sin(wy * 4 + wx * 2 - t * 0.2) * 0.6 +
              Math.sin(wx * 9 - wy * 6 + t * 0.35) * 0.3) /
            1.9;

          let h = 0.5 + 0.5 * Math.sin(wy * 3.2 + wx * 1.5 + t * 0.15);
          h = clamp(nyWarmth + 0.5 * h + 0.08 * Math.sin(wx * 7), 0, 1);

          let m = smooth(-0.15, 0.4, a);
          const dx = x - mouse.x;
          const d2 = dx * dx + dySq;
          if (d2 < mrSq) m = Math.min(1, m + (1 - Math.sqrt(d2) / mr) * 0.75);

          const lvlIdx = clamp(Math.round(m * (LEVELS - 1)), 0, LEVELS - 1);
          const hIdx = clamp(Math.round(h * (HUE_STEPS - 1)), 0, HUE_STEPS - 1);
          const lvl = lvlIdx / (LEVELS - 1);

          ctx.fillStyle = colorTable[lvlIdx][hIdx];
          ctx.beginPath();
          ctx.arc(x, y, maxR * (0.72 + 0.28 * lvl), 0, 6.2832);
          ctx.fill();

          if (lvlIdx === LEVELS - 1) {
            ctx.fillStyle = "rgba(255,255,255,.28)";
            ctx.beginPath();
            ctx.arc(x - maxR * 0.28, y - maxR * 0.28, maxR * 0.28, 0, 6.2832);
            ctx.fill();
          }
        }
      }
    }

    let animId: number;
    let last = 0;
    let isScrolling = false;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      isScrolling = true;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 150);
    };

    function loop(now: number) {
      // Throttle during active fast scrolling to prioritize smooth 60fps page scroll
      const minInterval = isScrolling ? 66 : 35;
      if (now - last > minInterval) {
        draw(now / 1000 + 8);
        last = now;
      }
      animId = requestAnimationFrame(loop);
    }

    const handlePointerMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handlePointerLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    resize();
    if (!reduceMotion) {
      animId = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mouseleave", handlePointerLeave);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="w-full h-full block transform-gpu" />
      {/* Balanced shadow vignette: keeps center vibrant for glass refraction while fading edges gracefully */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 45%, rgba(6,3,14,0.08) 0%, rgba(6,3,14,0.38) 65%, rgba(6,3,14,0.85) 100%)",
        }}
      />
    </div>
  );
}
