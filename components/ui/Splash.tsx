"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function Splash() {
  const reduce = useReducedMotion();

  return (
    <div className="relative grid place-items-center">
      {/* subtle ambient glow */}
      <div className="pointer-events-none absolute -inset-16 opacity-30 [background:radial-gradient(500px_260px_at_50%_40%,theme(colors.accent/0.14),transparent),radial-gradient(360px_200px_at_50%_60%,theme(colors.panel/0.3),transparent)]" />

      <div className="relative flex flex-col items-center gap-6">
        {/* Outlined folder icon with stroke-draw animation */}
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 384 256"
          width={144}
          height={96}
          className="text-accent drop-shadow-lg"
          initial={reduce ? undefined : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1 }}
          transition={{ duration: 0.3 }}
          aria-hidden
        >
          <motion.path
            d="M32 200h272c13.255 0 24-10.745 24-24v-72c0-13.255-10.745-24-24-24H184l-28-28H56C42.745 52 32 62.745 32 76v100c0 13.255 10.745 24 24 24z"
            fill="none"
            stroke="currentColor"
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? undefined : { pathLength: 0 }}
            animate={reduce ? undefined : { pathLength: 1 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />
          {/* inner paper line */}
          <motion.path
            d="M72 176h224"
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.6}
            strokeWidth={8}
            strokeLinecap="round"
            initial={reduce ? undefined : { pathLength: 0 }}
            animate={reduce ? undefined : { pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeInOut" }}
          />
        </motion.svg>

        {/* Progress bar */}
        <div className="w-48 overflow-hidden rounded-full ring-1 ring-ring/60">
          <div className="h-2 bg-panel">
            <motion.div
              className="h-2 bg-accent"
              initial={reduce ? undefined : { x: "-60%" }}
              animate={reduce ? undefined : { x: "100%" }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                ease: "easeInOut",
              }}
              style={{ width: "60%" }}
            />
          </div>
        </div>

        <motion.div
          className="text-muted font-retroSans"
          initial={reduce ? undefined : { opacity: 0, y: 4 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          aria-live="polite"
        >
          Loading workspace…
        </motion.div>
      </div>
    </div>
  );
}
