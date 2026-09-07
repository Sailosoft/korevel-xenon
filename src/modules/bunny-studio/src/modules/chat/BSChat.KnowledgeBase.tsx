// BSChat.KnowledgeBase — Knowledge Base (RAG) logic + UI for the chat.
//
// Everything the chat needs to talk to a knowledge group's Orama index lives
// here (feature: separate KB logic/component from the chat):
//  - retrieveKnowledgeForChat(): search the group's vector index AND build the
//    ready-to-inject RAG context string. Unlike the low-level helper it also
//    returns the raw Orama hits (with similarity scores) so the UI can render
//    the collapsible scoring panel.
//  - buildKnowledgeInstruction(): wrap the retrieved context into a reference
//    system instruction — the assistant builds on it (code, instructions,
//    explanations) and discloses whether the answer came from the knowledge
//    base or its own knowledge.
//  - BSChatKnowledgeBaseIndicator(): the assistant loading indicator — shows
//    "Retrieving from Knowledge" + the bouncing dots while the RAG search runs,
//    then switches back to the plain dots once streaming begins.
//  - BSChatKnowledgeBaseScores(): collapsible panel listing every retrieved
//    chunk with its Orama similarity score (feature: collapsible KB scoring).

"use client";

import React, { useState } from "react";
import { BookOpen, ChevronDown, Database, FileText } from "lucide-react";
import { searchKnowledgeGroup } from "../knowledge-base/BSKnowledgeBase.Orama";
import type { BSKnowledgeSearchHit } from "../knowledge-base/BSKnowledgeBase.Orama";
import type { BSKnowledgeSourceType } from "../knowledge-base/BSKnowledge.Types";

// ─── Retrieval logic ───────────────────────────────────────────────────

export interface BSKnowledgeRetrieval {
  /** Ready-to-inject RAG context string (empty string when nothing matched). */
  context: string;
  /** The raw Orama search hits (with similarity scores) for the UI panel. */
  hits: BSKnowledgeSearchHit[];
}

/**
 * Retrieve the top relevant chunks from a group's Orama index for a query and
 * build the RAG context block. Returns both the context string (injected into
 * the system instruction) and the raw hits so the collapsible score panel can
 * show exactly which sources grounded the answer.
 */
export async function retrieveKnowledgeForChat(
  groupId: string,
  query: string,
  limit = 4,
): Promise<BSKnowledgeRetrieval> {
  const hits = await searchKnowledgeGroup(groupId, query, limit);
  if (hits.length === 0) return { context: "", hits };
  const blocks = hits.map(
    (h) => `[Source: ${h.title}]\n${h.content.trim()}`,
  );
  return { context: blocks.join("\n\n---\n\n"), hits };
}

/**
 * Build the system-instruction block that gives the assistant the retrieved
 * knowledge base context as a REFERENCE (not a hard limit). The assistant may
 * build on the context — quote it, summarize it, or generate code/instructions/
 * explanations grounded in it — and may fall back to its own knowledge when the
 * context is insufficient. It must always disclose which source it answered
 * from via a trailing tag so the user can tell a knowledge-base answer from a
 * general-knowledge one.
 */
export function buildKnowledgeInstruction(context: string): string {
  return (
    "You have access to a Knowledge Base reference below. Use it as your primary " +
    "reference whenever it is relevant: quote it, summarize it, or build on top of it " +
    "(for example generate code, instructions, or explanations grounded in it). " +
    "If the Knowledge Base does not contain what the user needs, answer from your own " +
    "knowledge instead of refusing — the reference is a helper, not a hard limit.\n\n" +
    "Disclosure rule: end your answer with a single line containing exactly one of " +
    "these source tags so the user can tell where the answer came from:\n" +
    `- ${KNOWLEDGE_SOURCE_TAG["knowledge-base"]} — the answer is based on the Knowledge Base context.\n` +
    `- ${KNOWLEDGE_SOURCE_TAG.general} — the answer comes from your own knowledge.\n` +
    `- ${KNOWLEDGE_SOURCE_TAG.mixed} — the answer combines both.\n\n` +
    `Knowledge Base Context:\n${context}`
  );
}

// ─── Answer-source disclosure ──────────────────────────────────────────
//
// The knowledge instruction asks the assistant to end its answer with a
// source tag. These helpers detect that tag in the streamed response and let
// the UI render a small badge (and hide the raw tag from the rendered view).

export type BSKnowledgeAnswerSource =
  | "knowledge-base"
  | "general"
  | "mixed"
  | "unknown";

export const KNOWLEDGE_SOURCE_TAG: Record<
  Exclude<BSKnowledgeAnswerSource, "unknown">,
  string
> = {
  "knowledge-base": "[Source: Knowledge Base]",
  general: "[Source: General Knowledge]",
  mixed: "[Source: Knowledge Base + General Knowledge]",
};

