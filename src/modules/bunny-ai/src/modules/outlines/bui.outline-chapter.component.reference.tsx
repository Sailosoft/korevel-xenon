"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Link2 } from "lucide-react";
import type { BunnyFieldRendererProps } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { BUIOutlineItemEntity } from "./bui.outline.entity";
import { BUIOutlineChapterRepository } from "./bui.outline-chapter.repository";
import { BUIOutlineRepository } from "./bui.outline.repository";

/** Normalizes a stored reference value (array or comma list) to numeric ids. */
function toIds(value: unknown): number[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return raw
    .map((entry) => Number(String(entry).trim()))
    .filter((entry) => Number.isFinite(entry));
}

/**
 * Control-mode only form field rendered inside the item card. It lets the user
 * attach any sibling item as a reference; their written content is later read
 * and injected into this item's input context during generation.
 */
export default function BUIOutlineChapterReferenceField({
  value,
  formData,
  onChange,
}: BunnyFieldRendererProps<Record<string, unknown>>) {
  const bookId = Number(formData.bookId);
  const currentId = formData.id != null ? Number(formData.id) : undefined;
  const currentNumber = Number(formData.number);

  const [isControlMode, setIsControlMode] = useState(false);
  const [siblings, setSiblings] = useState<BUIOutlineItemEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(bookId) || bookId <= 0) return;

    let cancelled = false;
    (async () => {
      try {
        const outlineRepo = new BUIOutlineRepository();
        const chapterRepo = new BUIOutlineChapterRepository();
        const [outline, items] = await Promise.all([
          outlineRepo.panelGetOne(bookId),
          chapterRepo.getItemsByOutline(bookId),
        ]);
        if (cancelled) return;

        setIsControlMode(outline?.generationMode === "control");
        setSiblings(
          items
            .filter((item) => item.id != null && item.id !== currentId)
            .sort((a, b) => a.number - b.number),
        );
      } catch (error) {
        console.error("Failed to load reference items:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId, currentId]);

  const selectedIds = useMemo(() => toIds(value), [value]);

  // Earlier items, nearest first: used for the quick-attach shortcuts.
  const previousItems = useMemo(
    () =>
      siblings
        .filter((item) => item.number < currentNumber)
        .sort((a, b) => b.number - a.number),
    [siblings, currentNumber],
  );

  // Later items, nearest first: used for the quick-attach shortcuts.
  const nextItems = useMemo(
    () =>
      siblings
        .filter((item) => item.number > currentNumber)
        .sort((a, b) => a.number - b.number),
    [siblings, currentNumber],
  );

  if (loading || !isControlMode) return null;

  const applySelection = (ids: number[]) => {
    onChange("referenceIds", Array.from(new Set(ids)).sort((a, b) => a - b));
  };

  const toggle = (id: number) => {
    applySelection(
      selectedIds.includes(id)
        ? selectedIds.filter((entry) => entry !== id)
        : [...selectedIds, id],
    );
  };

  const attach = (id?: number) => {
    if (id == null || selectedIds.includes(id)) return;
    applySelection([...selectedIds, id]);
  };

  return (
    <div className="w-full rounded-xl border border-default-200 bg-default-50 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-default-500">
            <Link2 className="h-3.5 w-3.5 text-default-400" />
            Reference
          </span>
          <span className="text-xs text-default-500 leading-relaxed">
            Attach any items as references. Their written content is read and
            passed into this item&apos;s input context in Control mode.
          </span>
        </div>
        {selectedIds.length > 0 && (
          <Button size="sm" variant="ghost" onPress={() => applySelection([])}>
            Clear
          </Button>
        )}
      </div>

      {(previousItems[0]?.id != null ||
        previousItems[1]?.id != null ||
        nextItems[0]?.id != null ||
        nextItems[1]?.id != null) && (
        <div className="flex flex-wrap gap-2">
          {previousItems[0]?.id != null && (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => attach(previousItems[0].id)}
            >
              Attach latest previous (#{previousItems[0].number})
            </Button>
          )}
          {nextItems[0]?.id != null && (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => attach(nextItems[0].id)}
            >
              Attach next (#{nextItems[0].number})
            </Button>
          )}
          {previousItems[1]?.id != null && (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => attach(previousItems[1].id)}
            >
              Attach the one before (#{previousItems[1].number})
            </Button>
          )}
          {nextItems[1]?.id != null && (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => attach(nextItems[1].id)}
            >
              Attach the one after (#{nextItems[1].number})
            </Button>
          )}
        </div>
      )}

      {siblings.length === 0 ? (
        <p className="text-xs text-default-400 italic">
          No other items available to reference.
        </p>
      ) : (
        <div className="flex flex-col gap-1 pr-1">
          {siblings.map((item) => {
            const id = item.id!;
            const checked = selectedIds.includes(id);
            const hasContent = !!item.content && item.content.trim().length > 0;

            return (
              <label
                key={id}
                className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 cursor-pointer transition-colors ${
                  checked
                    ? "border-primary bg-primary-50"
                    : "border-default-200 bg-transparent hover:border-default-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(id)}
                  className="accent-primary"
                />
                <span className="text-sm text-default-800 truncate">
                  {item.number}. {item.title}
                </span>
                <span
                  className={`ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
                    hasContent ? "text-success-600" : "text-default-400"
                  }`}
                >
                  {hasContent ? "has content" : "empty"}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
