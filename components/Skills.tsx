import { skillCategories } from "@/lib/portfolio-data";
import {
  SiGo,
  SiPython,
  SiJavascript,
  SiSolidity,
  SiPostgresql,
  SiRedis,
  SiMysql,
  SiSqlite,
  SiIpfs,
  SiDocker,
  SiLinux,
  SiAmazon,
  SiGit,
  SiDjango,
  SiFlask,
  SiOpentelemetry,
} from "react-icons/si";
import {
  FaTerminal,
  FaDatabase,
  FaServer,
  FaKey,
  FaNetworkWired,
  FaCode,
  FaWrench,
} from "react-icons/fa6";
import { IoCloudOutline } from "react-icons/io5";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  go: SiGo,
  python: SiPython,
  javascript: SiJavascript,
  solidity: SiSolidity,
  sql: FaDatabase,
  bash: FaTerminal,
  api: FaNetworkWired,
  microservices: FaServer,
  concurrency: FaCode,
  jwt: FaKey,
  django: SiDjango,
  "go-chi": SiGo,
  flask: SiFlask,
  postgresql: SiPostgresql,
  redis: SiRedis,
  mysql: SiMysql,
  sqlite: SiSqlite,
  ipfs: SiIpfs,
  docker: SiDocker,
  linux: SiLinux,
  aws: SiAmazon,
  oci: IoCloudOutline,
  git: SiGit,
  opentelemetry: SiOpentelemetry,
};

export default function Skills() {
  return (
    <section id="skills" className="py-10 sm:py-14">
      <div className="space-y-7">
        {/* Section Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 font-semibold tracking-wider uppercase">
            <FaWrench size={12} />
            <span>Tech Stack</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Tech Stack
          </h2>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {skillCategories.map((category) => (
            <div
              key={category.title}
              className="p-5 sm:p-6 rounded-2xl bg-[#0c0a14]/80 backdrop-blur-md border border-white/[0.08] hover:border-white/20 hover:bg-[#110e1c]/90 transition-all duration-200 space-y-4 shadow-xl shadow-black/40"
            >
              <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-white">
                {category.title}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {category.skills.map((skill) => {
                  const Icon = iconMap[skill.iconKey] || FaCode;
                  return (
                    <div
                      key={skill.name}
                      className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/20 hover:bg-white/[0.07] transition-all duration-200"
                    >
                      <Icon
                        size={17}
                        className="text-zinc-400 group-hover:text-white transition-colors shrink-0"
                      />
                      <span className="text-xs font-medium text-zinc-300 group-hover:text-white truncate transition-colors">
                        {skill.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
