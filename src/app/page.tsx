import Hero from "@/components/Hero";
import GitHubHeatmap from "@/components/GitHubHeatmap";
import Section from "@/components/Section";
import ProjectsSection from "@/components/ProjectsSection";
import About from "@/sections/About";
import Education from "@/sections/Education";
import TechStack from "@/components/TechStack";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 bg-dot-grid opacity-60 -z-10" />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12 md:py-14 space-y-16 sm:space-y-18 md:space-y-20">
        <Section id="#" title="">
          <Hero />
        </Section>

        <ProjectsSection />

        <Section id="tech" title="My Tech-Stack">
          <TechStack />
        </Section>

        <Section id="about" title="About Me">
          <About />
        </Section>

        <Section id="education" title="Education">
          <Education />
        </Section>

        <Section
          id="open-source"
          title="My GitHub"
          subtitle="Live contributions and activity"
        >
          <GitHubHeatmap />
        </Section>

        <Section id="contact" title="Contact">
          <Contact />
        </Section>
      </main>

      <footer className="border-t border-white/10 mt-16 py-10 text-center text-sm text-zinc-400">
        © {new Date().getFullYear()} Linuxer77. All rights reserved.
      </footer>
    </div>
  );
}
