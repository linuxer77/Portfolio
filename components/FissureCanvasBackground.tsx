"use client";

import { useEffect, useRef } from "react";

interface FissureCanvasBackgroundProps {
  isActive: boolean;
}

export default function FissureCanvasBackground({
  isActive,
}: FissureCanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Load authentic stone background texture
    const bgImg = new Image();
    bgImg.src = "/backgrounds/fissure.webp";
    let imgLoaded = false;
    bgImg.onload = () => {
      imgLoaded = true;
    };

    let W = 0,
      H = 0;
    const mouse = { x: -9999, y: -9999 };

    // Geometric laser fissure nodes [xRatio, yRatio]
    const NODES: [number, number][] = [
      [0.38, 0.0],   // 0: top start
      [0.62, 0.22],  // 1: upper bend
      [0.24, 0.34],  // 2: sharp left cut
      [0.60, 0.38],  // 3: center cross junction
      [0.82, 0.45],  // 4: right angle
      [0.55, 0.68],  // 5: mid cyan junction
      [0.22, 0.79],  // 6: lower left violet
      [0.60, 1.0],   // 7: bottom exit
      // Branch nodes
      [0.0, 0.42],   // 8: far left red
      [0.92, 0.12],  // 9: far right red
      [0.98, 0.62],  // 10: right cyan branch
      [0.0, 0.86],   // 11: left magenta branch
      [0.38, 1.0],   // 12: bottom violet split
    ];

    const SEGMENTS: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      // Branches
      [2, 8],
      [1, 9],
      [5, 10],
      [6, 11],
      [6, 12],
    ];

    // Color ramp from top to bottom
    function getColorForY(yRatio: number): { r: number; g: number; b: number; hex: string } {
      if (yRatio < 0.2) return { r: 255, g: 30, b: 50, hex: "#ff1e32" }; // Red
      if (yRatio < 0.36) return { r: 255, g: 110, b: 20, hex: "#ff6e14" }; // Orange
      if (yRatio < 0.5) return { r: 255, g: 220, b: 30, hex: "#ffdc1e" }; // Yellow
      if (yRatio < 0.66) return { r: 50, g: 255, b: 100, hex: "#32ff64" }; // Green
      if (yRatio < 0.82) return { r: 0, g: 240, b: 255, hex: "#00f0ff" }; // Cyan
      return { r: 190, g: 40, b: 255, hex: "#be28ff" }; // Violet/Magenta
    }

    // Floating electric spark particles
    const sparks = Array.from({ length: 24 }, (_, i) => ({
      segIndex: i % SEGMENTS.length,
      progress: Math.random(),
      speed: 0.002 + Math.random() * 0.004,
      size: 1.5 + Math.random() * 2,
      driftX: (Math.random() - 0.5) * 6,
      driftY: (Math.random() - 0.5) * 6,
    }));

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(t: number) {
      if (!ctx) return;

      // 1. Draw base obsidian rock background
      ctx.fillStyle = "#030205";
      ctx.fillRect(0, 0, W, H);

      if (imgLoaded && bgImg.width) {
        ctx.globalAlpha = 0.55;
        // Cover-fit image
        const imgAspect = bgImg.width / bgImg.height;
        const canvasAspect = W / H;
        let dw = W,
          dh = H,
          dx = 0,
          dy = 0;
        if (canvasAspect > imgAspect) {
          dh = W / imgAspect;
          dy = (H - dh) / 2;
        } else {
          dw = H * imgAspect;
          dx = (W - dw) / 2;
        }
        ctx.drawImage(bgImg, dx, dy, dw, dh);
        ctx.globalAlpha = 1.0;
      }

      // 2. Draw glowing laser crack segments
      SEGMENTS.forEach(([startIdx, endIdx], sIdx) => {
        const [x1R, y1R] = NODES[startIdx];
        const [x2R, y2R] = NODES[endIdx];
        const x1 = x1R * W,
          y1 = y1R * H;
        const x2 = x2R * W,
          y2 = y2R * H;
        const midY = (y1R + y2R) / 2;
        const col = getColorForY(midY);

        // Distance from mouse to segment for interactive glow flare
        const dx = (x1 + x2) / 2 - mouse.x;
        const dy = (y1 + y2) / 2 - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const mouseFlare = Math.max(0, 1 - dist / 220);

        // Ambient breathing pulse
        const pulse = 0.8 + 0.2 * Math.sin(t * 2 + sIdx * 0.8) + mouseFlare * 0.6;

        // A. Wide diffuse neon glow
        ctx.lineWidth = 14 * pulse;
        ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${0.18 * pulse})`;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // B. Mid-intensity aura
        ctx.lineWidth = 6 * pulse;
        ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${0.45 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // C. Sharp laser core
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = col.hex;
        ctx.shadowBlur = 14 * pulse;
        ctx.shadowColor = col.hex;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // D. Ultra-bright hot center line
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // 3. Draw energy pulses travelling through fissures
      const pulseT = (t * 0.45) % 1;
      SEGMENTS.forEach(([startIdx, endIdx], i) => {
        const [x1R, y1R] = NODES[startIdx];
        const [x2R, y2R] = NODES[endIdx];
        const p = (pulseT + i * 0.15) % 1;
        const px = (x1R + (x2R - x1R) * p) * W;
        const py = (y1R + (y2R - y1R) * p) * H;
        const col = getColorForY(y1R + (y2R - y1R) * p);

        const grad = ctx.createRadialGradient(px, py, 0, px, py, 18);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        grad.addColorStop(0.3, `rgba(${col.r}, ${col.g}, ${col.b}, 0.8)`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, 18, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Draw drifting spark particles
      sparks.forEach((s) => {
        s.progress = (s.progress + s.speed) % 1;
        const [startIdx, endIdx] = SEGMENTS[s.segIndex];
        const [x1R, y1R] = NODES[startIdx];
        const [x2R, y2R] = NODES[endIdx];
        const curY = y1R + (y2R - y1R) * s.progress;
        const px = (x1R + (x2R - x1R) * s.progress) * W + s.driftX;
        const py = curY * H + s.driftY;
        const col = getColorForY(curY);

        ctx.fillStyle = col.hex;
        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
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
            "radial-gradient(ellipse 85% 75% at 50% 45%, rgba(3,2,6,0.48) 0%, rgba(3,2,6,0.78) 55%, rgba(3,2,6,0.94) 100%)",
        }}
      />
    </div>
  );
}
