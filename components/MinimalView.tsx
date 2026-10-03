"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  experiences,
  projects,
  skillCategories,
  certifications,
  education,
  personalData,
} from "@/lib/portfolio-data";
// Flow mode components preserved for future activation:
// import ViewModeSwitch from "@/components/ViewModeSwitch";
// import { useViewMode } from "@/lib/view-mode-context";
import { FaFilePdf } from "react-icons/fa6";
import { motion, AnimatePresence } from "framer-motion";
import HadoukenWave from "@/components/arcade/HadoukenWave";
import ContraRun from "@/components/arcade/ContraRun";
import ToastyPopup from "@/components/arcade/ToastyPopup";
import MarioRun from "@/components/arcade/MarioRun";
import MkSpear from "@/components/arcade/MkSpear";

// ==========================================
// Easter Egg 1: 0x6867 Scramble Effect
// ==========================================
function HexScrambler({ onScrollToIntro }: { onScrollToIntro: () => void }) {
  const target = "0x6867";
  const [display, setDisplay] = useState(target);
  const animatingRef = useRef(false);

  const triggerScramble = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    let iteration = 0;
    const chars = "0123456789abcdefx#";

    const interval = setInterval(() => {
      setDisplay(
        target
          .split("")
          .map((char, index) => {
            if (index < iteration) {
              return target[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      if (iteration >= target.length) {
        clearInterval(interval);
        setDisplay(target);
        animatingRef.current = false;
      }

      iteration += 1 / 2;
    }, 28);
  }, [target]);

  return (
    <button
      onClick={() => {
        triggerScramble();
        onScrollToIntro();
      }}
      onMouseEnter={triggerScramble}
      className="text-xs sm:text-sm font-bold tracking-widest uppercase hover:text-zinc-300 transition-colors shrink-0 underline underline-offset-8 decoration-1 decoration-white font-mono select-none"
    >
      {display}
    </button>
  );
}

// ==========================================
// Easter Egg 3: Interactive 3D Wireframe Glyphs
// ==========================================
function InteractiveGlyph({
  children,
  onFastClick,
}: {
  children: React.ReactNode;
  onFastClick?: () => void;
}) {
  const [spinCount, setSpinCount] = useState(0);
  const clickCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Trigger visual spin
    setSpinCount((c) => c + 1);

    clickCountRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);

    // Reset after 2.5s if 3 clicks not reached
    timerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 2500);

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      if (timerRef.current) clearTimeout(timerRef.current);
      onFastClick?.();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="cursor-pointer text-zinc-400 hover:text-white transition-colors p-2.5 inline-flex items-center justify-center rounded-lg hover:bg-white/[0.05] select-none border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-zinc-600"
      title="Interactive Vector Glyph (3x rapid clicks for easter egg)"
    >
      <motion.div
        whileHover={{ scale: 1.2, rotate: 30 }}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: spinCount * 360 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="pointer-events-none select-none"
      >
        {children}
      </motion.div>
    </button>
  );
}

function GlyphAsterisk() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-current fill-none" strokeWidth="1.2">
      <line x1="50" y1="10" x2="50" y2="90" />
      <line x1="10" y1="50" x2="90" y2="50" />
      <line x1="22" y1="22" x2="78" y2="78" />
      <line x1="22" y1="78" x2="78" y2="22" />
      <line x1="50" y1="10" x2="78" y2="78" />
      <line x1="50" y1="10" x2="22" y2="78" />
      <line x1="50" y1="90" x2="78" y2="22" />
      <line x1="50" y1="90" x2="22" y2="22" />
    </svg>
  );
}

function GlyphWheel() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-current fill-none" strokeWidth="1.2">
      <circle cx="50" cy="50" r="38" />
      <line x1="50" y1="12" x2="50" y2="88" />
      <line x1="12" y1="50" x2="88" y2="50" />
      <line x1="23.1" y1="23.1" x2="76.9" y2="76.9" />
      <line x1="23.1" y1="76.9" x2="76.9" y2="23.1" />
    </svg>
  );
}

function GlyphDiamond() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-current fill-none" strokeWidth="1.2">
      <polygon points="50,14 86,50 50,86 14,50" />
      <polygon points="50,26 74,50 50,74 26,50" />
      <line x1="50" y1="6" x2="50" y2="94" />
      <line x1="6" y1="50" x2="94" y2="50" />
      <circle cx="50" cy="50" r="3" className="fill-current" />
    </svg>
  );
}

