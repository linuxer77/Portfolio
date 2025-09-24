import type { Metadata } from "next";
import { Geist, Geist_Mono, Comic_Neue } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Nav from "@/components/Nav";
import { Toaster } from "react-hot-toast";
import SplashScreen from "@/components/SplashScreen";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const comic = Comic_Neue({
  variable: "--font-comic",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Linuxer77 — Full-Stack Developer",
    template: "%s | Linuxer77",
  },
  description:
    "Full-Stack Developer and UI/UX enthusiast crafting fast, accessible, and delightful web experiences.",
  keywords: [
    "Full-Stack Developer",
    "Next.js",
    "React",
    "TypeScript",
    "Tailwind CSS",
    "Node.js",
    "FastAPI",
  ],
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "Linuxer77 — Full-Stack Developer",
    description:
      "Portfolio showcasing projects, GitHub activity, experience, and contact details.",
    url: "https://your-domain.com",
    siteName: "Linuxer77 Portfolio",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linuxer77 — Full-Stack Developer",
    description:
      "Portfolio showcasing projects, GitHub activity, experience, and contact details.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${comic.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <SplashScreen />
          <Nav />
          {children}
          <Toaster position="top-right" />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
