"use client";
import { useState } from "react";
import { z } from "zod";
import toast from "react-hot-toast";
import { copyToClipboard } from "@/lib/utils";
import { FiMail, FiGithub, FiLinkedin, FiCopy, FiSend } from "react-icons/fi";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10),
});

const EMAIL = "harshitg187@gmail.com"; // TODO: replace with your public email
const GITHUB = "https://github.com/linuxer77";
const LINKEDIN = "https://www.linkedin.com/in/harshit-gupta-046b66278/";

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Please fill all fields correctly.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error("Failed to send");
      toast.success("Message sent. Thanks!");
      setForm({ name: "", email: "", message: "" });
    } catch (e) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const copy = async (text: string) => {
    const ok = await copyToClipboard(text);
    toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Form card with violet glass accents */}
      <form
        onSubmit={onSubmit}
        className="glass rounded-2xl p-5 space-y-4 sheen-hover glass-bevel card-violet-hover"
      >
        <div className="h-px w-20 bg-gradient-to-r from-violet-500/70 to-violet-300/40 rounded mx-auto md:mx-0 mb-1" />
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Name</label>
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            minLength={2}
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Email</label>
          <input
            type="email"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Message</label>
          <textarea
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 h-32 outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
            minLength={10}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl btn-primary px-5 py-2.5 font-medium disabled:opacity-60 btn-shine"
        >
          <FiSend /> {loading ? "Sending..." : "Send"}
        </button>
      </form>

      {/* Other contact methods with violet styling */}
      <div className="glass rounded-2xl p-5 space-y-3 sheen-hover glass-bevel card-violet-hover">
        <h3 className="text-white font-medium">Other ways to reach</h3>
        <div className="h-px w-20 bg-gradient-to-r from-violet-500/70 to-violet-300/40 rounded" />
        <button
          onClick={() => copy(EMAIL)}
          className="w-full flex items-center justify-between rounded-xl bg-violet-500/10 border border-violet-500/25 px-4 py-3 hover:bg-violet-500/15 text-zinc-200 sheen-hover"
        >
          <span className="inline-flex items-center gap-3 text-zinc-200">
            <FiMail className="text-violet-300" /> {EMAIL}
          </span>
          <FiCopy className="text-violet-300/80" />
        </button>
        <a
          href={GITHUB}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl bg-violet-500/10 border border-violet-500/25 px-4 py-3 hover:bg-violet-500/15 text-zinc-200 sheen-hover"
        >
          <span className="inline-flex items-center gap-3">
            <FiGithub className="text-violet-300" /> GitHub
          </span>
        </a>
        <a
          href={LINKEDIN}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl bg-violet-500/10 border border-violet-500/25 px-4 py-3 hover:bg-violet-500/15 text-zinc-200 sheen-hover"
        >
          <span className="inline-flex items-center gap-3">
            <FiLinkedin className="text-violet-300" /> LinkedIn
          </span>
        </a>
      </div>
    </div>
  );
}
