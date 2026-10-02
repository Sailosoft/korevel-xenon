"use client";

// BDStatusDot — a tiny colored status indicator with an optional label.

import { cn } from "@heroui/react";

export type BDStatusColor =
  | "gray"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "violet";

export interface BDStatusDotProps {
  color?: BDStatusColor;
  label?: string;
  className?: string;
  pulse?: boolean;
}

const DOT_CLASSES: Record<BDStatusColor, string> = {
  gray: "bg-slate-400",
  blue: "bg-blue-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
};

export function BDStatusDot({
  color = "gray",
  label,
  className,
  pulse = false,
}: BDStatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          DOT_CLASSES[color],
          pulse && "animate-pulse",
        )}
      />
      {label && <span className="text-xs text-slate-600">{label}</span>}
    </span>
  );
}

export default BDStatusDot;
