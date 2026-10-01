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
    <aside className="archive-sidebar scrollbar">
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
