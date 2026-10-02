"use client";

import { useEffect, useRef } from "react";

interface EmberCanvasBackgroundProps {
  isActive: boolean;
}

export default function EmberCanvasBackground({
  isActive,
}: EmberCanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const SPEED = 0.28;
    const CELL_DESKTOP = 16;
    const CELL_MOBILE = 13;

    // Palette runs from twilight navy → sunset crimson → warm amber → bright gold → incandescent white
    const PALETTE = [
      [14, 18, 54],   // 0: twilight navy
      [32, 28, 78],   // 1: dusk indigo
      [180, 32, 42],  // 2: sunset crimson
      [235, 78, 22],  // 3: burning orange
      [248, 155, 18], // 4: warm amber
      [255, 210, 35], // 5: radiant gold
      [255, 245, 170],// 6: sunlit highlight
    ];

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

    function paletteAt(h: number) {
      const p = clamp(h, 0, 0.9999) * (PALETTE.length - 1);
      const i = Math.floor(p);
      const f = p - i;
      const a = PALETTE[i];
      const b = PALETTE[i + 1];
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
    }

    // Floating embers rising from sunset horizon
    const embers = Array.from({ length: 35 }, () => ({
      x: Math.random(),
      y: 0.6 + Math.random() * 0.4,
      sp: 0.001 + Math.random() * 0.002,
      size: 1.5 + Math.random() * 2.5,
      wobble: Math.random() * 6.28,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      alpha: 0.4 + Math.random() * 0.6,
    }));

    let W = 0,
      H = 0,
      cell = CELL_DESKTOP,
      cols = 0,
      rows = 0;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = W < 700 ? CELL_MOBILE : CELL_DESKTOP;
      cols = Math.ceil(W / cell) + 1;
      rows = Math.ceil(H / cell) + 1;
    }

    // Procedural density function modeling the towering sunset cloud formation
    function sampleCloud(nx: number, ny: number, t: number): number {
      // Center of cloud is horizontally around 0.45, vertically from 0.1 to 0.75
      const cx = 0.48 + 0.04 * Math.sin(t * 0.2);
      const cy = 0.38;
      const dx = (nx - cx) * 1.5;
      const dy = (ny - cy) * 1.1;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Cloud density core
      const core = Math.max(0, 1 - dist * 1.4);

      // Organic fluid turbulence
      const noise =
        0.3 * Math.sin(nx * 7 + t * 0.4 + Math.sin(ny * 6)) +
        0.2 * Math.sin(ny * 9 - t * 0.3) +
        0.15 * Math.sin(nx * 14 + ny * 12 + t * 0.5);

      // Sunset horizon glow at bottom (ny > 0.7)
      const horizonGlow = Math.max(0, (ny - 0.65) * 2.5);

      return clamp(core * 1.2 + noise * 0.4 + horizonGlow * 0.7, 0, 1);
    }

    function draw(time: number) {
      if (!ctx) return;
      const t = time * SPEED;

      // 1. Twilight background
      ctx.fillStyle = "#050614";
      ctx.fillRect(0, 0, W, H);

      const maxR = cell * 0.43;
      const mr = 180;

      // 2. Draw pixel mosaic cells
      for (let j = 0; j < rows; j++) {
        const y = j * cell + cell / 2;
        const ny = y / H;

        // Skip very bottom strip for silhouette horizon
        if (ny > 0.95) continue;

        for (let i = 0; i < cols; i++) {
          const x = i * cell + cell / 2;
          const nx = x / W;

          let val = sampleCloud(nx, ny, t);

          // Mouse illumination
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < mr * mr) {
            val = Math.min(1, val + (1 - Math.sqrt(d2) / mr) * 0.45);
          }

          // Quantise into distinct mosaic steps
          const steps = 6;
          const qVal = Math.round(val * steps) / steps;
          if (qVal < 0.12) continue; // transparent twilight sky

          const c = paletteAt(qVal);
          const r = c[0] | 0;
          const g = c[1] | 0;
          const b = c[2] | 0;

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.beginPath();
          ctx.arc(x, y, maxR * (0.65 + 0.35 * qVal), 0, Math.PI * 2);
          ctx.fill();

          // Specular glint on peak golden clouds
          if (qVal > 0.82) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.beginPath();
            ctx.arc(x - maxR * 0.28, y - maxR * 0.28, maxR * 0.25, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. Draw horizon tree / grass silhouette at bottom
      const horizonY = H * 0.92;
      ctx.fillStyle = "#0a1208";
      ctx.fillRect(0, horizonY, W, H - horizonY);

      // 4. Draw floating glowing sunset embers rising upward
      embers.forEach((emb) => {
        emb.y -= emb.sp;
        emb.wobble += emb.wobbleSpeed;
        if (emb.y < 0.15) {
          emb.y = 0.95;
          emb.x = Math.random();
        }

        const px = (emb.x + Math.sin(emb.wobble) * 0.02) * W;
        const py = emb.y * H;

        ctx.fillStyle = `rgba(255, 185, 30, ${emb.alpha * Math.min(1, (emb.y - 0.15) * 3)})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#ffaa00";
        ctx.beginPath();
        ctx.arc(px, py, emb.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }

    let animId: number;
    let last = 0;
    function loop(now: number) {
      if (now - last > 33) {
        draw(now / 1000);
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
    document.addEventListener("mouseleave", handlePointerLeave);

    resize();
    if (!reduceMotion) {
      animId = requestAnimationFrame(loop);
    } else {
      draw(0);
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      cancelAnimationFrame(animId);
    };
  }, [isActive]);

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
        isActive ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Balanced shadow vignette for clean text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 85% 75% at 50% 45%, rgba(6,4,10,0.48) 0%, rgba(6,4,10,0.78) 55%, rgba(6,4,10,0.94) 100%)",
        }}
      />
    </div>
  );
}
