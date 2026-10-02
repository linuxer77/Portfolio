export interface Experience {
  company: string;
  role: string;
  period: string;
  location?: string;
  description: string[];
  skills: string[];
  link?: string;
}

export interface Project {
  title: string;
  tagline: string;
  description: string;
  highlights?: string[];
  tags: string[];
  image?: string;
  githubUrl?: string;
  liveUrl?: string;
  featured?: boolean;
}

export interface SkillCategory {
  title: string;
  skills: { name: string; iconKey: string }[];
}

export interface Certification {
  title: string;
  issuer: string;
  issueDate: string;
  credentialUrl: string;
  description: string;
}

export const personalData = {
  name: "Harshit Gupta",
  role: "Backend Engineer",
  location: "India",
  email: "harshitgit23@gmail.com",
  github: "https://github.com/linuxer77",
  linkedin: "https://www.linkedin.com/in/harshit-gupta-046b66278/",
  twitter: "https://x.com/linuxer771",
  resumePath: "/resume.pdf",
  bio: "Backend engineer using Python and Go.",
};

export const experiences: Experience[] = [
  {
    company: "Maximize.money",
    role: "Backend Developer Intern",
    period: "Apr 2026 — Aug 2026",
    link: "https://maximize.money",
    description: [
      "Patched critical TOCTOU race conditions and unauthenticated booking exploits, preventing credit-line drain and unauthorized transactions.",
      "Identified and mitigated BOLA/IDOR vulnerabilities, protecting sensitive customer PII and partner gift card credentials (Amazon & Domino's).",
      "Architected thread-safe RS256 JWT caching in Go for SuperCoins integration, slashing server-to-server (S2S) API latency by 70%.",
      "Engineered v3 canonical request signing to eliminate client-side hashing bottlenecks and tuned PostgreSQL connection pooling for concurrent traffic spikes.",
    ],
    skills: ["Go", "RS256 JWT", "PostgreSQL", "API Security", "Concurrency", "Connection Pooling"],
  },
  {
    company: "Playto.so",
    role: "Software Engineer Intern (Backend & Payments)",
    period: "Apr 2026 — Aug 2026",
    link: "https://playto.so",
    description: [
      "Engineered backend services for an international payment processing system handling 10,000+ active users across multiple geographies.",
      "Implemented financial ledger logic handling multi-currency payouts, automatic refunds, chargebacks, settlements, and negative balance protections.",
      "Built a unified dispute and refund abstraction layer bridging disparate payment gateways (Razorpay and xPay).",
      "Integrated Customer.io webhooks and events for mission-critical transactional emails and real-time payment status updates.",
    ],
    skills: ["Python", "Payments Infrastructure", "Razorpay", "xPay", "PostgreSQL", "Customer.io"],
  },
  {
    company: "Asama AI",
    role: "Backend Developer Intern",
    period: "Aug 2026 — Sep 2026",
    description: [
      "Designed and deployed automated GitHub Actions CI/CD release pipelines targeting Debian (DEB), Red Hat (RPM), and Docker distribution formats.",
      "Modularized packaging workflows for the Host Agent and OpenTelemetry Collector daemon.",
      "Integrated Pulp repository management for tamper-proof binary publishing and version control.",
    ],
    skills: ["Linux", "Docker", "Packaging (DEB/RPM)", "GitHub Actions", "OpenTelemetry", "Pulp"],
  },
  {
    company: "NuVista Technologies",
    role: "Backend Developer (Contract)",
    period: "Sep 2025 — Dec 2025",
    description: [
      "Developed performant RESTful APIs using Django REST framework and PostgreSQL, supporting seamless relational data access.",
      "Deployed and maintained server-side applications on AWS Elastic Beanstalk using Gunicorn WSGI and NGINX reverse proxying.",
    ],
    skills: ["Python", "Django REST", "PostgreSQL", "AWS Elastic Beanstalk", "Gunicorn"],
  },
];

