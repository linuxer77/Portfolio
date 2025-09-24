"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const sections = [
  { href: "#", label: "Home" },
  { href: "#projects", label: "Projects" },
  { href: "#about", label: "About" },
  { href: "#education", label: "Education" },
  { href: "#contact", label: "Contact" },
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
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="#" className="font-medium text-white">
          linuxer77.dev
        </Link>
        <div className="flex items-center gap-1">
          {sections.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className={`px-3 py-2 text-sm rounded-full hover:text-white ${
                active === s.href ? "text-white bg-white/10" : "text-zinc-400"
              }`}
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
