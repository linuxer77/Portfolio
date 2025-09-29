"use client";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import ContentWindow from "@/components/ui/ContentWindow";
import { fileTree, type TreeItem } from "@/lib/portfolio-data";
import Splash from "@/components/ui/Splash";
import AboutContent from "@/components/content/AboutContent";

export default function HomePage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(t);
  }, []);

  // Start with all folders collapsed; clicking toggles them open
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<string | null>(null);

  const activeComponent = useMemo(() => {
    const walk = (items: TreeItem[]): any => {
      for (const it of items) {
        if (it.id === active) return it.component ?? null;
        if (it.children) {
          const r = walk(it.children);
          if (r) return r;
        }
      }
      return null;
    };
    return walk(fileTree);
  }, [active]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6 md:p-10 overflow-auto">
      {!ready ? (
        <Splash />
      ) : (
        <div className="w-full max-w-[1200px] animate-fade-in scale-[3.2] origin-top-left">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px,1fr] h-[600px] overflow-auto rounded-3xl ring-4 ring-ring/80 p-2 bg-panel/40 shadow-2xl">
            <Sidebar
              items={fileTree}
              open={open}
              onToggle={(id) => setOpen((s) => ({ ...s, [id]: !s[id] }))}
              activeId={active}
              onSelect={setActive}
            />
            <ContentWindow component={activeComponent ?? (AboutContent as any)} />
          </div>
        </div>
      )}
    </main>
  );
}
