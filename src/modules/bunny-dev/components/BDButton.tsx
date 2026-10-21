"use client";

// BDButton — the module's base button primitive (bluish theme).
// Config-first: variant + size + optional icon and loading state.

import type { ComponentPropsWithRef, ReactNode } from "react";
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
  extends Omit<ComponentPropsWithRef<"button">, "children"> {
  variant?: BDButtonVariant;
  size?: BDButtonSize;
  icon?: LucideIcon;
  isLoading?: boolean;
  children?: ReactNode;
}

export const BD_BUTTON_VARIANT_CLASSES: Record<BDButtonVariant, string> = {
  primary:
    "bg-[var(--bd-primary)] text-[var(--bd-on-primary)] hover:bg-[var(--bd-primary-hover)] border-transparent",
  secondary:
    "bg-[var(--bd-primary-soft)] text-[var(--bd-primary-strong)] hover:bg-[var(--bd-primary-soft-hover)] border-transparent",
  outline:
    "bg-transparent text-[var(--bd-primary-strong)] border-[var(--bd-primary-border)] hover:bg-[var(--bd-primary-soft)]",
  ghost:
    "bg-transparent text-slate-600 border-transparent hover:bg-slate-100",
  danger:
    "bg-[var(--bd-color-danger)] text-white hover:bg-[var(--bd-color-danger-hover)] border-transparent",
};

export const BD_BUTTON_SIZE_CLASSES: Record<BDButtonSize, string> = {
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
  ref,
  ...rest
}: BDButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        BD_BUTTON_VARIANT_CLASSES[variant],
        BD_BUTTON_SIZE_CLASSES[size],
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
