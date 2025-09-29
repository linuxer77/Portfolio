"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FaChevronRight,
  FaFolder,
  FaFolderOpen,
  FaRegFile,
} from "react-icons/fa6";
import { TreeItem } from "@/lib/portfolio-data";

export default function FileTree({
  items,
  open,
  onToggle,
  activeId,
  onSelect,
}: {
  items: TreeItem[];
  open: Record<string, boolean>;
  onToggle: (id: string) => void;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const folderContainsActive = (item: TreeItem): boolean => {
    if (!activeId) return false;
    if (!item.children) return false;
    const walk = (node: TreeItem): boolean => {
      if (node.id === activeId) return true;
      if (node.children) return node.children.some(walk);
      return false;
    };
    return item.children.some(walk);
  };

  return (
    <ul className="space-y-0.5 font-mono text-[15px] md:text-[16px]">
      {items.map((item) => (
        <li key={item.id}>
          {item.type === "folder" ? (
            <button
              onClick={() => onToggle(item.id)}
              className={`group flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-[var(--list-hover-bg)] ${
                folderContainsActive(item) ? "text-accent" : ""
              }`}
            >
              <FaChevronRight
                className={`transition-transform ${open[item.id] ? "rotate-90 text-accent" : "text-muted"}`}
                size={14}
              />
              {open[item.id] ? (
                <FaFolderOpen className="text-accent" size={16} />
              ) : (
                <FaFolder className="text-accent" size={16} />
              )}
              <span>{item.name}</span>
            </button>
          ) : (
            <button
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-[var(--list-hover-bg)] ${
                activeId === item.id
                  ? "bg-[var(--list-active-bg)] ring-1 ring-ring/80 border-l-2 border-accent"
                  : ""
              }`}
            >
              <FaRegFile
                className={`${activeId === item.id ? "text-accent2" : "text-accent"} shrink-0`}
                size={14}
              />
              <span>{item.name}</span>
            </button>
          )}

          {item.children && (
            <AnimatePresence initial={false}>
              {open[item.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-4 border-l border-white/5 pl-2"
                >
                  <FileTree
                    items={item.children}
                    open={open}
                    onToggle={onToggle}
                    activeId={activeId}
                    onSelect={onSelect}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </li>
      ))}
    </ul>
  );
}
