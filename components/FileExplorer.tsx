"use client";

import { useMemo, useState, ReactNode } from "react";
import {
  AboutPanel,
  HighlightsPanel,
  ProjectsPanel,
  LinksPanel,
  ContactPanel,
  SkillsPanel,
  EducationPanel,
  AchievementsPanel,
} from "./panels";

export type NodeType = "folder" | "file";
export interface TreeNode {
  id: string;
  label: string;
  type: NodeType;
  children?: TreeNode[];
  panel?: ReactNode;
}

const tree: TreeNode[] = [
  {
    id: "portfolio",
    label: "portfolio",
    type: "folder",
    children: [
      {
        id: "about",
        label: "about",
        type: "folder",
        children: [
          {
            id: "about-details",
            label: "details.jsx",
            type: "file",
            panel: <AboutPanel />,
          },
          {
            id: "about-highlights",
            label: "highlights.jsx",
            type: "file",
            panel: <HighlightsPanel />,
          },
        ],
      },
      {
        id: "projects",
        label: "projects",
        type: "folder",
        children: [
          {
            id: "projects-generative",
            label: "systems",
            type: "folder",
            children: [],
          },
          {
            id: "projects-panel",
            label: "showcase.jsx",
            type: "file",
            panel: <ProjectsPanel />,
          },
        ],
      },
      {
        id: "skills",
        label: "skills",
        type: "folder",
        children: [
          {
            id: "skills-list",
            label: "techstack.jsx",
            type: "file",
            panel: <SkillsPanel />,
          },
        ],
      },
      {
        id: "education",
        label: "education",
        type: "folder",
        children: [
          {
            id: "edu-details",
            label: "college.jsx",
            type: "file",
            panel: <EducationPanel />,
          },
        ],
      },
      {
        id: "achievements",
        label: "achievements",
        type: "folder",
        children: [
          {
            id: "achievements-list",
            label: "wins.jsx",
            type: "file",
            panel: <AchievementsPanel />,
          },
        ],
      },
      {
        id: "connect",
        label: "connect",
        type: "folder",
        children: [
          {
            id: "links",
            label: "links.jsx",
            type: "file",
            panel: <LinksPanel />,
          },
        ],
      },
      {
        id: "contact",
        label: "contact.me",
        type: "file",
        panel: <ContactPanel />,
      },
    ],
  },
];

export default function FileExplorer() {
  const [open, setOpen] = useState<Record<string, boolean>>({
    portfolio: true,
    about: true,
  });
  const [active, setActive] = useState<string>("about-details");

  const activePanel = useMemo(() => {
    const walk = (nodes: TreeNode[]): ReactNode | null => {
      for (const n of nodes) {
        if (n.id === active) return n.panel ?? null;
        if (n.children) {
          const p = walk(n.children);
          if (p) return p;
        }
      }
      return null;
    };
    return walk(tree);
  }, [active]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px,1fr]">
      <aside className="rounded-xl bg-panel/70 p-4 shadow-glass ring-1 ring-ring/60">
        <h2 className="mb-3 font-mono text-lg font-semibold text-accent">
          Explore files
        </h2>
        <Tree
          nodes={tree}
          open={open}
          onToggle={(id) => setOpen((s) => ({ ...s, [id]: !s[id] }))}
          active={active}
          onSelect={setActive}
        />
      </aside>
      <section className="rounded-xl bg-panel/70 p-4 shadow-glass ring-1 ring-ring/60">
        {activePanel ?? (
          <div className="flex h-[460px] items-center justify-center text-sm text-muted">
            Hi there! I&apos;m Harshit...
          </div>
        )}
      </section>
    </div>
  );
}

function Tree({
  nodes,
  open,
  onToggle,
  active,
  onSelect,
}: {
  nodes: TreeNode[];
  open: Record<string, boolean>;
  onToggle: (id: string) => void;
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-1 font-mono text-sm">
      {nodes.map((n) => (
        <li key={n.id}>
          {n.type === "folder" ? (
            <div>
              <button
                className="group flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-white/5"
                onClick={() => onToggle(n.id)}
              >
                <span className="text-accent">{open[n.id] ? "▾" : "▸"}</span>
                <span className="text-accent">📁</span>
                <span>{n.label}</span>
              </button>
              {open[n.id] && n.children && (
                <div className="ml-4 border-l border-white/5 pl-2">
                  <Tree
                    nodes={n.children}
                    open={open}
                    onToggle={onToggle}
                    active={active}
                    onSelect={onSelect}
                  />
                </div>
              )}
            </div>
          ) : (
            <button
              className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-white/5 ${
                active === n.id ? "bg-white/10 ring-1 ring-ring/70" : ""
              }`}
              onClick={() => onSelect(n.id)}
            >
              <span className="text-accent">📄</span>
              <span>{n.label}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
