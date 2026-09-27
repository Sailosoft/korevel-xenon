"use client";

// BDBoard.Component — the kanban board with native drag-and-drop.

import { useState } from "react";
import { Plus, GripVertical } from "lucide-react";
import type { BDBoardColumn, BDBoardTask } from "../../BDDomain.Types";
import BDBadge from "../../components/BDBadge";
import { cn } from "@heroui/react";

export interface BDBoardComponentProps {
  columns: BDBoardColumn[];
  tasks: BDBoardTask[];
  onSelectTask: (task: BDBoardTask) => void;
  onMoveTask: (task: BDBoardTask, column: BDBoardColumn) => void;
  onAddTask: (column: BDBoardColumn) => void;
}

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

export function BDBoardComponent({
  columns,
  tasks,
  onSelectTask,
  onMoveTask,
  onAddTask,
}: BDBoardComponentProps) {
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  return (
    <div className="bd-scroll flex gap-4 overflow-x-auto pb-2">
      {columns.map((column) => {
        const columnTasks = tasks.filter(
          (task) => task.status === column.status.name || task.columnId === column.id,
        );
        return (
          <div
            key={column.id}
            className={cn(
              "flex w-72 flex-shrink-0 flex-col rounded-xl border bg-slate-50/70 p-2",
              overColumnId === column.id
                ? "border-blue-400 bg-blue-50"
                : "border-slate-200",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setOverColumnId(column.id);
            }}
            onDragLeave={() => setOverColumnId(null)}
            onDrop={() => {
              const task = tasks.find((t) => t.id === dragTaskId);
              if (task) onMoveTask(task, column);
              setDragTaskId(null);
              setOverColumnId(null);
            }}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {column.name}
                </span>
                <BDBadge>{columnTasks.length}</BDBadge>
              </div>
              <button
                type="button"
                onClick={() => onAddTask(column)}
                className="rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600"
                aria-label="Add task"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-[60px] flex-col gap-2">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragTaskId(task.id)}
                  onClick={() => onSelectTask(task)}
                  className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-600">
                      {task.key}
                    </span>
                    <GripVertical className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-800">
                    {task.name}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <BDBadge color="gray">{task.type}</BDBadge>
                    <BDBadge color={PRIORITY_COLOR[task.priority] ?? "gray"}>
                      {task.priority}
                    </BDBadge>
                    {task.storyPoints ? (
                      <BDBadge color="primary">{task.storyPoints} pts</BDBadge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BDBoardComponent;
