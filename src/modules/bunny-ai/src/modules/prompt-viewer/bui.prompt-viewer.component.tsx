"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  FileText,
  Braces,
  MessageSquare,
} from "lucide-react";
import {
  promptViewerRegistry,
  type PromptViewerEntry,
  type PromptVariant,
} from "./bui.prompt-viewer.data";

// ── Theme constants (matching the Bunny AI layout) ──────────────────────────────
const THEME = {
  gradient: "from-[#ff2d20] to-[#f43f5e]",
  textPrimary: "text-[#ff2d20]",
  btnSecondary: "text-[#ff2d20] bg-red-50 hover:bg-red-100 transition-colors",
  border: "border-slate-100",
};

// ── Utility ─────────────────────────────────────────────────────────────────────

/**
 * Truncate long whitespace / newlines for a compact card preview.
 */
function truncatePreview(text: string, maxLen = 140): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + "…" : cleaned;
}

// ── Copy Button ─────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
        copied
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
      }`}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── Prompt Variant Card ─────────────────────────────────────────────────────────

function PromptVariantCard({
  variant,
  isExpanded,
  onToggle,
}: {
  variant: PromptVariant;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white transition-shadow hover:shadow-sm">
      {/* Header / Toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${THEME.gradient} text-white`}
          >
            {variant.type}
          </span>
          <span className="text-sm text-slate-500 font-mono">
            {truncatePreview(variant.systemPrompt, 60)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton
            text={`System: ${variant.systemPrompt}\n\nUser: ${variant.userPrompt}`}
          />
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4">
          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Braces className="w-3.5 h-3.5" />
                System Prompt
              </span>
              <CopyButton text={variant.systemPrompt} />
            </div>
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-mono overflow-x-auto max-h-64 overflow-y-auto">
              {variant.systemPrompt}
            </pre>
          </div>

          {/* User Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                User Prompt
              </span>
              <CopyButton text={variant.userPrompt} />
            </div>
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-mono overflow-x-auto max-h-48 overflow-y-auto">
              {variant.userPrompt}
            </pre>
          </div>

          {variant.extraPrompt && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Extra Instructions
                </span>
                <CopyButton text={variant.extraPrompt} />
              </div>
              <pre className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs leading-relaxed text-amber-800 whitespace-pre-wrap font-mono overflow-x-auto max-h-32 overflow-y-auto">
                {variant.extraPrompt}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Prompt Group Section ────────────────────────────────────────────────────────

function PromptGroupCard({
  entry,
  searchQuery,
}: {
  entry: PromptViewerEntry;
  searchQuery: string;
}) {
  const [allOpen, setAllOpen] = useState(false);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return entry.prompts;
    const q = searchQuery.toLowerCase();
    return entry.prompts.filter(
      (p) =>
        p.type.toLowerCase().includes(q) ||
        p.systemPrompt.toLowerCase().includes(q) ||
        p.userPrompt.toLowerCase().includes(q),
    );
  }, [entry.prompts, searchQuery]);

  if (filteredPrompts.length === 0) return null;

  const toggleAll = () => {
    const next = !allOpen;
    setAllOpen(next);
    const newMap: Record<string, boolean> = {};
    filteredPrompts.forEach((p) => {
      newMap[p.type] = next;
    });
    setOpenMap(newMap);
  };

  const toggleVariant = (type: string) => {
    setOpenMap((prev) => ({ ...prev, [type]: !prev[type] }));
    // If all are now open, sync allOpen
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <span className="text-lg">
                {entry.module === "Author Skills"
                  ? "⚡"
                  : entry.module === "Authors"
                    ? "👤"
                    : entry.module === "Books"
                      ? "📚"
                      : entry.module === "Book Chapters"
                        ? "📖"
                        : "📄"}
              </span>
              {entry.module}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {entry.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
              {filteredPrompts.length} variant
              {filteredPrompts.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-[#ff2d20] hover:text-[#e0241b] hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          </div>
        </div>
        {entry.description && (
          <p className="text-sm text-slate-500 mt-1.5">{entry.description}</p>
        )}
      </div>

      {/* Prompt variants list */}
      <div className="divide-y divide-slate-100">
        {filteredPrompts.map((variant) => (
          <div key={variant.type} className="px-5 py-3">
            <PromptVariantCard
              variant={variant}
              isExpanded={openMap[variant.type] ?? false}
              onToggle={() => toggleVariant(variant.type)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────

export default function BUIPromptViewerComponent() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRegistry = useMemo(() => {
    if (!searchQuery.trim()) return promptViewerRegistry;
    const q = searchQuery.toLowerCase();
    return promptViewerRegistry
      .map((entry) => ({
        ...entry,
        prompts: entry.prompts.filter(
          (p) =>
            p.type.toLowerCase().includes(q) ||
            p.systemPrompt.toLowerCase().includes(q) ||
            p.userPrompt.toLowerCase().includes(q),
        ),
      }))
      .filter((entry) => entry.prompts.length > 0);
  }, [searchQuery]);

  const totalVariants = useMemo(
    () => promptViewerRegistry.reduce((acc, e) => acc + e.prompts.length, 0),
    [],
  );

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 md:px-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <span className="w-10 h-10 bg-gradient-to-br from-[#ff2d20] to-[#f43f5e] rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
              <FileText className="w-5 h-5 text-white" />
            </span>
            Prompt Viewer
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse all {totalVariants} AI prompt variants across{" "}
            {promptViewerRegistry.length} modules
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          aria-label="Search prompts"
          type="text"
          placeholder="Search prompts by type, system prompt, or user prompt…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-slate-200 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2d20]/20 focus:border-[#ff2d20] transition-all"
        />
      </div>

      {/* Results count */}
      {searchQuery.trim() && (
        <p className="text-sm text-slate-500">
          Found {filteredRegistry.reduce((acc, e) => acc + e.prompts.length, 0)}{" "}
          variant
          {filteredRegistry.reduce((acc, e) => acc + e.prompts.length, 0) !== 1
            ? "s"
            : ""}{" "}
          matching "{searchQuery}"
        </p>
      )}

      {/* Module sections */}
      {filteredRegistry.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            No prompts match your search
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-2 text-sm text-[#ff2d20] hover:underline cursor-pointer"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredRegistry.map((entry, i) => (
            <PromptGroupCard
              key={`${entry.module}-${entry.label}-${i}`}
              entry={entry}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}
