"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { personalData } from "@/lib/portfolio-data";
import { FaFilePdf, FaGithub, FaLinkedinIn } from "react-icons/fa6";
import ThemeToggle from "@/components/ThemeToggle";

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
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4 transition-all duration-300">
      <div
        className={`max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5 rounded-full transition-all duration-300 ${scrolled
          ? "bg-[#0c0a14]/85 backdrop-blur-md border border-white/[0.14] shadow-2xl shadow-black/80"
          : "bg-[#0c0a14]/60 backdrop-blur-md border border-white/[0.1]"
          }`}
      >
        <Link
          href="#about"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white hover:text-zinc-300 transition-colors"
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
        </Link>

        <nav className="hidden md:flex items-center gap-1">
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

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href={personalData.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/60 transition-colors"
          >
            <FaGithub size={15} />
          </a>
          <a
            href={personalData.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            className="hidden sm:flex p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/60 transition-colors"
          >
            <FaLinkedinIn size={15} />
          </a>
          <a
            href={personalData.resumePath}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-zinc-200 text-black rounded-full transition-all duration-200 font-semibold"
          >
            <FaFilePdf size={12} />
            <span>Resume</span>
          </a>
        </div>
      </div>
    </header>
  );
}
