import { AnimatePresence, motion } from "framer-motion";
import type { ComponentType } from "react";

export default function ContentWindow({
  component,
  fileName,
}: {
  component: ComponentType | null;
  fileName: string;
}) {
  const Cmp = component;
  return (
    <section className="content-window">
      <div className="content-tabs">
        <div className="active-tab"><span>●</span>{fileName}<i>×</i></div>
        <div className="tab-fill" />
      </div>
      <div className="content-scroll scrollbar">
      <AnimatePresence mode="wait">
        <motion.div
          key={Cmp ? (Cmp as any).name : "empty"}
          initial={{ opacity: 0, x: 22, filter: "blur(5px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, x: -18, filter: "blur(4px)" }}
          transition={{ duration: 0.28, ease: "easeOut" }}
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
      </div>
    </section>
  );
}
