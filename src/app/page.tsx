import Hero from "@/components/Hero";
import GitHubHeatmap from "@/components/GitHubHeatmap";
import Section from "@/components/Section";
import ProjectsSection from "@/components/ProjectsSection";
import About from "@/sections/About";
import Education from "@/sections/Education";
import TechStack from "@/components/TechStack";
import Contact from "@/components/Contact";
import LeetCodeCard from "@/components/LeetCodeCard";

export default function Home() {
  return (
    <div className="min-h-screen relative">
      {/* Photo background layer */}
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center blur-[8px]"
        style={{ backgroundImage: "url(/3d-mountain-landscape-sunset.jpg)" }}
        aria-hidden
      />
      {/* Optional dark tint for readability */}
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/30 to-black/60"
        aria-hidden
      />

      <div className="absolute inset-0 bg-dot-grid opacity-60 -z-0" />
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

        <Section id="open-source" title="My Activity" subtitle="GitHub and LeetCode">
          <div className="grid md:grid-cols-2 gap-6">
            <GitHubHeatmap />
            <LeetCodeCard username="Harshit727" />
          </div>
        </Section>

        <Section id="contact" title="Contact">
          <Contact />
        </Section>
      </main>
    </div>
  );
}
