"use client";
import { motion } from "framer-motion";
import { IconType } from "react-icons";
import {
  SiPython,
  SiGo,
  SiHtml5,
  SiSolidity,
  SiDjango,
  SiReact,
  SiFlask,
  SiLinux,
  SiGit,
  SiGithub,
  SiDocker,
  SiIpfs,
  SiJsonwebtokens,
} from "react-icons/si";
import { FaAws, FaCode } from "react-icons/fa";
import { TbApi } from "react-icons/tb";
import { RiKey2Line } from "react-icons/ri";
import { BsCloud, BsHexagon } from "react-icons/bs";

type Item = { name: string; icon: IconType };

type GroupType = { title: string; items: Item[] };

const groups: GroupType[] = [
  {
    title: "Languages",
    items: [
      { name: "Python", icon: SiPython },
      { name: "Golang", icon: SiGo },
      { name: "HTML/CSS", icon: SiHtml5 },
      { name: "Solidity", icon: SiSolidity },
    ],
  },
  {
    title: "Frameworks",
    items: [
      { name: "Django", icon: SiDjango },
      { name: "Go-Chi", icon: SiGo },
      { name: "Go-Gin", icon: SiGo },
      { name: "React", icon: SiReact },
      { name: "Flask", icon: SiFlask },
    ],
  },
  {
    title: "Developer Tools",
    items: [
      { name: "Linux", icon: SiLinux },
      { name: "Git", icon: SiGit },
      { name: "Github", icon: SiGithub },
      { name: "VS Code", icon: FaCode as unknown as IconType },
      { name: "Docker", icon: SiDocker },
      { name: "AWS", icon: FaAws as unknown as IconType },
      { name: "Remix IDE", icon: SiSolidity },
    ],
  },
  {
    title: "Technologies",
    items: [
      { name: "REST APIs", icon: TbApi as unknown as IconType },
      { name: "IPFS", icon: SiIpfs },
      { name: "Smart Contracts", icon: SiSolidity },
      { name: "Blockchain", icon: BsHexagon as unknown as IconType },
      { name: "JWT Auth", icon: SiJsonwebtokens },
      { name: "OAuth", icon: RiKey2Line as unknown as IconType },
      { name: "Cloud", icon: BsCloud as unknown as IconType },
    ],
  },
];

function Group({ title, items }: GroupType) {
  return (
    <div className="rounded-2xl p-5 bg-[linear-gradient(135deg,rgba(14,14,18,.88),rgba(20,20,26,.78))] border border-white/10 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.04)] sheen-hover glass-bevel card-violet-hover">
      <h3 className="text-sm font-medium text-zinc-300 mb-3">{title}</h3>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05 } },
        }}
        className="flex flex-wrap gap-2"
      >
        {items.map((it) => (
          <motion.span
            key={it.name}
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.3 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-xl chip-soft px-3 py-1.5 text-sm"
          >
            <it.icon aria-hidden className="text-[18px] text-white/90" />
            {it.name}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

export default function TechStack() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g, idx) => (
        <motion.div
          key={g.title}
          className="animate-float-slow"
          style={{ animationDelay: `${idx * 0.25}s` }}
        >
          <Group title={g.title} items={g.items} />
        </motion.div>
      ))}
    </div>
  );
}
