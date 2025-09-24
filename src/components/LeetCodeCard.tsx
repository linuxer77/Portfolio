"use client";
import useSWR from "swr";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaExternalLinkAlt } from "react-icons/fa";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json;
};

export default function LeetCodeCard({
  username = "Harshit727",
}: {
  username?: string;
}) {
  const { data, isLoading, error } = useSWR(
    `/api/leetcode?u=${username}`,
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
    }
  );

  const stats = data?.profile?.submitStats?.acSubmissionNum || [];
  const easy = stats.find((s: any) => s.difficulty === "Easy")?.count ?? 0;
  const medium = stats.find((s: any) => s.difficulty === "Medium")?.count ?? 0;
  const hard = stats.find((s: any) => s.difficulty === "Hard")?.count ?? 0;

  return (
    <section className="comic-card relative p-4 sm:p-5 border border-white/10 text-white card-hover overflow-hidden">
      {/* comic burst accents */}
      <span className="absolute -left-6 -top-6 size-24 rotate-12 opacity-20 starburst" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src="/images/chat.svg"
            alt="LeetCode"
            width={28}
            height={28}
            className="opacity-90"
          />
          <h2 className="text-lg font-semibold">LeetCode Activity</h2>
        </div>
        <a
          href={`https://leetcode.com/u/${data?.username || username}/`}
          target="_blank"
          className="text-sm text-violet-300 hover:text-white inline-flex items-center gap-1"
        >
          Profile <FaExternalLinkAlt />
        </a>
      </div>

      {error && (
        <p className="text-sm text-zinc-400 mt-2">
          Failed to load LeetCode data.
        </p>
      )}

      <div
        className={`mt-4 grid grid-cols-3 gap-3 ${
          isLoading ? "animate-pulse" : ""
        }`}
      >
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-400">Easy</div>
          <div className="text-2xl font-bold text-emerald-300">{easy}</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-400">Medium</div>
          <div className="text-2xl font-bold text-amber-300">{medium}</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-400">Hard</div>
          <div className="text-2xl font-bold text-rose-300">{hard}</div>
        </div>
      </div>

      {data?.recent?.length ? (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">
            Recent submissions
          </div>
          <ul className="space-y-1.5">
            {data.recent.slice(0, 5).map((r: any) => (
              <li
                key={r.timestamp}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <a
                  className="truncate text-violet-300 hover:text-white"
                  href={`https://leetcode.com/problems/${r.titleSlug}/`}
                  target="_blank"
                >
                  {r.title}
                </a>
                <span
                  className={`text-xs rounded-full px-2 py-0.5 border ${
                    r.status === "AC"
                      ? "border-emerald-400/40 text-emerald-300"
                      : "border-zinc-400/30 text-zinc-300"
                  }`}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
