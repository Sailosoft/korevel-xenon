"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  CatalogThemeProvider,
  useCatalogTheme,
  themeToCSSVars,
} from "./Catalog.Theme";
import CatalogHeader from "./CatalogHeader";
import {
  OPEN_CODE_GO_PRICING,
  type OpenCodeGoModelPricing,
} from "./CatalogOpenCodeGoCalculator.Dictionary";
import {
  isModelExcluded,
  OPEN_CODE_GO_EXCLUDED_MODELS,
} from "./CatalogOpenCodeGoCalculator.Constraint";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_INVESTMENT = 10;
const DICTIONARY_FILE = "CatalogOpenCodeGoCalculator.Dictionary.ts";
const RULE = "─".repeat(77);

const PHP_RATE_STORAGE_KEY = "korevel-catalog-php-usd-rate";
const PHP_RATE_API = "https://open.er-api.com/v6/latest/USD";

function todayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatPhp(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---------------------------------------------------------------------------
// PHP (₱) USD conversion rate — cached in localStorage and refreshed once per day
// ---------------------------------------------------------------------------
interface PhpRateInfo {
  rate: number | null;
  loading: boolean;
  stale: boolean;
  lastUpdated: string | null;
}

function usePhpUsdRate(): PhpRateInfo {
  const [info, setInfo] = useState<PhpRateInfo>({
    rate: null,
    loading: true,
    stale: false,
    lastUpdated: null,
  });

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const response = await fetch(PHP_RATE_API);
        const data = (await response.json()) as { rates?: { PHP?: number } };
        const rate = data?.rates?.PHP;
        if (typeof rate === "number" && Number.isFinite(rate)) {
          const stored = { date: todayKey(), rate };
          try {
            localStorage.setItem(PHP_RATE_STORAGE_KEY, JSON.stringify(stored));
          } catch {
            // storage unavailable — rate still usable for this session
          }
          if (!cancelled) {
            setInfo({ rate, loading: false, stale: false, lastUpdated: stored.date });
          }
        }
      } catch {
        // network error — handled by the stale-cache fallback below
      }
    };

    (async () => {
      let cached: { date: string; rate: number } | null = null;
      try {
        const raw = localStorage.getItem(PHP_RATE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { date?: string; rate?: number };
          if (
            parsed &&
            typeof parsed.rate === "number" &&
            Number.isFinite(parsed.rate) &&
            typeof parsed.date === "string" &&
            parsed.date !== ""
          ) {
            cached = { date: parsed.date, rate: parsed.rate };
          }
        }
      } catch {
        // corrupt cache — will refetch
      }

      // Yield a microtask so no setState happens synchronously inside the effect.
      await Promise.resolve();
      if (cancelled) return;

      if (cached && cached.date === todayKey()) {
        setInfo({ rate: cached.rate, loading: false, stale: false, lastUpdated: cached.date });
        return;
      }

      await refresh();
      if (cancelled) return;

      // Fall back to the cached rate if the network failed and nothing fresh landed.
      setInfo((prev) =>
        prev.rate === null && cached
          ? { rate: cached.rate, loading: false, stale: true, lastUpdated: cached.date }
          : { ...prev, loading: false },
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}

type SelectorSortOption =
  | "none"
  | "quota-asc"
  | "quota-desc"
  | "input-asc"
  | "input-desc"
  | "output-asc"
  | "output-desc"
  | "name-asc"
  | "name-desc";

const SELECTOR_SORT_OPTIONS: { value: SelectorSortOption; label: string }[] = [
  { value: "none", label: "No sorting" },
  { value: "quota-asc", label: "Quota · low to high" },
  { value: "quota-desc", label: "Quota · high to low" },
  { value: "input-asc", label: "Input · low to high" },
  { value: "input-desc", label: "Input · high to low" },
  { value: "output-asc", label: "Output · low to high" },
  { value: "output-desc", label: "Output · high to low" },
  { value: "name-asc", label: "Name · A to Z" },
  { value: "name-desc", label: "Name · Z to A" },
];

// ---------------------------------------------------------------------------
// SVG Icon Components (self-contained)
// ---------------------------------------------------------------------------
const Icons = {
  ArrowLeft: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
    </svg>
  ),
  Close: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  Search: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Calculator: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
    </svg>
  ),
  Code: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Copy: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  Check: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  ChevronDown: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Sparkles: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
    </svg>
  ),
  Bolt: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  Database: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5" /><path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  ),
  Warning: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  Refresh: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" />
    </svg>
  ),
  Coins: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function formatNumber(value: number): string {
  return String(value);
}

