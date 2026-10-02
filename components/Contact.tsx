"use client";

import { useState } from "react";
import { personalData } from "@/lib/portfolio-data";
import {
  FaEnvelope,
  FaCopy,
  FaCheck,
  FaGithub,
  FaLinkedinIn,
  FaXTwitter,
  FaPaperPlane,
} from "react-icons/fa6";

export default function Contact() {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(personalData.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <section id="contact" className="py-10 sm:py-14">
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0a14]/80 backdrop-blur-md border border-white/[0.08] hover:border-white/20 transition-all duration-300 relative overflow-hidden shadow-xl shadow-black/40">
        <div className="relative z-10 max-w-2xl space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 font-semibold tracking-wider uppercase">
              <FaEnvelope size={12} />
              <span>Contact</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Get In Touch
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${personalData.email}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-white hover:bg-zinc-200 text-black font-semibold transition-all duration-200 shadow-sm"
            >
              <FaPaperPlane size={13} />
              <span>Send an Email</span>
            </a>

            <button
              onClick={copyEmail}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] transition-all duration-200"
            >
              {copied ? (
                <>
                  <FaCheck size={13} className="text-white" />
                  <span className="text-white font-mono text-xs">Copied to clipboard!</span>
                </>
              ) : (
                <>
                  <FaCopy size={13} className="text-zinc-400" />
                  <span className="font-mono text-xs text-zinc-200">{personalData.email}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1 text-zinc-400">
            <span className="text-xs font-mono">Connect:</span>
            <a
              href={personalData.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="hover:text-white transition-colors"
            >
              <FaGithub size={17} />
            </a>
            <a
              href={personalData.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="hover:text-white transition-colors"
            >
              <FaLinkedinIn size={17} />
            </a>
            <a
              href={personalData.twitter}
              target="_blank"
              rel="noreferrer"
              aria-label="Twitter"
              className="hover:text-white transition-colors"
            >
              <FaXTwitter size={17} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
