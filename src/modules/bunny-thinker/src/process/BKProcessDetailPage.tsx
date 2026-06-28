"use client";

// BKProcessDetailPage.tsx
//
// Process Detail Page — the execution workspace where users:
// - View the process configuration (association + thought)
// - Resolve association slot values into context (client-side IndexedDB)
// - Execute the full pipeline (server-side AI chat via server action)
// - Review execution results, conversation, and memory output
// - Re-run the process
//
// All IndexedDB operations happen client-side. The server action only
// handles AI chat calls (Helix) and returns results to be saved locally.

import React, { useEffect, useState, useCallback } from "react";
import { v7 as uuidv7 } from "uuid";
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
import { bkProcessExecuteAction } from "./BKProcess.Actions";
import type { BKProcessExecutionRequest } from "./BKProcess.Actions";
import type { BKProcess } from "./BKProcess.Types";
import type { BKThoughtAssociation } from "../thought-association/BKThoughtAssociation.Types";
import type { BKThoughtPattern } from "../thought-pattern/BKThoughtPattern.Types";
import type { BKThought, BKTrainOfThought } from "../thoughts/BKThoughts.Types";
import type { BKThink } from "../think/BKThink.Types";
import type { BKMemory, BKMemoryNeuron } from "../memory/BKMemory.Types";
import type { BKCraftFormat } from "../craft/BKCraft.Types";
import { useAISettings } from "../ai-settings/BKAISettings.Context";

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

// ─── Helper: Build resolved context string ──────────────────────────────

function buildResolvedContext(
  pattern: BKThoughtPattern,
  association?: BKThoughtAssociation,
): string {
  const lines: string[] = [];
  lines.push(`Thought Pattern: ${pattern.name}`);
  if (pattern.description) {
    lines.push(pattern.description);
  }
  lines.push("");
  lines.push("Slots:");
  if (pattern.slots.length > 0) {
    for (const slot of pattern.slots) {
      const slotVal = association?.slotValues.find(
        (sv) => sv.slotId === slot.id,
      );
      const value = slotVal?.value ?? slot.defaultValue ?? "";
      const label = slot.label || slot.name;
      lines.push(`  - ${label}: ${value || "[not set]"}`);
    }
  } else {
    lines.push("  (no slots defined)");
  }
  return lines.join("\n");
}

// ─── Detail Page Component ──────────────────────────────────────────────

