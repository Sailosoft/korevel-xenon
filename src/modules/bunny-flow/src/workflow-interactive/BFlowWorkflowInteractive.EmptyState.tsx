/**
 * BFlowWorkflowInteractive.EmptyState — Empty state placeholder with optional action button.
 */

"use client";

import React from "react";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";

interface BFlowEmptyStateProps {
  icon: React.ReactNode;
  message: string;
  action?: string;
  onAction?: () => void;
}

export function BFlowEmptyState({
  icon,
  message,
  action,
  onAction,
}: BFlowEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-default-200 rounded-xl bg-default-50/50">
      <span className="text-default-300 mb-2">{icon}</span>
      <p className="text-sm text-default-400 mb-3">{message}</p>
      {action && onAction && (
        <Button
          onPress={onAction}
          variant="ghost"
          size="sm"
          className="text-primary text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          {action}
        </Button>
      )}
    </div>
  );
}