function formatUSD(value: number, maxDigits = 4): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: Math.min(2, maxDigits),
    maximumFractionDigits: maxDigits,
  })}`;
}

function formatPrice(value: number | null): string {
  return value === null ? "—" : `$${formatNumber(value)}`;
}

// ---------------------------------------------------------------------------
// Cost efficiency grading
//
// Every model is graded on two ratios:
//   • input-to-quota  = input price ÷ monthly quota  (lower is better)
//   • output-to-quota = output price ÷ monthly quota (lower is better)
//
// Each ratio is scored 0–100 relative to the most efficient model for that
// ratio, and the two scores are averaged into the final grading points.
// ---------------------------------------------------------------------------
interface CostEfficiencyEntry {
  model: OpenCodeGoModelPricing;
  inputRatio: number;
  outputRatio: number;
  inputScore: number;
  outputScore: number;
  score: number;
  grade: string;
}

function gradeFromScore(score: number): string {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 45) return "C";
  if (score >= 25) return "D";
  return "E";
}

function computeCostEfficiency(
  models: OpenCodeGoModelPricing[],
): CostEfficiencyEntry[] {
  if (models.length === 0) return [];

  const bestInputRatio = Math.min(
    ...models.map((model) => model.input / model.monthlyQuota),
  );
  const bestOutputRatio = Math.min(
    ...models.map((model) => model.output / model.monthlyQuota),
  );

  return models
    .map((model) => {
      const inputRatio = model.input / model.monthlyQuota;
      const outputRatio = model.output / model.monthlyQuota;
      const inputScore =
        inputRatio > 0 ? (bestInputRatio / inputRatio) * 100 : 0;
      const outputScore =
        outputRatio > 0 ? (bestOutputRatio / outputRatio) * 100 : 0;
      const score = (inputScore + outputScore) / 2;
      return {
        model,
        inputRatio,
        outputRatio,
        inputScore,
        outputScore,
        score,
        grade: gradeFromScore(score),
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// TSV parsing + TypeScript code generation
// ---------------------------------------------------------------------------
interface ParseResult {
  rows: OpenCodeGoModelPricing[];
  errors: string[];
}

const TAIL_PATTERN =
  /^(.+?)\s+\$?([\d.,]+)\s+\$?([\d.,]+)\s+\$?([\d.,]+|-)\s+\$?([\d.,]+|-)\s+\$?([\d.,]+)\s*$/;

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === "—") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function looksLikeHeader(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes("model") &&
    (lower.includes("input") || lower.includes("quota") || lower.includes("output"))
  );
}

/**
 * Parse a pasted pricing table. Accepts tab-separated rows or whitespace
 * separated rows. Columns: Model, Input, Output, Cached Read, Cached Write,
 * Monthly Quota. Use "-" for an absent cached price.
 */
function parsePricingTSV(input: string): ParseResult {
  const rows: OpenCodeGoModelPricing[] = [];
  const errors: string[] = [];

  const lines = input.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#") || line.startsWith("//")) return;
    if (looksLikeHeader(line)) return;

    let name = "";
    let fields: string[] | null = null;

    // Preferred: tab-separated.
    if (line.includes("\t")) {
      const parts = line.split("\t").map((part) => part.trim());
      if (parts.length >= 6) {
        name = parts[0];
        fields = parts.slice(1, 6);
      }
    }

    // Fallback: whitespace-separated from the right edge.
    if (!fields) {
      const match = line.match(TAIL_PATTERN);
      if (match) {
        name = match[1].trim();
        fields = [match[2], match[3], match[4], match[5], match[6]];
      }
    }

    if (!fields || name === "") {
      errors.push(`Line ${index + 1}: could not parse "${line.slice(0, 48)}"`);
      return;
    }

    const [inputRaw, outputRaw, cachedReadRaw, cachedWriteRaw, quotaRaw] = fields;
    const inputPrice = parseAmount(inputRaw);
    const outputPrice = parseAmount(outputRaw);
    const quota = parseAmount(quotaRaw);

    if (inputPrice === null || outputPrice === null || quota === null) {
      errors.push(`Line ${index + 1}: missing required numeric column for "${name}"`);
      return;
    }

    rows.push({
      name,
      input: inputPrice,
      output: outputPrice,
      cachedRead: parseAmount(cachedReadRaw),
      cachedWrite: parseAmount(cachedWriteRaw),
      monthlyQuota: quota,
    });
  });

  return { rows, errors };
}

/** Build the TypeScript source for the generated dictionary file. */
function generateDictionaryCode(rows: OpenCodeGoModelPricing[]): string {
  const generatedAt = new Date().toISOString();
  const body = rows
    .map(
      (row) =>
        `  { name: ${JSON.stringify(row.name)}, input: ${formatNumber(row.input)}, output: ${formatNumber(row.output)}, cachedRead: ${
          row.cachedRead === null ? "null" : formatNumber(row.cachedRead)
        }, cachedWrite: ${
          row.cachedWrite === null ? "null" : formatNumber(row.cachedWrite)
        }, monthlyQuota: ${formatNumber(row.monthlyQuota)} },`,
    )
    .join("\n");

  return `// ${RULE}
// ${DICTIONARY_FILE}
//
// ⚠️  AUTO-GENERATED — DO NOT EDIT MANUALLY.
//
// Generated by the OpenCode Go Calculator code generator:
//   Catalog → OpenCode Go Calculator → Code Generator
// Copy the full generated output over this file whenever pricing changes.
//
// Generated at: ${generatedAt}
// Models: ${rows.length}
// ${RULE}

/**
 * A single OpenCode Go model's pricing and monthly subscription quota.
 */
export interface OpenCodeGoModelPricing {
  /** Display name of the model. */
  name: string;
  /** Input price in USD per 1M tokens. */
  input: number;
  /** Output price in USD per 1M tokens. */
  output: number;
  /** Cached read price in USD per 1M tokens, or null when not offered. */
  cachedRead: number | null;
  /** Cached write price in USD per 1M tokens, or null when not offered. */
  cachedWrite: number | null;
  /** Monthly subscription quota in USD. */
  monthlyQuota: number;
}

