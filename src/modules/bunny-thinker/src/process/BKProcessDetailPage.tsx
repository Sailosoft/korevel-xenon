"use client";

// BKProcessDetailPage.tsx
//
// Process Detail Page — the execution workspace where users:
// - View the process configuration (association + thought)
// - Resolve association slot values into context
// - Execute the full pipeline (resolve → think → export to memory)
// - Review execution results, conversation, and memory output
// - Re-run the process

import React, { useEffect, useState, useCallback } from "react";
import { Button, Card } from "@heroui/react";
import {
  Play,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import {
  bkProcessExecuteAction,
  bkProcessResolveAssociationAction,
} from "./BKProcess.Actions";
import type { BKProcess } from "./BKProcess.Types";
import type { BKThoughtAssociation } from "../thought-association/BKThoughtAssociation.Types";
import type { BKThought } from "../thoughts/BKThoughts.Types";
import type { BKCraftFormat } from "../craft/BKCraft.Types";

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKProcessDetailPageProps {
  processId: string;
}

// ─── Status Badge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    resolving: "bg-blue-100 text-blue-700",
    ready: "bg-amber-100 text-amber-700",
    processing: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
        styles[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

// ─── Detail Page Component ──────────────────────────────────────────────

export default function BKProcessDetailPage({
  processId,
}: BKProcessDetailPageProps) {
  const router = useRouter();

  // State
  const [process, setProcess] = useState<BKProcess | null>(null);
  const [association, setAssociation] =
    useState<BKThoughtAssociation | null>(null);
  const [thought, setThought] = useState<BKThought | null>(null);
  const [resolvedContext, setResolvedContext] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [craftFormat, setCraftFormat] = useState<BKCraftFormat>("markdown");

  // ── Load Process ────────────────────────────────────────────────────

  useEffect(() => {
    bkLoadProcess();
  }, [processId]);

  const bkLoadProcess = async () => {
    try {
      const result = await bkThinkerDB.processesRepo.get(processId);
      if (result.isSuccess) {
        const proc = result.value;
        setProcess(proc);

        // Load association
        const assocResult = await bkThinkerDB.thoughtAssociationsRepo.get(
          proc.associationId,
        );
        if (assocResult.isSuccess) {
          setAssociation(assocResult.value);
        }

        // Load thought
        const thoughtResult = await bkThinkerDB.thoughtsRepo.get(
          proc.thoughtId,
        );
        if (thoughtResult.isSuccess) {
          setThought(thoughtResult.value);
        }
      }
    } catch (err) {
      console.error("[BKProcessDetail] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Resolve Association ─────────────────────────────────────────────

  const bkResolveContext = useCallback(async () => {
    if (!process) return;
    setExecutionLog((prev) => [...prev, "🔍 Resolving association..."]);

    const result = await bkProcessResolveAssociationAction(
      process.associationId,
    );
    if (result.success && result.resolvedContext) {
      setResolvedContext(result.resolvedContext);
      setExecutionLog((prev) => [
        ...prev,
        `✅ Resolved context from pattern "${result.patternName}"`,
      ]);
    } else {
      setExecutionLog((prev) => [
        ...prev,
        `❌ Resolution failed: ${result.error}`,
      ]);
    }
  }, [process]);

  // ── Execute Process ─────────────────────────────────────────────────

  const bkExecuteProcess = useCallback(async () => {
    if (!process) return;
    setIsExecuting(true);
    setError("");
    setExecutionLog([
      "🚀 Starting process execution...",
      `📋 Association: ${association?.name ?? process.associationId}`,
      `💭 Thought: ${thought?.name ?? process.thoughtId}`,
    ]);

    const result = await bkProcessExecuteAction(processId, {
      craftFormat,
    });

    if (result.success) {
      setExecutionLog((prev) => [
        ...prev,
        "✅ Process completed successfully!",
        `🧠 Think session: ${result.thinkId}`,
        `💾 Memory export: ${result.memoryId}`,
      ]);
    } else {
      setExecutionLog((prev) => [
        ...prev,
        `❌ Execution failed: ${result.error}`,
      ]);
      setError(result.error ?? "Unknown error");
    }

    // Reload process state
    await bkLoadProcess();
    setIsExecuting(false);
  }, [process, association, thought, craftFormat, processId]);

  // ── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!process) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Process not found.</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onPress={() =>
            router.push("/modules/bunny-thinker/processes")
          }
        >
          <ArrowLeft size={16} /> Back to Processes
        </Button>
      </div>
    );
  }

  const isIdle =
    process.status === "draft" || process.status === "ready";
  const isRunning = process.status === "processing" || isExecuting;
  const isDone = process.status === "completed";
  const isErrored = process.status === "error";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onPress={() =>
              router.push("/modules/bunny-thinker/processes")
            }
            isIconOnly
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                {process.name}
              </h1>
              <StatusBadge status={process.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {process.description || "End-to-end thought process orchestration"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {(isIdle || isErrored) && !isRunning && (
            <Button
              variant="primary"
              onPress={bkExecuteProcess}
              isDisabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Running...
                </>
              ) : (
                <>
                  <Play size={18} /> {isErrored ? "Retry Process" : "Run Process"}
                </>
              )}
            </Button>
          )}

          {isDone && (
            <>
              {process.thinkId && (
                <Button
                  variant="secondary"
                  onPress={() =>
                    router.push(
                      `/modules/bunny-thinker/think/${process.thinkId}`,
                    )
                  }
                >
                  <ExternalLink size={18} /> View Think Session
                </Button>
              )}
              <Button
                variant="primary"
                onPress={bkExecuteProcess}
                isDisabled={isRunning}
              >
                <RotateCcw size={18} /> Re-run
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {isErrored && process.errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">Process Error</p>
            <p className="text-sm text-red-600 mt-0.5">
              {process.errorMessage}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Configuration Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Association Info */}
        <Card className="p-4 border-none shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Thought Association
          </h3>
          {association ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-900 font-medium">
                {association.name}
              </p>
              <p className="text-xs text-gray-500">
                Pattern slots: {association.slotValues.length} values
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-purple-600"
                onPress={() =>
                  router.push(
                    `/modules/bunny-thinker/thought-associations/${association.id}`,
                  )
                }
              >
                <ExternalLink size={14} /> Edit Association
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Loading...</p>
          )}
        </Card>

        {/* Thought Info */}
        <Card className="p-4 border-none shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Thought</h3>
          {thought ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-900 font-medium">
                {thought.name}
              </p>
              <p className="text-xs text-gray-500 line-clamp-2">
                {thought.thought}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-purple-600"
                onPress={() =>
                  router.push(
                    `/modules/bunny-thinker/thoughts`,
                  )
                }
              >
                <ExternalLink size={14} /> View Thought
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Loading...</p>
          )}
        </Card>
      </div>

      {/* Resolved Context Preview */}
      {resolvedContext && (
        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">
              Resolved Context
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onPress={bkResolveContext}
            >
              <RotateCcw size={14} /> Refresh
            </Button>
          </div>
          <pre className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
            {resolvedContext}
          </pre>
        </Card>
      )}

      {/* Resolve Context Button (when not yet resolved) */}
      {!resolvedContext && !isRunning && (
        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">
                Slot Values
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Resolve the association's slot values to preview the context
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onPress={bkResolveContext}
            >
              Resolve Context
            </Button>
          </div>
        </Card>
      )}

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <Card className="p-4 border-none shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Execution Log
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {executionLog.map((entry, index) => (
              <div
                key={index}
                className="text-sm text-gray-600 flex items-start gap-2"
              >
                <span className="text-gray-400 mt-0.5 shrink-0">
                  {index + 1}.
                </span>
                <span className="whitespace-pre-wrap">{entry}</span>
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2 text-sm text-purple-600">
                <Loader2 size={14} className="animate-spin" />
                Processing...
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Results Summary (completed) */}
      {isDone && (
        <Card className="p-4 border-none shadow-sm border-l-4 border-l-green-500">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={24}
              className="text-green-500 mt-0.5 shrink-0"
            />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Process Completed
              </h3>
              <div className="mt-2 space-y-1">
                {process.thinkId && (
                  <p className="text-sm text-gray-600">
                    Think Session:{" "}
                    <a
                      href={`/modules/bunny-thinker/think/${process.thinkId}`}
                      className="text-purple-600 hover:underline"
                    >
                      {process.thinkId}
                    </a>
                  </p>
                )}
                {process.memoryId && (
                  <p className="text-sm text-gray-600">
                    Memory Export: {process.memoryId}
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onPress={() =>
                  router.push(
                    `/modules/bunny-thinker/think/${process.thinkId}`,
                  )
                }
              >
                <ExternalLink size={14} /> Open Think Studio
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Progress indicator for running */}
      {isRunning && (
        <Card className="p-4 border-none shadow-sm border-l-4 border-l-purple-500">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-purple-600" />
            <div>
              <p className="text-sm font-medium text-purple-700">
                Process Running
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Executing: resolve association → run thought → export to memory
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
