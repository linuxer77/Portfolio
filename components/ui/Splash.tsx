"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const slashes = [
  { angle: -18, delay: 0.9, origin: "left center" },
  { angle: 24, delay: 1.25, origin: "right center" },
  { angle: -48, delay: 1.6, origin: "left center" },
];

export default function Splash() {
  const reduce = useReducedMotion();
  const fast = reduce ? 0.01 : undefined;

  return (
    <motion.div
      className="splash-screen"
      initial={{ clipPath: "inset(0 0 0% 0)" }}
      animate={{ clipPath: ["inset(0 0 0% 0)", "inset(0 0 0% 0)", "inset(0 0 100% 0)"] }}
      transition={{ duration: fast ?? 5.8, times: [0, 0.86, 1], ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="splash-grid" />
      <motion.div className="cinematic-samurai" initial={reduce ? undefined : { opacity: 0, x: -80 }} animate={{ opacity: [0, 1, 1, 0], x: [-80, 0, 0, -20] }} transition={{ duration: fast ?? 0.72, times: [0, 0.55, 0.82, 1] }}>
        <Image src="/samurai-strike-pixel.png" alt="" fill priority sizes="(max-width: 700px) 90vw, 620px" />
      </motion.div>

      <motion.div className="impact-blackout" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 1] }} transition={{ duration: fast ?? 0.86, times: [0, 0.76, 0.77, 1] }} />
      <div className="cut-target" aria-hidden="true">
        <motion.div className="target-intact java-intact" initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: fast ?? 2.14, times: [0, 0.98, 0.99] }}>
          <Image src="/java-logo.png" alt="" fill priority sizes="170px" />
        </motion.div>
      </div>

      {slashes.map((slash, index) => (
        <div
          className="blade-path"
          key={slash.angle}
          style={{ transform: `translate(-50%, -50%) rotate(${slash.angle}deg)` }}
        >
          <motion.i
            className="blade-flash"
            style={{ transformOrigin: slash.origin }}
            initial={reduce ? undefined : { opacity: 0, scaleX: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scaleX: [0, 0.54, 1, 1] }}
            transition={{ delay: reduce ? 0 : slash.delay, duration: fast ?? 0.68, times: [0, 0.48, 0.84, 1], ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      ))}

      <motion.div className="impact-white-frame" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 0] }} transition={{ duration: fast ?? 2.42, times: [0, .84, .85, 1] }} />

      <div className="blood-splash-origin" aria-hidden="true">
        <motion.div
          className="blood-splash-cinematic"
          initial={reduce ? undefined : { opacity: 0, scale: 0.06, rotate: -8, rotateX: 68, filter: "blur(8px)" }}
          animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.06, 0.06, 0.38, 1.15, 1.45], rotate: [-8, -8, -4, 0, 1], rotateX: [68, 68, 34, 0, 0], filter: ["blur(8px)", "blur(8px)", "blur(2px)", "blur(0px)", "blur(0px)"] }}
          transition={{ duration: fast ?? 4.75, times: [0, 0.4, 0.48, 0.82, 1], ease: [0.22, 1, 0.36, 1] }}
        >
          <Image src="/blood-splash-cinematic.png" alt="" fill priority sizes="100vmax" />
        </motion.div>
      </div>

      <motion.div className="blood-flood" initial={{ scale: 0 }} animate={{ scale: [0, 0, 36, 36] }} transition={{ duration: fast ?? 5, times: [0, 0.56, 0.82, 1], ease: [0.76, 0, 0.24, 1] }} />
    </motion.div>
  );
}