export const OPEN_CODE_GO_PRICING: OpenCodeGoModelPricing[] = [
${body}
];
`;
}

/** Rebuild a TSV table from the current pricing dictionary. */
function pricingToTSV(rows: OpenCodeGoModelPricing[]): string {
  return rows
    .map((row) =>
      [
        row.name,
        `$${formatNumber(row.input)}`,
        `$${formatNumber(row.output)}`,
        row.cachedRead === null ? "-" : `$${formatNumber(row.cachedRead)}`,
        row.cachedWrite === null ? "-" : `$${formatNumber(row.cachedWrite)}`,
        `$${formatNumber(row.monthlyQuota)}`,
      ].join("\t"),
    )
    .join("\n");
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------
function SectionCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { theme } = useCatalogTheme();
  return (
    <div
      className={`rounded-2xl p-6 sm:p-7 animate-[slideUpFade_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0 ${className}`}
      style={{
        animationDelay: `${delay}s`,
        backgroundColor: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { theme } = useCatalogTheme();
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{
            background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
            boxShadow: `0 4px 14px ${theme.logoIconShadow}`,
            color: "#fff",
          }}
        >
          {icon}
        </div>
        <div>
          <h2
            className="text-lg font-extrabold tracking-tight"
            style={{ color: theme.heroHeadingText }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: theme.heroDescriptionText }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  gradient = false,
}: {
  label: string;
  value: string;
  hint: string;
  gradient?: boolean;
}) {
  const { theme } = useCatalogTheme();
  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        backgroundColor: gradient
          ? `linear-gradient(135deg, ${theme.filterActiveBg}, ${theme.logoIconTo})`
          : theme.pageBg,
        border: `1px solid ${gradient ? "transparent" : theme.cardBorder}`,
        color: gradient ? theme.filterActiveText : theme.pageText,
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: gradient ? "rgba(255,255,255,0.8)" : theme.cardStatusText }}
      >
        {label}
      </p>
      <p className="text-2xl font-extrabold mt-2 break-all">{value}</p>
      <p
        className="text-[11px] mt-1"
        style={{ color: gradient ? "rgba(255,255,255,0.75)" : theme.cardDescriptionText }}
      >
        {hint}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model picker (opens a searchable modal)
// ---------------------------------------------------------------------------
function ModelSelectorModal({
  open,
  models,
  selected,
  query,
  quota,
  sort,
  onQueryChange,
  onQuotaChange,
  onSortChange,
  onSelect,
  onClose,
}: {
  open: boolean;
  models: OpenCodeGoModelPricing[];
  selected: OpenCodeGoModelPricing | null;
  query: string;
  quota: number | null;
  sort: SelectorSortOption;
  onQueryChange: (value: string) => void;
  onQuotaChange: (value: number | null) => void;
  onSortChange: (value: SelectorSortOption) => void;
  onSelect: (model: OpenCodeGoModelPricing) => void;
  onClose: () => void;
}) {
  const { theme } = useCatalogTheme();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const quotaOptions = useMemo(
    () => [...new Set(models.map((model) => model.monthlyQuota))].sort((a, b) => a - b),
    [models],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = models.filter((model) => {
      if (quota !== null && model.monthlyQuota !== quota) return false;
      if (q && !model.name.toLowerCase().includes(q)) return false;
      return true;
    });

    if (sort === "none") return result;

    const [field, direction] = sort.split("-") as [string, "asc" | "desc"];
    const factor = direction === "asc" ? 1 : -1;

    result.sort((a, b) => {
      if (field === "name") return a.name.localeCompare(b.name) * factor;
      const key = field === "quota" ? "monthlyQuota" : field === "output" ? "output" : "input";
      return (a[key] - b[key]) * factor;
    });

    return result;
  }, [models, query, quota, sort]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{
        backgroundColor: "transparent",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl overflow-hidden animate-[modalIn_0.28s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        style={{
          backgroundColor: theme.pageBg,
          border: `1px solid ${theme.cardBorder}`,
          boxShadow: theme.cardHoverShadow,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${theme.cardFooterBorder}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
                boxShadow: `0 4px 12px ${theme.logoIconShadow}`,
                color: "#fff",
              }}
            >
              <Icons.Bolt className="w-4 h-4" />
            </div>
            <div>
              <h2
                className="text-lg font-extrabold tracking-tight"
                style={{ color: theme.heroHeadingText }}
              >
                Select a Model
              </h2>
              <p className="text-xs" style={{ color: theme.heroDescriptionText }}>
                {models.length} models available
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-all hover:rotate-90"
            style={{
              backgroundColor: theme.filterInactiveBg,
              color: theme.cardDescriptionText,
              border: `1px solid ${theme.filterInactiveBorder}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.pageText)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = theme.cardDescriptionText)
            }
          >
            <Icons.Close className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 sm:p-5 shrink-0" style={{ borderBottom: `1px solid ${theme.cardFooterBorder}` }}>
          <div className="relative">
            <input
              autoFocus
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search models…"
              className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all"
              style={{
                backgroundColor: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                color: theme.inputText,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.inputFocusBorder;
                e.currentTarget.style.boxShadow = `0 0 0 1px ${theme.inputFocusBorder}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.inputBorder;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: theme.inputPlaceholder }}
            >
              <Icons.Search />
            </span>
          </div>

          {/* Quota filter chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.cardStatusText }}>
              Quota
            </span>
            {[
              { label: "All", value: null },
              ...quotaOptions.map((value) => ({ label: `$${value}`, value })),
            ].map((option) => {
              const active = quota === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => onQuotaChange(option.value)}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  style={{
                    backgroundColor: active
                      ? theme.filterActiveBg
                      : theme.filterInactiveBg,
                    color: active
                      ? theme.filterActiveText
                      : theme.filterInactiveText,
                    border: `1px solid ${
                      active ? "transparent" : theme.filterInactiveBorder
                    }`,
                    boxShadow: active ? `0 4px 12px ${theme.filterActiveShadow}` : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      e.currentTarget.style.backgroundColor =
                        theme.filterInactiveHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.backgroundColor =
                        theme.filterInactiveBg;
                  }}
                >
                  {option.label}
                </button>
              );
            })}
            <span className="ml-auto text-[11px]" style={{ color: theme.cardDescriptionText }}>
              {filtered.length} model{filtered.length === 1 ? "" : "s"}
            </span>

            {/* Sort control */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.cardStatusText }}>
                Sort
              </span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => onSortChange(e.target.value as SelectorSortOption)}
                  aria-label="Sort models"
                  className="appearance-none rounded-lg pl-2.5 pr-7 py-1.5 text-[11px] font-semibold outline-none cursor-pointer text-left"
                  style={{
                    backgroundColor: theme.inputBg,
                    border: `1px solid ${theme.inputBorder}`,
                    color: theme.inputText,
                  }}
                >
                  {SELECTOR_SORT_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      style={{ backgroundColor: theme.pageBg, color: theme.inputText }}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: theme.inputPlaceholder }}
                >
                  <Icons.ChevronDown className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3">
          {filtered.length === 0 ? (
            <p
              className="text-sm text-center py-10"
              style={{ color: theme.cardDescriptionText }}
            >
              No models match your search.
            </p>
          ) : (
            filtered.map((model) => {
              const isSelected = selected?.name === model.name;
              return (
                <button
                  key={model.name}
                  type="button"
                  onClick={() => {
                    onSelect(model);
                    onClose();
                  }}
                  className="w-full text-left rounded-xl px-4 py-3 transition-colors"
                  style={{
                    backgroundColor: isSelected
                      ? theme.filterInactiveHoverBg
                      : "transparent",
                    color: theme.pageText,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.backgroundColor =
                        theme.filterInactiveHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold truncate" style={{ color: theme.pageText }}>
                      {model.name}
                    </span>
                    <span className="flex flex-row items-center gap-1.5 shrink-0">
                      <span
                        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg font-mono"
                        style={{
                          backgroundColor: theme.cardBadgeBg,
                          color: theme.logoAccent,
                          border: `1px solid ${theme.cardBadgeBorder}`,
                        }}
                      >
                        <span className="text-xs font-extrabold leading-none">
                          In {formatPrice(model.input)}
                        </span>
                        <span
                          className="text-[9px] font-semibold leading-none"
                          style={{ color: theme.cardStatusText }}
                        >
                          {formatUSD((model.input / model.monthlyQuota) * 10, 3)}/10$
                        </span>
                      </span>
                      <span
                        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg font-mono"
                        style={{
                          background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
                          color: "#fff",
                          boxShadow: `0 2px 8px ${theme.logoIconShadow}`,
                        }}
                      >
                        <span className="text-xs font-extrabold leading-none">
                          Out {formatPrice(model.output)}
                        </span>
                        <span
                          className="text-[9px] font-semibold leading-none"
                          style={{ color: "rgba(255,255,255,0.75)" }}
                        >
                          {formatUSD((model.output / model.monthlyQuota) * 10, 3)}/10$
                        </span>
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-1.5">
                    <span
                      className="text-[11px]"
                      style={{ color: theme.cardDescriptionText }}
                    >
                      Monthly quota ${formatNumber(model.monthlyQuota)}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: theme.logoAccent }}>
                        <Icons.Check className="w-3.5 h-3.5" />
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ModelPicker({
  models,
  selected,
  onSelect,
}: {
  models: OpenCodeGoModelPricing[];
  selected: OpenCodeGoModelPricing | null;
  onSelect: (model: OpenCodeGoModelPricing) => void;
}) {
  const { theme } = useCatalogTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [quota, setQuota] = useState<number | null>(null);
  const [sort, setSort] = useState<SelectorSortOption>("none");

  const openModal = () => {
    setQuery("");
    setQuota(null);
    setSort("none");
    setOpen(true);
  };

  return (
    <div>
      <button
        type="button"
        onClick={openModal}
        className="w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left transition-all"
        style={{
          backgroundColor: theme.inputBg,
          border: `1px solid ${theme.inputBorder}`,
          color: selected ? theme.inputText : theme.inputPlaceholder,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = theme.inputFocusBorder)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icons.Bolt className="w-4 h-4 shrink-0" />
          <span className="truncate font-medium">
            {selected ? selected.name : "Choose a model…"}
          </span>
        </span>
        <span className="shrink-0" style={{ color: theme.heroDescriptionText }}>
          <Icons.ChevronDown />
        </span>
      </button>

      {selected && (
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            ["Input", formatPrice(selected.input)],
            ["Output", formatPrice(selected.output)],
            ["Cached read", formatPrice(selected.cachedRead)],
            ["Cached write", formatPrice(selected.cachedWrite)],
            ["Quota", `$${formatNumber(selected.monthlyQuota)}/mo`],
          ].map(([label, value]) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: theme.cardBadgeBg,
                color: theme.cardBadgeText,
                border: `1px solid ${theme.cardBadgeBorder}`,
              }}
            >
              <span style={{ color: theme.cardStatusText }}>{label}</span>
              <span className="font-bold">{value}</span>
            </span>
          ))}
        </div>
      )}

      <ModelSelectorModal
        open={open}
        models={models}
        selected={selected}
        query={query}
        quota={quota}
        sort={sort}
        onQueryChange={setQuery}
        onQuotaChange={setQuota}
        onSortChange={setSort}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pricing matrix table
// ---------------------------------------------------------------------------
type SortKey = "name" | "input" | "output" | "monthlyQuota";

function PricingMatrix({ models }: { models: OpenCodeGoModelPricing[] }) {
  const { theme } = useCatalogTheme();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("input");
  const [ascending, setAscending] = useState(true);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? models.filter((model) => model.name.toLowerCase().includes(q))
      : models;
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      return a[sortKey] - b[sortKey];
    });
    return ascending ? sorted : sorted.reverse();
  }, [models, query, sortKey, ascending]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setAscending((prev) => !prev);
    else {
      setSortKey(key);
      setAscending(true);
    }
  };

  const headers: { key: SortKey | null; label: string; align: string }[] = [
    { key: "name", label: "Model", align: "text-left" },
    { key: "input", label: "Input /M", align: "text-right" },
    { key: "output", label: "Output /M", align: "text-right" },
    { key: null, label: "Cached read", align: "text-right" },
    { key: null, label: "Cached write", align: "text-right" },
    { key: "monthlyQuota", label: "Quota", align: "text-right" },
  ];

  return (
    <SectionCard delay={0.15}>
      <SectionTitle
        icon={<Icons.Database className="w-5 h-5" />}
        title="Pricing Matrix"
        subtitle={`${models.length} models · click a column to sort`}
        action={
          <div className="relative hidden sm:block">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none w-40 focus:w-52 transition-all"
              style={{
                backgroundColor: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                color: theme.inputText,
              }}
            />
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: theme.inputPlaceholder }}
            >
              <Icons.Search className="w-3.5 h-3.5" />
            </span>
          </div>
        }
      />

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header.label}
                  className={`py-2 px-3 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap ${header.align}`}
                  style={{
                    color: theme.cardStatusText,
                    borderBottom: `1px solid ${theme.cardFooterBorder}`,
                    cursor: header.key ? "pointer" : "default",
                  }}
                  onClick={() => header.key && toggleSort(header.key)}
                >
                  {header.label}
                  {header.key === sortKey && (ascending ? " ▲" : " ▼")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((model) => (
              <tr
                key={model.name}
                className="transition-colors"
                style={{ color: theme.pageText }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = theme.filterInactiveHoverBg)
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <td
                  className="py-2.5 px-3 font-medium"
                  style={{ borderBottom: `1px solid ${theme.cardFooterBorder}` }}
                >
                  {model.name}
                </td>
                <td
                  className="py-2.5 px-3 text-right font-mono"
                  style={{ borderBottom: `1px solid ${theme.cardFooterBorder}` }}
                >
                  {formatPrice(model.input)}
                </td>
                <td
                  className="py-2.5 px-3 text-right font-mono"
                  style={{ borderBottom: `1px solid ${theme.cardFooterBorder}` }}
                >
                  {formatPrice(model.output)}
                </td>
                <td
                  className="py-2.5 px-3 text-right font-mono"
                  style={{
                    color: theme.cardDescriptionText,
                    borderBottom: `1px solid ${theme.cardFooterBorder}`,
                  }}
                >
                  {formatPrice(model.cachedRead)}
                </td>
                <td
                  className="py-2.5 px-3 text-right font-mono"
                  style={{
                    color: theme.cardDescriptionText,
                    borderBottom: `1px solid ${theme.cardFooterBorder}`,
                  }}
                >
                  {formatPrice(model.cachedWrite)}
                </td>
                <td
                  className="py-2.5 px-3 text-right font-bold"
                  style={{
                    color: theme.logoAccent,
                    borderBottom: `1px solid ${theme.cardFooterBorder}`,
                  }}
                >
                  ${formatNumber(model.monthlyQuota)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Code generator panel
// ---------------------------------------------------------------------------
function CodeGenerator() {
  const { theme } = useCatalogTheme();
  const [tsv, setTsv] = useState(() => pricingToTSV(OPEN_CODE_GO_PRICING));
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  const parsed = useMemo(() => parsePricingTSV(tsv), [tsv]);
  const generated = useMemo(() => generateDictionaryCode(parsed.rows), [parsed.rows]);
  const codePlaceholder = `// Generating TypeScript for ${parsed.rows.length} model${parsed.rows.length === 1 ? "" : "s"} …`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [generated]);

  const lineCount = generated.split("\n").length;

  return (
    <SectionCard delay={0.2}>
      <SectionTitle
        icon={<Icons.Code className="w-5 h-5" />}
        title="Code Generator"
        subtitle={`Paste the new pricing table, then copy the generated TypeScript over ${DICTIONARY_FILE}`}
        action={
          <button
            type="button"
            onClick={() => setTsv(pricingToTSV(OPEN_CODE_GO_PRICING))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: theme.cardBadgeBg,
              color: theme.cardBadgeText,
              border: `1px solid ${theme.cardBadgeBorder}`,
            }}
          >
            <Icons.Refresh className="w-3.5 h-3.5" />
            Load current
          </button>
        }
      />

      {/* Warning banner */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5"
        style={{
          backgroundColor: theme.filterInactiveBg,
          border: `1px solid ${theme.filterInactiveBorder}`,
        }}
      >
        <span style={{ color: theme.statusMaintenance }} className="mt-0.5 shrink-0">
          <Icons.Warning />
        </span>
        <p className="text-xs leading-relaxed" style={{ color: theme.cardDescriptionText }}>
          <strong style={{ color: theme.pageText }}>Never edit the dictionary by hand.</strong>{" "}
          Replace the whole <span className="font-mono">{DICTIONARY_FILE}</span> file with the
          generated output. Columns: Model, Input, Output, Cached read, Cached write, Monthly
          quota. Use <span className="font-mono">-</span> for an absent cached price.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Input */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.cardStatusText }}>
              Source table
            </label>
            <span className="text-[11px]" style={{ color: theme.cardDescriptionText }}>
              {parsed.rows.length} model{parsed.rows.length === 1 ? "" : "s"} parsed
            </span>
          </div>
          <textarea
            value={tsv}
            onChange={(e) => setTsv(e.target.value)}
            spellCheck={false}
            rows={18}
            className="w-full flex-1 rounded-xl p-4 text-xs font-mono leading-relaxed outline-none resize-y"
            style={{
              backgroundColor: theme.inputBg,
              border: `1px solid ${parsed.errors.length ? theme.statusMaintenance : theme.inputBorder}`,
              color: theme.inputText,
              minHeight: "320px",
            }}
          />
          {parsed.errors.length > 0 && (
            <div className="mt-3 rounded-lg px-3 py-2 space-y-1 max-h-28 overflow-y-auto"
              style={{
                backgroundColor: theme.filterInactiveBg,
                border: `1px solid ${theme.statusMaintenance}`,
              }}
            >
              {parsed.errors.map((error, index) => (
                <p key={index} className="text-[11px] font-mono" style={{ color: theme.statusMaintenance }}>
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.cardStatusText }}>
              Generated TypeScript
            </label>
            <span className="text-[11px]" style={{ color: theme.cardDescriptionText }}>
              {lineCount} lines
            </span>
          </div>
          <div className="relative flex-1">
            <pre
              className="rounded-xl p-4 text-[11px] font-mono leading-relaxed overflow-auto"
              style={{
                backgroundColor: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                color: theme.inputText,
                height: "100%",
                minHeight: "320px",
                maxHeight: "480px",
                whiteSpace: "pre",
              }}
            >
              {mounted ? generated : codePlaceholder}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              disabled={parsed.rows.length === 0}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              style={{
                background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
                color: "#fff",
                boxShadow: `0 6px 16px ${theme.logoIconShadow}`,
              }}
            >
              {copied ? <Icons.Check className="w-3.5 h-3.5" /> : <Icons.Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------
interface CalculationResult {
  modelName: string;
  monthlyQuota: number;
  inputValue: number;
  percentageRatio: number;
  creditValue: number;
  dollarPerUnit: number;
  effectiveRate: number;
}

function Calculator({ models }: { models: OpenCodeGoModelPricing[] }) {
  const { theme } = useCatalogTheme();
  const php = usePhpUsdRate();
  const [selected, setSelected] = useState<OpenCodeGoModelPricing | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(() => {
    if (!selected) {
      setError("Select a model first.");
      return;
    }
    const value = parseFloat(inputValue);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid dollar amount greater than zero.");
      return;
    }
    setError(null);

    const percentageRatio = (value / selected.monthlyQuota) * 100;
    const creditValue = (percentageRatio / 100) * BASE_INVESTMENT;

    setResult({
      modelName: selected.name,
      monthlyQuota: selected.monthlyQuota,
      inputValue: value,
      percentageRatio,
      creditValue,
      dollarPerUnit: BASE_INVESTMENT / selected.monthlyQuota,
      effectiveRate: (creditValue / value) * 100,
    });
  }, [selected, inputValue]);

  const quotaPercent = result
    ? Math.min(100, (result.inputValue / result.monthlyQuota) * 100)
    : 0;

  return (
    <SectionCard delay={0.05}>
      <SectionTitle
        icon={<Icons.Calculator className="w-5 h-5" />}
        title="Credit Value Calculator"
        subtitle="Turn a monthly quota into the real dollar value of your credits"
      />

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: theme.pageText }}>
            Model
          </label>
          <ModelPicker models={models} selected={selected} onSelect={(model) => {
            setSelected(model);
            setError(null);
          }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: theme.pageText }}>
              Quota mode
            </label>
            <div
              className="rounded-xl px-4 py-3.5 text-sm font-semibold"
              style={{
                background: `linear-gradient(135deg, ${theme.filterActiveBg}, ${theme.logoIconTo})`,
                color: "#fff",
              }}
            >
              Monthly Quota
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: theme.pageText }}>
              Input value (USD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g. 15"
              className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
              style={{
                backgroundColor: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                color: theme.inputText,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputFocusBorder)}
              onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs font-medium" style={{ color: theme.statusMaintenance }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleCalculate}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold transition-all hover:-translate-y-0.5 active:translate-y-0"
          style={{
            background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
            color: "#fff",
            boxShadow: `0 10px 24px ${theme.logoIconShadow}`,
          }}
        >
          <Icons.Sparkles className="w-5 h-5" />
          Calculate credit value
        </button>
      </div>

      {result && (
        <div className="mt-7 animate-[slideUpFade_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div
            className="rounded-2xl p-6 text-center relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
              color: "#fff",
              boxShadow: `0 16px 40px ${theme.logoIconShadow}`,
            }}
          >
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
              Credit investment value
            </p>
            <p className="text-5xl font-extrabold my-3">
              {formatUSD(result.creditValue)}
            </p>
            <p className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>
              ≈ ₱{php.rate === null ? "—" : formatPhp(result.creditValue * php.rate)}{" "}
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
                PHP
              </span>
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
              {php.loading
                ? "Checking PHP rate…"
                : php.rate === null
                  ? "PHP rate unavailable"
                  : php.stale
                    ? `Using cached PHP rate ₱${formatPhp(php.rate)} (${php.lastUpdated}, refresh failed)`
                    : `Live PHP rate ₱${formatPhp(php.rate)} per USD · updated ${php.lastUpdated}`}
            </p>
            <p className="text-sm mt-3" style={{ color: "rgba(255,255,255,0.85)" }}>
              {result.percentageRatio.toFixed(2)}% of ${formatNumber(result.monthlyQuota)} quota ·{" "}
              {result.modelName}
            </p>

            {/* Quota usage bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: "rgba(255,255,255,0.85)" }}>
                <span>Quota utilized</span>
                <span>
                  {formatUSD(result.inputValue)} / {formatUSD(result.monthlyQuota, 0)}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${quotaPercent}%`, backgroundColor: "#ffffff" }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <StatCard
              label="Usage"
              value={`${result.percentageRatio.toFixed(2)}%`}
              hint="Of monthly quota"
            />
            <StatCard
              label="Dollar / unit"
              value={formatUSD(result.dollarPerUnit, 4)}
              hint="Base investment efficiency"
            />
            <StatCard
              label="Effective rate"
              value={`${result.effectiveRate.toFixed(2)}%`}
              hint="Return on investment"
            />
            <StatCard
              label="Utilized"
              value={formatUSD(result.inputValue)}
              hint={`of $${formatNumber(result.monthlyQuota)}`}
            />
          </div>

          <div
            className="rounded-xl px-4 py-3 mt-4"
            style={{
              backgroundColor: theme.filterInactiveBg,
              border: `1px solid ${theme.filterInactiveBorder}`,
            }}
          >
            <p className="text-xs leading-relaxed" style={{ color: theme.cardDescriptionText }}>
              <strong style={{ color: theme.pageText }}>Formula:</strong>{" "}
              <span className="font-mono">
                (input value ÷ monthly quota) × ${BASE_INVESTMENT}
              </span>{" "}
              — the input is expressed as a share of the monthly quota, then applied to a $
              {BASE_INVESTMENT} base investment.
            </p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Live insight sidebar
// ---------------------------------------------------------------------------
function InsightPanel({ models }: { models: OpenCodeGoModelPricing[] }) {
  const { theme } = useCatalogTheme();

  const stats = useMemo(() => {
    const available = models.filter((model) => !isModelExcluded(model.name));
    const quotas = [...new Set(available.map((model) => model.monthlyQuota))].sort((a, b) => a - b);
    const cheapest = [...available].sort((a, b) => a.input - b.input)[0];
    const costEfficiency = computeCostEfficiency(available);
    const best = costEfficiency[0] ?? null;
    const avgInput =
      available.reduce((sum, model) => sum + model.input, 0) / (available.length || 1);
    return { quotas, cheapest, best, avgInput, available };
  }, [models]);

  return (
    <SectionCard delay={0.1} className="h-full">
      <SectionTitle
        icon={<Icons.Coins className="w-5 h-5" />}
        title="At a glance"
        subtitle="Snapshot of the current OpenCode Go catalog"
      />

      <div className="space-y-4">
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: theme.pageBg, border: `1px solid ${theme.cardBorder}` }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.cardStatusText }}>
            Cheapest input
          </p>
          <p className="text-sm font-bold mt-1" style={{ color: theme.pageText }}>
            {stats.cheapest?.name ?? "—"}
          </p>
          <p className="text-xs mt-0.5 font-mono" style={{ color: theme.logoAccent }}>
            {stats.cheapest ? formatPrice(stats.cheapest.input) : "—"} /M tokens
          </p>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: theme.pageBg, border: `1px solid ${theme.cardBorder}` }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.cardStatusText }}>
              Cost efficient
            </p>
            {stats.best && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
                  color: "#fff",
                  boxShadow: `0 2px 8px ${theme.logoIconShadow}`,
                }}
              >
                Grade {stats.best.grade}
              </span>
            )}
          </div>
          <p className="text-sm font-bold mt-1" style={{ color: theme.pageText }}>
            {stats.best?.model.name ?? "—"}
          </p>
          {stats.best && (
            <>
              <div
                className="mt-2.5 flex items-center justify-between"
                style={{ borderTop: `1px solid ${theme.cardFooterBorder}`, paddingTop: "8px" }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider leading-5" style={{ color: theme.cardStatusText }}>
                  <span className="block">
                    Input/out
                  </span>
                  <span className="block">
                    {formatPrice(stats.best.model.input)} / {formatPrice(stats.best.model.output)}
                  </span>
                </div>
                <div className="text-right leading-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.cardStatusText }}>
                    Quota
                  </p>
                  <p className="text-sm font-extrabold font-mono" style={{ color: theme.logoAccent }}>
                    ${formatNumber(stats.best.model.monthlyQuota)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono mt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.cardStatusText }}>
                  Grading points
                </span>
                <span className="font-extrabold" style={{ color: theme.pageText }}>
                  {stats.best.score.toFixed(1)} / 100
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                <span style={{ color: theme.cardDescriptionText }}>In → quota</span>
                <span style={{ color: theme.pageText }}>{stats.best.inputScore.toFixed(1)} pts · ratio {stats.best.inputRatio.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                <span style={{ color: theme.cardDescriptionText }}>Out → quota</span>
                <span style={{ color: theme.pageText }}>{stats.best.outputScore.toFixed(1)} pts · ratio {stats.best.outputRatio.toFixed(4)}</span>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: theme.pageBg, border: `1px solid ${theme.cardBorder}` }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.cardStatusText }}>
              Models
            </p>
            <p className="text-2xl font-extrabold mt-1" style={{ color: theme.pageText }}>
              {stats.available.length}
            </p>
            {OPEN_CODE_GO_EXCLUDED_MODELS.length > 0 && (
              <p className="text-[10px] mt-1" style={{ color: theme.cardDescriptionText }}>
                {OPEN_CODE_GO_EXCLUDED_MODELS.length} excluded
              </p>
            )}
          </div>
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: theme.pageBg, border: `1px solid ${theme.cardBorder}` }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.cardStatusText }}>
              Avg input
            </p>
            <p className="text-2xl font-extrabold mt-1" style={{ color: theme.pageText }}>
              ${stats.avgInput.toFixed(3)}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.cardStatusText }}>
            Quota tiers
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.quotas.map((quota) => (
              <span
                key={quota}
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: theme.cardBadgeBg,
                  color: theme.cardBadgeText,
                  border: `1px solid ${theme.cardBadgeBorder}`,
                }}
              >
                ${quota}
              </span>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Inner page (reads theme context)
// ---------------------------------------------------------------------------
function CatalogOpenCodeGoCalculatorInner() {
  const { theme } = useCatalogTheme();
  const models = OPEN_CODE_GO_PRICING;

  return (
    <div
      className="min-h-screen font-sans relative overflow-x-hidden"
      style={{
        backgroundColor: theme.pageBg,
        color: theme.pageText,
        ...themeToCSSVars(theme),
      }}
    >
      {/* ========== Background Effects ========== */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundSize: "50px 50px",
            backgroundImage: `linear-gradient(to right, ${theme.gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${theme.gridColor} 1px, transparent 1px)`,
            maskImage: "radial-gradient(circle at center, black 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 100%)",
          }}
        />
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] animate-[float_6s_ease-in-out_infinite]"
          style={{ backgroundColor: theme.orbPrimary }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[100px] animate-[float_6s_ease-in-out_infinite]"
          style={{ backgroundColor: theme.orbSecondary, animationDelay: "2s" }}
        />
      </div>

      {/* ========== Navigation ========== */}
      <CatalogHeader />

      {/* ========== Main Content ========== */}
      <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* ---- Hero ---- */}
        <div className="text-center mb-12 animate-[slideUpFade_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-colors"
            style={{ color: theme.navLinkInactiveText }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.navLinkActiveText)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.navLinkInactiveText)}
          >
            <Icons.ArrowLeft className="w-4 h-4" />
            Back to Catalog
          </Link>
          <h1
            className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4"
            style={{ color: theme.heroHeadingText }}
          >
            OpenCode Go{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, ${theme.heroGradientFrom}, ${theme.heroGradientVia}, ${theme.heroGradientTo})`,
              }}
            >
              Calculator
            </span>
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: theme.heroDescriptionText }}>
            Price a monthly quota, value a credit pack, and regenerate the pricing
            dictionary — all in one place.
          </p>
        </div>

        {/* ---- Calculator + Insights ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <Calculator models={models} />
          </div>
          <div className="lg:col-span-1">
            <InsightPanel models={models} />
          </div>
        </div>

        {/* ---- Pricing matrix ---- */}
        <div className="mb-6">
          <PricingMatrix models={models} />
        </div>

        {/* ---- Code generator ---- */}
        <CodeGenerator />
      </main>

      {/* ========== Footer ========== */}
      <footer
        className="relative z-10 backdrop-blur-sm mt-12"
        style={{
          backgroundColor: theme.footerBg,
          borderTop: `1px solid ${theme.footerBorder}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm" style={{ color: theme.footerText }}>
            &copy; {new Date().getFullYear()} Korevel Xenon. All rights reserved.
          </p>
          <Link
            href="/"
            className="text-sm font-medium transition-colors mt-4 md:mt-0"
            style={{ color: theme.footerText }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.footerLinkHover)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.footerText)}
          >
            Back to Catalog
          </Link>
        </div>
      </footer>

      {/* ========== Keyframe animations ========== */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CatalogOpenCodeGoCalculator — wrapped with theme provider
// ---------------------------------------------------------------------------
export default function CatalogOpenCodeGoCalculator() {
  return (
    <CatalogThemeProvider>
      <CatalogOpenCodeGoCalculatorInner />
    </CatalogThemeProvider>
  );
}
