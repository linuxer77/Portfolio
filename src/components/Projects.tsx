import Image from "next/image";
import { FaExternalLinkAlt } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type Project = {
  title: string;
  description: string;
  image: string;
  tech: string[];
  demo?: string;
  repo?: string;
  featured?: boolean;
  category?: string;
};

export function ProjectsGrid({
  projects,
  filter,
}: {
  projects: Project[];
  filter?: string;
}) {
  const list = filter
    ? projects.filter((p) => p.category === filter || p.tech.includes(filter))
    : projects;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {list.map((p, i) => (
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
          key={p.title}
          className="group relative rounded-3xl overflow-hidden border border-white/10 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,.35)] bg-[linear-gradient(135deg,rgba(14,14,18,.9),rgba(20,20,26,.82))] transition-transform duration-500 will-change-transform hover:scale-[1.01] hover:-rotate-[0.35deg] sheen-hover glass-bevel cursor-pointer card-violet-hover"
        >
          {/* Full-card clickable overlay: prefer demo, fallback to repo */}
          {(p.demo || p.repo) && (
            <a
              href={(p.demo || p.repo) as string}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${p.title}`}
              className="absolute inset-0 z-10"
            />
          )}

          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src={p.image}
              alt={p.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />
            <div className="absolute inset-0 pointer-events-none ring-0 ring-violet-500/0 transition-[ring,opacity] duration-500 group-hover:ring-4 group-hover:ring-violet-500/20 opacity-0 group-hover:opacity-100" />
          </div>
          <div className="p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-white tracking-tight">
              {p.title}
            </h3>
            <p className="text-sm text-zinc-300/90 mt-1 line-clamp-2">
              {p.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.tech.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2.5 py-1 rounded-full chip-soft"
                >
                  {t}
                </span>
              ))}
            </div>
            {/* Keep Live link for clarity; remove Code link */}
            <div className="mt-4 flex gap-3">
              {p.demo && (
                <a
                  href={p.demo}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm inline-flex items-center gap-2 link-accent"
                >
                  <FaExternalLinkAlt /> Live
                </a>
              )}
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
