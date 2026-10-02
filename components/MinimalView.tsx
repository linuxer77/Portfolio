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
import { FaFilePdf, FaCopy, FaCheck } from "react-icons/fa6";

// Wireframe Glyphs matching the Riften design language
function GlyphAsterisk() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-zinc-400 fill-none" strokeWidth="1.2">
      <line x1="50" y1="10" x2="50" y2="90" />
      <line x1="10" y1="50" x2="90" y2="50" />
      <line x1="22" y1="22" x2="78" y2="78" />
      <line x1="22" y1="78" x2="78" y2="22" />
      {/* Outer chevron ties */}
      <line x1="50" y1="10" x2="78" y2="78" />
      <line x1="50" y1="10" x2="22" y2="78" />
      <line x1="50" y1="90" x2="78" y2="22" />
      <line x1="50" y1="90" x2="22" y2="22" />
    </svg>
  );
}

function GlyphWheel() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-zinc-400 fill-none" strokeWidth="1.2">
      <circle cx="50" cy="50" r="38" />
      <line x1="50" y1="12" x2="50" y2="88" />
      <line x1="12" y1="50" x2="88" y2="50" />
      <line x1="23.1" y1="23.1" x2="76.9" y2="76.9" />
      <line x1="23.1" y1="76.9" x2="76.9" y2="23.1" />
    </svg>
  );
}

function GlyphDiamond() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-zinc-400 fill-none" strokeWidth="1.2">
      <polygon points="50,14 86,50 50,86 14,50" />
      <polygon points="50,26 74,50 50,74 26,50" />
      <line x1="50" y1="6" x2="50" y2="94" />
      <line x1="6" y1="50" x2="94" y2="50" />
      <circle cx="50" cy="50" r="3" className="fill-zinc-400" />
    </svg>
  );
}

function GlyphCube() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-zinc-400 fill-none" strokeWidth="1.2">
      {/* Top Face */}
      <polygon points="50,18 82,34 50,50 18,34" />
      {/* Left Face */}
      <polygon points="18,34 50,50 50,82 18,66" />
      {/* Right Face */}
      <polygon points="50,50 82,34 82,66 50,82" />
      <line x1="50" y1="50" x2="50" y2="82" />
    </svg>
  );
}

function GlyphHexAperture() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-zinc-400 fill-none" strokeWidth="1.2">
      <polygon points="50,12 85,31 85,69 50,88 15,69 15,31" />
      <circle cx="50" cy="50" r="20" />
      <line x1="50" y1="12" x2="50" y2="30" />
      <line x1="85" y1="69" x2="67" y2="60" />
      <line x1="15" y1="69" x2="33" y2="60" />
    </svg>
  );
}

function GlyphOrbits() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-zinc-400 fill-none" strokeWidth="1.2">
      <ellipse cx="50" cy="50" rx="40" ry="16" transform="rotate(-30 50 50)" />
      <ellipse cx="50" cy="50" rx="40" ry="16" transform="rotate(30 50 50)" />
      <circle cx="50" cy="50" r="7" className="fill-zinc-400" />
    </svg>
  );
}

const glyphs = [
  <GlyphAsterisk key="g1" />,
  <GlyphWheel key="g2" />,
  <GlyphDiamond key="g3" />,
  <GlyphCube key="g4" />,
  <GlyphHexAperture key="g5" />,
  <GlyphOrbits key="g6" />,
];

