import { SiPython, SiGo, SiHtml5, SiSolidity } from "react-icons/si";

const items = [
  { label: "Python", Icon: SiPython },
  { label: "Golang", Icon: SiGo },
  { label: "HTML/CSS", Icon: SiHtml5 },
  { label: "Solidity", Icon: SiSolidity },
];

export default function TechLanguages() {
  return (
    <div className="prose prose-invert max-w-none">
      <h3 className="text-accent font-retroSans font-extrabold text-4xl md:text-5xl">
        Languages
      </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map(({ label, Icon }) => (
            <div className="flex items-center gap-3 rounded-lg bg-panel/70 px-3 py-2 md:px-4 md:py-3 ring-1 ring-ring/60" key={label}>
            <Icon className="text-accent" size={26} />
            <span className="font-retroSans font-extrabold text-lg">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
