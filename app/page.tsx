import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Certifications from "@/components/Certifications";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import PixelBackground from "@/components/PixelBackground";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#090714] text-slate-100 overflow-x-hidden selection:bg-pink-500/25 selection:text-amber-200">
      {/* Interactive Zoomable Retro Pixel Background */}
      <PixelBackground />

      {/* Floating Navigation */}
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
    </div>
  );
}
