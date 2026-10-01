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
    <ul className="file-tree">
      {items.map((item) => (
        <li key={item.id}>
          {item.type === "folder" ? (
            <button
              onClick={() => onToggle(item.id)}
              className={`tree-row folder-row ${
                folderContainsActive(item) ? "branch-active" : ""
              }`}
            >
              <FaChevronRight
                className={`tree-chevron ${open[item.id] ? "rotate-90" : ""}`}
                size={14}
              />
              {open[item.id] ? (
                <FaFolderOpen className="folder-icon" size={16} />
              ) : (
                <FaFolder className="folder-icon" size={16} />
              )}
              <span>{item.name}</span>
            </button>
          ) : (
            <button
              onClick={() => onSelect(item.id)}
              className={`tree-row file-row ${
                activeId === item.id
                  ? "file-active"
                  : ""
              }`}
            >
              <FaRegFile
                className="file-icon"
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
                  className="tree-children"
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
