"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const isDark = theme === "dark";
  return (
    <button
      aria-label="Toggle theme"
      className="ml-2 p-2 rounded-full border border-white/10 text-zinc-300 hover:text-white"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <FiSun /> : <FiMoon />}
    </button>
  );
}
