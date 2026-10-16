"use client";

// BDBoardList — the grouped list view for a board. Tasks are grouped by a
// selectable condition (section, priority, type, assignee, or a select custom
// field) and each group collapses independently.

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type {
  BDBoardColumn,
  BDBoardCustomField,
  BDBoardTask,
  BDProjectMember,
} from "../../BDDomain.Types";
import {
  BD_TASK_PRIORITY_OPTIONS,
  BD_TASK_TYPE_OPTIONS,
  customChipId,
} from "./BDTask.Types";
import BDBadge from "../../components/BDBadge";
import BDTaskChipRow from "./BDTaskChips.Component";
import BDEmptyState from "../../components/BDEmptyState";
import { cn } from "@heroui/react";

export interface BDBoardListComponentProps {
  columns: BDBoardColumn[];
  tasks: BDBoardTask[];
  groupBy: string;
  customFields?: BDBoardCustomField[];
  members?: BDProjectMember[];
  cardChips?: string[];
  onSelectTask: (task: BDBoardTask) => void;
}

interface TaskGroup {
  key: string;
  label: string;
  tasks: BDBoardTask[];
}

const NONE_KEY = "__none__";

/** Group-by options for the list view toolbar. */
export function boardGroupByOptions(
  customFields: BDBoardCustomField[] = [],
): { value: string; label: string }[] {
  return [
    { value: "status", label: "Section" },
    { value: "priority", label: "Priority" },
    { value: "type", label: "Type" },
    { value: "assignee", label: "Assignee" },
    ...customFields
      .filter((field) => field.type === "select")
      .map((field) => ({ value: customChipId(field.slug), label: field.name })),
  ];
}

function buildGroups(
  groupBy: string,
  columns: BDBoardColumn[],
  tasks: BDBoardTask[],
  customFields: BDBoardCustomField[],
  members: BDProjectMember[],
): TaskGroup[] {
  if (groupBy === "status") {
    const groups: TaskGroup[] = columns.map((column) => ({
      key: column.id,
      label: column.name,
      tasks: tasks.filter(
        (task) =>
          task.status === column.status.name || task.columnId === column.id,
      ),
    }));
    const matched = new Set(
      groups.flatMap((group) => group.tasks.map((task) => task.id)),
    );
    const orphans = tasks.filter((task) => !matched.has(task.id));
    if (orphans.length > 0) {
      groups.push({ key: NONE_KEY, label: "No section", tasks: orphans });
    }
    return groups;
  }

  if (groupBy === "priority") {
    return BD_TASK_PRIORITY_OPTIONS.map((option) => ({
      key: option.value,
      label: option.label,
      tasks: tasks.filter((task) => task.priority === option.value),
    })).filter((group) => group.tasks.length > 0);
  }

  if (groupBy === "type") {
    return BD_TASK_TYPE_OPTIONS.map((option) => ({
      key: option.value,
      label: option.label,
      tasks: tasks.filter((task) => task.type === option.value),
    })).filter((group) => group.tasks.length > 0);
  }

  if (groupBy === "assignee") {
    const groups: TaskGroup[] = [];
    for (const member of members) {
      const memberTasks = tasks.filter((task) => task.assigneeId === member.id);
      if (memberTasks.length > 0) {
        groups.push({ key: member.id, label: member.name, tasks: memberTasks });
      }
    }
    const unassigned = tasks.filter(
      (task) => !task.assigneeId || !members.some((m) => m.id === task.assigneeId),
    );
    if (unassigned.length > 0) {
      groups.push({ key: NONE_KEY, label: "Unassigned", tasks: unassigned });
    }
    return groups;
  }

  if (groupBy.startsWith("custom:")) {
    const slug = groupBy.slice("custom:".length);
    const field = customFields.find((f) => f.slug === slug);
    const values = field?.options ?? [];
    const seen = new Set<string>();
    const groups: TaskGroup[] = [];
    for (const value of values) {
      const valueTasks = tasks.filter(
        (task) => task.customFields?.[slug] === value,
      );
      seen.add(value);
      if (valueTasks.length > 0) {
        groups.push({ key: value, label: value, tasks: valueTasks });
      }
    }
    const others = tasks.filter((task) => {
      const value = task.customFields?.[slug];
      return !value || !seen.has(value);
    });
    if (others.length > 0) {
      groups.push({ key: NONE_KEY, label: "None", tasks: others });
    }
    return groups;
  }

  return [{ key: NONE_KEY, label: "All tasks", tasks }];
}

export function BDBoardListComponent({
  columns,
  tasks,
  groupBy,
  customFields,
  members,
  cardChips,
  onSelectTask,
}: BDBoardListComponentProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () =>
      buildGroups(groupBy, columns, tasks, customFields ?? [], members ?? []),
    [groupBy, columns, tasks, customFields, members],
  );

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (tasks.length === 0) {
    return (
      <BDEmptyState
        title="No tasks yet"
        description="Add a task to this board to see it here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.key);
        return (
          <div
            key={group.key}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="flex w-full items-center gap-2 bg-slate-50 px-3 py-2 text-left"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
              <span className="text-sm font-semibold text-slate-700">
                {group.label}
              </span>
              <BDBadge>{group.tasks.length}</BDBadge>
            </button>
            {!isCollapsed && (
              <div className="flex flex-col divide-y divide-slate-100">
                {group.tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onSelectTask(task)}
                    className={cn(
                      "flex flex-col gap-1.5 px-3 py-2 text-left transition-colors hover:bg-blue-50/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-blue-600">
                        {task.key}
                      </span>
                      <span className="line-clamp-1 text-sm text-slate-800">
                        {task.name}
                      </span>
                    </div>
                    <BDTaskChipRow
                      task={task}
                      cardChips={cardChips}
                      customFields={customFields}
                      members={members}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default BDBoardListComponent;
