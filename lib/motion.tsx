"use client";

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

// ==========================================
// Motion primitives (design-to-motion)
// Intro = CSS transitions keyed on [data-in] (see globals.css).
// Stories = one JS clock per unit, running only while the unit is on screen.
// ==========================================

export type Story = (t: number, el: HTMLElement) => void;

export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Stagger delay for an intro element, read by `.m` transitions as `--d`. */
export const d = (seconds: number) => ({ "--d": `${seconds}s` }) as CSSProperties;

const THRESHOLDS = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3];

/**
 * Reveals the unit once ~30% of it (or 30% of the viewport, for tall units) is visible,
 * then runs `story` on a clock that only advances while the unit is on screen.
 */
export function useMotionUnit<T extends HTMLElement>(story?: Story, start = 1.8) {
  const ref = useRef<T>(null);
  const storyRef = useRef(story);
  storyRef.current = story;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.setAttribute("data-in", "");
      return;
    }

    let revealed = false;
    let raf = 0;
    let last = 0;
    let clock = 0;

    const frame = (now: number) => {
      // clamp so a dropped frame never makes a story jump
      clock += last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (clock >= start) {
        if (!el.hasAttribute("data-live")) el.setAttribute("data-live", "");
        storyRef.current?.(clock - start, el);
      }
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (
          !revealed &&
          e.isIntersecting &&
          (e.intersectionRatio >= 0.3 || e.intersectionRect.height >= window.innerHeight * 0.3)
        ) {
          revealed = true;
          el.setAttribute("data-in", "");
        }
        cancelAnimationFrame(raf);
        last = 0;
        if (revealed && e.isIntersecting && storyRef.current) raf = requestAnimationFrame(frame);
      },
      { threshold: THRESHOLDS }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [start]);

  return ref;
}

interface UnitProps {
  as?: ElementType;
  story?: Story;
  /** Seconds after reveal when the story starts (the intro has landed). */
  start?: number;
  id?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Unit({ as: Tag = "div", story, start, id, className, style, children }: UnitProps) {
  const ref = useMotionUnit<HTMLElement>(story, start);
  return (
    <Tag ref={ref} id={id} className={className} style={style}>
      {children}
    </Tag>
  );
}

/**
 * A dotted rule that wipes in left to right. Sits over a transparent 1px border on its
 * parent (which must be `relative`), so layout is identical to a plain border.
 */
export function Rule({
  edge = "bottom",
  delay = 0,
  standalone = false,
}: {
  edge?: "top" | "bottom";
  delay?: number;
  /** Reveal on its own scroll position instead of with the enclosing unit. */
  standalone?: boolean;
}) {
  const className = `m m-wipe pointer-events-none absolute inset-x-0 border-dotted border-zinc-800 ${
    edge === "bottom" ? "-bottom-px border-b" : "-top-px border-t"
  }`;
  // data-game: the dotted rules double as floors for the monsters in DOOM mode
  const rule = <span aria-hidden data-game="floor" style={d(delay)} className={className} />;
  if (!standalone) return rule;
  // a hairline is too thin to measure reliably, so a taller invisible box triggers it
  return (
    <Unit
      className={`pointer-events-none absolute inset-x-0 h-16 ${edge === "bottom" ? "bottom-0" : "top-0"}`}
    >
      {rule}
    </Unit>
  );
}
