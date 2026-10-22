"use client";

// BDSortableList — config-first drag-and-drop reorderable list.
//
// Renders a vertical list of items with a drag handle per row using native HTML5
// drag-and-drop (no DnD dependency). Dropping a row before/after another emits the
// full reordered array via `onReorder`. The component keeps an optimistic local
// order until the `items` prop's id sequence changes, so callers can persist the
// order and refresh their data source without a visual jump.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical, Loader2 } from "lucide-react";
import { cn } from "@heroui/react";
import BDEmptyState, { type BDEmptyStateProps } from "./BDEmptyState";

type BDDropEdge = "before" | "after";

export interface BDSortableListProps<T> {
  items: T[];
  getRowId: (item: T) => string;
  /** Row body content. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Optional trailing actions rendered to the right of the row body. */
  renderItemActions?: (item: T, index: number) => ReactNode;
  /** Called with the full array in its new top-to-bottom order. */
  onReorder: (orderedItems: T[]) => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  emptyState?: BDEmptyStateProps;
  className?: string;
  itemClassName?: string;
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

export function BDSortableList<T>({
  items,
  getRowId,
  renderItem,
  renderItemActions,
  onReorder,
  isLoading = false,
  disabled = false,
  emptyState,
  className,
  itemClassName,
}: BDSortableListProps<T>) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropEdge, setDropEdge] = useState<BDDropEdge>("before");
  const [localOrder, setLocalOrder] = useState<T[] | null>(null);

  const getRowIdRef = useRef(getRowId);
  useEffect(() => {
    getRowIdRef.current = getRowId;
  }, [getRowId]);

  // Reset the optimistic order only when the source id sequence actually changes
  // (e.g. after the caller refreshes with the persisted order).
  const itemIdSignature = items.map((item) => getRowId(item)).join("|");
  useEffect(() => {
    setLocalOrder(null);
  }, [itemIdSignature]);

  const orderedItems = localOrder ?? items;

  const resetDrag = () => {
    setDragId(null);
    setOverId(null);
    setDropEdge("before");
  };

  const handleDrop = async () => {
    if (!dragId || !overId || dragId === overId) {
      resetDrag();
      return;
    }

    const next = moveItem(
      orderedItems,
      dragId,
      overId,
      dropEdge,
      getRowIdRef.current,
    );
    resetDrag();

    if (next === orderedItems) return;

    setLocalOrder(next);
    try {
      await onReorder(next);
    } catch (error) {
      console.error("BDSortableList reorder failed:", error);
      setLocalOrder(null);
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-16 text-sm text-slate-500",
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (orderedItems.length === 0) {
    return (
      <div className={className}>
        <BDEmptyState
          title={emptyState?.title ?? "Nothing here yet"}
          description={emptyState?.description}
          icon={emptyState?.icon}
          action={emptyState?.action}
        />
      </div>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {orderedItems.map((item, index) => {
        const id = getRowId(item);
        const isOver = overId === id && dragId !== null && dragId !== id;
        const showBefore = isOver && dropEdge === "before";
        const showAfter = isOver && dropEdge === "after";

        return (
          <li
            key={id}
            draggable={!disabled}
            onDragStart={(event) => {
              if (disabled) {
                event.preventDefault();
                return;
              }
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
              if (disabled || !dragId || id === dragId) return;
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              const edge: BDDropEdge =
                event.clientY - rect.top < rect.height / 2 ? "before" : "after";
              if (overId !== id) setOverId(id);
              if (dropEdge !== edge) setDropEdge(edge);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleDrop();
            }}
            className={cn(
              "relative rounded-xl",
              dragId === id && "opacity-50",
              itemClassName,
            )}
          >
            {showBefore && (
              <div className="pointer-events-none absolute inset-x-0 -top-1 z-10 h-0.5 rounded-full bg-[#1976d2]" />
            )}
            {showAfter && (
              <div className="pointer-events-none absolute inset-x-0 -bottom-1 z-10 h-0.5 rounded-full bg-[#1976d2]" />
            )}

            <div className="flex items-start gap-2">
              <button
                type="button"
                data-bd-drag-handle
                aria-label="Drag to reorder"
                disabled={disabled}
                className={cn(
                  "mt-1 flex h-7 w-6 shrink-0 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500",
                  disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
                )}
              >
                <GripVertical className="h-4 w-4" />
              </button>

              <div className="min-w-0 flex-1">
                {renderItem(item, index)}
              </div>

              {renderItemActions && (
                <div className="flex shrink-0 items-center gap-1">
                  {renderItemActions(item, index)}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default BDSortableList;
