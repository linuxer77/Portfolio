"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const slashes = [
  { angle: -18, delay: 0.72, origin: "left center" },
  { angle: 24, delay: 0.94, origin: "right center" },
  { angle: -48, delay: 1.16, origin: "left center" },
];

const fragments = [
  { top: 0, left: 0, width: 86, height: 58, x: -105, y: -90, rotate: -28 },
  { top: 0, left: 84, width: 86, height: 58, x: 100, y: -115, rotate: 32 },
  { top: 56, left: 0, width: 86, height: 58, x: -135, y: 5, rotate: -42 },
  { top: 56, left: 84, width: 86, height: 58, x: 130, y: 18, rotate: 38 },
  { top: 112, left: 0, width: 86, height: 58, x: -75, y: 125, rotate: -18 },
  { top: 112, left: 84, width: 86, height: 58, x: 90, y: 140, rotate: 45 },
];

const bloodShards = [
  { x: -210, y: -145, size: 34, rotate: -35 }, { x: -110, y: -205, size: 22, rotate: 18 },
  { x: 12, y: -190, size: 42, rotate: 65 }, { x: 155, y: -135, size: 26, rotate: -70 },
  { x: 225, y: -20, size: 38, rotate: 30 }, { x: 185, y: 120, size: 20, rotate: 75 },
  { x: 58, y: 185, size: 31, rotate: -28 }, { x: -88, y: 195, size: 24, rotate: 50 },
  { x: -190, y: 120, size: 36, rotate: -60 }, { x: -245, y: 5, size: 19, rotate: 12 },
];

export default function Splash() {
  const reduce = useReducedMotion();
  const fast = reduce ? 0.01 : undefined;

  return (
    <motion.div
      className="splash-screen"
      initial={{ clipPath: "inset(0 0 0% 0)" }}
      animate={{ clipPath: ["inset(0 0 0% 0)", "inset(0 0 0% 0)", "inset(0 0 100% 0)"] }}
      transition={{ duration: fast ?? 3.1, times: [0, 0.81, 1], ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="splash-grid" />
      <motion.div className="cinematic-samurai" initial={reduce ? undefined : { opacity: 0, x: -80 }} animate={{ opacity: [0, 1, 1, 0], x: [-80, 0, 0, -20] }} transition={{ duration: fast ?? 0.72, times: [0, 0.55, 0.82, 1] }}>
        <Image src="/samurai-strike-pixel.png" alt="" fill priority sizes="(max-width: 700px) 90vw, 620px" />
      </motion.div>

      <motion.div className="impact-blackout" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 1] }} transition={{ duration: fast ?? 0.72, times: [0, 0.76, 0.77, 1] }} />
      <div className="cut-target" aria-hidden="true">
        <motion.div className="target-intact java-intact" initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: fast ?? 1.4, times: [0, 0.98, 0.99] }}>
          <Image src="/java-logo.png" alt="" fill priority sizes="170px" />
        </motion.div>
        {fragments.map((fragment, index) => (
          <motion.i
            className="target-fragment"
            key={index}
            style={{ top: fragment.top, left: fragment.left, width: fragment.width, height: fragment.height, backgroundImage: "url(/java-logo.png)", backgroundSize: "170px 170px", backgroundPosition: `-${fragment.left}px -${fragment.top}px` }}
            initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
            animate={{ opacity: [0, 0, 1, 1], x: [0, 0, 0, fragment.x], y: [0, 0, 0, fragment.y], rotate: [0, 0, 0, fragment.rotate] }}
            transition={{ duration: fast ?? 2.08, times: [0, 0.67, 0.68, 1], ease: "easeOut" }}
          />
        ))}
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
            transition={{ delay: reduce ? 0 : slash.delay, duration: fast ?? 0.46, times: [0, 0.48, 0.84, 1], ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      ))}

      <motion.div className="impact-white-frame" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 0] }} transition={{ duration: fast ?? 1.72, times: [0, .84, .85, 1] }} />

      <div className="blood-origin" aria-hidden="true">
        {bloodShards.map((shard, index) => (
          <motion.i className="blood-shard" key={index} style={{ width: shard.size, height: shard.size * 1.6 }} initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0 }} animate={{ opacity: [0, 0, 1, 1], x: [0, 0, 0, shard.x], y: [0, 0, 0, shard.y], rotate: [0, 0, 0, shard.rotate], scale: [0, 0, 1.3, 1] }} transition={{ duration: fast ?? 2.02, times: [0, 0.76, 0.77, 1], ease: "easeOut" }} />
        ))}
      </div>

      <motion.div className="blood-flood" initial={{ scale: 0 }} animate={{ scale: [0, 0, 36] }} transition={{ duration: fast ?? 2.55, times: [0, 0.68, 1], ease: [0.76, 0, 0.24, 1] }} />
    </motion.div>
  );
}
