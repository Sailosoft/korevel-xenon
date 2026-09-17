// BSKnowledge.Component — Knowledge Base page for Bunny AI Studio.
//
// Lets the user add knowledge to a Knowledge Group via two tabs:
//  - Website: scan a website URL (server-side fetch → clean text).
//  - Resources: upload a text / source-code file, or paste text manually.
//
// Each added source is chunked, embedded with the group's engine (local
// Transformers.js by default, or SiliconFlow / DeepInfra through the server
// route) and indexed into the selected group's Orama vector database. The group
// can then be selected in Chat Settings so the assistant answers from it
// (feature: knowledge base tool).

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
  RefreshCw,
  ClipboardType,
  FileCode,
} from "lucide-react";
import { bsDB } from "../../BSDatabase";
import type { BSKnowledgeGroup } from "./BSKnowledge.Types";
import type { BSKnowledge } from "./BSKnowledge.Types";
import type { BSKnowledgeIndexSnapshot } from "./BSKnowledge.Types";
import {
  readFileAsText,
  scanWebsite,
  useBSKnowledgeIngest,
  useBSKnowledgeReindex,
  type BSScanResult,
} from "./BSKnowledge.Hooks";
import {
  buildResourceAccept,
  getResourceKind,
  getResourceLanguage,
  isAllowedResourceFile,
} from "./BSKnowledge.Resource";
import {
  DEFAULT_EMBEDDING_ENGINE,
  DEFAULT_TRANSFORMERS_EMBEDDING_MODEL,
  HELIX_EMBEDDING_ENGINE_LABELS,
  getEmbeddingModelDimensions,
  getEmbeddingModelEngine,
  getEmbeddingModelsForEngine,
  getProviderDefaultEmbeddingModelForEngine,
  type HelixEmbeddingEngine,
} from "./BSKnowledgeBase.Embedding";
import {
  clearAllGroupIndexes,
  deleteGroupIndex,
} from "./BSKnowledgeBase.Orama";

const SELECT_STYLE =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white";
const INPUT_STYLE =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white";
const TEXTAREA_STYLE = `${INPUT_STYLE} font-mono resize-y`;

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

/** Resolve the list icon, color, and detail line for a knowledge source. */
function getKnowledgeSourceMeta(knowledge: BSKnowledge) {
  if (knowledge.sourceType === "website") {
    return {
      Icon: Globe,
      color: "bg-blue-50 text-blue-500",
      detail: knowledge.url ?? "",
    };
  }
  if (knowledge.sourceType === "text") {
    return {
      Icon: ClipboardType,
      color: "bg-amber-50 text-amber-600",
      detail: "Pasted text",
    };
  }
  if (knowledge.resourceKind === "code") {
    return {
      Icon: FileCode,
      color: "bg-violet-50 text-violet-600",
      detail: [knowledge.fileName, knowledge.language]
        .filter(Boolean)
        .join(" · "),
    };
  }
  return {
    Icon: FileText,
    color: "bg-amber-50 text-amber-600",
    detail: knowledge.fileName ?? "",
  };
}

/**
 * Extract dropped files from a drag event. `dataTransfer.files` is empty for
 * some drag sources (VS Code, other apps), so also check `items` which expose
 * each dragged file via `getAsFile()`.
 */