export default function BKProcessDetailPage({
  processId,
}: BKProcessDetailPageProps) {
  const router = useRouter();
  const { aiConfig } = useAISettings();

  // State
  const [process, setProcess] = useState<BKProcess | null>(null);
  const [association, setAssociation] =
    useState<BKThoughtAssociation | null>(null);
  const [pattern, setPattern] = useState<BKThoughtPattern | null>(null);
  const [thought, setThought] = useState<BKThought | null>(null);
  const [trainOfThoughts, setTrainOfThoughts] = useState<BKTrainOfThought[]>(
    [],
  );
  const [resolvedContext, setResolvedContext] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [craftFormat, setCraftFormat] = useState<BKCraftFormat>("markdown");

  // ── Load Process (client-side IndexedDB) ────────────────────────────

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
          const assoc = assocResult.value;
          setAssociation(assoc);

          // Load pattern (from association)
          const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
            assoc.patternId,
          );
          if (patternResult.isSuccess) {
            setPattern(patternResult.value);
          }
        }

        // Load thought
        const thoughtResult = await bkThinkerDB.thoughtsRepo.get(
          proc.thoughtId,
        );
        if (thoughtResult.isSuccess) {
          const loadedThought = thoughtResult.value;
          setThought(loadedThought);

          // Load train-of-thoughts
          const totList =
            await bkThinkerDB.trainOfThoughtsRepo.getByThoughtId(
              loadedThought.id,
            );
          setTrainOfThoughts(totList);
        }
      }
    } catch (err) {
      console.error("[BKProcessDetail] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Resolve Association (client-side IndexedDB) ─────────────────────

  const bkResolveContext = useCallback(async () => {
    if (!process || !pattern) return;
    setExecutionLog((prev) => [...prev, "🔍 Resolving association..."]);

    try {
      const context = buildResolvedContext(pattern, association ?? undefined);
      setResolvedContext(context);
      setExecutionLog((prev) => [
        ...prev,
        `✅ Resolved context from pattern "${pattern.name}"`,
      ]);
    } catch (err) {
      setExecutionLog((prev) => [
        ...prev,
        `❌ Resolution failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      ]);
    }
  }, [process, pattern, association]);

  // ── Execute Process ────────────────────────────────────────────────

  const bkExecuteProcess = useCallback(async () => {
    if (!process || !thought || trainOfThoughts.length === 0) return;

    setIsExecuting(true);
    setError("");

    const log: string[] = [
      "🚀 Starting process execution...",
      `📋 Association: ${association?.name ?? process.associationId}`,
      `💭 Thought: ${thought.name}`,
    ];
    setExecutionLog(log);

    try {
      // ── 1. Update process status to "resolving" (client-side) ────
      await bkThinkerDB.processesRepo.update(processId, {
        ...process,
        status: "resolving",
        updatedAt: Date.now(),
      } as BKProcess);
      setProcess((prev) =>
        prev ? { ...prev, status: "resolving" as const } : prev,
      );

      // ── 2. Resolve association context (client-side) ─────────────
      let slotContextStr = "";
      if (pattern) {
        slotContextStr = buildResolvedContext(pattern, association ?? undefined);
      }

      // ── 3. Update process status to "ready" (client-side) ────────
      await bkThinkerDB.processesRepo.update(processId, {
        ...process,
        status: "ready",
        updatedAt: Date.now(),
      } as BKProcess);
      setProcess((prev) =>
        prev ? { ...prev, status: "ready" as const } : prev,
      );

      // ── 4. Build the server action request ───────────────────────
      const request: BKProcessExecutionRequest = {
        thoughtName: thought.name,
        thoughtContent: thought.thought,
        associationContext: slotContextStr || undefined,
        trainOfThoughts: trainOfThoughts.map((tot) => ({
          id: tot.id,
          name: tot.name,
          thought: tot.thought,
          craftId: tot.craftId,
        })),
        craftFormat,
        aiConfig: aiConfig
          ? { provider: aiConfig.provider, model: aiConfig.model }
          : undefined,
      };

      // ── 5. Update process status to "processing" (client-side) ───
      await bkThinkerDB.processesRepo.update(processId, {
        ...process,
        status: "processing",
        updatedAt: Date.now(),
      } as BKProcess);
      setProcess((prev) =>
        prev ? { ...prev, status: "processing" as const } : prev,
      );

      // ── 6. Execute AI chat on the server ─────────────────────────
      log.push("🤖 Executing train-of-thought steps via AI...");
      setExecutionLog([...log]);

      const result = await bkProcessExecuteAction(request);

      if (!result.success) {
        await markProcessError(processId, result.error ?? "Execution failed");
        setExecutionLog((prev) => [
          ...prev,
          `❌ Execution failed: ${result.error}`,
        ]);
        setError(result.error ?? "Unknown execution error");
        setIsExecuting(false);
        return;
      }

      const conversation = result.conversation ?? [];
      log.push(`✅ AI execution completed (${conversation.length} messages)`);
      setExecutionLog([...log]);

      // ── 7. Create Think session in IndexedDB ─────────────────────
      const thinkId = uuidv7();
      const thinkSlug = `${thought.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

      await bkThinkerDB.thinksRepo.create({
        id: thinkId,
        slug: thinkSlug,
        name: `Process: ${thought.name}`,
        description: `Auto-generated by process "${process.name}"${association ? ` using association "${association.name}"` : ""}`,
        thoughtId: thought.id,
        thoughtAssociationId: process.associationId,
        thinkConversation: conversation,
        status: "completed",
        createdAt: Date.now(),
      } as BKThink);

      log.push(`🧠 Think session created: ${thinkId}`);

      // ── 8. Export to Memory in IndexedDB ─────────────────────────
      const memoryId = uuidv7();
      const processedOutput = result.output ?? "";

      await bkThinkerDB.memoriesRepo.create({
        id: memoryId,
        thinkId,
        name: `Memory - ${process.name} - ${new Date().toLocaleDateString()}`,
        description: `Exported from process "${process.name}"`,
        rawOutput: conversation[conversation.length - 1]?.content ?? "",
        processedOutput:
          processedOutput ||
          (conversation[conversation.length - 1]?.content ?? ""),
        format: craftFormat,
        createdAt: Date.now(),
      } as BKMemory);

      // Create memory neurons for each assistant response
      for (let i = 0; i < conversation.length; i++) {
        const msg = conversation[i];
        if (msg.role === "assistant") {
          const stepIndex = Math.floor(i / 2) - 1; // -1 to skip system message at index 0
          const totStep = trainOfThoughts[stepIndex >= 0 ? stepIndex : 0];
          await bkThinkerDB.memoryNeuronsRepo.create({
            id: uuidv7(),
            memoryId,
            thoughtId: thought.id,
            trainOfThoughtId: totStep?.id,
            name: totStep?.name ?? `Neuron ${Math.floor(i / 2) + 1}`,
            value: msg.content,
            order: Math.floor(i / 2),
          } as BKMemoryNeuron);
        }
      }

      log.push(`💾 Memory export: ${memoryId}`);

      // ── 9. Finalize the Process in IndexedDB ─────────────────────
      await bkThinkerDB.processesRepo.update(processId, {
        ...process,
        thinkId,
        memoryId,
        status: "completed",
        updatedAt: Date.now(),
      } as BKProcess);

      log.push("✅ Process completed successfully!");
      setExecutionLog([...log]);

      // Reload process state
      await bkLoadProcess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown process execution error";
      console.error("[BKProcessDetail] execute failed:", message);
      await markProcessError(processId, message);
      setExecutionLog((prev) => [...prev, `❌ Execution failed: ${message}`]);
      setError(message);
    } finally {
      setIsExecuting(false);
    }
  }, [process, thought, trainOfThoughts, association, pattern, craftFormat, processId, aiConfig]);

  // ── Helper: Mark process as errored ───────────────────────────────

  const markProcessError = async (
    pid: string,
    errorMessage: string,
  ) => {
    try {
      const result = await bkThinkerDB.processesRepo.get(pid);
      if (result.isSuccess) {
        await bkThinkerDB.processesRepo.update(pid, {
          ...result.value,
          status: "error",
          errorMessage,
          updatedAt: Date.now(),
        } as BKProcess);
        setProcess((prev) =>
          prev
            ? { ...prev, status: "error" as const, errorMessage }
            : prev,
        );
      }
    } catch (err) {
      console.error("[BKProcessDetail] Failed to mark error:", err);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────

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
              {pattern && (
                <p className="text-xs text-gray-500">
                  Pattern: {pattern.name}
                </p>
              )}
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
              <p className="text-xs text-gray-500">
                Train of thoughts: {trainOfThoughts.length} steps
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
