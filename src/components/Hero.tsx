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
      <div className="relative overflow-hidden card-fantasy p-6 sm:p-8 sheen-hover">
        <div className="relative flex flex-col md:flex-row items-center gap-6 sm:gap-8">
          <motion.div
            whileHover={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 250, damping: 18 }}
            className="relative shrink-0"
          >
            <div className="relative size-28 md:size-32 rounded-full overflow-hidden border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
              <Image
                src="/avatar.jpg"
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>
          </motion.div>
          <div className="relative flex-1 text-center md:text-left">
            <h1 className="h-display text-3xl sm:text-4xl md:text-5xl font-normal text-white underline-ornate">
              Harshit Gupta
            </h1>
            <p className="mt-3 text-violet-200/90 text-base sm:text-lg">
              Engineer | Developer
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 justify-center md:justify-start">
              <Magnetic>
                <a
                  href="#contact"
                  className="h-11 px-6 inline-flex items-center justify-center rounded-xl btn-hero font-semibold transition-all btn-shine"
                >
                  Contact
                </a>
              </Magnetic>
              <Magnetic>
                <a
                  href="/resume.pdf"
                  download
                  className="h-11 px-6 inline-flex items-center justify-center rounded-xl btn-ghost-dark font-medium gap-2 transition-all btn-shine"
                >
                  <FaDownload /> Resume
                </a>
              </Magnetic>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-4 text-2xl text-white/80">
              <Magnetic>
                <a
                  href="https://github.com/linuxer77"
                  target="_blank"
                  aria-label="GitHub"
                  className="hover:text-white"
                >
                  <FiGithub />
                </a>
              </Magnetic>
              <Magnetic>
                <a
                  href="https://www.linkedin.com/in/harshit-gupta-046b66278/"
                  aria-label="LinkedIn"
                  className="hover:text-white"
                >
                  <FiLinkedin />
                </a>
              </Magnetic>
              <Magnetic>
                <a
                  href="#contact"
                  aria-label="Email"
                  className="hover:text-white"
                >
                  <FiMail />
                </a>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
