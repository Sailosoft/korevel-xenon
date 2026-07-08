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
