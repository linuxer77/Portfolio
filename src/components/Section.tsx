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
    <section id={id} className="scroll-mt-24">
      {hasTitle && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <h2 className="underline-accent inline-block text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm sm:text-base mt-2 max-w-2xl bg-clip-text text-transparent bg-gradient-to-r from-zinc-300 to-zinc-400/80">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}
