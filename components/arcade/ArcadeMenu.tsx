"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ACHIEVEMENTS, GAMES, records, unlocked, type ArcadeGame } from "@/lib/arcade";
import { makePreviews } from "./previews";

// ==========================================
// The arcade: a card for every page-wrecking mode with a live looping preview, your record,
// and its achievements, plus the full achievement list. Opened with `arcade` in the terminal
// or the arcade button; a card (or its number key) launches that game.
// ==========================================

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function ArcadeMenu({ onLaunch, onClose }: { onLaunch: (g: ArcadeGame) => void; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const previews = useMemo(() => (typeof window === "undefined" ? null : makePreviews()), []);
  const [saved] = useState(() => ({ records: records(), unlocked: unlocked() }));

  useEffect(() => setMounted(true), []);

  // one loop draws every card's preview
  useEffect(() => {
    if (!mounted || !previews) return;
    const font =
      getComputedStyle(document.querySelector("[data-page-root]") ?? document.body).fontFamily || "monospace";
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      const dpr = window.devicePixelRatio || 1;
      GAMES.forEach((g, i) => {
        const c = canvases.current[i];
        if (!c) return;
        const w = c.clientWidth;
        const h = c.clientHeight;
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
          c.width = Math.round(w * dpr);
          c.height = Math.round(h * dpr);
        }
        const ctx = c.getContext("2d")!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        previews[g.id].draw(ctx, dt, w, h, font);
        ctx.restore();
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mounted, previews]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      const n = Number(/^Digit([1-9])$/.exec(e.code)?.[1]);
      if (n && GAMES[n - 1]) {
        e.preventDefault();
        onLaunch(GAMES[n - 1].id);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [onClose, onLaunch]);

  if (!mounted) return null;

  const total = ACHIEVEMENTS.length;
  const got = ACHIEVEMENTS.filter((a) => saved.unlocked.has(a.id)).length;

  return createPortal(
    <div data-arcade data-menu className="fixed inset-0 z-[49] overflow-y-auto bg-black font-mono">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">ARCADE</h2>
            <p className="mt-1 text-xs text-zinc-400">
              {GAMES.length} ways to wreck this portfolio. Everything goes back when you leave.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 border border-dotted border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-400 transition-colors hover:text-white"
          >
            Close [Esc]
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g, i) => {
            const best = saved.records[g.id];
            const mine = ACHIEVEMENTS.filter((a) => a.game === g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onLaunch(g.id)}
                className="group flex flex-col border border-dotted border-zinc-700 bg-black text-left transition-colors hover:border-zinc-300 focus:border-white focus:outline-none"
              >
                <canvas
                  ref={(el) => {
                    canvases.current[i] = el;
                  }}
                  className="aspect-video w-full border-b border-dotted border-zinc-800"
                />
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold uppercase tracking-wider text-white">{g.title}</span>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">{g.players}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400">{g.pitch}</p>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-1 text-[10px] uppercase tracking-wider">
                    <span className="text-zinc-500">
                      {best !== undefined ? (
                        <>
                          {g.record.label}{" "}
                          <span className="text-white">{g.record.time ? formatTime(best) : best.toLocaleString()}</span>
                        </>
                      ) : (
                        "not played yet"
                      )}
                    </span>
                    <span title={mine.map((a) => `${saved.unlocked.has(a.id) ? "★" : "☆"} ${a.title}`).join("\n")}>
                      {mine.map((a) => (
                        <span key={a.id} className={saved.unlocked.has(a.id) ? "text-yellow-300" : "text-zinc-700"}>
                          ★
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-600">
                    <code className="group-hover:text-cyan-300">&gt; {g.command}</code>
                    <span>[{i + 1}]</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-10">
          <div className="mb-3 flex items-baseline justify-between border-b border-dotted border-zinc-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Achievements</h3>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              {got} / {total} unlocked
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ACHIEVEMENTS.map((a) => {
              const done = saved.unlocked.has(a.id);
              const game = GAMES.find((g) => g.id === a.game)!;
              return (
                <div
                  key={a.id}
                  className={`flex items-start gap-2 border border-dotted p-2 text-[11px] ${
                    done ? "border-yellow-400/40" : "border-zinc-800"
                  }`}
                >
                  <span className={done ? "text-yellow-300" : "text-zinc-700"}>★</span>
                  <div>
                    <div className={done ? "font-bold text-white" : "font-bold text-zinc-500"}>{a.title}</div>
                    <div className="text-zinc-500">
                      {game.title} · {a.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-[10px] text-zinc-600">
            Hidden extras: type <span className="text-zinc-400">hadouken</span>,{" "}
            <span className="text-zinc-400">mario</span>, <span className="text-zinc-400">contra</span>,{" "}
            <span className="text-zinc-400">fatality</span> or <span className="text-zinc-400">toasty</span> anywhere on
            the page.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
