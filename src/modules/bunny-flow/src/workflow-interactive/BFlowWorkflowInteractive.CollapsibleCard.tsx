/**
 * BFlowWorkflowInteractive.CollapsibleCard — Expandable card with title, subtitle, edit/remove actions.
 */

"use client";

import React, { useState } from "react";
import { Button, Card } from "@heroui/react";
import { ChevronDown, ChevronRight, Edit3, Trash2 } from "lucide-react";

interface BFlowCollapsibleCardProps {
  title: string;
  subtitle?: string;
  onRemove?: () => void;
  onEdit?: () => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function BFlowCollapsibleCard({
  title,
  subtitle,
  onRemove,
  onEdit,
  defaultOpen = false,
  children,
}: BFlowCollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="border border-default-100 bg-background shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-default-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button className="text-default-400 shrink-0">
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {title}
            </p>
            {subtitle && (
              <p className="text-xs text-default-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <Button
              onPress={onEdit}
              variant="ghost"
              size="sm"
              className="text-default-400 h-7 min-w-0 w-7 p-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
          )}
          {onRemove && (
            <Button
              onPress={onRemove}
              variant="ghost"
              size="sm"
              className="text-danger-400 hover:text-danger h-7 min-w-0 w-7 p-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-default-50 pt-3">
          {children}
        </div>
      )}
    </Card>
  );
}
