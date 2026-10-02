"use client";

// BDBadge — small status/label pill used across lists, boards, and trees.

import type { ReactNode } from "react";
import { cn } from "@heroui/react";
import type { BDAppColor } from "../BDDomain.Types";

export interface BDBadgeProps {
  children: ReactNode;
  color?: BDAppColor | "neutral";
  className?: string;
  dot?: boolean;
}

const COLOR_CLASSES: Record<BDAppColor | "neutral", string> = {
  primary: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  gray: "bg-slate-100 text-slate-600 border-slate-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
};

export function BDBadge({
  children,
  color = "neutral",
  className,
  dot = false,
}: BDBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        COLOR_CLASSES[color],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export default BDBadge;
