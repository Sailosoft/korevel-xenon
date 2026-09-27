"use client";

import { useState } from "react";
import { Save, Trash2, Send } from "lucide-react";
import type {
  BDBoardColumn,
  BDBoardTask,
  BDTaskComment,
} from "../../BDDomain.Types";
import { useBDTaskComments } from "./BDTask.Hooks";
import {
  BD_TASK_PRIORITY_OPTIONS,
  BD_TASK_TYPE_OPTIONS,
} from "./BDTask.Types";
import { bdTaskCommentRepository } from "./BDTask.Repository";
import BDDrawer from "../../components/BDDrawer";
import BDButton from "../../components/BDButton";

export interface BDTaskDrawerComponentProps {
  open: boolean;
  task: BDBoardTask | null;
  columns: BDBoardColumn[];
  onClose: () => void;
  onSave: (task: BDBoardTask) => void;
  onDelete: (task: BDBoardTask) => void;
}

const CELL =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400";

export function BDTaskDrawerComponent({
  open,
  task,
  columns,
  onClose,
  onSave,
  onDelete,
}: BDTaskDrawerComponentProps) {
  const [draft, setDraft] = useState<BDBoardTask | null>(task);
  const [comment, setComment] = useState("");
  const comments = useBDTaskComments(task?.id);

  const drawerKey = `${open}:${task?.id ?? "none"}`;
  const [prevKey, setPrevKey] = useState(drawerKey);
  if (drawerKey !== prevKey) {
    setPrevKey(drawerKey);
    setDraft(task);
    setComment("");
  }

  if (!draft) {
    return (
      <BDDrawer open={open} onClose={onClose} title="Task">
        <p className="text-sm text-slate-500">Select a task to edit.</p>
      </BDDrawer>
    );
  }

  const update = (patch: Partial<BDBoardTask>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const addComment = async () => {
    if (!comment.trim()) return;
    await bdTaskCommentRepository.create({
      taskId: draft.id,
      comment: comment.trim(),
    });
    setComment("");
  };

  return (
    <BDDrawer
      open={open}
      onClose={onClose}
      width="40rem"
      title={`${draft.key} · ${draft.name}`}
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
      <div className="flex flex-col gap-4">
        <input
          className={`${CELL} font-semibold`}
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
        />
        <textarea
          className={CELL}
          rows={4}
          placeholder="Description"
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Type</span>
            <select
              className={CELL}
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
            <span className="text-xs font-medium text-slate-600">Priority</span>
            <select
              className={CELL}
              value={draft.priority}
              onChange={(e) =>
                update({ priority: e.target.value as BDBoardTask["priority"] })
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
            <span className="text-xs font-medium text-slate-600">Status</span>
            <select
              className={CELL}
              value={draft.status}
              onChange={(e) => {
                const column = columns.find(
                  (c) => c.status.name === e.target.value,
                );
                update({
                  status: e.target.value,
                  columnId: column?.id,
                });
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
              className={CELL}
              value={draft.storyPoints ?? ""}
              onChange={(e) =>
                update({
                  storyPoints:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Assignee</span>
            <input
              className={CELL}
              placeholder="member id"
              value={draft.assigneeId ?? ""}
              onChange={(e) =>
                update({ assigneeId: e.target.value || undefined })
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Due date</span>
            <input
              type="date"
              className={CELL}
              value={draft.dueDate ?? ""}
              onChange={(e) => update({ dueDate: e.target.value || undefined })}
            />
          </label>
        </div>

        {/* Comments */}
        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Comments ({(comments ?? []).length})
          </h3>
          <div className="flex flex-col gap-2">
            {(comments ?? []).map((c: BDTaskComment) => (
              <div
                key={c.id}
                className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                <p>{c.comment}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {c.createdAt
                    ? new Date(c.createdAt).toLocaleString()
                    : "just now"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-end gap-2">
            <textarea
              className={CELL}
              rows={2}
              placeholder="Add a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <BDButton size="sm" icon={Send} onClick={addComment}>
              Post
            </BDButton>
          </div>
        </section>
      </div>
    </BDDrawer>
  );
}

export default BDTaskDrawerComponent;
