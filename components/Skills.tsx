import { skillCategories } from "@/lib/portfolio-data";

export default function Skills() {
  return (
    <section id="skills" className="py-10 sm:py-14">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-8">
        Tech Stack
      </h2>

      <div className="space-y-6">
        {skillCategories.map((category, idx) => (
          <div
            key={category.title}
            className={`flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 ${
              idx !== skillCategories.length - 1
                ? "pb-6 border-b border-white/[0.08]"
                : ""
            }`}
          >
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
        ))}
      </div>
    </section>
  );
}
