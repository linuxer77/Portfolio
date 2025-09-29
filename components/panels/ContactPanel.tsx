"use client";

import { useState } from "react";

export function ContactPanel() {
  const [status, setStatus] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const email = fd.get("email") as string;
    const message = fd.get("message") as string;

    // Placeholder: normally you'd POST to an API route or serverless function
    await new Promise((r) => setTimeout(r, 600));
    setStatus(`Thanks ${name}! I'll get back to you at ${email}.`);
    e.currentTarget.reset();
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <h3 className="mb-1 text-xl font-semibold">Send a Message</h3>
      <label className="text-xs text-gray-400">Name:</label>
      <input
        name="name"
        className="rounded-md bg-white/5 p-3 outline-none ring-1 ring-white/10"
      />
      <label className="text-xs text-gray-400">Email:</label>
      <input
        name="email"
        type="email"
        className="rounded-md bg-white/5 p-3 outline-none ring-1 ring-white/10"
      />
      <label className="text-xs text-gray-400">Message:</label>
      <textarea
        name="message"
        rows={4}
        className="rounded-md bg-white/5 p-3 outline-none ring-1 ring-white/10"
      />
      <button className="mt-1 rounded-md bg-blue-600 px-4 py-3 font-medium hover:bg-blue-500">
        Send Message
      </button>
      {status && <p className="text-sm text-green-400">{status}</p>}
    </form>
  );
}
