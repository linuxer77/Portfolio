import { AnimatePresence, motion } from "framer-motion";
import type { ComponentType } from "react";

export default function ContentWindow({
  component,
}: {
  component: ComponentType | null;
}) {
  const Cmp = component;
  return (
    <section className="rounded-xl bg-panelEditor/90 p-4 shadow-glass ring-2 ring-ring/70 h-full w-full overflow-y-auto overflow-x-hidden scrollbar">
      <AnimatePresence mode="wait">
        <motion.div
          key={Cmp ? (Cmp as any).name : "empty"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {Cmp ? (
            <Cmp />
          ) : (
            <div className="flex h-[460px] items-center justify-center text-sm text-muted">
              Select a file to view its contents.
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
