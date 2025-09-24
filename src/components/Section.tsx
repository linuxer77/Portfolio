"use client";
import { motion } from "framer-motion";

type Props = {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function Section({ id, title, subtitle, children }: Props) {
  const hasTitle = Boolean(title && title.trim().length > 0);
  return (
    <section id={id} className="scroll-mt-24 relative">
      {hasTitle && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <h2 className="h-comic inline-block text-2xl sm:text-3xl font-normal text-white tracking-wide">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm sm:text-base mt-2 max-w-2xl text-zinc-300/90">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}
      <div className="">{children}</div>
    </section>
  );
}
