// BSChat.KnowledgeBase — Knowledge Base (RAG) logic + UI for the chat.
//
// Everything the chat needs to talk to a knowledge group's Orama index lives
// here (feature: separate KB logic/component from the chat):
//  - retrieveKnowledgeForChat(): search the group's vector index AND build the
//    ready-to-inject RAG context string. Unlike the low-level helper it also
//    returns the raw Orama hits (with similarity scores) so the UI can render
//    the collapsible scoring panel.
//  - buildKnowledgeInstruction(): wrap the retrieved context into the strict
//    system instruction the assistant must answer from.
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
 * Build the strict system-instruction block that grounds the assistant in the
 * retrieved knowledge base context.
 */
export function buildKnowledgeInstruction(context: string): string {
  return (
    "Answer the user's question using ONLY the provided Knowledge Base context. " +
    "If the context does not contain the answer, politely say that you do not know.\n\n" +
    `Knowledge Base Context:\n${context}`
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
