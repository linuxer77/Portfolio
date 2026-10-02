import { experiences } from "@/lib/portfolio-data";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";
import GlowDivider from "@/components/GlowDivider";

export default function Experience() {
  return (
    <section id="experience" className="py-10 sm:py-14">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-8">
        Work History
      </h2>

      <div className="space-y-8">
        {experiences.map((exp, index) => (
          <div key={exp.company} className="space-y-3.5">
            {/* Header: Company & Date */}
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-xs font-mono text-zinc-400">
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

            {/* Glowing line under each work history entry */}
            {index !== experiences.length - 1 && (
              <GlowDivider className="pt-4" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
