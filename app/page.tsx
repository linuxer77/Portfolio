"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { FaGithub, FaLinkedinIn, FaEnvelope, FaFilePdf, FaTerminal } from "react-icons/fa6";
import Sidebar from "@/components/ui/Sidebar";
import ContentWindow from "@/components/ui/ContentWindow";
import Splash from "@/components/ui/Splash";
import { fileTree, type TreeItem } from "@/lib/portfolio-data";

function findItem(items: TreeItem[], id: string): TreeItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) { const match = findItem(item.children, id); if (match) return match; }
  }
  return null;
}
function findPath(items: TreeItem[], id: string, path: string[] = []): string[] {
  for (const item of items) {
    const next = [...path, item.name];
    if (item.id === id) return next;
    if (item.children) { const match = findPath(item.children, id, next); if (match.length) return match; }
  }
  return [];
}

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState("about-home");
  const [open, setOpen] = useState<Record<string, boolean>>({ portfolio: true, about: true, experience: true, projects: true, "projects-extensions": true });
  const reduceMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const samuraiX = useSpring(mouseX, { stiffness: 45, damping: 18 });
  const samuraiY = useSpring(mouseY, { stiffness: 45, damping: 18 });

  useEffect(() => { const timer = setTimeout(() => setReady(true), 5900); return () => clearTimeout(timer); }, []);
  const activeItem = useMemo(() => findItem(fileTree, active), [active]);
  const activePath = useMemo(() => findPath(fileTree, active), [active]);
  const ActiveComponent = activeItem?.component ?? null;

  const handlePointer = (event: React.PointerEvent<HTMLElement>) => {
    if (reduceMotion) return;
    mouseX.set((event.clientX / window.innerWidth - 0.5) * 18);
    mouseY.set((event.clientY / window.innerHeight - 0.5) * 12);
  };

  return (
    <main className="archive-world" onPointerMove={handlePointer}>
      {!ready && <Splash />}
      <div className="world-sun" aria-hidden="true" />
      <div className="ink-cloud cloud-one" aria-hidden="true" />
      <div className="ink-cloud cloud-two" aria-hidden="true" />
      <div className="world-mountains" aria-hidden="true"><i /><i /><i /></div>
      <motion.img className="world-samurai" src="/samurai-engineer-pixel.png" alt="" aria-hidden="true" style={{ x: samuraiX, y: samuraiY }} />

      <section className="archive-shell">
        <header className="archive-titlebar">
          <div className="window-dots" aria-hidden="true"><span /><span /><span /></div>
          <div className="archive-brand"><strong>HARSHIT GUPTA</strong></div>
          <div className="archive-actions">
            <a href="https://github.com/linuxer77" target="_blank" rel="noreferrer" aria-label="GitHub"><FaGithub /></a>
            <a href="https://www.linkedin.com/in/harshit-gupta-046b66278/" target="_blank" rel="noreferrer" aria-label="LinkedIn"><FaLinkedinIn /></a>
            <a href="mailto:harshitgit23@gmail.com" aria-label="Email"><FaEnvelope /></a>
            <a href="/resume.pdf" target="_blank" aria-label="Résumé"><FaFilePdf /></a>
          </div>
        </header>
        <div className="archive-toolbar"><div className="breadcrumb"><FaTerminal /> {activePath.join(" / ")}</div></div>
        <div className="archive-grid">
          <Sidebar items={fileTree} open={open} onToggle={(id) => setOpen((state) => ({ ...state, [id]: !state[id] }))} activeId={active} onSelect={setActive} />
          <ContentWindow component={ActiveComponent} fileName={activeItem?.name ?? "welcome.md"} />
        </div>
      </section>
    </main>
  );
}
