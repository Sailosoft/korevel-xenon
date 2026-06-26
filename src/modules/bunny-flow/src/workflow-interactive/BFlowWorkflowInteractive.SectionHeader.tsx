/**
 * BFlowWorkflowInteractive.SectionHeader — Reusable section header with icon, title, count badge, and add action.
 */

"use client";

import React from "react";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";

interface BFlowSectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
}

export function BFlowSectionHeader({
  icon,
  title,
  count,
  onAdd,
  addLabel,
}: BFlowSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-default-500">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {count !== undefined && (
          <span className="text-xs bg-default-100 text-default-500 px-2 py-0.5 rounded-full font-medium">
            {count}
          </span>
        )}
      </div>
      {onAdd && (
        <Button
          onPress={onAdd}
          variant="ghost"
          size="sm"
          className="text-primary font-medium text-xs h-7 min-w-0 px-2"
        >
          <Plus className="w-3.5 h-3.5" />
          {addLabel ?? "Add"}
        </Button>
      )}
    </div>
  );
}
