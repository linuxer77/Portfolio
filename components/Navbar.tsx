"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { personalData } from "@/lib/portfolio-data";
import { FaFilePdf } from "react-icons/fa6";
import ThemeToggle from "@/components/ThemeToggle";
import ViewModeSwitch from "@/components/ViewModeSwitch";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Tech Stack", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 transition-all duration-300">
      <div
        className={`max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5 rounded-full transition-all duration-300 ${
          scrolled
            ? "bg-[#0c0a14]/85 backdrop-blur-md border border-white/[0.14] shadow-2xl shadow-black/80"
            : "bg-[#0c0a14]/60 backdrop-blur-md border border-white/[0.1]"
        }`}
      >
        <Link
          href="#about"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white hover:text-zinc-300 transition-colors shrink-0"
        >
          {/* Animated GIF Logo */}
          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/20 shadow-md shadow-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.gif"
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-mono font-bold text-xs tracking-wider text-zinc-200">
            0x6867
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/50 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ViewModeSwitch />
          <ThemeToggle />
          <a
            href={personalData.resumePath}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-zinc-200 text-black rounded-full transition-all duration-200 font-semibold shadow-sm"
          >
            <FaFilePdf size={12} />
            <span>Resume</span>
          </a>
        </div>
      </div>
    </header>
  );
}
