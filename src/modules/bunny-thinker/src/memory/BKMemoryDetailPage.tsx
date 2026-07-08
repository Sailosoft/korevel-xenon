"use client";

// BKMemoryDetailPage.tsx
//
// Memory Detail Page — view and extract compiled neuron output from
// a memory's associated neurons.

import React, { useEffect, useState, useCallback } from "react";
import { Button, Card, Modal } from "@heroui/react";
import { ArrowLeft, Download, Cpu, Eye, Maximize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKMemory, BKMemoryNeuron } from "./BKMemory.Types";
import type { BKCraftFormat } from "../craft/BKCraft.Types";
import { convertToExportHtml } from "../craft/BKCraft.Html";

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKMemoryDetailPageProps {
  memoryId: string;
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
  const [viewingNeuron, setViewingNeuron] = useState<BKMemoryNeuron | null>(
    null,
  );

  useEffect(() => {
    bkLoadMemory();
  }, [memoryId]);

  const bkLoadMemory = async () => {
    try {
      // Load memory entity
      const memoryResult = await bkThinkerDB.memoriesRepo.get(memoryId);
      if (memoryResult.isSuccess) {
        setMemory(memoryResult.value);
      }

      // Load associated neurons (already sorted by order via repository)
      const sorted = await bkThinkerDB.memoryNeuronsRepo.getByMemoryId(
        memoryId,
      );
      setNeurons(sorted);
    } catch (err) {
      console.error("[BKMemoryDetail] Failed to load:", err);
      setError("Failed to load memory");
    } finally {
      setLoading(false);
    }
  };

  // ─── Compiled neuron content ────────────────────────────────────────────

  const bkCompiledContent = neurons
    .sort((a, b) => a.order - b.order)
    .map((n) => n.value)
    .join("\n\n");

  // ─── Copy / Download helpers ────────────────────────────────────────────

  const bkCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const bkDownloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── View as HTML (new tab) ────────────────────────────────────────────

  const bkViewAsHtml = useCallback(() => {
    const format = (memory?.format || "markdown") as BKCraftFormat;
    const html = convertToExportHtml(bkCompiledContent, format);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }, [bkCompiledContent, memory?.format]);

  // ─── Download as HTML ──────────────────────────────────────────────────

  const bkDownloadHtml = useCallback(() => {
    const format = (memory?.format || "markdown") as BKCraftFormat;
    const html = convertToExportHtml(bkCompiledContent, format);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neurons-${memoryId.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [bkCompiledContent, memoryId, memory?.format]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            onPress={() =>
              router.push("/modules/bunny-thinker/memories")
            }
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {memory?.name || "Memory Detail"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
              <span>{neurons.length} neuron{neurons.length !== 1 ? "s" : ""}</span>
              {memory?.format && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span>Format: {memory.format}</span>
                </>
              )}
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
              onPress={bkDownloadHtml}
            >
              <Download size={14} /> Download HTML
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={bkViewAsHtml}
            >
              <Eye size={16} /> View HTML
            </Button>
          </div>
        )}
      </div>

      {/* ── Processed Output ───────────────────────────────────────── */}
      {memory?.processedOutput && (
        <Card className="p-4 border-none shadow-sm">
          <button
            onClick={() => setShowProcessedOutput(!showProcessedOutput)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Download size={18} className="text-green-600" />
              <h3 className="text-sm font-medium text-gray-700">
                Processed Output
              </h3>
            </div>
            <span className="text-xs text-gray-400">
              {showProcessedOutput ? "Collapse" : "Expand"}
            </span>
          </button>
          {showProcessedOutput && (
            <div
              className="mt-3 p-4 bg-white border border-gray-200 rounded-lg prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: memory.processedOutput }}
            />
          )}
        </Card>
      )}

      {/* ── Raw Output ─────────────────────────────────────────────── */}
      {memory?.rawOutput && (
        <Card className="p-4 border-none shadow-sm">
          <button
            onClick={() => setShowRawOutput(!showRawOutput)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-blue-600" />
              <h3 className="text-sm font-medium text-gray-700">
                Raw Output
              </h3>
            </div>
            <span className="text-xs text-gray-400">
              {showRawOutput ? "Collapse" : "Expand"}
            </span>
          </button>
          {showRawOutput && (
            <pre className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
              {memory.rawOutput}
            </pre>
          )}
        </Card>
      )}

      {/* Memory Neurons — Individual */}
      {neurons.length > 0 && (
        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={18} className="text-purple-600" />
            <h3 className="text-sm font-medium text-gray-700">
              Individual Neurons ({neurons.length})
            </h3>
          </div>
          <div className="space-y-3">
            {neurons
              .sort((a, b) => a.order - b.order)
              .map((neuron) => (
                <div
                  key={neuron.id}
                  className="bg-purple-50 border border-purple-100 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-purple-700">
                      {neuron.name || `Neuron #${neuron.order + 1}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        onPress={() => setViewingNeuron(neuron)}
                      >
                        <Maximize2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => bkCopyContent(neuron.value)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="prose prose-sm prose-code:before:content-none prose-code:after:content-none max-w-none text-purple-900 max-h-64 overflow-y-auto">
                    <ReactMarkdown
                      components={{
                        code({ className, children, ...props }) {
                          const isInline = !className;
                          if (isInline) {
                            return (
                              <code
                                className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          }
                          const codeStr = String(children).replace(/\n$/, "");
                          return (
                            <div className="relative group my-2">
                              <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 text-gray-300 text-xs rounded-t-lg">
                                <span>code</span>
                                <button
                                  onClick={() =>
                                    navigator.clipboard.writeText(codeStr)
                                  }
                                  className="hover:text-white transition-colors"
                                  title="Copy code"
                                >
                                  Copy
                                </button>
                              </div>
                              <pre className="!mt-0 bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            </div>
                          );
                        },
                        pre({ children }) {
                          return <>{children}</>;
                        },
                      }}
                    >
                      {neuron.value}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Compiled Output (all neurons joined) */}
      {neurons.length > 0 && (
        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Download size={18} className="text-purple-600" />
              <h3 className="text-sm font-medium text-gray-700">
                Compiled Output
              </h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onPress={() => bkCopyContent(bkCompiledContent)}
              >
                {copied ? "Copied!" : "Copy All"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={() =>
                  bkDownloadContent(
                    bkCompiledContent,
                    `neurons-${memoryId.slice(0, 8)}.txt`,
                  )
                }
              >
                <Download size={14} /> Download
              </Button>
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 prose prose-sm prose-code:before:content-none prose-code:after:content-none max-w-none text-purple-900 max-h-96 overflow-y-auto">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  const codeStr = String(children).replace(/\n$/, "");
                  return (
                    <div className="relative group my-2">
                      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 text-gray-300 text-xs rounded-t-lg">
                        <span>code</span>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(codeStr)
                          }
                          className="hover:text-white transition-colors"
                          title="Copy code"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="!mt-0 bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
                pre({ children }) {
                  return <>{children}</>;
                },
              }}
            >
              {bkCompiledContent || "No neuron content available"}
            </ReactMarkdown>
          </div>
        </Card>
      )}

      {/* No content */}
      {!memory?.rawOutput && !memory?.processedOutput && neurons.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>This memory has no content to display.</p>
        </div>
      )}

      {/* ── Neuron Markdown Viewer Modal ──────────────────────────────── */}
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
                <div>
                  <span className="text-lg font-semibold text-foreground">
                    {viewingNeuron?.name ||
                      `Neuron #${(viewingNeuron?.order ?? 0) + 1}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    viewingNeuron &&
                    bkCopyContent(viewingNeuron.value)
                  }
                >
                  {copied ? "Copied!" : "Copy Content"}
                </Button>
              </div>
            </Modal.Header>

            <Modal.Body className="overflow-y-auto max-h-[70vh]">
              {viewingNeuron && (
                <div className="prose prose-sm prose-code:before:content-none prose-code:after:content-none max-w-none prose-neutral p-4">
                  <ReactMarkdown
                    components={{
                      code({ className, children, ...props }) {
                        const isInline = !className;
                        if (isInline) {
                          return (
                            <code
                              className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }
                        const codeStr = String(children).replace(/\n$/, "");
                        return (
                          <div className="relative group my-2">
                            <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 text-gray-300 text-xs rounded-t-lg">
                              <span>code</span>
                              <button
                                onClick={() =>
                                  navigator.clipboard.writeText(codeStr)
                                }
                                className="hover:text-white transition-colors"
                                title="Copy code"
                              >
                                Copy
                              </button>
                            </div>
                            <pre className="!mt-0 bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          </div>
                        );
                      },
                      pre({ children }) {
                        return <>{children}</>;
                      },
                    }}
                  >
                    {viewingNeuron.value}
                  </ReactMarkdown>
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
