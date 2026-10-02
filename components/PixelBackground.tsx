"use client";

import { useEffect, useState } from "react";

export default function PixelBackground() {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let animationFrameId: number;

    const handlePointerMove = (e: PointerEvent) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        setPos({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
        setIsHovered(true);
      });
    };

    const handlePointerLeave = () => {
      setIsHovered(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("mouseleave", handlePointerLeave);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#090714]">
      {/* Zoomable Container: subtle ~1.05x expand towards cursor on hover */}
      <div
        className="absolute inset-[-50px] transition-transform duration-300 ease-out will-change-transform"
        style={{
          transformOrigin: `${pos.x}% ${pos.y}%`,
          transform: isHovered ? "scale(1.05)" : "scale(1.0)",
        }}
      >
        {/* Vibrant Mosaic Color Blooms (Amber-Yellow, Magenta-Rose, Cyan, Purple) */}
        <div className="absolute top-[8%] left-[24%] w-[520px] h-[360px] bg-amber-400/[0.15] blur-[110px] rounded-full" />
        <div className="absolute top-[2%] right-[10%] w-[580px] h-[400px] bg-rose-500/[0.17] blur-[120px] rounded-full" />
        <div className="absolute top-[40%] left-[8%] w-[480px] h-[380px] bg-cyan-400/[0.14] blur-[110px] rounded-full" />
        <div className="absolute top-[60%] right-[12%] w-[620px] h-[500px] bg-purple-600/[0.18] blur-[130px] rounded-full" />
        <div className="absolute bottom-[4%] left-[18%] w-[500px] h-[360px] bg-fuchsia-600/[0.13] blur-[120px] rounded-full" />

        {/* Chunky Circular Mosaic LED Beads matching reference image */}
        <div className="absolute inset-0 bg-mosaic-beads opacity-90" />
        <div className="absolute inset-0 bg-mosaic-gutters opacity-60" />
      </div>

      {/* Interactive Cursor Spotlight that illuminates the beads */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 360px at ${pos.x}% ${pos.y}%, rgba(244, 114, 182, 0.15), transparent 75%)`,
        }}
      />
    </div>
  );
}
