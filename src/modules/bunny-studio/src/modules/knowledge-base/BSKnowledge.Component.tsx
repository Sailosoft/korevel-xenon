// BSKnowledge.Component — Knowledge Base page for Bunny AI Studio.
//
// Lets the user add knowledge to a Knowledge Group via two tabs:
//  - Website: scan a website URL (server-side fetch → clean text).
//  - Resources: upload a .txt / .md file.
//
// Each added source is chunked, embedded (SiliconFlow) and indexed into the
// selected group's Orama vector database. The group can then be selected in
// Chat Settings so the assistant answers from it (feature: knowledge base tool).

"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import {
  Rabbit,
  Globe,
  FileText,
  Upload,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Link2,
  FolderOpen,
  X,
} from "lucide-react";
import { bsDB } from "../../BSDatabase";
import type { BSKnowledgeGroup } from "./BSKnowledge.Types";
import type { BSKnowledge } from "./BSKnowledge.Types";
import type { BSKnowledgeIndexSnapshot } from "./BSKnowledge.Types";
import {
  isAllowedResourceFile,
  readFileAsText,
  scanWebsite,
  useBSKnowledgeIngest,
  type BSScanResult,
} from "./BSKnowledge.Hooks";
import {
  EMBEDDING_MODELS,
  HELIX_PROVIDER_EMBEDDING_MODELS,
} from "./BSKnowledgeBase.Embedding";
import {
  HELIX_PROVIDER_LABELS,
  type HelixAIProvider,
} from "@/src/modules/helix";
import {
  clearAllGroupIndexes,
  deleteGroupIndex,
} from "./BSKnowledgeBase.Orama";

const SELECT_STYLE =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white";
const INPUT_STYLE =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white";

/** Number of knowledge rows rendered per page in the list. */
const PAGE_SIZE = 8;

