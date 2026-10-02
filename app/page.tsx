"use client";

/*
// Flow Mode components preserved for future activation:
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Certifications from "@/components/Certifications";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import BackgroundAmbience from "@/components/BackgroundAmbience";
import { useViewMode } from "@/lib/view-mode-context";
import { AnimatePresence, motion } from "framer-motion";
*/

import MinimalView from "@/components/MinimalView";

export default function HomePage() {
  // Always renders the Minimal Brutalist View
  return <MinimalView />;

  /*
  // Flow View preserved:
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
          <BackgroundAmbience />
          <Navbar />
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
  */
}
