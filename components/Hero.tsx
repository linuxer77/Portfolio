"use client";

import { useState } from "react";
import { personalData } from "@/lib/portfolio-data";
import {
  FaGithub,
  FaLinkedinIn,
  FaXTwitter,
  FaEnvelope,
  FaFilePdf,
  FaCopy,
  FaCheck,
  FaArrowRight,
} from "react-icons/fa6";

export default function Hero() {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(personalData.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <section id="about" className="pt-24 pb-8 sm:pt-32 sm:pb-12">
      <div className="glass-card p-7 sm:p-10 space-y-6">
        {/* Animated PFP Avatar */}
        <div className="relative inline-block">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-xl shadow-black/80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.gif"
              alt={personalData.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Title and Intro */}
        <div className="space-y-2.5">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            {personalData.name}
          </h1>
          <p className="text-base sm:text-lg text-zinc-100 font-medium max-w-xl leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
            {personalData.bio}
          </p>
        </div>

        {/* Actions & Links */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href={personalData.resumePath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-white text-zinc-950 hover:bg-zinc-200 transition-all duration-200 shadow-sm"
          >
            <FaFilePdf size={14} className="text-zinc-800" />
            <span>View Résumé</span>
            <FaArrowRight size={11} className="text-zinc-500" />
          </a>

          <button
            onClick={copyEmail}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.14] backdrop-blur-xl transition-all duration-200"
          >
            {copied ? (
              <>
                <FaCheck size={13} className="text-white" />
                <span className="text-white font-mono text-xs">Email copied!</span>
              </>
            ) : (
              <>
                <FaCopy size={13} className="text-zinc-400" />
                <span className="font-mono text-xs">Copy Email</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 pl-1 sm:pl-2">
            <a
              href={personalData.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="p-2.5 text-zinc-400 hover:text-white rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] backdrop-blur-xl transition-all duration-200"
            >
              <FaGithub size={17} />
            </a>
            <a
              href={personalData.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="p-2.5 text-zinc-400 hover:text-white rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] backdrop-blur-xl transition-all duration-200"
            >
              <FaLinkedinIn size={17} />
            </a>
            <a
              href={personalData.twitter}
              target="_blank"
              rel="noreferrer"
              aria-label="Twitter"
              className="p-2.5 text-zinc-400 hover:text-white rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] backdrop-blur-xl transition-all duration-200"
            >
              <FaXTwitter size={17} />
            </a>
            <a
              href={`mailto:${personalData.email}`}
              aria-label="Email"
              className="p-2.5 text-zinc-400 hover:text-white rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] backdrop-blur-xl transition-all duration-200"
            >
              <FaEnvelope size={17} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
