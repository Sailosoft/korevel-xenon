/**
 * BFlowStatusBadge — Reusable status indicator for BunnyFlow run states.
 *
 * Provides visual badges for: pending, running, succeeded, failed, cancelled, skipped.
 * Uses HeroUI semantic colour tokens for consistency across the workspace.
 */

import React from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  StopCircle,
  SkipForward,
} from "lucide-react";

// ─── Config ─────────────────────────────────────────────────────────

export interface BFlowStatusConfig {
  icon: React.ReactNode;
  color: string;
  bg: string;
  label: string;
}

const STATUS_CONFIG: Record<string, BFlowStatusConfig> = {
  pending: {
    icon: <Clock className="w-4 h-4" />,
    color: "text-default-400",
    bg: "bg-default-50 border-default-200",
    label: "Pending",
  },
  running: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: "text-primary",
    bg: "bg-primary-50 border-primary-200",
    label: "Running",
  },
  succeeded: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-success",
    bg: "bg-success-50 border-success-200",
    label: "Succeeded",
  },
  failed: {
    icon: <XCircle className="w-4 h-4" />,
    color: "text-danger",
    bg: "bg-danger-50 border-danger-200",
    label: "Failed",
  },
  cancelled: {
    icon: <StopCircle className="w-4 h-4" />,
    color: "text-warning",
    bg: "bg-warning-50 border-warning-200",
    label: "Cancelled",
  },
  skipped: {
    icon: <SkipForward className="w-4 h-4" />,
    color: "text-warning",
    bg: "bg-warning-50 border-warning-200",
    label: "Skipped",
  },
};

/** Look up the config for a given status string, falling back to "pending". */
export function getStatusConfig(status?: string): BFlowStatusConfig {
  return STATUS_CONFIG[status ?? "pending"] ?? STATUS_CONFIG.pending;
}

// ─── Component ──────────────────────────────────────────────────────

export interface BFlowStatusBadgeProps {
  /** The run/step status key */
  status?: string;
}

/**
 * Compact inline status badge showing the status icon + label.
 * Styled with HeroUI semantic colour tokens.
 */
export function BFlowStatusBadge({ status }: BFlowStatusBadgeProps) {
  const cfg = getStatusConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} border-current`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