/** Format a byte count into a compact, human-readable string (e.g. "1.2 MB"). */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 || value >= 10 ? 0 : 1)} ${units[i]}`;
}

export function BSKnowledgeComponent() {
  const groups = useLiveQuery<BSKnowledgeGroup[]>(
    () => bsDB.knowledgeGroupsRepo.listAll(),
    [],
  );
  const knowledges = useLiveQuery<BSKnowledge[]>(
    () => bsDB.knowledgesRepo.listAllNewestFirst(),
    [],
  );
  const ragIndexes = useLiveQuery<BSKnowledgeIndexSnapshot[]>(
    () => bsDB.knowledgeIndexes.toArray(),
    [],
  );

  const { state, ingestKnowledge, removeKnowledge, reset } =
    useBSKnowledgeIngest();

  // ── UI state ─────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"website" | "resource">("website");
  const [groupId, setGroupId] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState<string>(
    EMBEDDING_MODELS[0],
  );

  // Website tab
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanned, setScanned] = useState<BSScanResult | null>(null);

  // Resources tab
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  // Knowledge list pagination
  const [page, setPage] = useState(1);

  // RAG index clearing
  const [clearingRag, setClearingRag] = useState(false);
  const [clearingGroup, setClearingGroup] = useState(false);
  const [ragMessage, setRagMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const selectedGroup = groups?.find((g) => g.id === groupId) ?? null;

  // Persist the group's embedding model when the user changes it.
  const handleEmbeddingModelChange = (value: string) => {
    setEmbeddingModel(value);
    if (groupId) {
      void bsDB.knowledgeGroups.update(groupId, { embeddingModel: value });
    }
  };

  // Stats for the selected group (when one is chosen).
  const groupStats = useMemo(() => {
    if (!groupId || !knowledges) return { count: 0, chunks: 0 };
    const list = knowledges.filter((k) => k.knowledgeGroupId === groupId);
    return {
      count: list.length,
      chunks: list.reduce((sum, k) => sum + (k.chunkCount ?? 0), 0),
    };
  }, [groupId, knowledges]);

  // Whole-database RAG stats: sources, indexed chunks, and the serialized byte
  // size of the local Orama vector indexes (the "RAG database size").
  const ragStats = useMemo(() => {
    const list = knowledges ?? [];
    const chunks = list.reduce((sum, k) => sum + (k.chunkCount ?? 0), 0);
    const bytes = (ragIndexes ?? []).reduce(
      (sum, idx) => sum + new TextEncoder().encode(idx.data).length,
      0,
    );
    return { sources: list.length, chunks, bytes };
  }, [knowledges, ragIndexes]);

  // ── Knowledge list pagination ─────────────────────────────────────────
  const filteredKnowledges = useMemo(() => {
    const list = knowledges ?? [];
    return groupId
      ? list.filter((k) => k.knowledgeGroupId === groupId)
      : list;
  }, [groupId, knowledges]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredKnowledges.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const pagedKnowledges = filteredKnowledges.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // ── Website tab handlers ─────────────────────────────────────────────
  const handleScan = async () => {
    if (!url.trim() || scanning) return;
    setScanning(true);
    setScanError("");
    setScanned(null);
    try {
      const result = await scanWebsite(url.trim());
      setScanned(result);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to scan.");
    } finally {
      setScanning(false);
    }
  };

  const handleAddWebsite = async () => {
    if (!scanned) return;
    const created = await ingestKnowledge({
      groupId,
      title: scanned.title,
      sourceType: "website",
      content: scanned.content,
      url: scanned.url,
      model: embeddingModel,
    });
    if (created) {
      setScanned(null);
      setUrl("");
    }
  };

  // ── Resources tab handlers ───────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFileError("");
    if (selected && !isAllowedResourceFile(selected)) {
      setFileError("Only .txt and .md files are supported.");
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleAddResource = async () => {
    if (!file) return;
    try {
      const content = await readFileAsText(file);
      const created = await ingestKnowledge({
        groupId,
        title: file.name,
        sourceType: "resource",
        content,
        fileName: file.name,
        model: embeddingModel,
      });
      if (created) setFile(null);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to read file.");
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────
  const handleDelete = async (knowledge: BSKnowledge) => {
    await removeKnowledge(knowledge);
  };

  // ── Clear RAG indexes ────────────────────────────────────────────────
  /** Wipe every group's RAG vector index (all embeddings), keeping sources. */
  const handleClearRagIndexes = async () => {
    if (clearingRag) return;
    const confirmed = window.confirm(
      "Clear all RAG vector indexes? Every embedding across all knowledge groups will be removed. Knowledge sources stay, but must be re-indexed to answer from them again.",
    );
    if (!confirmed) return;
    setClearingRag(true);
    setRagMessage(null);
    try {
      await clearAllGroupIndexes();
      setRagMessage({ ok: true, text: "All RAG indexes cleared." });
    } catch (err) {
      setRagMessage({
        ok: false,
        text:
          err instanceof Error ? err.message : "Failed to clear RAG indexes.",
      });
    } finally {
      setClearingRag(false);
    }
  };

  /** Wipe the selected group's RAG vector index, keeping its sources. */
  const handleClearGroupIndex = async () => {
    if (!groupId || clearingGroup) return;
    const confirmed = window.confirm(
      "Clear this group's RAG vector index? Its sources stay, but must be re-indexed to answer from them again.",
    );
    if (!confirmed) return;
    setClearingGroup(true);
    try {
      await deleteGroupIndex(groupId);
    } catch (err) {
      console.error("[BSKnowledge] Failed to clear group index:", err);
    } finally {
      setClearingGroup(false);
    }
  };

  const ingesting = state.status === "ingesting";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bs-bunny-face bs-beat w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0">
            <Rabbit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Knowledges
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 text-[11px] font-medium px-2.5 py-0.5">
                <Database className="w-3 h-3" /> RAG
              </span>
            </h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              Add knowledge by scanning a website or uploading a file, then
              pick the group in Chat Settings to answer from it.
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium px-2.5 py-1">
                <Database className="w-3 h-3 text-red-400" />
                {ragStats.sources} source(s)
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium px-2.5 py-1">
                <Sparkles className="w-3 h-3 text-red-400" />
                {ragStats.chunks} chunk(s)
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 text-[11px] font-medium px-2.5 py-1"
                title="Total serialized size of the local RAG vector database"
              >
                <Database className="w-3 h-3" />
                RAG DB {formatBytes(ragStats.bytes)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => void handleClearRagIndexes()}
                disabled={clearingRag || ragStats.bytes === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-red-600 hover:border-red-300 text-[11px] font-medium px-2.5 py-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                title="Remove every vector embedding. Sources stay but must be re-indexed."
              >
                {clearingRag ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                Clear RAG indexes
              </button>
              {ragMessage && (
                <span
                  className={`text-[11px] font-medium ${
                    ragMessage.ok ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {ragMessage.text}
                </span>
              )}
            </div>
          </div>
        </div>

        {!groups || groups.length === 0 ? (
          /* No groups yet — guide the user to create one first */
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-10 text-center">
            <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 font-medium">
              No knowledge groups yet.
            </p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Create a Knowledge Group first — knowledges are added to a group,
              and groups are selected in chat.
            </p>
            <Link
              href="/modules/bunny-studio/knowledge-groups"
              className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl px-4 py-2 transition"
            >
              <FolderOpen className="w-4 h-4" /> Create Knowledge Groups
            </Link>
          </div>
        ) : (
          <>
            {/* Group + model selectors */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Knowledge Group{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => {
                      const nextGroupId = e.target.value;
                      setGroupId(nextGroupId);
                      setPage(1);
                      // Keep the model selector in sync with the selected
                      // group's configured model (a group must stay on one
                      // model so its vectors share a space).
                      const nextGroup = groups?.find(
                        (g) => g.id === nextGroupId,
                      );
                      setEmbeddingModel(
                        nextGroup?.embeddingModel || EMBEDDING_MODELS[0],
                      );
                    }}
                    className={SELECT_STYLE}
                  >
                    <option value="">Select a group…</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                        {g.category ? ` (${g.category})` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedGroup && (
                    <>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {groupStats.count} knowledge source(s) ·{" "}
                        {groupStats.chunks} indexed chunk(s)
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleClearGroupIndex()}
                        disabled={clearingGroup}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Remove this group's vector embeddings. Sources stay but must be re-indexed."
                      >
                        {clearingGroup ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Clear group index
                      </button>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Embedding Model
                  </label>
                  <select
                    value={embeddingModel}
                    onChange={(e) => handleEmbeddingModelChange(e.target.value)}
                    className={SELECT_STYLE}
                  >
                    {(
                      Object.entries(
                        HELIX_PROVIDER_EMBEDDING_MODELS,
                      ) as [HelixAIProvider, readonly string[] | undefined][]
                    ).map(([provider, models]) => (
                      <optgroup
                        key={provider}
                        label={HELIX_PROVIDER_LABELS[provider] ?? provider}
                      >
                        {(models ?? []).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Used to generate vectors. Applies to this group (keep it
                    consistent with already-indexed content).
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              <button
                type="button"
                onClick={() => setTab("website")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  tab === "website"
                    ? "bg-white shadow text-red-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Globe className="w-4 h-4" /> Website
              </button>
              <button
                type="button"
                onClick={() => setTab("resource")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  tab === "resource"
                    ? "bg-white shadow text-red-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <FileText className="w-4 h-4" /> Resources
              </button>
            </div>

            {/* Website tab */}
            {tab === "website" && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                      <Link2 className="w-4 h-4 text-red-500" /> Website URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleScan();
                        }}
                        placeholder="https://example.com/docs"
                        disabled={scanning || ingesting}
                        className={`${INPUT_STYLE} disabled:opacity-60`}
                      />
                      <button
                        type="button"
                        onClick={() => void handleScan()}
                        disabled={!url.trim() || scanning || ingesting}
                        className="shrink-0 flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl px-4 py-2 transition"
                      >
                        {scanning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                        Scan
                      </button>
                    </div>
                    {scanError && (
                      <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1.5">
                        <AlertCircle className="w-3 h-3" /> {scanError}
                      </p>
                    )}
                  </div>

                  {/* Scan preview */}
                  {scanned && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {scanned.title}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {scanned.url}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setScanned(null)}
                            className="flex items-center justify-center rounded-full bg-gray-900 text-white w-6 h-6 shadow"
                            title="Discard preview"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-2 line-clamp-3">
                        {scanned.content.slice(0, 400)}
                        {scanned.content.length > 400 ? "…" : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleAddWebsite()}
                        disabled={!groupId || ingesting}
                        className="mt-3 flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl px-4 py-2 transition"
                      >
                        {ingesting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Add to group
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resources tab */}
            {tab === "resource" && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                      <FileText className="w-4 h-4 text-red-500" /> Text File
                      (.txt / .md)
                    </label>
                    {file ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">
                            {file.name}
                          </span>
                          <span className="text-[11px] text-gray-400 shrink-0">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="flex items-center justify-center rounded-full bg-gray-900 text-white w-6 h-6 shadow shrink-0"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 hover:border-red-400 hover:text-red-600 transition-colors">
                        <Upload className="w-5 h-5" />
                        Choose a .txt or .md file to add
                        <input
                          type="file"
                          accept=".txt,.md,.markdown,text/plain,text/markdown"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                    )}
                    {fileError && (
                      <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1.5">
                        <AlertCircle className="w-3 h-3" /> {fileError}
                      </p>
                    )}
                  </div>

                  {file && (
                    <button
                      type="button"
                      onClick={() => void handleAddResource()}
                      disabled={!groupId || ingesting}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl px-4 py-2 transition"
                    >
                      {ingesting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Add to group
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Ingest status */}
            {state.status === "success" && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {state.message}
              </div>
            )}
            {state.status === "error" && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {state.error}
                <button
                  type="button"
                  onClick={reset}
                  className="ml-auto text-[11px] text-red-500 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Knowledge list */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                  {groupId ? "Knowledges in this group" : "All Knowledges"}
                </h2>
                <span className="text-[11px] text-gray-400">
                  {filteredKnowledges.length} total
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {pagedKnowledges.map((k) => {
                    const group = groups?.find((g) => g.id === k.knowledgeGroupId);
                    return (
                      <div
                        key={k.id}
                        className="flex items-start gap-3 px-5 py-3.5"
                      >
                        <div
                          className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                            k.sourceType === "website"
                              ? "bg-blue-50 text-blue-500"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {k.sourceType === "website" ? (
                            <Globe className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {k.title}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {k.sourceType === "website" ? k.url : k.fileName} ·{" "}
                            {k.chunkCount} chunk(s) ·{" "}
                            {group?.name ?? "Unknown group"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDelete(k)}
                          title="Delete knowledge"
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                {filteredKnowledges.length === 0 && (
                  <div className="px-5 py-10 text-center">
                    <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No knowledges yet. Add one using the tabs above.
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                    <span className="text-[11px] text-gray-400">
                      {pagedKnowledges.length === 0
                        ? "0 results"
                        : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                            currentPage * PAGE_SIZE,
                            filteredKnowledges.length,
                          )} of ${filteredKnowledges.length}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setPage(currentPage - 1)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-medium transition ${
                              p === currentPage
                                ? "bg-red-600 text-white"
                                : "text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            {p}
                          </button>
                        ),
                      )}
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage(currentPage + 1)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BSKnowledgeComponent;
