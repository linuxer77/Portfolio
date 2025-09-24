import type { Project } from "@/components/Projects";

export const projects: Project[] = [
  {
    title: "Algo Trading System",
    image: "/images/algo-trade.jpg", // put your screenshot here
    tech: ["Go", "Python", "AWS EC2", "Telegram API", "Pushover"],
    repo: "https://www.linkedin.com/posts/harshit-gupta-046b66278_built-this-system-in-about-a-month-been-activity-7347274128862687232-LNG4?utm_source=share&utm_medium=member_desktop&rcm=ACoAAEPNkrYBLtIRl5wn8GUFMFUnYsDnisv1EaE", // replace with actual links
    category: "Tools",
    description: "Here’s how I earn 10k per month from my algo trading bot.",
  },
  {
    title: "VeriCred: Blockchain Credentialing",
    image: "/images/vericred.jpg", // put your screenshot here
    tech: ["Go", "Solidity", "React", "IPFS", "go-eth"],
    repo: "https://github.com/", // replace with actual repo
    demo: "https://vericred-frontend-fs1a.vercel.app/", // replace with live demo
    category: "Web",
    description:
      "Issue and verify academic credentials as NFTs with on‑chain validation.",
  },
  {
    title: "IPFS Health Storage",
    image: "/images/ipfs-health.svg", // improved custom illustration
    tech: ["Python", "Django", "REST API", "IPFS", "Solidity"],
    repo: "https://github.com/linuxer77/Backend-Medicheck", // replace with actual repo
    category: "Web",
    description:
      "Django REST backend for secure medical records with IPFS storage.",
  },
];
