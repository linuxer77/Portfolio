import { certifications, education } from "@/lib/portfolio-data";
import {
  FaGraduationCap,
  FaAward,
  FaArrowUpRightFromSquare,
} from "react-icons/fa6";
import { IoCloudOutline } from "react-icons/io5";

export default function Certifications() {
  return (
    <section id="credentials" className="py-10 sm:py-14">
      <div className="space-y-7">
        {/* Section Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 font-semibold tracking-wider uppercase">
            <FaAward size={12} />
            <span>Credentials</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Certifications & Education
          </h2>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Certification Card */}
          {certifications.map((cert) => (
            <div
              key={cert.title}
              className="p-5 sm:p-6 rounded-2xl bg-[#0c0a14]/80 backdrop-blur-md border border-white/[0.08] hover:border-white/20 hover:bg-[#110e1c]/90 transition-all duration-200 flex flex-col justify-between space-y-4 shadow-xl shadow-black/40"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white">
                    <IoCloudOutline size={22} />
                  </div>
                  <span className="font-mono text-xs text-zinc-300 font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                    {cert.issuer} Certified
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    {cert.title}
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    Issued {cert.issueDate}
                  </p>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  {cert.description}
                </p>
              </div>

              <div className="pt-2">
                <a
                  href={cert.credentialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-white hover:text-zinc-300 transition-colors"
                >
                  <span>Verify on Oracle CertView</span>
                  <FaArrowUpRightFromSquare size={11} />
                </a>
              </div>
            </div>
          ))}

          {/* Education Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0c0a14]/80 backdrop-blur-md border border-white/[0.08] hover:border-white/20 hover:bg-[#110e1c]/90 transition-all duration-200 flex flex-col justify-between space-y-4 shadow-xl shadow-black/40">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white">
                  <FaGraduationCap size={20} />
                </div>
                <span className="font-mono text-xs text-zinc-300 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                  {education.period}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {education.degree}
                </h3>
                <p className="text-xs text-zinc-300">
                  {education.institution}
                </p>
                <p className="text-xs font-mono text-zinc-500">
                  {education.location}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
