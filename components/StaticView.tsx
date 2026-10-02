"use client";

import { useState } from "react";
import Image from "next/image";
import {
  experiences,
  projects,
  skillCategories,
  certifications,
  education,
  personalData,
} from "@/lib/portfolio-data";
import ViewModeSwitch from "@/components/ViewModeSwitch";
import ThemeToggle from "@/components/ThemeToggle";
import {
  FaGithub,
  FaLinkedinIn,
  FaXTwitter,
  FaArrowUpRightFromSquare,
  FaFilePdf,
  FaCopy,
  FaCheck,
  FaEnvelope,
  FaRotateRight,
  FaMagnifyingGlass,
  FaTerminal,
} from "react-icons/fa6";

export default function StaticView() {
  const [activeTab, setActiveTab] = useState<string>("exp-0");
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const copyEmail = () => {
    navigator.clipboard.writeText(personalData.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const navItems = [
    { id: "exp-0", number: "01", label: experiences[0].company.toUpperCase(), short: experiences[0].role },
    { id: "exp-1", number: "02", label: experiences[1].company.toUpperCase(), short: experiences[1].role },
    { id: "exp-2", number: "03", label: experiences[2].company.toUpperCase(), short: experiences[2].role },
    { id: "exp-3", number: "04", label: experiences[3].company.toUpperCase(), short: experiences[3].role },
    { id: "sec-projects", number: "05", label: "PROJECTS", short: "FEATURED WORK" },
    { id: "sec-stack", number: "06", label: "TECH STACK", short: "SKILLS & TOOLS" },
    { id: "sec-credentials", number: "07", label: "CREDENTIALS", short: "CERTS & EDU" },
    { id: "sec-contact", number: "08", label: "CONTACT", short: "DISPATCH" },
  ];

  const scrollTo = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-zinc-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* 1. Header with unified ViewModeSwitch & ThemeToggle */}
      <header className="sticky top-0 z-50 bg-[#07080c]/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Identity (NO online badge) */}
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon.gif"
                alt={personalData.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white tracking-tight">
                {personalData.name}
              </span>
            </div>
          </div>

          {/* Quick Section Anchor Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-mono text-zinc-400">
            <button
              onClick={() => scrollTo("exp-0")}
              className="hover:text-white transition-colors uppercase tracking-wider"
            >
              EXPERIENCE
            </button>
            <button
              onClick={() => scrollTo("sec-projects")}
              className="hover:text-white transition-colors uppercase tracking-wider"
            >
              PROJECTS
            </button>
            <button
              onClick={() => scrollTo("sec-stack")}
              className="hover:text-white transition-colors uppercase tracking-wider"
            >
              TECH STACK
            </button>
            <button
              onClick={() => scrollTo("sec-credentials")}
              className="hover:text-white transition-colors uppercase tracking-wider"
            >
              CREDENTIALS
            </button>
            <button
              onClick={() => scrollTo("sec-contact")}
              className="hover:text-white transition-colors uppercase tracking-wider"
            >
              CONTACT
            </button>
          </nav>

          {/* Unified Controls Across All Views: ViewModeSwitch + ThemeToggle + Resume */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ViewModeSwitch />
            <ThemeToggle />
            <a
              href={personalData.resumePath}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold bg-white hover:bg-zinc-200 text-black rounded-lg transition-all tracking-wider uppercase shadow-sm"
            >
              <FaFilePdf size={11} />
              <span>Resume</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. Top Hero Introduction with EXACT text from flow view */}
      <section className="border-b border-zinc-800 bg-[#090a0f] py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
              <span className="text-cyan-400 font-bold">$</span>
              <span>{personalData.role.toUpperCase()}</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-300">GO &bull; PYTHON</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              {personalData.name}
            </h1>

            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl font-mono">
              {personalData.bio}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={copyEmail}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-colors"
              >
                {copied ? (
                  <>
                    <FaCheck size={12} className="text-emerald-400" />
                    <span className="text-emerald-400 font-mono">Email copied!</span>
                  </>
                ) : (
                  <>
                    <FaCopy size={12} className="text-zinc-400" />
                    <span>Copy: {personalData.email}</span>
                  </>
                )}
              </button>

              <a
                href={personalData.resumePath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white transition-colors"
              >
                <FaFilePdf size={12} />
                <span>View Résumé</span>
              </a>

              <a
                href={personalData.github}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="p-2 text-zinc-400 hover:text-white rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <FaGithub size={16} />
              </a>

              <a
                href={personalData.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="p-2 text-zinc-400 hover:text-white rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <FaLinkedinIn size={16} />
              </a>

              <a
                href={personalData.twitter}
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter"
                className="p-2 text-zinc-400 hover:text-white rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <FaXTwitter size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Split Composio Feature Architecture */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Numbered Navigation Sidebar (Fixed/Sticky on Desktop) */}
          <aside className="lg:col-span-3 sticky top-24 self-start space-y-1 bg-[#090a0f] p-2 rounded-xl border border-zinc-800">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold border-b border-zinc-800/80 mb-1">
              Architecture Index
            </div>
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  type="button"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-mono transition-all ${
                    active
                      ? "bg-blue-950/40 border border-blue-500/50 text-white shadow-sm shadow-blue-950/50"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
                  }`}
                >
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-bold transition-colors ${
                      active
                        ? "bg-blue-500 text-black font-extrabold"
                        : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                    }`}
                  >
                    {item.number}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate tracking-wider">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-zinc-500 truncate">
                      {item.short}
                    </span>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Right Main Columns: Two-Column Showcase Split */}
          <main className="lg:col-span-9 space-y-16">
            {/* EXPERIENCES */}
            {experiences.map((exp, idx) => (
              <section
                key={exp.company}
                id={`exp-${idx}`}
                className="border border-zinc-800 rounded-2xl bg-[#090a0f] overflow-hidden"
              >
                <div className="grid grid-cols-1 xl:grid-cols-12">
                  {/* Visual / Terminal Inspector Card */}
                  <div className="xl:col-span-6 p-6 sm:p-8 bg-gradient-to-br from-blue-900/60 via-zinc-900 to-zinc-950 relative flex items-center justify-center overflow-hidden border-b xl:border-b-0 xl:border-r border-zinc-800">
                    <div className="relative w-full max-w-md bg-[#0a0c14] border border-white/10 rounded-xl p-5 shadow-2xl space-y-4 font-mono text-xs">
                      {/* Search Command Input */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-zinc-300">
                        <div className="flex items-center gap-2 truncate">
                          <FaTerminal size={11} className="text-cyan-400" />
                          <span className="text-zinc-400 text-[11px] truncate">
                            $ cat {exp.company.toLowerCase().replace(/[^a-z0-9]/g, "")}_experience.json
                          </span>
                        </div>
                        <span className="text-[10px] text-cyan-400 font-semibold shrink-0">
                          0{idx + 1}
                        </span>
                      </div>

                      {/* Technical Specs Output */}
                      <div className="space-y-2 pt-1">
                        <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                          <div className="text-cyan-300 font-bold text-[11px]">
                            {exp.role.toUpperCase()}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {exp.period}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                          <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                            SKILLS &amp; ARCHITECTURE
                          </span>
                          <div className="flex flex-wrap gap-1 pt-1.5">
                            {exp.skills.map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-950/60 border border-cyan-800/40 text-cyan-300"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Refresh control */}
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => setRefreshKey((k) => k + 1)}
                          className="p-1.5 rounded-md hover:bg-white/10 text-cyan-300 transition-colors"
                          title="Reload terminal state"
                        >
                          <FaRotateRight
                            size={11}
                            className="hover:rotate-180 transition-transform duration-300"
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Technical Description & Pipe Bullets */}
                  <div className="xl:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-400 font-semibold">
                        <span>0{idx + 1}</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-cyan-400">{exp.company}</span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {exp.company}
                      </h2>

                      <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                        <span className="text-zinc-200">{exp.role}</span>
                        <span>&bull;</span>
                        <span>{exp.period}</span>
                        {exp.link && (
                          <a
                            href={exp.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            <FaArrowUpRightFromSquare size={11} />
                          </a>
                        )}
                      </div>

                      {/* EXACT Bullet Points from portfolio-data.ts */}
                      <div className="space-y-2.5 pt-2 font-mono text-xs">
                        {exp.description.map((bullet, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-3 text-zinc-300">
                            <span className="text-cyan-400 font-bold select-none">|</span>
                            <span className="leading-relaxed">{bullet}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 flex flex-wrap gap-1.5 text-[11px] font-mono">
                      {exp.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ))}

            {/* FEATURED PROJECTS */}
            <section
              id="sec-projects"
              className="border border-zinc-800 rounded-2xl bg-[#090a0f] p-6 sm:p-8 lg:p-10 space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-400 font-semibold">
                    <span>05</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-cyan-400">PROJECTS</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Featured Projects
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((proj) => (
                  <div
                    key={proj.title}
                    className="p-6 rounded-xl bg-black/40 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {proj.image && (
                        <div className="relative aspect-[16/10] w-full bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 mb-3">
                          <Image
                            src={proj.image}
                            alt={proj.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                          />
                        </div>
                      )}

                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {proj.title}
                      </h3>
                      <div className="text-xs font-mono text-zinc-400">
                        {proj.tagline}
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                        {proj.description}
                      </p>

                      {proj.highlights && proj.highlights.length > 0 && (
                        <div className="space-y-1.5 pt-1 font-mono text-xs text-zinc-400">
                          {proj.highlights.map((h, hIdx) => (
                            <div key={hIdx} className="flex items-start gap-2">
                              <span className="text-cyan-400 font-bold">&bull;</span>
                              <span>{h}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                        {proj.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono pt-1">
                        {proj.liveUrl && (
                          <a
                            href={proj.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            <span>Live</span>
                            <FaArrowUpRightFromSquare size={10} />
                          </a>
                        )}
                        {proj.githubUrl && (
                          <a
                            href={proj.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
                          >
                            <span>Code</span>
                            <FaArrowUpRightFromSquare size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* TECH STACK */}
            <section
              id="sec-stack"
              className="border border-zinc-800 rounded-2xl bg-[#090a0f] p-6 sm:p-8 lg:p-10 space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-400 font-semibold">
                <span>06</span>
                <span className="text-zinc-600">/</span>
                <span className="text-cyan-400">TECH STACK</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Core Architecture &amp; Skills
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {skillCategories.map((category) => (
                  <div
                    key={category.title}
                    className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 space-y-3"
                  >
                    <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                      {category.title}
                    </h3>
                    <ul className="space-y-2 text-xs font-mono text-zinc-300">
                      {category.skills.map((skill) => (
                        <li key={skill.name} className="flex items-center gap-2">
                          <span className="text-cyan-500 font-bold">&bull;</span>
                          <span>{skill.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* CREDENTIALS & EDUCATION */}
            <section
              id="sec-credentials"
              className="border border-zinc-800 rounded-2xl bg-[#090a0f] p-6 sm:p-8 lg:p-10 space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-400 font-semibold">
                <span>07</span>
                <span className="text-zinc-600">/</span>
                <span className="text-cyan-400">CREDENTIALS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Certifications &amp; Education
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-black/40 border border-zinc-800/80 space-y-3 font-mono">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Certifications
                  </h3>
                  {certifications.map((cert) => (
                    <div key={cert.title} className="space-y-1.5 pt-2">
                      <div className="text-sm font-bold text-white">{cert.title}</div>
                      <div className="text-xs text-zinc-400">
                        {cert.issuer} &bull; {cert.issueDate}
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed pt-1">
                        {cert.description}
                      </p>
                      {cert.credentialUrl && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 pt-1"
                        >
                          <span>Verify Credential</span>
                          <FaArrowUpRightFromSquare size={10} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-xl bg-black/40 border border-zinc-800/80 space-y-3 font-mono">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Education
                  </h3>
                  <div className="space-y-1.5 pt-2">
                    <div className="text-sm font-bold text-white">{education.degree}</div>
                    <div className="text-xs text-zinc-300">{education.institution}</div>
                    <div className="text-xs text-zinc-400">
                      {education.period} &bull; {education.location}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CONTACT */}
            <section
              id="sec-contact"
              className="border border-zinc-800 rounded-2xl bg-[#090a0f] p-6 sm:p-8 lg:p-10 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-400 font-semibold">
                <span>08</span>
                <span className="text-zinc-600">/</span>
                <span className="text-cyan-400">CONTACT</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Get in Touch
              </h2>

              <p className="text-sm text-zinc-300 font-mono max-w-xl">
                Feel free to reach out for backend engineering roles, collaborations, or questions.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={copyEmail}
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-colors"
                >
                  {copied ? (
                    <>
                      <FaCheck size={12} className="text-emerald-400" />
                      <span className="text-emerald-400">Email copied!</span>
                    </>
                  ) : (
                    <>
                      <FaCopy size={12} className="text-zinc-400" />
                      <span>{personalData.email}</span>
                    </>
                  )}
                </button>

                <a
                  href={`mailto:${personalData.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
                >
                  <FaEnvelope size={12} />
                  <span>Send Email</span>
                </a>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
