"use client";

import { useState } from "react";
import { personalData } from "@/lib/portfolio-data";
import {
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
      <div className="glass-card p-7 sm:p-9 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Get In Touch
        </h2>

        <p className="text-sm text-zinc-300 max-w-lg leading-relaxed">
          Feel free to reach out for backend engineering roles, systems design discussions, or collaborations.
        </p>

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

        <div className="flex items-center gap-4 pt-2 text-zinc-400 border-t border-white/[0.06]">
          <span className="text-xs font-mono text-zinc-500">Links:</span>
          <a
            href={personalData.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="hover:text-white transition-colors"
          >
            <FaGithub size={18} />
          </a>
          <a
            href={personalData.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            className="hover:text-white transition-colors"
          >
            <FaLinkedinIn size={18} />
          </a>
          <a
            href={personalData.twitter}
            target="_blank"
            rel="noreferrer"
            aria-label="Twitter"
            className="hover:text-white transition-colors"
          >
            <FaXTwitter size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}
