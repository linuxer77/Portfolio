import { SiDjango, SiReact, SiFlask } from "react-icons/si";
import { PiBroomBold } from "react-icons/pi";

const items = [
  { label: "Django", Icon: SiDjango },
  { label: "Go-Chi", Icon: PiBroomBold },
  { label: "Go-Gin", Icon: PiBroomBold },
  { label: "React", Icon: SiReact },
  { label: "Flask", Icon: SiFlask },
];

export default function TechFrameworks() {
  return (
    <div className="prose prose-invert max-w-none">
      <h3 className="text-accent font-retroSans font-extrabold text-4xl md:text-5xl">
        Frameworks
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map(({ label, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg bg-panel/70 px-3 py-2 md:px-4 md:py-3 ring-1 ring-ring/60"
          >
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
