"use client";

import { useState } from "react";
import { Save, Trash2, MessageSquare } from "lucide-react";
import type { BDBoardColumn, BDBoardTask } from "../../BDDomain.Types";
import { useBDTaskComments } from "./BDTask.Hooks";
import {
  BD_TASK_PRIORITY_OPTIONS,
  BD_TASK_TYPE_OPTIONS,
} from "./BDTask.Types";
import BDTaskCommentsComponent from "./BDTaskComments.Component";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import BDWysiwygEditor from "../../components/BDWysiwygEditor";
import { cn } from "@heroui/react";

export interface BDTaskDrawerComponentProps {
  open: boolean;
  task: BDBoardTask | null;
  columns: BDBoardColumn[];
  onClose: () => void;
  onSave: (task: BDBoardTask) => void;
  onDelete: (task: BDBoardTask) => void;
}

const FIELD =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400";

export function BDTaskDrawerComponent({
  open,
  task,
  columns,
  onClose,
  onSave,
  onDelete,
}: BDTaskDrawerComponentProps) {
  const [draft, setDraft] = useState<BDBoardTask | null>(task);
  const [commentsCollapsed, setCommentsCollapsed] = useState(false);
  const comments = useBDTaskComments(task?.id);

  const drawerKey = `${open}:${task?.id ?? "none"}`;
  const [prevKey, setPrevKey] = useState(drawerKey);
  if (drawerKey !== prevKey) {
    setPrevKey(drawerKey);
    setDraft(task);
    setCommentsCollapsed(false);
  }

  if (!draft) {
    return (
      <BDModal open={open} onClose={onClose} title="Task">
        <p className="text-sm text-slate-500">Select a task to edit.</p>
      </BDModal>
    );
  }

  const update = (patch: Partial<BDBoardTask>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const commentCount = comments?.length ?? 0;

  return (
    <BDModal
      open={open}
      onClose={onClose}
      size="xl"
      bodyScroll={false}
      bodyClassName="p-0"
      title={
        <span className="font-mono text-sm font-semibold text-blue-600">
          {draft.key}
        </span>
      }
      footer={
        <>
          <BDButton variant="danger" icon={Trash2} onClick={() => onDelete(draft)}>
            Delete
          </BDButton>
          <div className="flex-1" />
          <BDButton variant="ghost" onClick={onClose}>
            Close
          </BDButton>
          <BDButton icon={Save} onClick={() => onSave(draft)}>
            Save task
          </BDButton>
        </>
      }
    >
      <div
        className={cn(
          "grid h-[70vh] max-h-full min-h-0",
          commentsCollapsed
            ? "grid-cols-1"
            : "grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px]",
        )}
      >
        {/* ── Left: details ── */}
        <div className="bd-scroll flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="flex items-start gap-2">
            <input
              className={cn(
                FIELD,
                "flex-1 border-transparent bg-transparent px-1 text-lg font-semibold hover:bg-slate-50 focus:bg-white",
              )}
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            {commentsCollapsed && (
              <BDButton
                variant="ghost"
                size="sm"
                icon={MessageSquare}
                onClick={() => setCommentsCollapsed(false)}
              >
                Show comments ({commentCount})
              </BDButton>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Description
            </span>
            <BDWysiwygEditor
              value={draft.description}
              onChange={(value) => update({ description: value })}
              placeholder="Add a more detailed description…"
            />
          </div>

          <div>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Details
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Type</span>
                <select
                  className={FIELD}
                  value={draft.type}
                  onChange={(e) =>
                    update({ type: e.target.value as BDBoardTask["type"] })
                  }
                >
                  {BD_TASK_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Priority
                </span>
                <select
                  className={FIELD}
                  value={draft.priority}
                  onChange={(e) =>
                    update({
                      priority: e.target.value as BDBoardTask["priority"],
                    })
                  }
                >
                  {BD_TASK_PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Status
                </span>
                <select
                  className={FIELD}
                  value={draft.status}
                  onChange={(e) => {
                    const column = columns.find(
                      (c) => c.status.name === e.target.value,
                    );
                    update({ status: e.target.value, columnId: column?.id });
                  }}
                >
                  {columns.map((column) => (
                    <option key={column.id} value={column.status.name}>
                      {column.status.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Story points
                </span>
                <input
                  type="number"
                  className={FIELD}
                  value={draft.storyPoints ?? ""}
                  onChange={(e) =>
                    update({
                      storyPoints:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Assignee
                </span>
                <input
                  className={FIELD}
                  placeholder="member id"
                  value={draft.assigneeId ?? ""}
                  onChange={(e) =>
                    update({ assigneeId: e.target.value || undefined })
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Due date
                </span>
                <input
                  type="date"
                  className={FIELD}
                  value={draft.dueDate ?? ""}
                  onChange={(e) =>
                    update({ dueDate: e.target.value || undefined })
                  }
                />
              </label>
            </div>
          </div>
        </div>

        {/* ── Right: comments ── */}
        {!commentsCollapsed && (
          <div className="h-full min-h-0 border-t border-slate-100 md:border-l md:border-t-0">
            <BDTaskCommentsComponent
              key={draft.id}
              taskId={draft.id}
              onHide={() => setCommentsCollapsed(true)}
            />
          </div>
        )}
      </div>
    </BDModal>
  );
}

export default BDTaskDrawerComponent;
