"use client";

// BDOutline.Component — recursive topic tree with native HTML5 drag reorder.
//
// Each sibling level is independently drag-reorderable. The draggable row is a
// DOM sibling of the nested child tree, so drag events from child rows never
// bubble into the parent's draggable row.

import { useState } from "react";
import {
  ChevronRight,
  FileText,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import type { BDOutlineTopic } from "../../BDDomain.Types";
import { cn } from "@heroui/react";
import BDIconButton from "../../components/BDIconButton";

type BDDropEdge = "before" | "after";

export interface BDOutlineComponentProps {
  topics: BDOutlineTopic[];
  parentId?: string | null;
  selectedId?: string;
  depth?: number;
  onSelect: (topic: BDOutlineTopic) => void;
  onAdd: (parentId: string | null) => void;
  onDelete: (topic: BDOutlineTopic) => void;
  onReorder: (parentId: string | null, ordered: BDOutlineTopic[]) => void;
}

function moveItem<T>(
  items: T[],
  fromId: string,
  overId: string,
  edge: BDDropEdge,
  getRowId: (item: T) => string,
): T[] {
  const fromIndex = items.findIndex((item) => getRowId(item) === fromId);
  if (fromIndex < 0) return items;

  const without = items.filter((_, index) => index !== fromIndex);
  const overIndex = without.findIndex((item) => getRowId(item) === overId);
  if (overIndex < 0) return items;

  const insertAt = edge === "before" ? overIndex : overIndex + 1;
  const next = [...without];
  next.splice(insertAt, 0, items[fromIndex]);
  return next;
}

export function BDOutlineComponent({
  topics,
  parentId = null,
  selectedId,
  depth = 0,
  onSelect,
  onAdd,
  onDelete,
  onReorder,
}: BDOutlineComponentProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropEdge, setDropEdge] = useState<BDDropEdge>("before");

  const resetDrag = () => {
    setDragId(null);
    setOverId(null);
    setDropEdge("before");
  };

  const handleDrop = () => {
    if (!dragId || !overId || dragId === overId) {
      resetDrag();
      return;
    }
    const next = moveItem(topics, dragId, overId, dropEdge, (topic) => topic.id);
    resetDrag();
    if (next === topics) return;
    onReorder(parentId, next);
  };

  return (
    <ul className={cn("flex flex-col gap-0.5", depth === 0 && "p-1")}>
      {topics.map((topic) => {
        const id = topic.id;
        const isOver = overId === id && dragId !== null && dragId !== id;
        const showBefore = isOver && dropEdge === "before";
        const showAfter = isOver && dropEdge === "after";

        return (
          <li key={id}>
            {showBefore && (
              <div className="pointer-events-none mx-2 h-0.5 rounded-full bg-blue-500" />
            )}
            <div
              draggable
              onDragStart={(event) => {
                if (
                  !(event.target as HTMLElement).closest("[data-bd-drag-handle]")
                ) {
                  event.preventDefault();
                  return;
                }
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", id);
                setDragId(id);
              }}
              onDragEnd={resetDrag}
              onDragOver={(event) => {
                if (!dragId || id === dragId) return;
                event.preventDefault();
                event.stopPropagation();
                const rect = event.currentTarget.getBoundingClientRect();
                const edge: BDDropEdge =
                  event.clientY - rect.top < rect.height / 2
                    ? "before"
                    : "after";
                if (overId !== id) setOverId(id);
                if (dropEdge !== edge) setDropEdge(edge);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleDrop();
              }}
              className={cn(
                "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm",
                dragId === id && "opacity-50",
                topic.id === selectedId
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-600 hover:bg-slate-50",
              )}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
            >
              <button
                type="button"
                data-bd-drag-handle
                aria-label="Drag to reorder"
                className="flex h-5 w-4 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 hover:text-slate-500 active:cursor-grabbing"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
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
                <BDIconButton
                  icon={Plus}
                  label="Add child topic"
                  size="sm"
                  onClick={() => onAdd(topic.id)}
                />
                <BDIconButton
                  icon={Trash2}
                  label="Delete topic"
                  size="sm"
                  onClick={() => onDelete(topic)}
                />
              </div>
            </div>
            {showAfter && (
              <div className="pointer-events-none mx-2 h-0.5 rounded-full bg-blue-500" />
            )}
            {topic.children && topic.children.length > 0 && (
              <BDOutlineComponent
                topics={topic.children}
                parentId={topic.id}
                selectedId={selectedId}
                depth={depth + 1}
                onSelect={onSelect}
                onAdd={onAdd}
                onDelete={onDelete}
                onReorder={onReorder}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default BDOutlineComponent;
