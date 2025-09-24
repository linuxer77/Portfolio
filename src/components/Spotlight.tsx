"use client";
import { useEffect, useRef } from "react";

export default function Spotlight({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onMove(e: MouseEvent) {
      const host = ref.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      host.style.setProperty("--mx", `${x}px`);
      host.style.setProperty("--my", `${y}px`);
    }
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);
  return (
    <div
      ref={ref}
      className={`pointer-events-none absolute inset-0 -z-10 ${className}`}
    />
  );
}
