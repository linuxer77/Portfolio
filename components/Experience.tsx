import { experiences } from "@/lib/portfolio-data";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";

export default function Experience() {
  return (
    <section id="experience" className="py-10 sm:py-14">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-8">
        Work History
      </h2>

      <div className="space-y-6">
        {experiences.map((exp) => (
          <div
            key={exp.company}
            className="glass-card p-6 sm:p-8 space-y-3.5 group"
          >
            {/* Header: Company & Date */}
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <div className="flex items-center gap-2.5">
                {exp.logo && (
                  <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-white/10 bg-black/60 shrink-0 flex items-center justify-center shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={exp.logo}
                      alt={exp.company}
                      className="w-full h-full object-contain p-0.5 grayscale contrast-125"
                    />
                  </div>
                )}
                <h3 className="text-lg font-bold text-white group-hover:text-zinc-100 transition-colors">
                  {exp.company}
                </h3>
                {exp.link && (
                  <a
                    href={exp.link}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${exp.company} website`}
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    <FaArrowUpRightFromSquare size={11} />
                  </a>
                )}
              </div>
              <span className="font-mono text-xs text-zinc-400">
                {exp.period}
              </span>
            </div>

            {/* Role */}
            <p className="text-sm font-mono text-zinc-300">
              {exp.role}
            </p>

            {/* Bullets */}
            <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc list-outside ml-4 pt-1">
              {exp.description.map((bullet, i) => (
                <li key={i} className="pl-1">
                  {bullet}
                </li>
              ))}
            </ul>

            {/* Clean inline tech stack */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-2.5 text-xs font-mono text-zinc-400 border-t border-white/[0.06]">
              <span className="text-zinc-500 font-semibold">Stack:</span>
              {exp.skills.map((skill, sIdx) => (
                <span key={skill} className="text-zinc-300">
                  {skill}
                  {sIdx < exp.skills.length - 1 && (
                    <span className="text-zinc-600 ml-2">/</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
