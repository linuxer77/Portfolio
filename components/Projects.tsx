import Image from "next/image";
import { projects } from "@/lib/portfolio-data";
import {
  FaGithub,
  FaArrowUpRightFromSquare,
  FaFolderClosed,
} from "react-icons/fa6";

export default function Projects() {
  return (
    <section id="projects" className="py-10 sm:py-14">
      <div className="space-y-7">
        {/* Section Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 font-semibold tracking-wider uppercase">
            <FaFolderClosed size={12} />
            <span>Projects</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Projects
          </h2>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <article
              key={project.title}
              className="group flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-[#0c0a14]/80 backdrop-blur-md border border-white/[0.08] hover:border-white/20 hover:bg-[#110e1c]/90 transition-all duration-200 shadow-xl shadow-black/40"
            >
              <div className="space-y-4">
                {/* Preview Image */}
                {project.image && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-[#07060c] border border-white/[0.08]">
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Header */}
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    {project.tagline}
                  </p>
                </div>

                {/* Description */}
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {project.description}
                </p>
              </div>

              {/* Bottom: Tags & Action Links */}
              <div className="pt-5 mt-4 border-t border-white/[0.08] space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.08]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-300 hover:text-white transition-colors"
                    >
                      <FaGithub size={13} />
                      <span>Code</span>
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-white hover:text-zinc-300 transition-colors"
                    >
                      <FaArrowUpRightFromSquare size={11} />
                      <span>Live / Demo</span>
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
