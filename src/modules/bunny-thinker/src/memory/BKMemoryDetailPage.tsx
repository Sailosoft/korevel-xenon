"use client";

// BKMemoryDetailPage.tsx
//
// Memory Detail Page — view and extract compiled neuron output from
// a memory's associated neurons. Uses RenderView from the render module
// for all format-aware rendering (markdown, html, tailwind, csv, json, etc.).

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button, Card, Modal, toast } from "@heroui/react";
import {
  ArrowLeft,
  Download,
  Cpu,
  Eye,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import RenderView from "@/src/modules/render/src/components/RenderModule.View";
import type { RenderFormat } from "@/src/modules/render/src/RenderModule.Types";
import { useRouter } from "next/navigation";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKMemory, BKMemoryNeuron } from "./BKMemory.Types";
import {
  bkCopyContent,
  bkDownloadContent,
  bkViewNeuronBlob,
  bkViewAsHtml,
  bkDownloadHtml,
} from "./BKMemory.Export";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Formats that RenderView renders via sandboxed iframe (html/tailwind). */
const IFRAME_FORMATS = new Set(["html", "tailwind"]);

/** Maps BKCraftFormat to RenderFormat for safe casting. */
const SAFE_RENDER_FORMATS = new Set([
  "markdown", "html", "tailwind", "csv", "json", "mermaid", "plain", "codeblock",
]);

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKMemoryDetailPageProps {
  memoryId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Safely cast a format string to RenderFormat, falling back to "markdown". */
function toRenderFormat(format?: string): RenderFormat {
  if (format && SAFE_RENDER_FORMATS.has(format)) {
    return format as RenderFormat;
  }
  return "markdown";
}

/** Get a display colour for a format badge. */
function formatBadgeColor(format: string): string {
  switch (format) {
    case "html":      return "bg-orange-100 text-orange-700 border-orange-200";
    case "tailwind":  return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case "csv":       return "bg-green-100 text-green-700 border-green-200";
    case "json":      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "mermaid":   return "bg-blue-100 text-blue-700 border-blue-200";
    case "plain":     return "bg-gray-100 text-gray-700 border-gray-200";
    case "codeblock": return "bg-slate-100 text-slate-700 border-slate-300";
    default:          return "bg-purple-100 text-purple-700 border-purple-200";
  }
}

// ─── Component ──────────────────────────────────────────────────────────

export default function BKMemoryDetailPage({
  memoryId,
}: BKMemoryDetailPageProps) {
  const router = useRouter();
  const [memory, setMemory] = useState<BKMemory | null>(null);
  const [neurons, setNeurons] = useState<BKMemoryNeuron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [showProcessedOutput, setShowProcessedOutput] = useState(false);
  const [viewingNeuron, setViewingNeuron] = useState<BKMemoryNeuron | null>(null);

  /** Per-neuron format overrides (neuronId → RenderFormat). Falls back to memory.format. */
  const [neuronFormats, setNeuronFormats] = useState<Record<string, RenderFormat>>({});

  const renderFormat = useMemo(() => toRenderFormat(memory?.format), [memory?.format]);
  const isIframeFormat = memory?.format ? IFRAME_FORMATS.has(memory.format) : false;

  /** Resolve format for a specific neuron: override → memory format → "markdown" */
  const getNeuronFormat = useCallback(
    (neuronId: string): RenderFormat =>
      neuronFormats[neuronId] ?? renderFormat,
    [neuronFormats, renderFormat],
  );

  const handleNeuronFormatChange = useCallback(
    async (neuronId: string, format: RenderFormat) => {
      // Update local state immediately
      setNeuronFormats((prev) => ({ ...prev, [neuronId]: format }));
      // Persist to DB
      try {
        await bkThinkerDB.memoryNeuronsRepo.update(neuronId, {
          format,
        } as BKMemoryNeuron);
        toast.success(`Format changed to ${format}`);
      } catch (err) {
        console.error("[BKMemoryDetail] Failed to save neuron format:", err);
        toast.danger("Failed to save format");
      }
    },
    [],
  );

  /** Available formats for the neuron format selector */
  const FORMAT_OPTIONS: RenderFormat[] = [
    "markdown", "html", "tailwind", "csv", "json", "mermaid", "plain", "codeblock",
  ];

  useEffect(() => {
    bkLoadMemory();
  }, [memoryId]);

  const bkLoadMemory = async () => {
    try {
      const memoryResult = await bkThinkerDB.memoriesRepo.get(memoryId);
      if (memoryResult.isSuccess) {
        setMemory(memoryResult.value);
      }

      const sorted = await bkThinkerDB.memoryNeuronsRepo.getByMemoryId(memoryId);
      setNeurons(sorted);

      // Populate per-neuron formats from persisted DB values
      const formats: Record<string, RenderFormat> = {};
      for (const n of sorted) {
        if (n.format) {
          formats[n.id] = toRenderFormat(n.format);
        }
      }
      setNeuronFormats(formats);
    } catch (err) {
      console.error("[BKMemoryDetail] Failed to load:", err);
      setError("Failed to load memory");
    } finally {
      setLoading(false);
    }
  };

  // ─── Compiled neuron content ────────────────────────────────────────────

  const bkCompiledContent = useMemo(
    () =>
      [...neurons]
        .sort((a, b) => a.order - b.order)
        .map((n) => n.value)
        .join("\n\n"),
    [neurons],
  );

  // ─── Copy handler with feedback ─────────────────────────────────────────

  const handleCopy = useCallback(async (content: string) => {
    await bkCopyContent(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // ─── View/download handlers that wire component state into export fns ───

  const handleViewAsHtml = useCallback(() => {
    bkViewAsHtml(neurons, memory, getNeuronFormat);
  }, [neurons, memory, getNeuronFormat]);

  const handleDownloadHtml = useCallback(() => {
    bkDownloadHtml(neurons, memoryId, memory, getNeuronFormat);
  }, [neurons, memoryId, memory, getNeuronFormat]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{error}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onPress={() => router.push("/modules/bunny-thinker/memories")}
        >
          <ArrowLeft size={16} /> Back to Memories
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            onPress={() => router.push("/modules/bunny-thinker/memories")}
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900 truncate">
                {memory?.name || "Memory Detail"}
              </h1>
              {memory?.format && (
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${formatBadgeColor(memory.format)}`}
                >
                  {memory.format}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{neurons.length} neuron{neurons.length !== 1 ? "s" : ""}</span>
              {memory?.createdAt && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span>{new Date(memory.createdAt).toLocaleString()}</span>
                </>
              )}
            </p>
          </div>
        </div>
        {neurons.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onPress={handleViewAsHtml}
              className="flex items-center gap-1.5"
            >
              <Eye size={14} /> View HTML
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={handleDownloadHtml}
              className="flex items-center gap-1.5"
            >
              <Download size={14} /> Download HTML
            </Button>
          </div>
        )}
      </div>
      {/* ── Memory Neurons — Individual ────────────────────────────── */}
      {neurons.length > 0 && (
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-purple-600" />
              <h3 className="text-sm font-medium text-gray-700">
                Individual Neurons
              </h3>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                {neurons.length}
              </span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {[...neurons]
              .sort((a, b) => a.order - b.order)
              .map((neuron) => {
                const nFormat = getNeuronFormat(neuron.id);
                const nIsIframe = IFRAME_FORMATS.has(nFormat);
                return (
                  <div
                    key={neuron.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow"
                  >
                    {/* Neuron header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-gray-700 truncate">
                          {neuron.name || `Neuron #${neuron.order + 1}`}
                        </span>
                        {/* Format selector */}
                        <select
                          value={nFormat}
                          onChange={(e) =>
                            handleNeuronFormatChange(
                              neuron.id,
                              e.target.value as RenderFormat,
                            )
                          }
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border appearance-none cursor-pointer outline-none ${formatBadgeColor(nFormat)}`}
                          title="Change render format"
                        >
                          {FORMAT_OPTIONS.map((fmt) => (
                            <option key={fmt} value={fmt}>
                              {fmt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {nIsIframe && (
                          <button
                            onClick={() => bkViewNeuronBlob(neuron.value, nFormat)}
                            title="Open in new tab"
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                          >
                            <ExternalLink size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => setViewingNeuron(neuron)}
                          title="Maximize view"
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Maximize2 size={12} />
                        </button>
                        <button
                          onClick={() => handleCopy(neuron.value)}
                          title="Copy content"
                          className="px-2 py-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    {/* Neuron content */}
                    <div className="max-h-64 overflow-y-auto">
                      <RenderView
                        format={nFormat}
                        content={neuron.value}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* ── Compiled Output ────────────────────────────────────────── */}
      {neurons.length > 0 && (
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download size={16} className="text-purple-600" />
                <h3 className="text-sm font-medium text-gray-700">
                  Compiled Output
                </h3>
                {memory?.format && (
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${formatBadgeColor(memory.format)}`}
                  >
                    {memory.format}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 min-w-0 px-2"
                  onPress={() => handleCopy(bkCompiledContent)}
                >
                  {copied ? "Copied!" : "Copy All"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 min-w-0 px-2"
                  onPress={() =>
                    bkDownloadContent(
                      bkCompiledContent,
                      `neurons-${memoryId.slice(0, 8)}.txt`,
                    )
                  }
                >
                  <Download size={12} /> TXT
                </Button>
              </div>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <RenderView
              format={renderFormat}
              content={bkCompiledContent || "No neuron content available"}
            />
          </div>
        </Card>
      )}

      {/* ── No content ─────────────────────────────────────────────── */}
      {!memory?.rawOutput && !memory?.processedOutput && neurons.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>This memory has no content to display.</p>
        </div>
      )}

      {/* ── Neuron Viewer Modal ────────────────────────────────────── */}
      <Modal.Backdrop
        isOpen={viewingNeuron !== null}
        onClick={() => setViewingNeuron(null)}
      >
        <Modal.Container>
          <Modal.Dialog
            className="max-w-4xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Modal.CloseTrigger onClick={() => setViewingNeuron(null)} />
            <Modal.Header>
              <div className="flex items-center justify-between w-full pr-8">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg font-semibold text-foreground truncate">
                    {viewingNeuron?.name ||
                      `Neuron #${(viewingNeuron?.order ?? 0) + 1}`}
                  </span>
                  {viewingNeuron && (
                    <select
                      value={getNeuronFormat(viewingNeuron.id)}
                      onChange={(e) => {
                        handleNeuronFormatChange(
                          viewingNeuron.id,
                          e.target.value as RenderFormat,
                        );
                        // Force re-render by spreading state
                        setViewingNeuron((prev) =>
                          prev ? { ...prev } : null,
                        );
                      }}
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border appearance-none cursor-pointer outline-none shrink-0 ${formatBadgeColor(getNeuronFormat(viewingNeuron.id))}`}
                      title="Change render format"
                    >
                      {FORMAT_OPTIONS.map((fmt) => (
                        <option key={fmt} value={fmt}>
                          {fmt}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {viewingNeuron &&
                    IFRAME_FORMATS.has(getNeuronFormat(viewingNeuron.id)) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onPress={() =>
                          bkViewNeuronBlob(
                            viewingNeuron.value,
                            getNeuronFormat(viewingNeuron.id),
                          )
                        }
                      >
                        <ExternalLink size={12} /> New Tab
                      </Button>
                    )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onPress={() =>
                      viewingNeuron && handleCopy(viewingNeuron.value)
                    }
                  >
                    {copied ? "Copied!" : "Copy Content"}
                  </Button>
                </div>
              </div>
            </Modal.Header>

            <Modal.Body className="overflow-y-auto max-h-[70vh]">
              {viewingNeuron && (
                <div className="min-h-[200px]">
                  <RenderView
                    format={getNeuronFormat(viewingNeuron.id)}
                    content={viewingNeuron.value}
                  />
                </div>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="ghost"
                className="w-full"
                onPress={() => setViewingNeuron(null)}
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
