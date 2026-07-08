import type { ComponentType, CSSProperties } from "react";

export interface CatalogApp {
  id: number;
  name: string;
  url: string;
  description: string;
  category: "productivity" | "analytics" | "design" | "security" | "ai" | "frontend" | "backend";
  status: "Active" | "Maintenance" | "Inactive";
  iconColor: string; // tailwind gradient classes
  gradientFrom: string;
  gradientTo: string;
  /** Optional Lucide (or any) React icon component to render instead of monogram */
  icon?: ComponentType<{ className?: string; style?: CSSProperties }>;
}

export const catalogApps: CatalogApp[] = [
  {
    id: 1,
    name: "Book Builder",
    url: "/modules/book-builder",
    description: "Compose and structure digital books with rich formatting, chapter management, and collaborative editing tools.",
    category: "productivity",
    status: "Active",
    iconColor: "from-blue-400 to-cyan-300",
    gradientFrom: "#3b82f6",
    gradientTo: "#06b6d4",
  },
  {
    id: 2,
    name: "Concept Builder",
    url: "/modules/concept-builder",
    description: "Visual mind-mapping and concept diagramming tool for brainstorming and organizing complex ideas.",
    category: "design",
    status: "Active",
    iconColor: "from-emerald-400 to-teal-300",
    gradientFrom: "#34d399",
    gradientTo: "#2dd4bf",
  },
  {
    id: 3,
    name: "Elven",
    url: "/modules/elven",
    description: "Lightning-fast frontend component explorer and design system manager for modern web applications.",
    category: "frontend",
    status: "Active",
    iconColor: "from-violet-400 to-purple-300",
    gradientFrom: "#a78bfa",
    gradientTo: "#c084fc",
  },
  {
    id: 4,
    name: "Maiden",
    url: "/modules/maiden",
    description: "Enterprise-grade backend service orchestrator with API management, monitoring, and auto-scaling.",
    category: "backend",
    status: "Active",
    iconColor: "from-pink-400 to-rose-300",
    gradientFrom: "#f472b6",
    gradientTo: "#fb7185",
  },
  {
    id: 5,
    name: "BunnyAI",
    url: "/modules/bunny-ai",
    description: "AI-powered assistant platform with intelligent search, content generation, and workflow automation.",
    category: "ai",
    status: "Active",
    iconColor: "from-orange-400 to-amber-300",
    gradientFrom: "#fb923c",
    gradientTo: "#fbbf24",
  },
  {
    id: 6,
    name: "BunnyFlow",
    url: "/modules/bunny-flow",
    description: "Visual workflow builder with drag-and-drop pipeline creation, triggers, and real-time execution monitoring.",
    category: "ai",
    status: "Active",
    iconColor: "from-cyan-400 to-sky-300",
    gradientFrom: "#22d3ee",
    gradientTo: "#7dd3fc",
  },
  {
    id: 7,
    name: "BunnyAI Thinker",
    url: "/modules/bunny-thinker",
    description: "Deep reasoning engine for complex problem-solving with chain-of-thought processing and multi-step analysis.",
    category: "ai",
    status: "Active",
    iconColor: "from-fuchsia-400 to-pink-300",
    gradientFrom: "#d946ef",
    gradientTo: "#f9a8d4",
  },
  {
    id: 8,
    name: "BunnyLegacy",
    url: "/modules/bunny-legacy",
    description: "Legacy system integration bridge — connect and modernize existing infrastructure with new microservices.",
    category: "backend",
    status: "Active",
    iconColor: "from-slate-400 to-slate-300",
    gradientFrom: "#94a3b8",
    gradientTo: "#cbd5e1",
  },
  {
    id: 9,
    name: "Lemon Coder",
    url: "/modules/lemon-coder",
    description: "AI-assisted code editor and project scaffold with contextual suggestions and automated refactoring.",
    category: "productivity",
    status: "Active",
    iconColor: "from-yellow-400 to-lime-300",
    gradientFrom: "#facc15",
    gradientTo: "#a3e635",
  },
];
