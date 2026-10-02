"use client";

// BDAsyncBoundary — one place to render loading / error / empty / content for
// any Dexie live-query driven view.

import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import BDEmptyState from "./BDEmptyState";
import type { BDEmptyStateProps } from "./BDEmptyState";

export interface BDAsyncBoundaryProps {
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyState?: BDEmptyStateProps;
  children: ReactNode;
  loadingLabel?: string;
  minHeight?: number;
}

export function BDAsyncBoundary({
  isLoading = false,
  error = null,
  isEmpty = false,
  emptyState,
  children,
  loadingLabel = "Loading…",
  minHeight = 200,
}: BDAsyncBoundaryProps) {
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-2 text-sm text-slate-500"
        style={{ minHeight }}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {loadingLabel}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center gap-2 rounded-xl bg-red-50 text-sm text-red-600"
        style={{ minHeight }}
      >
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    );
  }

  if (isEmpty && emptyState) {
    return <BDEmptyState {...emptyState} />;
  }

  return <>{children}</>;
}

export default BDAsyncBoundary;
