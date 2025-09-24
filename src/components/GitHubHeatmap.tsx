"use client";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";

const Calendar = dynamic(() => import("react-calendar-heatmap"), {
  ssr: false,
});

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok)
    throw Object.assign(new Error(json?.error || "Request failed"), {
      status: res.status,
      data: json,
    });
  return json;
};

export default function GitHubHeatmap() {
  const { data, isLoading, error } = useSWR("/api/github", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  const total =
    data?.user?.contributionsCollection?.contributionCalendar
      ?.totalContributions ?? 0;
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  useEffect(() => {
    const controls = animate(count, total, { duration: 0.8, ease: "easeOut" });
    return () => controls.stop();
  }, [total]);

  const days = useMemo(() => {
    const weeks =
      data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
    return weeks
      .flatMap((w: any) => w.contributionDays)
      .map((d: any) => ({ date: d.date, count: d.contributionCount }));
  }, [data]);

  const empty = !isLoading && !error && (!days || days.length === 0);

  return (
    <section className="comic-card relative p-4 sm:p-5 border border-white/10 text-white card-hover overflow-hidden">
      {/* burst accents */}
      <span className="absolute -right-8 -top-8 size-28 -rotate-12 opacity-25 starburst" />
      <span className="absolute -left-10 bottom-0 size-24 rotate-6 opacity-15 starburst" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-xl font-bold h-comic tracking-wider">
          GitHub Activity
        </h2>
        <div className="text-xs text-zinc-300/90 flex items-center gap-2">
          <span>Total</span>
          <motion.span className="inline-flex px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-100">
            {rounded}
          </motion.span>
        </div>
      </div>

      <div
        className={cn("mt-3", isLoading && "animate-pulse")}
        aria-busy={isLoading}
        aria-live="polite"
      >
        {error && (
          <p className="text-zinc-400 text-sm">
            {error.status === 429 ? (
              <>Rate limited. Try again shortly.</>
            ) : error.status === 401 || error.status === 400 ? (
              <>Auth error loading GitHub data.</>
            ) : (
              <>Failed to load GitHub data: {String(error.message)}</>
            )}
          </p>
        )}
        {empty && (
          <p className="text-zinc-400 text-sm">No contributions found.</p>
        )}
        <div
          className="overflow-x-auto -mx-2 px-2 cursor-grab active:cursor-grabbing"
          role="region"
          aria-label="Contributions heatmap"
        >
          {!isLoading && !error && !empty && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Scale down the heatmap grid to reduce box sizes */}
              <div className="origin-top-left scale-[0.9] sm:scale-[0.95]">
                <div className="min-w-[640px]">
                  <Calendar
                    startDate={
                      new Date(
                        new Date().setFullYear(new Date().getFullYear() - 1)
                      )
                    }
                    endDate={new Date()}
                    values={days}
                    classForValue={(val: any) => {
                      if (!val) return "color-empty";
                      if (val.count === 0) return "color-empty";
                      if (val.count < 2) return "color-scale-1";
                      if (val.count < 4) return "color-scale-2";
                      if (val.count < 8) return "color-scale-3";
                      return "color-scale-4";
                    }}
                    tooltipDataAttrs={(value: any) => ({
                      "aria-label": `${value?.date || ""}: ${
                        value?.count || 0
                      } contributions`,
                      "data-tip": `${value?.date || ""}: ${
                        value?.count || 0
                      } contributions`,
                    })}
                    showMonthLabels
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

<style jsx global>{`
  .react-calendar-heatmap .color-empty {
    fill: rgba(255, 255, 255, 0.06);
  }
  .react-calendar-heatmap .color-scale-1 {
    fill: #1f2a44;
  }
  .react-calendar-heatmap .color-scale-2 {
    fill: #2c4a7c;
  }
  .react-calendar-heatmap .color-scale-3 {
    fill: #3565a8;
  }
  .react-calendar-heatmap .color-scale-4 {
    fill: #4d9be6;
  }
  .react-calendar-heatmap text {
    fill: rgba(255, 255, 255, 0.5);
    font-size: 10px;
  }
`}</style>;
