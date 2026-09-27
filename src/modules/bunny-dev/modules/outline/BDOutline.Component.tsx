"use client";

// BDOutline.Component — recursive topic tree.

import { ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import type { BDOutlineTopic } from "../../BDDomain.Types";
import { cn } from "@heroui/react";

export interface BDOutlineComponentProps {
  topics: BDOutlineTopic[];
  selectedId?: string;
  depth?: number;
  onSelect: (topic: BDOutlineTopic) => void;
  onAdd: (parentId: string | null) => void;
  onDelete: (topic: BDOutlineTopic) => void;
}

export function BDOutlineComponent({
  topics,
  selectedId,
  depth = 0,
  onSelect,
  onAdd,
  onDelete,
}: BDOutlineComponentProps) {
  return (
    <ul className={cn("flex flex-col gap-0.5", depth === 0 && "p-1")}>
      {topics.map((topic) => (
        <li key={topic.id}>
          <div
            className={cn(
              "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm",
              topic.id === selectedId
                ? "bg-blue-50 font-semibold text-blue-700"
                : "text-slate-600 hover:bg-slate-50",
            )}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
          >
            <button
              type="button"
              className="flex flex-1 items-center gap-1.5 text-left"
              onClick={() => onSelect(topic)}
            >
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{topic.title}</span>
            </button>
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:text-blue-600"
                onClick={() => onAdd(topic.id)}
                aria-label="Add child topic"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:text-red-500"
                onClick={() => onDelete(topic)}
                aria-label="Delete topic"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {topic.children && topic.children.length > 0 && (
            <BDOutlineComponent
              topics={topic.children}
              selectedId={selectedId}
              depth={depth + 1}
              onSelect={onSelect}
              onAdd={onAdd}
              onDelete={onDelete}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default BDOutlineComponent;