/** Detect which source the assistant disclosed for a response. */
export function detectKnowledgeAnswerSource(
  content: string,
): BSKnowledgeAnswerSource {
  if (!content) return "unknown";
  if (content.includes(KNOWLEDGE_SOURCE_TAG.mixed)) return "mixed";
  if (content.includes(KNOWLEDGE_SOURCE_TAG["knowledge-base"])) {
    return "knowledge-base";
  }
  if (content.includes(KNOWLEDGE_SOURCE_TAG.general)) return "general";
  return "unknown";
}

/** Remove the disclosed source tag(s) from content for clean display. */
export function stripKnowledgeSourceTag(content: string): string {
  if (!content) return content;
  let out = content;
  for (const tag of Object.values(KNOWLEDGE_SOURCE_TAG)) {
    out = out.split(tag).join("");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export interface BSChatKnowledgeSourceBadgeProps {
  /** Assistant message content to detect the disclosed source from. */
  content: string;
}

const SOURCE_BADGE_STYLE: Record<BSKnowledgeAnswerSource, string> = {
  "knowledge-base": "bg-red-100 text-red-600",
  general: "bg-gray-100 text-gray-500",
  mixed: "bg-amber-100 text-amber-700",
  unknown: "bg-gray-100 text-gray-400",
};

const SOURCE_BADGE_LABEL: Record<BSKnowledgeAnswerSource, string> = {
  "knowledge-base": "From Knowledge Base",
  general: "From General Knowledge",
  mixed: "From Knowledge Base + General",
  unknown: "Source Unknown",
};

/**
 * Small pill that shows where the assistant's answer came from. Renders nothing
 * when the response carries no disclosure tag (e.g. no knowledge group was
 * active, so the disclosure instruction was never injected).
 */
export function BSChatKnowledgeSourceBadge({
  content,
}: BSChatKnowledgeSourceBadgeProps) {
  const source = detectKnowledgeAnswerSource(content);
  if (source === "unknown") return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_BADGE_STYLE[source]}`}
      title="The AI disclosed where this answer came from"
    >
      <BookOpen className="w-3 h-3" />
      {SOURCE_BADGE_LABEL[source]}
    </span>
  );
}

// ─── Loading indicator ─────────────────────────────────────────────────
//
// While the RAG search runs (before streaming starts) the bubble shows the
// "Retrieving from Knowledge" label over the bouncing dots. Once the stream
// starts it returns to the plain three-dot animation.

export interface BSChatKnowledgeBaseIndicatorProps {
  /** True while the RAG retrieval is running (before streaming starts). */
  retrieving?: boolean;
  /** True once the assistant stream is running. */
  streaming?: boolean;
}

export function BSChatKnowledgeBaseIndicator({
  retrieving = false,
  streaming = false,
}: BSChatKnowledgeBaseIndicatorProps) {
  if (!retrieving && !streaming) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {retrieving && (
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-500">
          <Database className="w-3 h-3 animate-pulse" />
          Retrieving from Knowledge
        </span>
      )}
      <div className="flex items-center gap-2 text-gray-400 min-h-6">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0.15s]" />
        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0.3s]" />
      </div>
    </div>
  );
}

// ─── Collapsible Orama scoring panel ───────────────────────────────────

const SOURCE_LABEL: Record<BSKnowledgeSourceType, string> = {
  website: "Website",
  resource: "Resource",
};

/** Orama similarity is 0..1 — render it as an intuitive percentage. */
function formatScore(score: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100);
  return `${pct}%`;
}

export interface BSChatKnowledgeBaseScoresProps {
  /** Retrieved Orama hits (with scores) to display. */
  hits: BSKnowledgeSearchHit[];
  /** Optional group display name shown in the header. */
  groupName?: string;
}

export function BSChatKnowledgeBaseScores({
  hits,
  groupName,
}: BSChatKnowledgeBaseScoresProps) {
  const [open, setOpen] = useState(false);
  if (!hits || hits.length === 0) return null;

  return (
    <div className="mt-2 rounded-xl border border-red-100 bg-red-50/50 overflow-hidden">
      {/* Header — click to collapse / expand */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-red-50 transition"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 min-w-0">
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            Knowledge Base{groupName ? ` · ${groupName}` : ""}
          </span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-gray-400 font-normal">
            {hits.length} source{hits.length === 1 ? "" : "s"}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      {/* Body — retrieved chunks + Orama scores */}
      {open && (
        <div className="px-3 pb-2 space-y-1.5">
          {hits.map((hit) => (
            <div
              key={hit.id}
              className="rounded-lg bg-white border border-gray-200 px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-700 min-w-0">
                  <FileText className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="truncate">{hit.title}</span>
                </span>
                <span
                  className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600"
                  title="Orama similarity score"
                >
                  {formatScore(hit.score)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1">
                <Database className="w-2.5 h-2.5" />
                {SOURCE_LABEL[hit.source] ?? hit.source}
                {hit.knowledgeId ? ` · #${hit.knowledgeId.slice(0, 8)}` : ""}
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3 whitespace-pre-line">
                {hit.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
