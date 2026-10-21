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
  primary: "bd-badge-primary",
  success: "bd-badge-success",
  warning: "bd-badge-warning",
  danger: "bd-badge-danger",
  info: "bd-badge-info",
  gray: "bd-badge-gray",
  neutral: "bd-badge-neutral",
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
