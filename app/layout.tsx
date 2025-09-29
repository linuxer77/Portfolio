import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harshit Gupta | Portfolio",
  description: "Portfolio of Harshit Gupta",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P:wght@400&family=VT323:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`min-h-screen bg-bg antialiased text-[18px] md:text-[20px]`}
      >
        <div className="pointer-events-none fixed inset-0 opacity-30 [background:radial-gradient(800px_400px_at_70%_20%,#ffffff10,transparent),radial-gradient(600px_300px_at_10%_90%,#2a9d8f10,transparent)]" />
        <div className="relative">{children}</div>
      </body>
    </html>
  );
}
