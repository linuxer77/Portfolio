"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Certifications from "@/components/Certifications";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import BackgroundAmbience from "@/components/BackgroundAmbience";
import MinimalView from "@/components/MinimalView";
import { useViewMode } from "@/lib/view-mode-context";
import { AnimatePresence, motion } from "framer-motion";

export default function HomePage() {
  const { viewMode } = useViewMode();

  return (
    <AnimatePresence mode="wait">
      {viewMode === "minimal" ? (
        <motion.div
          key="minimal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <MinimalView />
        </motion.div>
      ) : (
        <motion.div
          key="flow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="relative min-h-screen bg-black text-slate-100 overflow-x-hidden selection:bg-white/20 selection:text-white"
        >
          {/* Theme-Driven Ambient Glows & Interactive LED Matrix */}
          <BackgroundAmbience />

          {/* Expanded Floating Navigation with View Switcher & LED Theme Switcher */}
          <Navbar />

          {/* Main Content Area */}
          <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <Hero />
            <Experience />
            <Projects />
            <Skills />
            <Certifications />
            <Contact />
            <Footer />
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
