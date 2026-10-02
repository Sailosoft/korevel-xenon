"use client";

import { useState } from "react";
import { Plus, Save, Trash2, MessageSquare } from "lucide-react";
import type {
  BDBoardColumn,
  BDBoardCustomField,
  BDBoardTask,
} from "../../BDDomain.Types";
import { useBDProjectMembers, useBDTaskComments } from "./BDTask.Hooks";
import { bdBoardTaskRepository } from "./BDTask.Repository";
import {
  BD_TASK_PRIORITY_OPTIONS,
  BD_TASK_TYPE_OPTIONS,
} from "./BDTask.Types";
import BDTaskCommentsComponent from "./BDTaskComments.Component";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import BDWysiwygEditor from "../../components/BDWysiwygEditor";
import { cn } from "@heroui/react";

/** Editable draft: full task in update mode, id-less in create mode. */
export type BDTaskDraft = Omit<BDBoardTask, "id"> & { id?: string };

export interface BDTaskDrawerComponentProps {
  open: boolean;
  mode: "create" | "update";
  task: BDBoardTask | null;
  newTask: Omit<BDBoardTask, "id"> | null;
  columns: BDBoardColumn[];
  projectId: string;
  customFields?: BDBoardCustomField[];
  onClose: () => void;
  onCreate?: (draft: Omit<BDBoardTask, "id">) => void;
  onDelete?: (task: BDBoardTask) => void;
}

const FIELD =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400";

export function BDTaskDrawerComponent({
  open,
  mode,
  task,
  newTask,
  columns,
  projectId,
  customFields,
  onClose,
  onCreate,
  onDelete,
}: BDTaskDrawerComponentProps) {
  const initial: BDTaskDraft | null =
    mode === "create" ? newTask : (task as BDTaskDraft | null);
  const [draft, setDraft] = useState<BDTaskDraft | null>(initial);
  const [commentsCollapsed, setCommentsCollapsed] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const members = useBDProjectMembers(projectId);
  const comments = useBDTaskComments(draft?.id);

  const drawerKey = `${open}:${mode}:${task?.id ?? newTask?.columnId ?? "new"}`;
  const [prevKey, setPrevKey] = useState(drawerKey);
  if (drawerKey !== prevKey) {
    setPrevKey(drawerKey);
    setDraft(mode === "create" ? newTask : (task as BDTaskDraft | null));
    setCommentsCollapsed(false);
  }

  if (!draft) {
    return (
      <BDModal open={open} onClose={onClose} title="Task">
        <p className="text-sm text-slate-500">Select a task to edit.</p>
      </BDModal>
    );
  }

  const isUpdate = mode === "update";

  const patchDraft = (patch: Partial<BDBoardTask>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  /** Persist straight to the record — update mode only. */
  const persist = (patch: Partial<BDBoardTask>) => {
    if (!isUpdate || !draft.id) return;
    void bdBoardTaskRepository.update(draft.id, patch);
  };

  /** Local edit + autosave (update mode). */
  const apply = (patch: Partial<BDBoardTask>) => {
    patchDraft(patch);
    persist(patch);
  };

  const isDescriptionDirty =
    isUpdate && !!task && draft.description !== task.description;

  const saveDescription = async () => {
    if (!draft.id) return;
    setSavingDescription(true);
    try {
      await bdBoardTaskRepository.update(draft.id, {
        description: draft.description,
      });
    } finally {
      setSavingDescription(false);
    }
  };

  const setCustomField = (slug: string, value: string) => {
    apply({ customFields: { ...(draft.customFields ?? {}), [slug]: value } });
  };

  // Keep the current assignee selectable even when the member list is empty.
  const assigneeOptions = [
    ...(members ?? []),
    ...(draft.assigneeId && !(members ?? []).some((m) => m.id === draft.assigneeId)
      ? [{ id: draft.assigneeId, name: "Unknown member" }]
      : []),
  ];

  const commentCount = comments?.length ?? 0;

  return (
    <BDModal
      open={open}
      onClose={onClose}
      size="xl"
      bodyScroll={false}
      bodyClassName="p-0"
      title={
        isUpdate && draft.key ? (
          <span className="font-mono text-sm font-semibold text-blue-600">
            {draft.key}
          </span>
        ) : (
          <span className="text-sm font-semibold text-slate-700">New task</span>
        )
      }
      footer={
        <>
          {isUpdate && (
            <BDButton
              variant="danger"
              icon={Trash2}
              onClick={() => task && onDelete?.(task)}
            >
              Delete
            </BDButton>
          )}
          <div className="flex-1" />
          <BDButton variant="ghost" onClick={onClose}>
            Close
          </BDButton>
          {!isUpdate && (
            <BDButton
              icon={Plus}
              disabled={!draft.name.trim()}
              onClick={() => onCreate?.(draft)}
            >
              Create task
            </BDButton>
          )}
        </>
      }
    >
      <div
        className={cn(
          "grid h-[70vh] max-h-full min-h-0",
          commentsCollapsed || !isUpdate
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
              onChange={(e) => patchDraft({ name: e.target.value })}
              onBlur={(e) => persist({ name: e.target.value })}
            />
            {isUpdate && commentsCollapsed && (
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
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Description
              </span>
              {isDescriptionDirty && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  Unsaved changes
                </span>
              )}
            </div>
            <BDWysiwygEditor
              value={draft.description}
              onChange={(value) => patchDraft({ description: value })}
              placeholder="Add a more detailed description…"
            />
            {isUpdate && (
              <div className="flex justify-end">
                <BDButton
                  size="sm"
                  variant="secondary"
                  icon={Save}
                  disabled={!isDescriptionDirty}
                  isLoading={savingDescription}
                  onClick={saveDescription}
                >
                  Save description
                </BDButton>
              </div>
            )}
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
                    apply({ type: e.target.value as BDBoardTask["type"] })
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
                    apply({
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
                    apply({ status: e.target.value, columnId: column?.id });
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
                    apply({
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
                <select
                  className={FIELD}
                  value={draft.assigneeId ?? ""}
                  onChange={(e) =>
                    apply({ assigneeId: e.target.value || undefined })
                  }
                >
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
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
                    apply({ dueDate: e.target.value || undefined })
                  }
                />
              </label>
            </div>
          </div>

          {(customFields ?? []).length > 0 && (
            <div>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Custom fields
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(customFields ?? []).map((field) => {
                  const value = draft.customFields?.[field.slug] ?? "";
                  const onChange = (next: string) =>
                    setCustomField(field.slug, next);
                  return (
                    <label key={field.id} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-600">
                        {field.name}
                      </span>
                      {field.type === "textarea" ? (
                        <textarea
                          className={cn(FIELD, "min-h-[72px] resize-y")}
                          value={value}
                          onChange={(e) => onChange(e.target.value)}
                        />
                      ) : (
                        <input
                          type={
                            field.type === "number"
                              ? "number"
                              : field.type === "date"
                                ? "date"
                                : "text"
                          }
                          className={FIELD}
                          value={value}
                          onChange={(e) => onChange(e.target.value)}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: comments (update mode only) ── */}
        {isUpdate && !commentsCollapsed && draft.id && (
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
