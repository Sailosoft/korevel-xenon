"use client";

// BDDrawer — right-hand slide-over panel for editors and task details.

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@heroui/react";

export interface BDDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  className?: string;
  /** When false, Escape does not close the drawer (e.g. a nested modal is open). */
  closeOnEscape?: boolean;
}

export function BDDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "32rem",
  className,
  closeOnEscape = true,
}: BDDrawerProps) {
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "bd-scroll relative z-10 flex h-full max-w-full flex-col overflow-y-auto bg-white shadow-2xl",
          className,
        )}
        style={{ width }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 px-5 py-4">{children}</div>

        {footer && (
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

export default BDDrawer;
