import { IconType } from "react-icons";
import {
  FaReact,
  FaNodeJs,
  FaPython,
  FaGithub,
  FaFigma,
  FaCloud,
} from "react-icons/fa";
import {
  SiNextdotjs,
  SiTypescript,
  SiTailwindcss,
  SiFastapi,
  SiPostgresql,
  SiVercel,
  SiSupabase,
  SiCloudinary,
  SiVite,
} from "react-icons/si";

const ITEMS: {
  label: string;
  Icon: IconType;
  group: "Frontend" | "Backend" | "Database" | "Cloud" | "Tools";
}[] = [
  { label: "Next.js", Icon: SiNextdotjs, group: "Frontend" },
  { label: "React", Icon: FaReact, group: "Frontend" },
  { label: "TypeScript", Icon: SiTypescript, group: "Frontend" },
  { label: "Tailwind", Icon: SiTailwindcss, group: "Frontend" },
  { label: "Node.js", Icon: FaNodeJs, group: "Backend" },
  { label: "Python", Icon: FaPython, group: "Backend" },
  { label: "FastAPI", Icon: SiFastapi, group: "Backend" },
  { label: "PostgreSQL", Icon: SiPostgresql, group: "Database" },
  { label: "Vercel", Icon: SiVercel, group: "Cloud" },
  { label: "Supabase", Icon: SiSupabase, group: "Cloud" },
  { label: "Cloudinary", Icon: SiCloudinary, group: "Cloud" },
  { label: "Git", Icon: FaGithub, group: "Tools" },
  { label: "VS Code", Icon: FaCloud, group: "Tools" },
  { label: "Figma", Icon: FaFigma, group: "Tools" },
];

export default function TechGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {ITEMS.map(({ Icon, label, group }) => (
        <div
          key={label}
          className="glass rounded-2xl p-4 flex items-center gap-3"
        >
          <Icon className="text-2xl text-cyan-300" />
          <div>
            <div className="text-white font-medium">{label}</div>
            <div className="text-xs text-zinc-400">{group}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
