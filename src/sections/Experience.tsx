type Item = {
  role: string;
  company: string;
  period: string;
  bullets: string[];
};

const items: Item[] = [
  {
    role: "Full-Stack Developer",
    company: "Freelance",
    period: "2022 — Present",
    bullets: [
      "Delivered responsive web apps using Next.js and TypeScript",
      "Integrated third‑party APIs and optimized Lighthouse scores (90+)",
      "Improved accessibility and performance across projects",
    ],
  },
];

export default function Experience() {
  return (
    <ol className="relative border-s border-white/10 pl-6 space-y-6">
      {items.map((it) => (
        <li key={it.company} className="group">
          <div className="absolute -left-1.5 top-1 size-3 rounded-full bg-cyan-400" />
          <h3 className="text-white font-medium">
            {it.role} · {it.company}
          </h3>
          <p className="text-xs text-zinc-400">{it.period}</p>
          <ul className="mt-2 list-disc pl-4 text-sm text-zinc-300 space-y-1">
            {it.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
