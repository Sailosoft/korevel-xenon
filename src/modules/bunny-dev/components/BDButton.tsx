"use client";

// BDButton — the module's base button primitive (bluish theme).
// Config-first: variant + size + optional icon and loading state.

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@heroui/react";

export type BDButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type BDButtonSize = "sm" | "md" | "lg";

export interface BDButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: BDButtonVariant;
  size?: BDButtonSize;
  icon?: LucideIcon;
  isLoading?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<BDButtonVariant, string> = {
  primary: "bg-[#1976d2] text-white hover:bg-[#1565c0] border-transparent",
  secondary:
    "bg-[#e3f2fd] text-[#1565c0] hover:bg-[#bbdefb] border-transparent",
  outline:
    "bg-transparent text-[#1565c0] border-[#90caf9] hover:bg-[#e3f2fd]",
  ghost:
    "bg-transparent text-slate-600 border-transparent hover:bg-slate-100",
  danger: "bg-[#dc2626] text-white hover:bg-[#b91c1c] border-transparent",
};

const SIZE_CLASSES: Record<BDButtonSize, string> = {
  sm: "text-xs px-2.5 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
  lg: "text-base px-5 py-2.5 gap-2",
};

export function BDButton({
  variant = "primary",
  size = "md",
  icon: Icon,
  isLoading = false,
  className,
  children,
  disabled,
  ...rest
}: BDButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}
      {children}
    </button>
  );
}

export default BDButton;