function GlyphCube() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-current fill-none" strokeWidth="1.2">
      <polygon points="50,18 82,34 50,50 18,34" />
      <polygon points="18,34 50,50 50,82 18,66" />
      <polygon points="50,50 82,34 82,66 50,82" />
      <line x1="50" y1="50" x2="50" y2="82" />
    </svg>
  );
}

function GlyphHexAperture() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-current fill-none" strokeWidth="1.2">
      <polygon points="50,12 85,31 85,69 50,88 15,69 15,31" />
      <circle cx="50" cy="50" r="20" />
      <line x1="50" y1="12" x2="50" y2="30" />
      <line x1="85" y1="69" x2="67" y2="60" />
      <line x1="15" y1="69" x2="33" y2="60" />
    </svg>
  );
}

function GlyphOrbits() {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 stroke-current fill-none" strokeWidth="1.2">
      <ellipse cx="50" cy="50" rx="40" ry="16" transform="rotate(-30 50 50)" />
      <ellipse cx="50" cy="50" rx="40" ry="16" transform="rotate(30 50 50)" />
      <circle cx="50" cy="50" r="7" className="fill-current" />
    </svg>
  );
}

function renderGlyph(index: number, onFastClick?: () => void) {
  const list = [
    <GlyphAsterisk key="g1" />,
    <GlyphWheel key="g2" />,
    <GlyphDiamond key="g3" />,
    <GlyphCube key="g4" />,
    <GlyphHexAperture key="g5" />,
    <GlyphOrbits key="g6" />,
  ];
  return (
    <InteractiveGlyph onFastClick={onFastClick}>
      {list[index % list.length]}
    </InteractiveGlyph>
  );
}

// ==========================================
// Easter Egg 4: Embedded Linux Bash Terminal
// ==========================================
interface LogEntry {
  type: "in" | "out" | "err";
  text: string;
}

interface TerminalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerHadouken: () => void;
  onTriggerContra: () => void;
  onTriggerMario: () => void;
  onTriggerMk: () => void;
  onTriggerToasty?: () => void;
}

