import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://harshit.dev"),
  title: "Harshit Gupta — Backend Engineer",
  description:
    "Portfolio of Harshit Gupta, a Backend Engineer using Python and Go.",
  icons: {
    icon: "/favicon.gif",
    shortcut: "/favicon.gif",
    apple: "/icon.gif",
  },
  keywords: [
    "Harshit Gupta",
    "Backend Engineer",
    "Backend Developer",
    "Golang",
    "Python",
    "PostgreSQL",
    "Docker",
    "AWS",
    "API Security",
  ],
  authors: [{ name: "Harshit Gupta" }],
  openGraph: {
    title: "Harshit Gupta — Backend Engineer",
    description: "Backend engineer using Python and Go.",
    type: "website",
    images: [{ url: "/icon.gif" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <head>
        <link rel="icon" type="image/gif" href="/favicon.gif" />
        <link rel="shortcut icon" type="image/gif" href="/favicon.gif" />
      </head>
      <body className="font-sans min-h-screen bg-[#090b10] text-slate-200 antialiased selection:bg-purple-500/25 selection:text-purple-300">
        {children}
      </body>
    </html>
  );
}
