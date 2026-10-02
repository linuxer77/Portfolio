import { certifications, education } from "@/lib/portfolio-data";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";

export default function Certifications() {
  return (
    <section id="credentials" className="py-10 sm:py-14">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-8">
        Certifications & Education
      </h2>

      <div className="space-y-6">
        {/* Certifications */}
        {certifications.map((cert) => (
          <div
            key={cert.title}
            className="glass-card p-6 sm:p-8 space-y-2 group"
          >
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white group-hover:text-zinc-100 transition-colors">
                  {cert.title}
                </h3>
                <a
                  href={cert.credentialUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Verify credential on Oracle CertView"
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <FaArrowUpRightFromSquare size={11} />
                </a>
              </div>
              <span className="font-mono text-xs text-zinc-400">
                Issued {cert.issueDate}
              </span>
            </div>

            <p className="text-sm font-mono text-zinc-300">
              {cert.issuer}
            </p>

            <p className="text-sm text-zinc-400 leading-relaxed">
              {cert.description}
            </p>
          </div>
        ))}

        {/* Education */}
        <div className="glass-card p-6 sm:p-8 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
            <h3 className="text-lg font-bold text-white">
              {education.degree}
            </h3>
            <span className="font-mono text-xs text-zinc-400">
              {education.period}
            </span>
          </div>

          <p className="text-sm font-mono text-zinc-300">
            {education.institution}
          </p>

          <p className="text-xs font-mono text-zinc-500">
            {education.location}
          </p>
        </div>
      </div>
    </section>
  );
}
