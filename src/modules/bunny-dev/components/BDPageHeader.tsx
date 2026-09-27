"use client";

// BDPageHeader — consistent page title row used by every sub-module page.

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@heroui/react";

export interface BDPageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

export function BDPageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: BDPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export default BDPageHeader;
