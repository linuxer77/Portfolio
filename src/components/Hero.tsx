"use client";
import { motion } from "framer-motion";
import { FaDownload } from "react-icons/fa";
import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import Image from "next/image";
import Magnetic from "./Magnetic";

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative w-full"
    >
      {/* Creative purple-themed glass card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(11,8,18,0.98),rgba(18,13,30,0.95))] shadow-[0_15px_60px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl p-6 sm:p-8 transition-transform duration-500 will-change-transform [transform-style:preserve-3d] hover:scale-[1.012] hover:-rotate-[0.35deg] sheen-hover glass-bevel">
        {/* Angled split background tint */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(124,58,237,0.12) 0%, transparent 45%), linear-gradient(300deg, rgba(167,139,250,0.10) 0%, transparent 55%)",
          }}
        />

        {/* Diagonal subtle grid mask */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-dot-grid [transform:skewY(-4deg)] [mask-image:radial-gradient(900px_480px_at_center,black,transparent)]" />

        {/* Corner accents (thin, no glow) */}
        <div className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full border border-violet-500/20" />
        <div className="pointer-events-none absolute -right-10 -bottom-10 size-40 rounded-full border border-violet-500/15" />

        <div className="relative flex flex-col md:flex-row items-center gap-6 sm:gap-8">
          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 250, damping: 18 }}
            className="relative shrink-0 animate-float-slow"
          >
            <div className="relative size-28 md:size-32 rounded-full overflow-hidden ring-1 ring-violet-400/25 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
              <Image
                src="/avatar.jpg"
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>
          </motion.div>

          {/* Info */}
          <div className="relative flex-1 text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
              Harshit Gupta
            </h1>
            <p className="mt-3 text-zinc-300 text-base sm:text-lg">
              Engineer | Developer
            </p>

            {/* Decorative rule */}
            <div className="mt-4 h-px w-24 mx-auto md:mx-0 bg-gradient-to-r from-violet-500/60 to-violet-300/30" />

            {/* Socials */}
            <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-4">
              <Magnetic>
                <a
                  href="https://github.com/linuxer77"
                  target="_blank"
                  className="text-zinc-300 hover:text-white text-2xl transition-transform duration-300 hover:scale-110"
                  aria-label="GitHub"
                >
                  <FiGithub />
                </a>
              </Magnetic>
              <Magnetic>
                <a
                  href="https://www.linkedin.com/in/harshit-gupta-046b66278/"
                  className="text-zinc-300 hover:text-white text-2xl transition-transform duration-300 hover:scale-110"
                  aria-label="LinkedIn"
                >
                  <FiLinkedin />
                </a>
              </Magnetic>
              <Magnetic>
                <a
                  href="#contact"
                  className="text-zinc-300 hover:text-white text-2xl transition-transform duration-300 hover:scale-110"
                  aria-label="Email"
                >
                  <FiMail />
                </a>
              </Magnetic>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-4 justify-center md:justify-start">
              <Magnetic>
                <a
                  href="#contact"
                  className="h-11 px-6 inline-flex items-center justify-center rounded-xl btn-primary font-medium shadow hover:shadow-lg transition-all btn-shine"
                >
                  Contact
                </a>
              </Magnetic>
              <Magnetic>
                <a
                  href="/resume.pdf"
                  download
                  className="h-11 px-6 inline-flex items-center justify-center rounded-xl btn-ghost font-medium gap-2 transition-all btn-shine"
                >
                  <FaDownload /> Resume
                </a>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
