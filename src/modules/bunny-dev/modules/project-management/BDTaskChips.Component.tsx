"use client";

// BDTaskChips — the configurable chip row shown on task cards and list rows.
// The set of chips comes from the board's `cardChips` (built-ins + custom
// fields); when unset it falls back to the historical default set.

import type {
  BDBoardCustomField,
  BDBoardTask,
  BDProjectMember,
} from "../../BDDomain.Types";
import { BD_DEFAULT_CARD_CHIPS, customChipId } from "./BDTask.Types";
import BDBadge from "../../components/BDBadge";
import { cn } from "@heroui/react";

const PRIORITY_COLOR: Record<
  string,
  "gray" | "info" | "warning" | "danger" | "success"
> = {
  lowest: "gray",
  low: "gray",
  medium: "info",
  high: "warning",
  highest: "danger",
  blocker: "danger",
};

const SELECT_COLORS = [
  "primary",
  "info",
  "success",
  "warning",
  "danger",
  "gray",
] as const;

function selectColor(value: string, options: string[] | undefined): typeof SELECT_COLORS[number] {
  const index = options?.indexOf(value) ?? -1;
  if (index < 0) return "gray";
  return SELECT_COLORS[index % SELECT_COLORS.length];
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export interface BDTaskChipRowProps {
  task: BDBoardTask;
  cardChips?: string[];
  customFields?: BDBoardCustomField[];
  members?: BDProjectMember[];
  className?: string;
}

export function BDTaskChipRow({
  task,
  cardChips,
  customFields,
  members,
  className,
}: BDTaskChipRowProps) {
  const chipIds = cardChips && cardChips.length > 0 ? cardChips : BD_DEFAULT_CARD_CHIPS;
  const chips: React.ReactNode[] = [];

  for (const chipId of chipIds) {
    if (chipId === "key") {
      chips.push(
        <BDBadge key={chipId} color="gray" className="font-mono">
          {task.key}
        </BDBadge>,
      );
    } else if (chipId === "type") {
      chips.push(
        <BDBadge key={chipId} color="gray">
          {task.type}
        </BDBadge>,
      );
    } else if (chipId === "priority") {
      chips.push(
        <BDBadge
          key={chipId}
          color={PRIORITY_COLOR[task.priority] ?? "gray"}
        >
          {task.priority}
        </BDBadge>,
      );
    } else if (chipId === "storyPoints") {
      if (task.storyPoints) {
        chips.push(
          <BDBadge key={chipId} color="primary">
            {task.storyPoints} pts
          </BDBadge>,
        );
      }
    } else if (chipId === "assignee") {
      if (task.assigneeId) {
        const name =
          members?.find((member) => member.id === task.assigneeId)?.name ??
          "Assignee";
        chips.push(
          <BDBadge key={chipId} color="info">
            {name}
          </BDBadge>,
        );
      }
    } else if (chipId === "dueDate") {
      if (task.dueDate) {
        chips.push(
          <BDBadge key={chipId} color="warning">
            {formatDate(task.dueDate)}
          </BDBadge>,
        );
      }
    } else if (chipId.startsWith("custom:")) {
      const slug = chipId.slice("custom:".length);
      const value = task.customFields?.[slug];
      if (!value) continue;
      const field = customFields?.find((f) => f.slug === slug);
      chips.push(
        <span key={chipId} title={field ? `${field.name}: ${value}` : value}>
          <BDBadge
            color={
              field?.type === "select"
                ? selectColor(value, field.options)
                : "gray"
            }
          >
            {value}
          </BDBadge>
        </span>,
      );
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chips}
    </div>
  );
}

export { customChipId };
export default BDTaskChipRow;
