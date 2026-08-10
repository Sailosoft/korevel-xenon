import type { ComponentType, CSSProperties } from "react";

export interface CatalogApp {
  id: number;
  name: string;
  url: string;
  description: string;
  category: "code-editor" | "content-writing" | "training" | "study" | "chat";
  status: "Active" | "Maintenance" | "Inactive";
  iconColor: string; // tailwind gradient classes
  gradientFrom: string;
  gradientTo: string;
  /** Optional Lucide (or any) React icon component to render instead of monogram */
  icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
}

export const catalogApps: CatalogApp[] = [
  {
    id: 10,
    name: "Bunny AI Studio",
    url: "/modules/bunny-studio",
    description: "Multi-modal AI chat with streaming, agent pools, AI settings, and conversation management.",
    category: "chat",
    status: "Active",
    iconColor: "from-violet-400 to-purple-300",
    gradientFrom: "#8b5cf6",
    gradientTo: "#c4b5fd",
  },
  {
    id: 11,
    name: "Bunny Case",
    url: "/modules/bunny-case",
    description: "Conversational AI training ecosystem — personas, simulations, roleplay coaching, stress-test gauntlet, and playbook library.",
    category: "training",
    status: "Active",
    iconColor: "from-emerald-400 to-teal-300",
    gradientFrom: "#10b981",
    gradientTo: "#5eead4",
  },
  {
    id: 5,
    name: "Bunny Book Builder",
    url: "/modules/bunny-ai",
    description: "AI-assisted book creation — build authors, books, and content with guided prompts, structured workflows, and editorial tooling.",
    category: "study",
    status: "Active",
    iconColor: "from-orange-400 to-amber-300",
    gradientFrom: "#fb923c",
    gradientTo: "#fbbf24",
  },
  {
    id: 6,
    name: "BunnyFlow",
    url: "/modules/bunny-flow",
    description: "YAML-driven workflow and pipeline builder (inspired by GitHub Actions) that chains steps and passes AI output between stages.",
    category: "content-writing",
    status: "Active",
    iconColor: "from-cyan-400 to-sky-300",
    gradientFrom: "#22d3ee",
    gradientTo: "#7dd3fc",
  },
  {
    id: 7,
    name: "Bunny Thinker",
    url: "/modules/bunny-thinker",
    description: "Chain-of-thought stepper and pre-prompt composer for structured reasoning, guided thinking steps, and reusable thought patterns.",
    category: "content-writing",
    status: "Active",
    iconColor: "from-fuchsia-400 to-pink-300",
    gradientFrom: "#d946ef",
    gradientTo: "#f9a8d4",
  },
  {
    id: 8,
    name: "BunnyLegacy Book Builder",
    url: "/modules/bunny-legacy",
    description: "The original (first) book builder — compose and structure digital books with rich formatting, chapter management, and editing tools.",
    category: "study",
    status: "Active",
    iconColor: "from-slate-400 to-slate-300",
    gradientFrom: "#94a3b8",
    gradientTo: "#cbd5e1",
  },
  {
    id: 9,
    name: "Lemon Coder",
    url: "/modules/lemon-coder",
    description: "AI-assisted code editor with Ask, Code, and Plan modes for contextual suggestions, code generation, and project planning.",
    category: "code-editor",
    status: "Active",
    iconColor: "from-yellow-400 to-lime-300",
    gradientFrom: "#facc15",
    gradientTo: "#a3e635",
  },
];
