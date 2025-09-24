"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FaHome,
  FaCode,
  FaUserAlt,
  FaGraduationCap,
  FaEnvelope,
} from "react-icons/fa";

const sections = [
  { href: "#", label: "Home", icon: <FaHome /> },
  { href: "#projects", label: "Projects", icon: <FaCode /> },
  { href: "#about", label: "About", icon: <FaUserAlt /> },
  { href: "#education", label: "Education", icon: <FaGraduationCap /> },
  { href: "#contact", label: "Contact", icon: <FaEnvelope /> },
];

export default function Nav() {
  const [active, setActive] = useState<string>("#");
  useEffect(() => {
    const handler = () => {
      const offsets = sections.map((s) => {
        const el =
          s.href === "#" ? document.body : document.querySelector(s.href);
        const top = el
          ? s.href === "#"
            ? 0
            : (el as HTMLElement).getBoundingClientRect().top + window.scrollY
          : 0;
        return { href: s.href, top: Math.abs(top - window.scrollY - 120) };
      });
      setActive(offsets.sort((a, b) => a.top - b.top)[0]?.href || "#");
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 backdrop-blur border-b border-white/10 bg-black/40">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="#"
            className="font-medium text-white h-comic tracking-wide"
          >
            linuxer77.dev
          </Link>

          {/* Gaming style nav bar */}
          <ul className="relative flex items-center gap-1 px-1 py-1 rounded-2xl nav-pixel">
            {sections.map((s) => {
              const isActive = active === s.href;
              return (
                <li key={s.href} className="relative">
                  <a
                    href={s.href}
                    className={`nav-btn ${
                      isActive ? "text-white" : "text-zinc-300 hover:text-white"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {/* Animated active pill behind */}
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="nav-indicator -z-10"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="text-lg md:text-xl leading-none">
                      {s.icon}
                    </span>
                    <span className="hidden md:inline font-medium">
                      {s.label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </header>
  );
}
