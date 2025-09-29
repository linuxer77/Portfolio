import FileTree from "@/components/ui/FileTree";
import type { TreeItem } from "@/lib/portfolio-data";

export default function Sidebar({
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
  return (
    <aside className="rounded-xl bg-panelSidebar/80 p-4 shadow-glass ring-2 ring-ring/70 h-full overflow-y-auto overflow-x-hidden scrollbar">
      <h2 className="mb-3 font-retroSans text-2xl md:text-3xl font-extrabold text-accent">
        Explorer
      </h2>
      <FileTree
        items={items}
        open={open}
        onToggle={onToggle}
        activeId={activeId}
        onSelect={onSelect}
      />
    </aside>
  );
}
