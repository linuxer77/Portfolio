"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

// ==========================================
// On-screen controls for the fighting modes on touch screens: an 8-way thumb pad on the
// left, held attack buttons and one-tap specials on the right. Everything is reported as
// the keyboard codes the games already understand, so the games need no touch code.
// ==========================================

export interface TouchButton {
  label: string;
  /** a held button: sends this key code down on press and up on release */
  code?: string;
  /** a one-tap button */
  onTap?: () => void;
  tone?: "special" | "finish";
}

interface Props {
  /** key codes for the four directions */
  pad: { left: string; right: string; up: string; down: string };
  buttons: TouchButton[];
  specials?: TouchButton[];
  onKey: (code: string, down: boolean) => void;
}

const buzz = () => {
  try {
    navigator.vibrate?.(8);
  } catch {
    // vibration blocked: no feedback
  }
};

function ThumbPad({ pad, onKey }: Pick<Props, "pad" | "onKey">) {
  const ref = useRef<HTMLDivElement>(null);
  const held = useRef({ left: false, right: false, up: false, down: false });
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const set = useCallback(
    (next: typeof held.current) => {
      for (const k of ["left", "right", "up", "down"] as const) {
        if (next[k] !== held.current[k]) onKey(pad[k], next[k]);
      }
      held.current = next;
    },
    [onKey, pad],
  );

  const track = useCallback(
    (e: ReactPointerEvent) => {
      const r = ref.current!.getBoundingClientRect();
      const radius = r.width / 2;
      let dx = e.clientX - (r.left + radius);
      let dy = e.clientY - (r.top + radius);
      const dist = Math.hypot(dx, dy);
      // a direction counts once it's within 67.5° of it, so diagonals sit between two
      const on = dist > radius * 0.22;
      set({
        left: on && dx < -dist * 0.38,
        right: on && dx > dist * 0.38,
        up: on && dy < -dist * 0.38,
        down: on && dy > dist * 0.38,
      });
      const max = radius * 0.55;
      if (dist > max) {
        dx = (dx / dist) * max;
        dy = (dy / dist) * max;
      }
      setKnob({ x: dx, y: dy });
    },
    [set],
  );

  const release = useCallback(() => {
    set({ left: false, right: false, up: false, down: false });
    setKnob({ x: 0, y: 0 });
  }, [set]);

  return (
    <div
      ref={ref}
      className="pointer-events-auto relative h-32 w-32 rounded-full border border-dotted border-zinc-500/70 bg-black/40"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        buzz();
        track(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) track(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      {["▲", "▶", "▼", "◀"].map((arrow, i) => (
        <span
          key={arrow}
          className="absolute text-[10px] text-zinc-500"
          style={{
            left: `${50 + Math.sin((i * Math.PI) / 2) * 38}%`,
            top: `${50 - Math.cos((i * Math.PI) / 2) * 38}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {arrow}
        </span>
      ))}
      <div
        className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full border border-zinc-300/80 bg-white/15"
        style={{
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
        }}
      />
    </div>
  );
}

function PadButton({
  b,
  onKey,
  round,
}: {
  b: TouchButton;
  onKey: Props["onKey"];
  round: boolean;
}) {
  const [down, setDown] = useState(false);
  const up = () => {
    if (!down) return;
    setDown(false);
    if (b.code) onKey(b.code, false);
  };
  const colour =
    b.tone === "finish"
      ? "border-red-500 text-red-400 bg-red-950/60"
      : b.tone === "special"
        ? "border-yellow-500/70 text-yellow-300 bg-black/50"
        : "border-zinc-500/70 text-zinc-100 bg-black/40";
  return (
    <button
      type="button"
      className={`pointer-events-auto select-none border font-bold uppercase tracking-wider transition-colors ${colour} ${
        round
          ? "h-14 w-14 rounded-full text-[10px]"
          : "rounded-full px-3 py-2 text-[9px]"
      } ${down ? "!bg-white !text-black" : ""}`}
      style={{ touchAction: "none", WebkitTouchCallout: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        buzz();
        setDown(true);
        if (b.code) onKey(b.code, true);
        b.onTap?.();
      }}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {b.label}
    </button>
  );
}

export default function TouchControls({
  pad,
  buttons,
  specials = [],
  onKey,
}: Props) {
  // a 2- or 3-wide grid, so four buttons sit in a square and six in two rows
  const cols = buttons.length > 4 ? 3 : 2;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[47] flex items-end justify-between gap-4 px-4 font-mono"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <ThumbPad pad={pad} onKey={onKey} />
      <div className="flex flex-col items-end gap-3">
        {specials.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {specials.map((b) => (
              <PadButton key={b.label} b={b} onKey={onKey} round={false} />
            ))}
          </div>
        )}
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, 3.5rem)` }}
        >
          {buttons.map((b) => (
            <PadButton key={b.label} b={b} onKey={onKey} round />
          ))}
        </div>
      </div>
    </div>
  );
}
