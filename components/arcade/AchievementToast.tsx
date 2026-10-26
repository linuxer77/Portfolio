"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GAMES, UNLOCK_EVENT, type Achievement } from "@/lib/arcade";

// ==========================================
// Achievement toasts: a small card slides in at the top when one is unlocked, with a chime.
// Listens for the arcade's unlock event, so any game can unlock without importing this.
// ==========================================

function chime() {
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = new AC();
    const t = ctx.currentTime;
    [784, 988, 1319].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.08, t + i * 0.09 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.45);
      osc.connect(g).connect(ctx.destination);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.45);
    });
    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    // no audio: the toast still shows
  }
}

export default function AchievementToast() {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onUnlock = (e: Event) => {
      const a = (e as CustomEvent<Achievement>).detail;
      setQueue((q) => [...q, a]);
      chime();
    };
    window.addEventListener(UNLOCK_EVENT, onUnlock);
    return () => window.removeEventListener(UNLOCK_EVENT, onUnlock);
  }, []);

  // one at a time, each for a few seconds
  useEffect(() => {
    if (!queue.length) return;
    const t = window.setTimeout(() => setQueue((q) => q.slice(1)), 3600);
    return () => window.clearTimeout(t);
  }, [queue]);

  if (!mounted || !queue.length) return null;
  const a = queue[0];
  const game = GAMES.find((g) => g.id === a.game);

  return createPortal(
    <div
      key={a.id}
      data-arcade
      role="status"
      className="pointer-events-none fixed left-1/2 top-20 z-[60] -translate-x-1/2 animate-[toast-in_0.35s_ease-out] font-mono"
    >
      <div className="flex items-center gap-3 border border-dotted border-yellow-400/70 bg-black/95 px-4 py-2.5">
        <span className="text-xl text-yellow-300">★</span>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-yellow-300">
            Achievement unlocked{game ? ` · ${game.title}` : ""}
          </div>
          <div className="text-sm font-bold text-white">{a.title}</div>
          <div className="text-[11px] text-zinc-400">{a.detail}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
