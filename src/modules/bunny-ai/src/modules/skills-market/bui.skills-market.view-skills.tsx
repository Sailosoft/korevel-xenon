"use client";

import { BadgeCheck, BookOpen, Tag } from "lucide-react";
import { BUISkillsMarketRow } from "./bui.skills-market.entity";

export function StatusBadge({ added }: { added: boolean }) {
  if (added) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">
        <BadgeCheck className="w-3.5 h-3.5" />
        In Author Skills
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-default-200/60 text-default-500 text-xs font-medium">
      Not Added
    </span>
  );
}

function FieldLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-default-400">
      <Icon className="w-3.5 h-3.5" />
      {children}
    </span>
  );
}

export default function BUISkillsMarketViewBody({ row }: { row: BUISkillsMarketRow }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-default-200/60">
        <div className="flex flex-col gap-1 min-w-0">
          <FieldLabel icon={BookOpen}>Description</FieldLabel>
          <p className="text-sm text-default-700 leading-relaxed whitespace-pre-wrap">
            {row.description?.trim() || "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3">
        <FieldLabel icon={Tag}>Status</FieldLabel>
        <StatusBadge added={row.added} />
      </div>
    </div>
  );
}
