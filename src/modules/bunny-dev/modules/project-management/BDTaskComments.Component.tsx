"use client";

// BDTaskComments.Component — JIRA-style comment panel for a board task.
//
// Renders a virtualized, one-level threaded comment list with a WYSIWYG
// composer. Replies always attach to the thread root so rendering stays flat
// and virtual-scroll friendly.

import { useMemo, useRef, useState } from "react";
import {
  CornerDownRight,
  MessageSquare,
  Reply,
  Send,
  X,
} from "lucide-react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import type { BDTaskComment } from "../../BDDomain.Types";
import { useBDTaskComments } from "./BDTask.Hooks";
import { bdTaskCommentRepository } from "./BDTask.Repository";
import BDWysiwygEditor from "../../components/BDWysiwygEditor";
import BDMarkdownView from "../../components/BDMarkdownView";
import BDButton from "../../components/BDButton";
import { useBDToast } from "../../components/BDToast";
import { cn } from "@heroui/react";

interface BDCommentRow {
  comment: BDTaskComment;
  depth: 0 | 1;
  parentLabel?: string;
}

export interface BDTaskCommentsComponentProps {
  taskId: string;
  className?: string;
  onHide?: () => void;
}

function initials(value?: string): string {
  if (!value) return "?";
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "");
  return (cleaned.slice(0, 2) || "?").toUpperCase();
}

function memberLabel(authorId?: string): string {
  if (!authorId) return "Member";
  return `Member · ${authorId.slice(0, 6)}`;
}

function formatTime(value?: string): string {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Resolve the thread root for a comment, clamping arbitrary depth to one level. */
function resolveRootId(
  comment: BDTaskComment,
  byId: Map<string, BDTaskComment>,
): string {
  let current = comment;
  const seen = new Set<string>([current.id]);
  while (current.replyToId) {
    const parent = byId.get(current.replyToId);
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    current = parent;
  }
  return current.id;
}

export function BDTaskCommentsComponent({
  taskId,
  className,
  onHide,
}: BDTaskCommentsComponentProps) {
  const comments = useBDTaskComments(taskId);
  const { toast } = useBDToast();
  const virtRef = useRef<VirtuosoHandle>(null);

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<BDTaskComment | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const { rows, byId } = useMemo(() => {
    const all = comments ?? [];
    const index = new Map(all.map((c) => [c.id, c] as const));
    const rootOf = new Map<string, string>();
    for (const comment of all) {
      rootOf.set(comment.id, resolveRootId(comment, index));
    }

    const repliesByRoot = new Map<string, BDTaskComment[]>();
    for (const comment of all) {
      const rootId = rootOf.get(comment.id);
      if (!rootId || rootId === comment.id) continue;
      const list = repliesByRoot.get(rootId) ?? [];
      list.push(comment);
      repliesByRoot.set(rootId, list);
    }

    const built: BDCommentRow[] = [];
    for (const comment of all) {
      if (rootOf.get(comment.id) !== comment.id) continue;
      built.push({ comment, depth: 0 });
      for (const reply of repliesByRoot.get(comment.id) ?? []) {
        built.push({
          comment: reply,
          depth: 1,
          parentLabel: memberLabel(index.get(reply.replyToId ?? "")?.authorId),
        });
      }
    }
    return { rows: built, byId: index };
  }, [comments]);

  const total = comments?.length ?? 0;

  const post = async () => {
    const value = draft.trim();
    if (!value || isPosting) return;
    setIsPosting(true);
    try {
      const replyToId = replyTo ? resolveRootId(replyTo, byId) : undefined;
      await bdTaskCommentRepository.create({
        taskId,
        comment: value,
        replyToId,
      });
      setDraft("");
      setReplyTo(null);
      // Rows sort ascending, so the new comment is the last index. Wait a tick
      // so the live query re-render has data before scrolling.
      window.setTimeout(() => {
        virtRef.current?.scrollToIndex({
          index: total,
          behavior: "smooth",
          align: "end",
        });
      }, 0);
    } catch {
      toast({ title: "Could not post comment", status: "error" });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Comments</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            {total}
          </span>
        </div>
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Hide comments"
            title="Hide comments"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1">
        {rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-slate-400">
            <MessageSquare className="h-6 w-6" />
            <p className="text-xs">No comments yet. Start the discussion.</p>
          </div>
        ) : (
          <Virtuoso
            ref={virtRef}
            className="bd-scroll"
            style={{ height: "100%" }}
            data={rows}
            followOutput="smooth"
            computeItemKey={(_, row) => row.comment.id}
            itemContent={(_, row) => (
              <BDCommentItem
                row={row}
                onReply={() => setReplyTo(row.comment)}
              />
            )}
          />
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 p-3">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700">
            <CornerDownRight className="h-3.5 w-3.5" />
            <span className="flex-1 truncate">
              Replying to {memberLabel(replyTo.authorId)}
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="rounded p-0.5 text-blue-500 hover:bg-blue-100"
              aria-label="Cancel reply"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <BDWysiwygEditor
          variant="compact"
          value={draft}
          onChange={setDraft}
          placeholder="Add a comment…"
        />

        <div className="mt-2 flex items-center justify-end">
          <BDButton
            size="sm"
            icon={Send}
            onClick={post}
            isLoading={isPosting}
            disabled={!draft.trim()}
          >
            {replyTo ? "Reply" : "Comment"}
          </BDButton>
        </div>
      </div>
    </section>
  );
}

function BDCommentItem({
  row,
  onReply,
}: {
  row: BDCommentRow;
  onReply: () => void;
}) {
  const { comment, depth } = row;
  const isReply = depth === 1;

  return (
    <div className={cn("px-3", isReply ? "py-1.5 pl-8" : "py-2")}>
      <div
        className={cn(
          "group rounded-lg border bg-white p-3 transition-colors",
          isReply
            ? "border-slate-100 bg-slate-50/60"
            : "border-slate-200 hover:border-slate-300",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
              isReply ? "bg-slate-400" : "bg-[#1976d2]",
            )}
          >
            {initials(comment.authorId)}
          </span>
          <span className="truncate text-xs font-semibold text-slate-700">
            {memberLabel(comment.authorId)}
          </span>
          {isReply && row.parentLabel && (
            <span className="flex items-center gap-0.5 truncate text-[11px] text-slate-400">
              <CornerDownRight className="h-3 w-3" />
              {row.parentLabel}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[11px] text-slate-400">
            {formatTime(comment.createdAt)}
          </span>
        </div>

        <div className="mt-2 text-sm text-slate-700">
          <BDMarkdownView content={comment.comment} />
        </div>

        <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onReply}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-slate-100 hover:text-blue-600"
          >
            <Reply className="h-3 w-3" />
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

export default BDTaskCommentsComponent;
