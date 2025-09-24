"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1700);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "var(--background)" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          aria-label="Loading"
          role="status"
        >
          {/* Subtle purple vignette/backdrop */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0 opacity-60"
              style={{
                background:
                  "radial-gradient(650px 320px at 70% 10%, rgba(124,58,237,0.10), transparent 60%), radial-gradient(520px 280px at 30% 80%, rgba(167,139,250,0.10), transparent 60%)",
                filter: "blur(18px)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(1200px 600px at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 70%)",
              }}
            />
          </div>

          <div className="relative">
            {/* Logo: diamond with gradient stroke and shine sweep */}
            <motion.svg
              width="120"
              height="120"
              viewBox="0 0 96 96"
              initial={{ scale: 0.9, rotate: -6, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <defs>
                <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
                <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.55)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                <clipPath id="diamondClip">
                  <path d="M48 6 L74 48 L48 90 L22 48 Z" />
                </clipPath>
              </defs>

              {/* Rotating dotted ring and orbiting orbs */}
              <motion.g
                style={{ transformOrigin: "48px 48px" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 6, ease: "linear", repeat: Infinity }}
              >
                <circle
                  cx="48"
                  cy="48"
                  r="34"
                  fill="none"
                  stroke="rgba(167,139,250,0.35)"
                  strokeWidth="1.2"
                  strokeDasharray="2 10"
                />
                <circle cx="48" cy="13" r="2" fill="rgba(167,139,250,0.7)" />
                <circle cx="48" cy="83" r="1.6" fill="rgba(124,58,237,0.6)" />
              </motion.g>

              {/* Diamond path draw */}
              <motion.path
                d="M48 6 L74 48 L48 90 L22 48 Z"
                fill="#0a0712"
                stroke="url(#strokeGrad)"
                strokeWidth="3.2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
              />

              {/* Shine sweep within diamond */}
              <motion.rect
                x="-100"
                y="0"
                width="200"
                height="96"
                clipPath="url(#diamondClip)"
                fill="url(#shine)"
                initial={{ x: -110, opacity: 0 }}
                animate={{ x: 110, opacity: 1 }}
                transition={{ duration: 1.1, delay: 0.25, ease: "easeInOut" }}
              />
            </motion.svg>

            {/* Bottom shimmering bar */}
            <motion.div
              className="absolute -bottom-7 left-1/2 -translate-x-1/2 h-1 w-28 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(124,58,237,0.25), rgba(255,255,255,0.35), rgba(124,58,237,0.25))",
              }}
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.45, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
