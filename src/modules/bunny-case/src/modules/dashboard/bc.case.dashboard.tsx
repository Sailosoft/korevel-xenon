// bc.case.dashboard.tsx
//
// BunnyCase dashboard — the Conversational AI Training Ecosystem workflow:
// Architect → Simulator → Trainer → Gauntlet → Analytics → Playbook.

"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  Briefcase,
  MessagesSquare,
  PlayCircle,
  Swords,
  LineChart,
  Library,
  BookOpen,
  Bot,
  ArrowRight,
} from "lucide-react";

interface BCSection {
  section: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const BC_SECTIONS: BCSection[] = [
  {
    section: "Configure",
    title: "Persona Architect",
    description: "Define who the customer is — traits become an AI psychological profile.",
    href: "/modules/bunny-case/personas",
    icon: Users,
  },
  {
    section: "Configure",
    title: "Agent Persona",
    description: "Build the ideal agent persona — optionally apply it to the Simulator.",
    href: "/modules/bunny-case/agent-personas",
    icon: Bot,
  },
  {
    section: "Configure",
    title: "Case Base",
    description: "Define the scenario — link a conflict to a persona.",
    href: "/modules/bunny-case/cases",
    icon: Briefcase,
  },
  {
    section: "Observe",
    title: "Conversation Simulator",
    description: "Watch an ideal agent, with external words and internal thoughts.",
    href: "/modules/bunny-case/simulator",
    icon: MessagesSquare,
  },
  {
    section: "Learn",
    title: "Study",
    description: "Generate a 1000–2000 word handbook & guide book for any case.",
    href: "/modules/bunny-case/study",
    icon: BookOpen,
  },
  {
    section: "Interact",
    title: "Conversation Trainer",
    description: "Guided roleplay — an AI Trainer coaches every response.",
    href: "/modules/bunny-case/trainer",
    icon: PlayCircle,
  },
  {
    section: "Validate",
    title: "Stress-Test Gauntlet",
    description: "The final exam — no coach, unexpected curveballs.",
    href: "/modules/bunny-case/gauntlet",
    icon: Swords,
  },
  {
    section: "Optimize",
    title: "Sentiment Analytics",
    description: "Which words turned the customer's mood from negative to positive.",
    href: "/modules/bunny-case/analytics",
    icon: LineChart,
  },
  {
    section: "Optimize",
    title: "Playbook Library",
    description: "Archive successful interactions into a searchable knowledge base.",
    href: "/modules/bunny-case/playbook",
    icon: Library,
  },
];

export default function BCCaseDashboard() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-6 space-y-8">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 mx-auto">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">
          Conversational AI Training Ecosystem
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          From crafting a customer persona to certifying communication skills —
          Architect → Simulator → Trainer → Gauntlet → Analytics → Playbook.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BC_SECTIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                    {item.section}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-slate-800 mt-1 flex items-center gap-1">
                  {item.title}
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
