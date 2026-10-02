import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-bold mb-4">404 // NOT FOUND</h2>
      <p className="text-zinc-500 mb-6 text-sm">The requested route could not be found.</p>
      <Link
        href="/"
        className="px-4 py-2 border border-dotted border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-400 transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
}
