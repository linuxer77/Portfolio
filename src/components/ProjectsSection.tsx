"use client";
import Section from "./Section";
import { ProjectsGrid } from "./Projects";
import { projects } from "@/content/projects";

export default function ProjectsSection() {
  return (
    <Section
      id="projects"
      title="Projects"
      subtitle="A selection of recent work"
    >
      <ProjectsGrid projects={projects} />
    </Section>
  );
}