export const projects: Project[] = [
  {
    title: "Algorithmic Trading Engine",
    tagline: "High-concurrency market scanner & automated signal system",
    description:
      "A 24/7 high-throughput crypto market scanner in Go utilizing a worker-pool architecture to ingest and analyze tick data across 400+ pairs in parallel.",
    highlights: [
      "Engineered worker pools with sync.Mutex locks to ensure zero race conditions across high-frequency market streams.",
      "Containerized with Docker and deployed on cloud VM instances for continuous 99.9% uptime.",
      "Dispatches real-time entry/exit alerts to private Telegram and Pushover channels with sub-second execution.",
    ],
    tags: ["Go", "Python", "Docker", "Azure", "Goroutines", "Telegram API", "Pushover"],
    image: "/projects/algo-trading.png",
    liveUrl: "https://www.linkedin.com/feed/update/urn:li:activity:7347274128862687232/",
    featured: true,
  },
  {
    title: "VeriCred — Blockchain Credentialing",
    tagline: "Tamper-proof academic credential minting & instant verification",
    description:
      "A decentralized platform empowering educational institutions to issue cryptographically signed, fraud-proof academic credentials as ERC-721 tokens.",
    highlights: [
      "Engineered custom Go middleware with go-ethereum for transaction management, on-chain minting, and proof verification.",
      "Leveraged IPFS decentralized storage and content hashing to ensure immutability and permanent availability of certificate assets.",
      "Streamlined institutional onboarding and instant verification for recruiters without requiring blockchain knowledge.",
    ],
    tags: ["Go", "Solidity", "IPFS", "go-ethereum", "EVM", "React"],
    image: "/projects/vericred.png",
    githubUrl: "https://github.com/linuxer77/VeriCred",
    liveUrl: "https://vericred-frontend-fs1a.vercel.app/",
    featured: true,
  },
  {
    title: "Overwatch AI",
    tagline: "Sub-200ms intelligent productivity & tab classification extension",
    description:
      "A high-speed Firefox browser extension that classifies web browsing activity in real time to filter distractions without degrading browser performance.",
    tags: ["JavaScript", "Firefox WebExtensions", "TypeSafe Jev API", "Async/Await"],
    image: "/projects/overwatch.png",
    githubUrl: "https://github.com/linuxer77/Overwatch-AI",
    featured: true,
  },
  {
    title: "Chess Steganography",
    tagline: "Binary payload encoding into playable PGN chess games",
    description:
      "An algorithm that encodes binary data (images, files) into chess moves by mapping bit states to destination square colors, played out automatically via Lichess bots.",
    highlights: [
      "Bit-to-move mapping algorithm translating binary streams into valid legal chess moves.",
      "Automated bot-vs-bot games executed through Lichess API and serialized as PGN records.",
      "Deterministic decoder reconstructing original binary files with zero loss.",
    ],
    tags: ["Python", "Algorithms", "Lichess API", "Binary Encoding", "Data Steganography"],
    image: "/projects/chess-steganography.png",
    githubUrl: "https://github.com/linuxer77/chessStorj",
    featured: false,
  },
];

export const skillCategories: SkillCategory[] = [
  {
    title: "Languages",
    skills: [
      { name: "Go", iconKey: "go" },
      { name: "Python", iconKey: "python" },
      { name: "SQL", iconKey: "sql" },
      { name: "JavaScript", iconKey: "javascript" },
      { name: "Solidity", iconKey: "solidity" },
      { name: "Bash / Shell", iconKey: "bash" },
    ],
  },
  {
    title: "Backend & Architecture",
    skills: [
      { name: "REST APIs", iconKey: "api" },
      { name: "Microservices", iconKey: "microservices" },
      { name: "JWT & OAuth2", iconKey: "jwt" },
      { name: "Django REST", iconKey: "django" },
      { name: "Go-Chi / Go-Gin", iconKey: "go-chi" },
      { name: "Flask", iconKey: "flask" },
    ],
  },
  {
    title: "Databases & Caching",
    skills: [
      { name: "PostgreSQL", iconKey: "postgresql" },
      { name: "Redis", iconKey: "redis" },
      { name: "MySQL", iconKey: "mysql" },
      { name: "SQLite", iconKey: "sqlite" },
      { name: "IPFS", iconKey: "ipfs" },
    ],
  },
  {
    title: "Cloud & DevOps",
    skills: [
      { name: "Docker", iconKey: "docker" },
      { name: "Linux / UNIX", iconKey: "linux" },
      { name: "AWS", iconKey: "aws" },
      { name: "Oracle Cloud (OCI)", iconKey: "oci" },
      { name: "Git & GitHub Actions", iconKey: "git" },
      { name: "OpenTelemetry", iconKey: "opentelemetry" },
    ],
  },
];

export const certifications: Certification[] = [
  {
    title: "Oracle Cloud Infrastructure 2024 Certified Architect Associate",
    issuer: "Oracle",
    issueDate: "2024",
    credentialUrl:
      "https://catalog-education.oracle.com/ords/certview/sharebadge?id=9A2628790FF63864C2245588BEDAF6E2A23560828D06974D48FB8559E44D80E9",
    description:
      "Certified in designing resilient cloud architectures, compute, virtual cloud networking, security, storage, and identity management on Oracle Cloud Infrastructure.",
  },
];

export const education = {
  degree: "B.Tech in Computer Science & Engineering",
  institution: "Jaypee University of Engineering and Technology (JUET)",
  period: "2023 — 2027",
  location: "Madhya Pradesh, India",
};
