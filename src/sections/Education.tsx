type Item = {
  degree: string;
  institution: string;
  period: string;
  location?: string;
  bullets?: string[];
};

const items: Item[] = [
  {
    degree: "B.Tech in Computer Science Engineering",
    institution: "Jaypee University of Engineering and Technology",
    location: "Guna, MP",
    period: "Aug. 2023 – Ongoing",
  },
];

export default function Education() {
  return (
    <ol className="relative border-s border-white/10 pl-6 space-y-6">
      {items.map((it) => (
        <li key={it.institution} className="group">
          <div className="absolute -left-1.5 top-1 size-3 rounded-full bg-cyan-400" />
          <h3 className="text-white font-medium">
            {it.degree} · {it.institution}
          </h3>
          <p className="text-xs text-zinc-400">
            {it.period}
            {it.location ? ` · ${it.location}` : ""}
          </p>
          {it.bullets && it.bullets.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-sm text-zinc-300 space-y-1">
              {it.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
