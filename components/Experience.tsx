import { experiences } from "@/lib/portfolio-data";
import { FaArrowUpRightFromSquare, FaBriefcase } from "react-icons/fa6";

export default function Experience() {
  return (
    <section id="experience" className="py-10 sm:py-14">
      <div className="space-y-7">
        {/* Section Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 font-semibold tracking-wider uppercase">
            <FaBriefcase size={12} />
            <span>Experience</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Work History
          </h2>
        </div>

        {/* Timeline */}
        <div className="relative border-l border-white/[0.08] ml-3 sm:ml-4 pl-6 sm:pl-8 space-y-9">
          {experiences.map((exp) => (
            <div key={exp.company} className="relative group">
              {/* Timeline Marker */}
              <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-[#0c0a14] border border-white/20 transition-colors duration-200">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Card Container - Smoked Obsidian Glass with White Text */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0a14]/80 backdrop-blur-md border border-white/[0.08] hover:border-white/20 hover:bg-[#110e1c]/90 transition-all duration-200 space-y-4 shadow-xl shadow-black/40">
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white transition-colors">
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
                          <FaArrowUpRightFromSquare size={12} />
                        </a>
                      )}
                    </div>
                    <p className="text-sm font-medium text-zinc-300 font-mono">
                      {exp.role}
                    </p>
                  </div>
                  <span className="self-start sm:self-center font-mono text-xs text-zinc-400 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                    {exp.period}
                  </span>
                </div>

                {/* Bullets */}
                <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc list-outside ml-4">
                  {exp.description.map((bullet, i) => (
                    <li key={i} className="pl-1">
                      {bullet}
                    </li>
                  ))}
                </ul>

                {/* Tech Tags */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {exp.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.08]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