function extractDroppedFiles(dataTransfer: DataTransfer): File[] {
  const files: File[] = [];
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    for (const item of Array.from(dataTransfer.items)) {
      if (item.kind !== "file") continue;
      const dropped = item.getAsFile();
      if (dropped) files.push(dropped);
    }
  }
  if (files.length === 0 && dataTransfer.files) {
    files.push(...Array.from(dataTransfer.files));
  }
  return files;
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
  const {
    state: reindexState,
    reindexGroup,
    reset: resetReindex,
  } = useBSKnowledgeReindex();

  // ── UI state ─────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"website" | "resource">("website");
  const [groupId, setGroupId] = useState("");
  const [embeddingEngine, setEmbeddingEngine] = useState<HelixEmbeddingEngine>(
    DEFAULT_EMBEDDING_ENGINE,
  );
  const [embeddingModel, setEmbeddingModel] = useState<string>(
    DEFAULT_TRANSFORMERS_EMBEDDING_MODEL,
  );

  // Website tab
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanned, setScanned] = useState<BSScanResult | null>(null);

  // Resources tab — file upload
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Resources tab — manual text input
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [textError, setTextError] = useState("");

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

  // Engine + model selectable for the current engine (group-scoped).
  const engineModels = getEmbeddingModelsForEngine(embeddingEngine);

  /**
   * Persist the group's embedding engine/model and invalidate its index: the
   * stored vectors were produced by the previous configuration, so they can no
   * longer be mixed with new ones (the user re-indexes to rebuild them).
   */
  const applyEmbeddingChange = (
    engine: HelixEmbeddingEngine,
    model: string,
  ) => {
    if (!groupId) return;
    void bsDB.knowledgeGroups.update(groupId, {
      embeddingEngine: engine,
      embeddingModel: model,
      embeddingDimensions: getEmbeddingModelDimensions(model),
    });
    const hadIndex = (ragIndexes ?? []).some((idx) => idx.id === groupId);
    void deleteGroupIndex(groupId);
    if (hadIndex) {
      setRagMessage({ ok: true, text: "Index cleared — re-index this group." });
    }
  };

  // Change the engine and reset the model to that engine's default.
  const handleEmbeddingEngineChange = (value: string) => {
    const engine = value as HelixEmbeddingEngine;
    const model = getProviderDefaultEmbeddingModelForEngine(engine);
    setEmbeddingEngine(engine);
    setEmbeddingModel(model);
    if (selectedGroup) applyEmbeddingChange(engine, model);
  };

  // Persist the group's embedding model when the user changes it.
  const handleEmbeddingModelChange = (value: string) => {
    setEmbeddingModel(value);
    if (selectedGroup) applyEmbeddingChange(embeddingEngine, value);
  };

  /** Clear the group index and re-embed every source with the group's engine. */
  const handleReindexGroup = async () => {
    if (!groupId || reindexState.status === "ingesting") return;
    await reindexGroup(groupId);
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
  /** Validate a picked/dropped file and select it (or report why not). */
  const selectResourceFile = (selected: File | null) => {
    setFileError("");
    if (selected && !isAllowedResourceFile(selected)) {
      setFileError(
        "Unsupported file. Use a text file (.txt / .md) or a source-code file (.ts, .cs, .css, .html, .js, …).",
      );
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectResourceFile(e.target.files?.[0] ?? null);
  };

  // Allow dropping a resource file (text or source code) onto the Resources panel.
  const handleFileDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragActive(false);
    const [dropped] = extractDroppedFiles(e.dataTransfer);
    if (dropped) {
      selectResourceFile(dropped);
      return;
    }
    // Some drag sources expose no file at all (e.g. dragging from VS Code).
    setFileError(
      "Could not read the dropped item. Drag the file from your file explorer, or use the file picker.",
    );
  };

  // Dropping a text/code file on the textarea loads its text for manual editing.
  const handleTextAreaDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    // Handle it here instead of letting the panel treat it as an upload.
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const [dropped] = extractDroppedFiles(e.dataTransfer);
    if (!dropped) return;
    if (!isAllowedResourceFile(dropped)) {
      setTextError(
        "Unsupported file. Drop a text or source-code file (.txt, .md, .ts, .cs, .css, .html, .js, …).",
      );
      return;
    }
    void readFileAsText(dropped)
      .then((text) => {
        setTextContent(text);
        if (!textTitle.trim()) setTextTitle(dropped.name);
        setTextError("");
      })
      .catch((err) => {
        setTextError(
          err instanceof Error ? err.message : "Failed to read the file.",
        );
      });
  };

  // Keep the drop highlight while a file is dragged over the panel; clear it
  // only when the pointer actually leaves the panel (not its children).
  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (!dragActive) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragActive(false);
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
        resourceKind: getResourceKind(file.name),
        language: getResourceLanguage(file.name),
        model: embeddingModel,
      });
      if (created) setFile(null);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to read file.");
    }
  };

  /** Add manually pasted text as a knowledge source in the selected group. */
  const handleAddText = async () => {
    setTextError("");
    if (!textContent.trim()) {
      setTextError("Paste or type some text first.");
      return;
    }
    const created = await ingestKnowledge({
      groupId,
      title:
        textTitle.trim() || `Pasted text — ${new Date().toLocaleString()}`,
      sourceType: "text",
      content: textContent,
      model: embeddingModel,
    });
    if (created) {
      setTextTitle("");
      setTextContent("");
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
  const reindexing = reindexState.status === "ingesting";

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
              Add knowledge by scanning a website, uploading a text / code
              file, or pasting text. Pick the group in Chat Settings to answer
              from it.
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
                      setRagMessage(null);
                      // Keep the engine + model selectors in sync with the
                      // selected group's configuration (a group must stay on
                      // one engine/model so its vectors share a space).
                      const nextGroup = groups?.find(
                        (g) => g.id === nextGroupId,
                      );
                      const nextEngine =
                        nextGroup?.embeddingEngine ??
                        (nextGroup?.embeddingModel
                          ? getEmbeddingModelEngine(nextGroup.embeddingModel)
                          : DEFAULT_EMBEDDING_ENGINE);
                      setEmbeddingEngine(nextEngine);
                      setEmbeddingModel(
                        nextGroup?.embeddingModel ||
                          getProviderDefaultEmbeddingModelForEngine(
                            nextEngine,
                          ),
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
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void handleReindexGroup()}
                          disabled={reindexing}
                          className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Clear this group's index and re-embed every source with its engine/model."
                        >
                          {reindexing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          Re-index group
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleClearGroupIndex()}
                          disabled={clearingGroup || reindexing}
                          className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Remove this group's vector embeddings. Sources stay but must be re-indexed."
                        >
                          {clearingGroup ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Clear group index
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Embedding Engine
                    </label>
                    <select
                      value={embeddingEngine}
                      onChange={(e) =>
                        handleEmbeddingEngineChange(e.target.value)
                      }
                      disabled={!selectedGroup}
                      className={`${SELECT_STYLE} disabled:opacity-60`}
                    >
                      {(
                        Object.keys(
                          HELIX_EMBEDDING_ENGINE_LABELS,
                        ) as HelixEmbeddingEngine[]
                      ).map((engine) => (
                        <option key={engine} value={engine}>
                          {HELIX_EMBEDDING_ENGINE_LABELS[engine]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Embedding Model
                    </label>
                    <select
                      value={embeddingModel}
                      onChange={(e) =>
                        handleEmbeddingModelChange(e.target.value)
                      }
                      disabled={!selectedGroup}
                      className={`${SELECT_STYLE} disabled:opacity-60`}
                    >
                      {engineModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {getEmbeddingModelDimensions(embeddingModel)} dimensions ·{" "}
                      {embeddingEngine === "transformers"
                        ? "runs locally in the browser (no API key; first use downloads the model)."
                        : "generated through the Helix server route."}{" "}
                      Changing either clears this group&apos;s index.
                    </p>
                  </div>
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
                        disabled={scanning || ingesting || reindexing}
                        className={`${INPUT_STYLE} disabled:opacity-60`}
                      />
                      <button
                        type="button"
                        onClick={() => void handleScan()}
                        disabled={
                          !url.trim() || scanning || ingesting || reindexing
                        }
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
                        disabled={!groupId || ingesting || reindexing}
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
              <div
                onDragEnter={handleDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleFileDrop}
                className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-colors ${
                  dragActive ? "border-red-400" : "border-gray-200"
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* File upload — prose text or source code */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                      <FileCode className="w-4 h-4 text-red-500" /> File
                      <span className="text-[11px] font-normal text-gray-400">
                        text (.txt / .md) or code (.ts, .cs, .css, .html, .js, …)
                      </span>
                    </label>
                    {file ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2">
                          {getResourceKind(file.name) === "code" ? (
                            <FileCode className="w-4 h-4 text-violet-500 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                          <span className="text-sm text-gray-700 truncate">
                            {file.name}
                          </span>
                          {getResourceLanguage(file.name) && (
                            <span className="text-[10px] uppercase tracking-wide text-violet-600 bg-violet-50 rounded px-1.5 py-0.5 shrink-0">
                              {getResourceLanguage(file.name)}
                            </span>
                          )}
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
                      <label
                        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-sm transition-colors ${
                          dragActive
                            ? "border-red-400 bg-red-50 text-red-600"
                            : "border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-600"
                        }`}
                      >
                        <Upload className="w-5 h-5" />
                        {dragActive
                          ? "Drop the file to add it"
                          : "Choose, drag & drop, or drop a file into the text box below"}
                        <input
                          type="file"
                          accept={buildResourceAccept()}
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

                  {/* Manual text — paste any text straight into the group */}
                  <div className="pt-4 border-t border-gray-100">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                      <ClipboardType className="w-4 h-4 text-red-500" /> Pasted
                      Text
                      <span className="text-[11px] font-normal text-gray-400">
                        copy-paste text manually
                      </span>
                    </label>
                    <input
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      placeholder="Optional title (defaults to a timestamp)"
                      disabled={ingesting || reindexing}
                      className={`${INPUT_STYLE} mb-2 disabled:opacity-60`}
                    />
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleTextAreaDrop}
                      placeholder="Paste or type the text to index here, or drop a text / source-code file…"
                      rows={7}
                      disabled={ingesting || reindexing}
                      className={`${TEXTAREA_STYLE} disabled:opacity-60`}
                    />
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <span className="text-[11px] text-gray-400">
                        {textContent.length} character(s)
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleAddText()}
                        disabled={!groupId || ingesting || reindexing}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl px-4 py-2 transition"
                      >
                        {ingesting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Add text to group
                      </button>
                    </div>
                    {textError && (
                      <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1.5">
                        <AlertCircle className="w-3 h-3" /> {textError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Re-index status */}
            {reindexState.status === "ingesting" && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                {reindexState.message}
              </div>
            )}
            {reindexState.status === "success" && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {reindexState.message}
                <button
                  type="button"
                  onClick={resetReindex}
                  className="ml-auto text-[11px] text-green-700 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {reindexState.status === "error" && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {reindexState.error}
                <button
                  type="button"
                  onClick={resetReindex}
                  className="ml-auto text-[11px] text-red-500 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Ingest status — also reports local model loading progress */}
            {state.status === "ingesting" && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                {state.message}
              </div>
            )}
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
                    const { Icon: SourceIcon, color, detail } =
                      getKnowledgeSourceMeta(k);
                    return (
                      <div
                        key={k.id}
                        className="flex items-start gap-3 px-5 py-3.5"
                      >
                        <div
                          className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${color}`}
                        >
                          <SourceIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {k.title}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {detail} · {k.chunkCount} chunk(s) ·{" "}
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
