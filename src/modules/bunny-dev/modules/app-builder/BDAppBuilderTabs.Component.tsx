"use client";

// BDAppBuilderTabs — VSCode-style editor tab strip for the app designer:
// one tab per open resource (plus Overview / New resource), a "+" button,
// and a compact Design/Render segmented toggle on the right.

import { Eye, Pencil, Plus, X } from "lucide-react";
import { cn } from "@heroui/react";

export interface BDAppBuilderTabItem {
  id: string;
  label: string;
}

export interface BDAppBuilderTabsProps {
  tabs: BDAppBuilderTabItem[];
  activeTab: string | null;
  onChange: (id: string) => void;
  /** Omit to render non-closable tabs (e.g. the Render preview). */
  onClose?: (id: string) => void;
  onNew?: () => void;
  mode: "design" | "preview";
  onModeChange: (mode: "design" | "preview") => void;
}

export function BDAppBuilderTabs({
  tabs,
  activeTab,
  onChange,
  onClose,
  onNew,
  mode,
  onModeChange,
}: BDAppBuilderTabsProps) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-slate-200 bg-slate-50 px-2">
      <div className="bd-scroll flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <div
              key={tab.id}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 border-t-2 px-3 text-xs transition-colors",
                active
                  ? "border-[#1976d2] bg-white font-semibold text-slate-800"
                  : "border-transparent text-slate-500 hover:bg-slate-200/60",
              )}
            >
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                className="max-w-40 truncate"
                title={tab.label}
              >
                {tab.label}
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={() => onClose(tab.id)}
                  aria-label={`Close ${tab.label}`}
                  className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        {onNew && (
          <button
            type="button"
            onClick={onNew}
            aria-label="New resource"
            title="New resource"
            className="mb-0.5 ml-1 rounded p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-white p-0.5">
        <button
          type="button"
          onClick={() => onModeChange("design")}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors",
            mode === "design"
              ? "bg-[#e3f2fd] font-semibold text-[#1565c0]"
              : "text-slate-500 hover:bg-slate-100",
          )}
        >
          <Pencil className="h-3 w-3" /> Design
        </button>
        <button
          type="button"
          onClick={() => onModeChange("preview")}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors",
            mode === "preview"
              ? "bg-[#e3f2fd] font-semibold text-[#1565c0]"
              : "text-slate-500 hover:bg-slate-100",
          )}
        >
          <Eye className="h-3 w-3" /> Render
        </button>
      </div>
    </div>
  );
}

export default BDAppBuilderTabs;