export default function MinimalView() {
  const [activeSection, setActiveSection] = useState("experience");
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(personalData.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      {/* 1. Riften Top Navigation Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-dotted border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Identity & Nav Links */}
          <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
            <button
              onClick={() => scrollTo("intro")}
              className="text-xs sm:text-sm font-bold tracking-widest uppercase hover:text-zinc-300 transition-colors shrink-0 underline underline-offset-8 decoration-1 decoration-white font-mono"
            >
              0x6867
            </button>

            <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-400 tracking-wider uppercase">
              <button
                onClick={() => scrollTo("experience")}
                className={`hover:text-white transition-colors ${
                  activeSection === "experience" ? "text-white underline underline-offset-8 decoration-1" : ""
                }`}
              >
                EXPERIENCE
              </button>
              <button
                onClick={() => scrollTo("projects")}
                className={`hover:text-white transition-colors ${
                  activeSection === "projects" ? "text-white underline underline-offset-8 decoration-1" : ""
                }`}
              >
                PROJECTS
              </button>
              <button
                onClick={() => scrollTo("stack")}
                className={`hover:text-white transition-colors ${
                  activeSection === "stack" ? "text-white underline underline-offset-8 decoration-1" : ""
                }`}
              >
                STACK
              </button>
              <button
                onClick={() => scrollTo("contact")}
                className={`hover:text-white transition-colors ${
                  activeSection === "contact" ? "text-white underline underline-offset-8 decoration-1" : ""
                }`}
              >
                CONTACT
              </button>
            </nav>
          </div>

          {/* Minimal View Controls: ViewModeSwitch + Resume (ThemeToggle only on Flow view) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ViewModeSwitch />
            <a
              href={personalData.resumePath}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-black bg-white hover:bg-zinc-200 font-bold transition-colors select-none"
            >
              <FaFilePdf size={11} />
              <span>RESUME ↗</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Intro Banner */}
      <section id="intro" className="border-b border-dotted border-zinc-800 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4 max-w-3xl">
            <div className="text-[11px] text-zinc-400 uppercase tracking-widest">
              SYSTEM PROFILE // {personalData.role.toUpperCase()}
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white uppercase">
              {personalData.name}
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl font-mono">
              {personalData.bio}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
              <button
                onClick={copyEmail}
                type="button"
                className="underline underline-offset-4 decoration-zinc-500 hover:decoration-white text-zinc-300 hover:text-white transition-colors"
              >
                {copied ? "EMAIL COPIED" : `COPY: ${personalData.email}`}
              </button>
              <a
                href={personalData.github}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 decoration-zinc-500 hover:decoration-white text-zinc-300 hover:text-white transition-colors"
              >
                GITHUB ↗
              </a>
              <a
                href={personalData.linkedin}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 decoration-zinc-500 hover:decoration-white text-zinc-300 hover:text-white transition-colors"
              >
                LINKEDIN ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Experiences: 3-Column Rows with Dotted Lines */}
      <section id="experience">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {experiences.map((exp, idx) => (
            <div
              key={exp.company}
              className="border-b border-dotted border-zinc-800 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
            >
              {/* Column 1: Monochrome High-Contrast Company Logo / Image */}
              <div className="lg:col-span-5">
                <div className="relative aspect-[16/10] w-full bg-black border border-zinc-800/80 overflow-hidden">
                  <Image
                    src={exp.image || "/companies/maximize-bw.png"}
                    alt={exp.company}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover grayscale contrast-125 brightness-95 hover:brightness-110 transition-all duration-500"
                  />
                </div>
              </div>

              {/* Column 2: Title, Exact Bullets, Link */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold tracking-wider text-white uppercase inline-block underline underline-offset-8 decoration-1 decoration-zinc-400">
                    {exp.company.toUpperCase()}.
                  </h2>
                  <div className="text-[11px] text-zinc-400 mt-2 uppercase tracking-wide">
                    {exp.role} &bull; {exp.period}
                  </div>
                </div>

                {/* EXACT Bullet points from portfolio-data.ts */}
                <div className="space-y-3 pt-2 text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                  {exp.description.map((bullet, bIdx) => (
                    <p key={bIdx} className="leading-relaxed">
                      {bullet}
                    </p>
                  ))}
                </div>

                {/* Tech Skills */}
                <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-zinc-400">
                  {exp.skills.map((skill) => (
                    <span
                      key={skill}
                      className="border-b border-dotted border-zinc-700 pb-0.5"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Action Link */}
                {exp.link && (
                  <div className="pt-2">
                    <a
                      href={exp.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-xs text-zinc-300 hover:text-white underline underline-offset-8 decoration-1 decoration-zinc-500 hover:decoration-white transition-colors"
                    >
                      Explore {exp.company} ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Column 3: Monospace Index & Geometric Wireframe Glyph */}
              <div className="lg:col-span-2 flex flex-col justify-between h-full space-y-6">
                <div className="space-y-1 text-xs text-zinc-400 tracking-wider">
                  <div>0{idx + 1} / EXPERIENCE</div>
                  <div className="text-white uppercase font-bold truncate">
                    {exp.company.split(".")[0]}
                  </div>
                </div>

                <div className="pt-2 text-zinc-400 opacity-80 hover:opacity-100 transition-opacity">
                  {glyphs[idx % glyphs.length]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Projects: 3-Column Rows with Dotted Lines */}
      <section id="projects">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-10 pb-4 border-b border-dotted border-zinc-800 text-xs text-zinc-400 uppercase tracking-widest">
            FEATURED PROJECTS // SELECTED WORK
          </div>

          {projects.map((proj, idx) => (
            <div
              key={proj.title}
              className="border-b border-dotted border-zinc-800 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
            >
              {/* Column 1: Project Image */}
              <div className="lg:col-span-5">
                <div className="relative aspect-[16/10] w-full bg-zinc-950 border border-zinc-900 overflow-hidden">
                  {proj.image ? (
                    <Image
                      src={proj.image}
                      alt={proj.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover grayscale contrast-125 brightness-90 hover:brightness-100 transition-all duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                      [PREVIEW]
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Exact Project Description & Highlights */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold tracking-wider text-white uppercase inline-block underline underline-offset-8 decoration-1 decoration-zinc-400">
                    {proj.title.toUpperCase()}.
                  </h2>
                  <div className="text-[11px] text-zinc-400 mt-2 uppercase tracking-wide">
                    {proj.tagline}
                  </div>
                </div>

                <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                  {proj.description}
                </p>

                {proj.highlights && proj.highlights.length > 0 && (
                  <div className="space-y-2 pt-1 text-xs text-zinc-300">
                    {proj.highlights.map((h, hIdx) => (
                      <p key={hIdx} className="leading-relaxed">
                        &bull; {h}
                      </p>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-zinc-400">
                  {proj.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border-b border-dotted border-zinc-700 pb-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-2 text-xs">
                  {proj.liveUrl && (
                    <a
                      href={proj.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-300 hover:text-white underline underline-offset-8 decoration-1 decoration-zinc-500 hover:decoration-white transition-colors"
                    >
                      Live Deployment ↗
                    </a>
                  )}
                  {proj.githubUrl && (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-300 hover:text-white underline underline-offset-8 decoration-1 decoration-zinc-500 hover:decoration-white transition-colors"
                    >
                      Source Code ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Column 3: Project Index & Wireframe Glyph */}
              <div className="lg:col-span-2 flex flex-col justify-between h-full space-y-6">
                <div className="space-y-1 text-xs text-zinc-400 tracking-wider">
                  <div>0{idx + 5} / PROJECT</div>
                  <div className="text-white uppercase font-bold truncate">
                    {proj.title}
                  </div>
                </div>

                <div className="pt-2 text-zinc-400 opacity-80 hover:opacity-100 transition-opacity">
                  {glyphs[(idx + 4) % glyphs.length]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Tech Stack & Credentials */}
      <section id="stack" className="border-b border-dotted border-zinc-800 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">
            CORE CAPABILITIES // ARCHITECTURE &amp; STACK
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {skillCategories.map((category) => (
              <div key={category.title} className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider underline underline-offset-4 decoration-1 decoration-zinc-500">
                  {category.title}
                </h3>
                <ul className="space-y-2 text-xs text-zinc-300 font-mono">
                  {category.skills.map((skill) => (
                    <li key={skill.name} className="flex items-center gap-2">
                      <span className="text-zinc-600">&bull;</span>
                      <span>{skill.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Certifications & Education */}
          <div className="pt-8 border-t border-dotted border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-mono">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider underline underline-offset-4 decoration-1 decoration-zinc-500">
                CERTIFICATIONS
              </h3>
              {certifications.map((cert) => (
                <div key={cert.title} className="space-y-1 pt-1">
                  <div className="text-zinc-200 font-semibold">{cert.title}</div>
                  <div className="text-zinc-400">
                    {cert.issuer} &bull; {cert.issueDate}
                  </div>
                  {cert.credentialUrl && (
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-zinc-400 hover:text-white underline underline-offset-4 decoration-zinc-600"
                    >
                      Verify Credential ↗
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider underline underline-offset-4 decoration-1 decoration-zinc-500">
                EDUCATION
              </h3>
              <div className="space-y-1 pt-1">
                <div className="text-zinc-200 font-semibold">{education.degree}</div>
                <div className="text-zinc-400">{education.institution}</div>
                <div className="text-zinc-500">
                  {education.period} &bull; {education.location}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Contact & Footer */}
      <footer id="contact" className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-6 text-xs font-mono text-zinc-400">
            <div className="text-zinc-500 font-mono">
              0x6867
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={copyEmail}
                type="button"
                className="hover:text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-white transition-colors"
              >
                {copied ? "COPIED" : personalData.email}
              </button>
              <a
                href={personalData.github}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-white transition-colors"
              >
                GITHUB ↗
              </a>
              <a
                href={personalData.linkedin}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-white transition-colors"
              >
                LINKEDIN ↗
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
