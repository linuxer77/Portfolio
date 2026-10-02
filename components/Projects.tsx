import Image from "next/image";
import { projects } from "@/lib/portfolio-data";
import {
  FaGithub,
  FaArrowUpRightFromSquare,
} from "react-icons/fa6";
import GlowDivider from "@/components/GlowDivider";

export default function Projects() {
  return (
    <section id="projects" className="py-10 sm:py-14">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-8">
        Projects
      </h2>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
        {projects.map((project) => (
          <article
            key={project.title}
            className="group flex flex-col justify-between space-y-4 p-6 sm:p-7 rounded-2xl bg-[#090812]/60 backdrop-blur-xl border border-white/[0.1] hover:border-white/[0.2] transition-all duration-300 shadow-xl shadow-black/40"
          >
            <div className="space-y-3.5">
              {/* Preview Image */}
              {project.image && (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-black/40 border border-white/[0.08] group-hover:border-white/20 transition-colors">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
              )}

              {/* Title & Links */}
              <div className="flex items-baseline justify-between gap-2 pt-1">
                <h3 className="text-lg font-bold text-white group-hover:text-zinc-200 transition-colors">
                  {project.title}
                </h3>
                <div className="flex items-center gap-3 shrink-0">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${project.title} GitHub repository`}
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      <FaGithub size={15} />
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${project.title} live preview`}
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      <FaArrowUpRightFromSquare size={13} />
                    </a>
                  )}
                </div>
              </div>

              {/* Tagline */}
              <p className="text-xs font-mono text-zinc-400">
                {project.tagline}
              </p>

              {/* Description */}
              <p className="text-sm text-zinc-300 leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Clean inline tech stack */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs font-mono text-zinc-400">
              <span className="text-zinc-500 font-semibold">Stack:</span>
              {project.tags.map((tag, tIdx) => (
                <span key={tag} className="text-zinc-300">
                  {tag}
                  {tIdx < project.tags.length - 1 && (
                    <span className="text-zinc-600 ml-2">/</span>
                  )}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <GlowDivider className="pt-12" />
    </section>
  );
}
