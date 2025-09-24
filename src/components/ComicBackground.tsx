"use client";

export default function ComicBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen relative">{children}</div>;
}