function TerminalDrawer({
  isOpen,
  onClose,
  onTriggerHadouken,
  onTriggerContra,
  onTriggerMario,
  onTriggerMk,
  onTriggerToasty,
}: TerminalDrawerProps) {
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: "out", text: "Welcome to 0x6867 shell v1.0.0 (x86_64-linux)" },
    { type: "out", text: "Type 'help' for routines or 'arcade' to see authentic retro games." },
  ]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory((prev) => [...prev, trimmed]);
    setHistoryIdx(-1);

    const parts = trimmed.split(" ");
    const command = parts[0].toLowerCase();

    const newLogs: LogEntry[] = [...logs, { type: "in", text: `guest@0x6867:~$ ${trimmed}` }];

    switch (command) {
      case "help":
        newLogs.push({
          type: "out",
          text: `AVAILABLE COMMANDS:
  neofetch
  cat resume.md
  ls
  whoami
  exp
  projects
  skills
  contact
  resume
  clear
  exit

ARCADE:
  contra
  sf2`,
        });
        break;

      case "neofetch":
      case "fastfetch":
        newLogs.push({
          type: "out",
          text: `       /\\         harshit@0x6867-arch
      /  \\        -------------------
     /\\   \\       OS: Arch Linux x86_64
    /      \\      Host: Distributed Baremetal Node
   /   ,,   \\     Kernel: 6.9.1-zen-0x6867
  /   |  |  -\\    Shell: bash 5.2.26
 /_-''    ''-_\\   Uptime: 24h`,
        });
        break;

      case "ls":
        newLogs.push({
          type: "out",
          text: "resume.md  projects.db  system.log  id_ed25519.pub",
        });
        break;

      case "cat":
        if (parts[1]?.toLowerCase().includes("resume")) {
          newLogs.push({
            type: "out",
            text: `# HARSHIT GUPTA — SENIOR BACKEND ENGINEER
Email: ${personalData.email} | GitHub: ${personalData.github}

## EXPERIENCE
* Neovista Technologies — Software Engineer (Backend)
* Asama AI — Backend Engineer
* Playto.so — Backend Engineer Intern
* Maximize — Backend Developer Intern

## CORE STACK
* Languages: Go, Rust, Python, TypeScript
* Distributed Architecture, Microservices, Event-Driven (Kafka, RabbitMQ)
* Storage: PostgreSQL, Redis, ScyllaDB
* Cloud & Infra: Docker, Kubernetes, AWS, gRPC, CI/CD`,
          });
        } else if (
          parts[1]?.toLowerCase().includes("id_ed25519") ||
          parts[1]?.toLowerCase().includes("key") ||
          parts[1]?.toLowerCase().includes(".pub")
        ) {
          newLogs.push({
            type: "out",
            text: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIERFQ1JZUFQoMHg2ODY3KT09PT09PT09PT09PTY3 harshit@0x6867",
          });
        } else if (parts[1]?.toLowerCase().includes("project")) {
          newLogs.push({
            type: "out",
            text: "SQLite format 3: index_engine, log_pipeline, service_mesh, distributed_kv [OK]",
          });
        } else if (parts[1]?.toLowerCase().includes("system") || parts[1]?.toLowerCase().includes("log")) {
          newLogs.push({
            type: "out",
            text: "[SYSTEM LOG] 0x6867 node operational | 4 clusters active | 0 errors reported",
          });
        } else if (parts[1]) {
          newLogs.push({
            type: "err",
            text: `cat: ${parts[1]}: Permission denied or no such file. Try 'cat resume.md'`,
          });
        } else {
          newLogs.push({ type: "err", text: "cat: missing file operand. Try 'cat resume.md'" });
        }
        break;

      case "decrypt":
      case "decode":
        newLogs.push({
          type: "out",
          text: "67",
        });
        break;

      case "base64":
        if (parts[1] === "-d" || parts[1] === "--decode" || parts[1]?.includes("d")) {
          newLogs.push({
            type: "out",
            text: "67",
          });
        } else {
          newLogs.push({
            type: "out",
            text: "Njc=",
          });
        }
        break;

      case "ssh-keygen":
        newLogs.push({
          type: "out",
          text: "256 SHA256:0x6867/67 harshit@0x6867 (ED25519) -> 67",
        });
        break;

      case "arcade":
      case "retro":
      case "secrets":
      case "games":
        newLogs.push({
          type: "out",
          text: `ARCADE:
  contra
  mario
  mk
  sf2`,
        });
        break;

      case "mk":
      case "spear":
      case "scorpion":
        onTriggerMk();
        newLogs.push({ type: "out", text: "GET OVER HERE!" });
        break;

      case "mario":
      case "smb":
        onTriggerMario();
        newLogs.push({ type: "out", text: "SUPER MARIO BROS" });
        break;

      case "sf2":
      case "hadouken":
        onTriggerHadouken();
        newLogs.push({ type: "out", text: "HADOUKEN!" });
        break;

      case "contra":
      case "konami":
        onTriggerContra();
        newLogs.push({ type: "out", text: "CONTRA" });
        break;

      case "toasty":
        onTriggerToasty?.();
        newLogs.push({ type: "out", text: "TOASTY!" });
        break;

      case "whoami":
      case "bio":
        newLogs.push({
          type: "out",
          text: `${personalData.name} — ${personalData.role}\n${personalData.bio}\nGitHub: ${personalData.github}`,
        });
        break;

      case "exp":
      case "work":
      case "experience":
        newLogs.push({
          type: "out",
          text: experiences
            .map((e, i) => `[${i + 1}] ${e.company} — ${e.role} (${e.period})`)
            .join("\n"),
        });
        break;

      case "projects":
        newLogs.push({
          type: "out",
          text: projects
            .map((p, i) => `[${i + 1}] ${p.title} // ${p.tagline}`)
            .join("\n"),
        });
        break;

      case "skills":
        newLogs.push({
          type: "out",
          text: skillCategories
            .map((c) => `${c.title}: ${c.skills.map((s) => s.name).join(", ")}`)
            .join("\n"),
        });
        break;

      case "contact":
      case "email":
        newLogs.push({
          type: "out",
          text: `Email: ${personalData.email}\nGitHub: ${personalData.github}\nLinkedIn: ${personalData.linkedin}`,
        });
        break;

      case "resume":
        window.open(personalData.resumePath, "_blank");
        newLogs.push({ type: "out", text: "Opening résumé in external viewport..." });
        break;

      case "clear":
        setLogs([]);
        return;

      case "exit":
      case "quit":
        onClose();
        return;

      default:
        newLogs.push({
          type: "err",
          text: `bash: ${command}: command not found. Type 'help' for routines.`,
        });
    }

    setLogs(newLogs);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(inputVal);
      setInputVal("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputVal(history[nextIdx] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(-1);
        setInputVal("");
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx] || "");
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: 280, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 280, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="fixed inset-x-0 bottom-0 z-50 max-h-[46vh] sm:max-h-[380px] bg-black/95 backdrop-blur-2xl border-t border-dotted border-zinc-700 shadow-2xl flex flex-col font-mono text-xs"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-dotted border-zinc-800 bg-zinc-950 text-zinc-400 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block animate-pulse" />
          <span className="text-[11px] text-zinc-200 font-bold">
            0x6867_terminal // bash v5.2 (x86_64-linux)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-zinc-500 hidden sm:inline">type &apos;help&apos; for commands</span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white px-2 py-0.5 rounded border border-dotted border-zinc-800 hover:border-zinc-500 transition-colors"
          >
            ESC / close
          </button>
        </div>
      </div>

      <div
        ref={logContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-1.5 text-zinc-300 font-mono text-xs leading-relaxed"
      >
        {logs.map((log, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap ${
              log.type === "in"
                ? "text-cyan-400 font-bold"
                : log.type === "err"
                ? "text-rose-400"
                : "text-zinc-300"
            }`}
          >
            {log.text}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-dotted border-zinc-800 bg-black">
        <span className="text-cyan-400 font-bold select-none shrink-0">guest@0x6867:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-white outline-none font-mono text-xs"
          placeholder="type command..."
          spellCheck={false}
        />
      </div>
    </motion.div>
  );
}

const SECTIONS = ["intro", "experience", "projects", "stack", "contact"];

// ==========================================
// Main Minimal View
// ==========================================
export default function MinimalView() {
  const [activeSection, setActiveSection] = useState("experience");
  const [copied, setCopied] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [hadoukenActive, setHadoukenActive] = useState(false);
  const [contraActive, setContraActive] = useState(false);
  const [marioActive, setMarioActive] = useState(false);
  const [mkActive, setMkActive] = useState(false);
  const [toastyOpen, setToastyOpen] = useState(false);
  const keyHistoryRef = useRef<string[]>([]);
  // const { setViewMode } = useViewMode();

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  }, []);

  const triggerToasty = useCallback(() => {
    setToastyOpen(false);
    setTimeout(() => {
      setToastyOpen(true);
    }, 20);
  }, []);

  const copyEmail = useCallback(() => {
    navigator.clipboard.writeText(personalData.email);
    setCopied(true);
    showToast("EMAIL COPIED [harshitgit23@gmail.com]");
    setTimeout(() => setCopied(false), 2000);
  }, [showToast]);

  const scrollTo = useCallback((id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // ==========================================
  // Easter Egg Sequence Detection & Terminal Listener
  // ==========================================
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is focused inside an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      // Record key sequence for multi-character easter eggs
      keyHistoryRef.current = [...keyHistoryRef.current.slice(-15), e.key];
      const seqStr = keyHistoryRef.current.map((k) => k.toLowerCase()).join("");

      // 1. Contra Shortened Code: ArrowUp ArrowUp ArrowDown ArrowDown (↑ ↑ ↓ ↓) or "contra"
      const last4 = keyHistoryRef.current.slice(-4);
      if (
        last4.length === 4 &&
        last4[0]?.toLowerCase() === "arrowup" &&
        last4[1]?.toLowerCase() === "arrowup" &&
        last4[2]?.toLowerCase() === "arrowdown" &&
        last4[3]?.toLowerCase() === "arrowdown"
      ) {
        e.preventDefault();
        setContraActive(true);
        keyHistoryRef.current = [];
        return;
      }
      if (seqStr.endsWith("contra")) {
        e.preventDefault();
        setContraActive(true);
        keyHistoryRef.current = [];
        return;
      }

      // 2. Street Fighter ("hadouken", "sf2")
      if (seqStr.endsWith("hadouken") || seqStr.endsWith("sf2")) {
        e.preventDefault();
        setHadoukenActive(true);
        keyHistoryRef.current = [];
        return;
      }

      // 3. Super Mario Bros ("mario", "smb")
      if (seqStr.endsWith("mario") || seqStr.endsWith("smb")) {
        e.preventDefault();
        setMarioActive(true);
        keyHistoryRef.current = [];
        return;
      }

      // 4. Mortal Kombat ("mk", "spear", "scorpion")
      if (seqStr.endsWith("mk") || seqStr.endsWith("spear") || seqStr.endsWith("scorpion")) {
        e.preventDefault();
        setMkActive(true);
        keyHistoryRef.current = [];
        return;
      }

      // 5. Secret Toasty ("toasty") - let user discover by typing
      if (seqStr.endsWith("toasty")) {
        e.preventDefault();
        triggerToasty();
        keyHistoryRef.current = [];
        return;
      }

      // 6. Developer Terminal Drawer toggle (~ or `)
      if (e.key === "~" || e.key === "`") {
        e.preventDefault();
        setShowTerminal((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [showToast, triggerToasty]);

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black relative">
      {/* 1. Riften Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-dotted border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Identity & Nav Links */}
          <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
            <HexScrambler onScrollToIntro={() => scrollTo("intro")} />

            <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-400 tracking-wider uppercase">
              <button
                onClick={() => scrollTo("experience")}
                className={`hover:text-white transition-colors ${
                  activeSection === "experience" ? "text-white underline underline-offset-8 decoration-1" : ""
                }`}
              >
                EXPERIENCE
              </button>
              <button
                onClick={() => scrollTo("projects")}
                className={`hover:text-white transition-colors ${
                  activeSection === "projects" ? "text-white underline underline-offset-8 decoration-1" : ""
                }`}
              >
                PROJECTS
              </button>
              <button
                onClick={() => scrollTo("stack")}
                className={`hover:text-white transition-colors ${
                  activeSection === "stack" ? "text-white underline underline-offset-8 decoration-1" : ""
                }`}
              >
                STACK
              </button>
              <button
                onClick={() => scrollTo("contact")}
                className={`hover:text-white transition-colors ${
                  activeSection === "contact" ? "text-white underline underline-offset-8 decoration-1" : ""
                }`}
              >
                CONTACT
              </button>
            </nav>
          </div>

          {/* Minimal View Controls: ViewModeSwitch (commented out) + Resume */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* <ViewModeSwitch /> */}
            <a
              href={personalData.resumePath}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-black bg-white hover:bg-zinc-200 font-bold transition-colors select-none"
            >
              <FaFilePdf size={11} />
              <span>RESUME ↗</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Intro Banner */}
      <section id="intro" className="border-b border-dotted border-zinc-800 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white uppercase">
                {personalData.name}
              </h1>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl font-mono">
                {personalData.bio}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                <button
                  onClick={copyEmail}
                  type="button"
                  className="underline underline-offset-4 decoration-zinc-500 hover:decoration-white text-zinc-300 hover:text-white transition-colors"
                >
                  {copied ? "EMAIL COPIED" : `COPY: ${personalData.email}`}
                </button>
                <a
                  href={personalData.github}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 decoration-zinc-500 hover:decoration-white text-zinc-300 hover:text-white transition-colors"
                >
                  GITHUB ↗
                </a>
                <a
                  href={personalData.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 decoration-zinc-500 hover:decoration-white text-zinc-300 hover:text-white transition-colors"
                >
                  LINKEDIN ↗
                </a>
              </div>
            </div>

            {/* Right-side quadrant: games terminal hint */}
            <div className="pt-2 md:pt-0 shrink-0">
              <button
                onClick={() => setShowTerminal(true)}
                className="group inline-flex items-center gap-2 font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Open bash terminal (~)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-pulse" />
                <span>
                  type <code className="text-cyan-400 font-bold group-hover:underline">&apos;arcade&apos;</code> in the terminal
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Experiences: 3-Column Rows with Dotted Lines */}
      <section id="experience">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-10 pb-4 border-b border-dotted border-zinc-800 text-xs text-zinc-400 uppercase tracking-widest">
            EXPERIENCE
          </div>

          {experiences.map((exp, idx) => (
            <div
              key={exp.company}
              className="border-b border-dotted border-zinc-800 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
            >
              {/* Column 1: Monochrome High-Contrast Company Logo / Image */}
              <div className="lg:col-span-5">
                <div className="relative aspect-[16/10] w-full bg-black border border-zinc-800/80 overflow-hidden">
                  <Image
                    src={exp.image || "/companies/maximize-bw.png"}
                    alt={exp.company}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover grayscale contrast-125 brightness-95 hover:brightness-110 transition-all duration-500"
                  />
                </div>
              </div>

              {/* Column 2: Title, Exact Bullets, Link */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold tracking-wider text-white uppercase inline-block underline underline-offset-8 decoration-1 decoration-zinc-400">
                    {exp.company.toUpperCase()}.
                  </h2>
                  <div className="text-[11px] text-zinc-400 mt-2 uppercase tracking-wide">
                    {exp.role} &bull; {exp.period}
                  </div>
                </div>

                {/* EXACT Bullet points from portfolio-data.ts */}
                <div className="space-y-3 pt-2 text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                  {exp.description.map((bullet, bIdx) => (
                    <p key={bIdx} className="leading-relaxed">
                      {bullet}
                    </p>
                  ))}
                </div>

                {/* Tech Skills */}
                <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-zinc-400">
                  {exp.skills.map((skill) => (
                    <span
                      key={skill}
                      className="border-b border-dotted border-zinc-700 pb-0.5"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Action Link */}
                {exp.link && (
                  <div className="pt-2">
                    <a
                      href={exp.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-xs text-zinc-300 hover:text-white underline underline-offset-8 decoration-1 decoration-zinc-500 hover:decoration-white transition-colors"
                    >
                      Explore {exp.company} ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Column 3: Monospace Index & Interactive Wireframe Glyph */}
              <div className="lg:col-span-2 flex flex-col justify-between h-full space-y-6">
                <div className="space-y-1 text-xs text-zinc-400 tracking-wider">
                  <div>0{idx + 1} / EXPERIENCE</div>
                  <div className="text-white uppercase font-bold truncate">
                    {exp.company.split(".")[0]}
                  </div>
                </div>

                <div className="pt-2">
                  {renderGlyph(idx, triggerToasty)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Projects: 3-Column Rows with Dotted Lines */}
      <section id="projects">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-10 pb-4 border-b border-dotted border-zinc-800 text-xs text-zinc-400 uppercase tracking-widest">
            FEATURED PROJECTS // SELECTED WORK
          </div>

          {projects.map((proj, idx) => (
            <div
              key={proj.title}
              className="border-b border-dotted border-zinc-800 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
            >
              {/* Column 1: Project Image */}
              <div className="lg:col-span-5">
                <div className="relative aspect-[16/10] w-full bg-zinc-950 border border-zinc-900 overflow-hidden">
                  {proj.image ? (
                    <Image
                      src={proj.image}
                      alt={proj.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover grayscale contrast-125 brightness-90 hover:brightness-100 transition-all duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                      [PREVIEW]
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Exact Project Description & Highlights */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold tracking-wider text-white uppercase inline-block underline underline-offset-8 decoration-1 decoration-zinc-400">
                    {proj.title.toUpperCase()}.
                  </h2>
                  <div className="text-[11px] text-zinc-400 mt-2 uppercase tracking-wide">
                    {proj.tagline}
                  </div>
                </div>

                <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                  {proj.description}
                </p>

                {proj.highlights && proj.highlights.length > 0 && (
                  <div className="space-y-2 pt-1 text-xs text-zinc-300">
                    {proj.highlights.map((h, hIdx) => (
                      <p key={hIdx} className="leading-relaxed">
                        &bull; {h}
                      </p>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-zinc-400">
                  {proj.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border-b border-dotted border-zinc-700 pb-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-2 text-xs">
                  {proj.liveUrl && (
                    <a
                      href={proj.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-300 hover:text-white underline underline-offset-8 decoration-1 decoration-zinc-500 hover:decoration-white transition-colors"
                    >
                      Live Deployment ↗
                    </a>
                  )}
                  {proj.githubUrl && (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-300 hover:text-white underline underline-offset-8 decoration-1 decoration-zinc-500 hover:decoration-white transition-colors"
                    >
                      Source Code ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Column 3: Project Index & Interactive Wireframe Glyph */}
              <div className="lg:col-span-2 flex flex-col justify-between h-full space-y-6">
                <div className="space-y-1 text-xs text-zinc-400 tracking-wider">
                  <div>0{idx + 5} / PROJECT</div>
                  <div className="text-white uppercase font-bold truncate">
                    {proj.title}
                  </div>
                </div>

                <div className="pt-2">
                  {renderGlyph(idx + 4, triggerToasty)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Tech Stack & Credentials */}
      <section id="stack" className="border-b border-dotted border-zinc-800 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-xs text-zinc-400 uppercase tracking-widest">
            CORE CAPABILITIES // ARCHITECTURE &amp; STACK
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {skillCategories.map((category) => (
              <div key={category.title} className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider underline underline-offset-4 decoration-1 decoration-zinc-500">
                  {category.title}
                </h3>
                <ul className="space-y-2 text-xs text-zinc-300 font-mono">
                  {category.skills.map((skill) => (
                    <li key={skill.name} className="flex items-center gap-2">
                      <span className="text-zinc-600">&bull;</span>
                      <span>{skill.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Certifications & Education */}
          <div className="pt-8 border-t border-dotted border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-mono">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider underline underline-offset-4 decoration-1 decoration-zinc-500">
                CERTIFICATIONS
              </h3>
              {certifications.map((cert) => (
                <div key={cert.title} className="space-y-1 pt-1">
                  <div className="text-zinc-200 font-semibold">{cert.title}</div>
                  <div className="text-zinc-400">
                    {cert.issuer} &bull; {cert.issueDate}
                  </div>
                  {cert.credentialUrl && (
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-zinc-400 hover:text-white underline underline-offset-4 decoration-zinc-600"
                    >
                      Verify Credential ↗
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider underline underline-offset-4 decoration-1 decoration-zinc-500">
                EDUCATION
              </h3>
              <div className="space-y-1 pt-1">
                <div className="text-zinc-200 font-semibold">{education.degree}</div>
                <div className="text-zinc-400">{education.institution}</div>
                <div className="text-zinc-500">
                  {education.period} &bull; {education.location}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Contact & Footer */}
      <footer id="contact" className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-6 text-xs font-mono text-zinc-400">
            <div className="text-zinc-500 font-mono">
              0x6867
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={copyEmail}
                type="button"
                className="hover:text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-white transition-colors"
              >
                {copied ? "COPIED" : personalData.email}
              </button>
              <a
                href={personalData.github}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-white transition-colors"
              >
                GITHUB ↗
              </a>
              <a
                href={personalData.linkedin}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-white transition-colors"
              >
                LINKEDIN ↗
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Terminal Drawer Trigger Button */}
      <div className="fixed bottom-3 right-3 z-30">
        <button
          onClick={() => setShowTerminal((prev) => !prev)}
          className="px-2.5 py-1 rounded bg-black/80 border border-dotted border-zinc-800 hover:border-cyan-700 hover:text-cyan-300 text-[10px] font-mono text-zinc-400 transition-colors shadow-lg flex items-center gap-1.5"
          title="Open terminal console (~)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          <span>&gt;_ bash</span>
        </button>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-emerald-400 shadow-2xl"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embedded Terminal Drawer */}
      <AnimatePresence>
        {showTerminal && (
          <TerminalDrawer
            isOpen={showTerminal}
            onClose={() => setShowTerminal(false)}
            onTriggerHadouken={() => setHadoukenActive(true)}
            onTriggerContra={() => setContraActive(true)}
            onTriggerMario={() => setMarioActive(true)}
            onTriggerMk={() => setMkActive(true)}
            onTriggerToasty={triggerToasty}
          />
        )}
      </AnimatePresence>

      {/* Secret Easter Egg: Dan Forden Toasty (Unlisted discovery) */}
      <ToastyPopup isOpen={toastyOpen} onClose={() => setToastyOpen(false)} />

      {/* Easter Egg 1: Authentic Street Fighter II Hadouken Wave */}
      <HadoukenWave isActive={hadoukenActive} onComplete={() => setHadoukenActive(false)} />

      {/* Easter Egg 2: Authentic Contra Bill Rizer Sprint (Shortened ↑ ↑ ↓ ↓ Cheat Code) */}
      <ContraRun isActive={contraActive} onComplete={() => setContraActive(false)} />

      {/* Easter Egg 3: Authentic Super Mario Bros (1985 NES) Power-up Run */}
      <MarioRun isActive={marioActive} onComplete={() => setMarioActive(false)} />

      {/* Easter Egg 4: Authentic UMK3 Scorpion Spear & Uppercut ("GET OVER HERE!") */}
      <MkSpear isActive={mkActive} onComplete={() => setMkActive(false)} />
    </div>
  );
}
