import { skillCategories } from "@/lib/portfolio-data";
import GlowDivider from "@/components/GlowDivider";

export default function Skills() {
  return (
    <section id="skills" className="py-10 sm:py-14">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-8">
        Tech Stack
      </h2>

      <div className="p-6 sm:p-7 rounded-2xl bg-[#090812]/80 backdrop-blur-md border border-white/[0.09] shadow-xl shadow-black/40 space-y-4">
        {skillCategories.map((category, idx) => (
          <div key={category.title}>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 py-2">
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-400 sm:w-48 shrink-0 font-semibold">
                {category.title}
              </span>

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm">
                {category.skills.map((skill, sIdx) => (
                  <span
                    key={skill.name}
                    className="inline-flex items-center text-zinc-300"
                  >
                    <span className="hover:text-white transition-colors">
                      {skill.name}
                    </span>
                    {sIdx < category.skills.length - 1 && (
                      <span className="text-zinc-600 ml-2.5 select-none">/</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Glowing line between skill categories */}
            {idx !== skillCategories.length - 1 && (
              <GlowDivider intensity="subtle" className="my-1" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
