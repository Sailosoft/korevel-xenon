"use client";

// BKProcessDetailPage.tsx
//
// Process Detail Page — the execution workspace where users:
// - View the process configuration (association + thought)
// - Resolve association slot values into context (client-side IndexedDB)
// - Execute the full pipeline (server-side AI chat via server action)
// - Review execution results step-by-step, conversation, and memory output
// - Re-run the process
//
// All IndexedDB operations happen client-side. The server action only
// handles AI chat calls (Helix) and returns results to be saved locally.

import React, { useEffect, useState, useCallback, useRef } from "react";
import { v7 as uuidv7 } from "uuid";
import ReactMarkdown from "react-markdown";
import { Button, Card, Select, ListBox } from "@heroui/react";
import {
  Play,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Brain,
  ChevronDown,
  ChevronRight,
  MessageSquareText,
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
import type { BKConversationMessage } from "../thoughts/BKThoughts.Types";
import type { BKMemory } from "../memory/BKMemory.Types";
import type { BKCraftFormat, BKCraftConfig } from "../craft/BKCraft.Types";
import type { BKThinker } from "../thinker/BKThinker.Types";
import { BKCraftEngine } from "../craft/BKCraft.Engine";
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

// ─── Step Panel Component ───────────────────────────────────────────────

function BKProcessStepPanel({
  step,
  index,
  userMessage,
  assistantMessage,
}: {
  step: BKTrainOfThought;
  index: number;
  userMessage?: BKConversationMessage;
  assistantMessage?: BKConversationMessage;
}) {
  return (
    <div className="space-y-4">
      {/* User Prompt Section */}
      {userMessage && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              User Prompt
            </span>
            <span className="text-xs text-gray-400">
              Step {index + 1}: {step.name}
            </span>
          </div>
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{step.thought}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* AI Response Section */}
      {assistantMessage ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded">
              AI Response
            </span>
            <span className="text-xs text-gray-400">
              {new Date(assistantMessage.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="prose prose-sm prose-code:before:content-none prose-code:after:content-none max-w-none text-gray-800">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const isInline = !className;
                    const match = /language-(\w+)/.exec(className || "");
                    const codeStr = String(children).replace(/\n$/, "");

                    if (isInline) {
                      return (
                        <code
                          className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-xs font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }

                    return (
                      <div className="relative group">
                        <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 text-gray-300 text-xs rounded-t-lg">
                          <span>{match?.[1] || "code"}</span>
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
                {assistantMessage.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ) : step.includeInMemory !== false ? (
        <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
          <p className="text-sm text-gray-400 italic">
            Waiting for AI response...
          </p>
        </div>
      ) : null}
    </div>
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

  // Process state
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

  // Conversation state (like BKStudio)
  const [conversation, setConversation] = useState<BKConversationMessage[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [result, setResult] = useState<string>("");
  const [showProcessedOutput, setShowProcessedOutput] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const isTabPinnedRef = useRef(false);

  // Thinker state (like BKStudio)
  const [thinker, setThinker] = useState<BKThinker | null>(null);
  const [thinkers, setThinkers] = useState<BKThinker[]>([]);
  const [thinkersLoading, setThinkersLoading] = useState(false);

  // ── Load Thinkers ───────────────────────────────────────────────────

  const bkLoadThinkers = useCallback(async () => {
    setThinkersLoading(true);
    try {
      const result = await bkThinkerDB.thinkersRepo.query.getAll({
        page: 0,
        pageSize: 9999,
        filters: [],
      });
      setThinkers(result.data);
    } catch (err) {
      console.error("[BKProcessDetail] Failed to load thinkers:", err);
    } finally {
      setThinkersLoading(false);
    }
  }, []);

  useEffect(() => {
    bkLoadThinkers();
  }, [bkLoadThinkers]);

  // ── Thinker selection handler ───────────────────────────────────────

  const handleThinkerChange = useCallback(
    async (val: unknown) => {
      const thinkerId = String(val);
      if (!thinkerId) {
        setThinker(null);
        return;
      }
      try {
        const result = await bkThinkerDB.thinkersRepo.get(thinkerId);
        if (result.isSuccess) {
          setThinker(result.value);
        }
      } catch (err) {
        console.error("[BKProcessDetail] Failed to load selected thinker:", err);
      }
    },
    [],
  );

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
    setConversation([]);
    setResult("");
    setCurrentStepIndex(0);
    setActiveStepIndex(0);
    isTabPinnedRef.current = false;

    const log: string[] = [
      "🚀 Starting process execution...",
      `📋 Association: ${association?.name ?? process.associationId}`,
      `💭 Thought: ${thought.name}`,
      thinker ? `🧠 Thinker: ${thinker.name} (${thinker.role})` : "🧠 Thinker: None (default)",
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

      // Load craft configs to resolve per-step craft formats
      const allCraftConfigs = await bkThinkerDB.craftConfigs
        .toArray() as BKCraftConfig[];
      const craftConfigMap = new Map(
        allCraftConfigs.map((c) => [c.id, c]),
      );

      // ── 4. Build the server action request ───────────────────────
      const request: BKProcessExecutionRequest = {
        thoughtName: thought.name,
        thoughtContent: thought.thought,
        thinkerName: thinker?.name,
        thinkerDescription: thinker?.description,
        thinkerRole: thinker?.role,
        associationContext: slotContextStr || undefined,
        trainOfThoughts: trainOfThoughts.map((tot) => {
          const craftConfig = tot.craftId
            ? craftConfigMap.get(tot.craftId)
            : null;
          return {
            id: tot.id,
            name: tot.name,
            thought: tot.thought,
            craftId: tot.craftId,
            craftFormat: craftConfig?.format ?? null,
            craftInstruction: craftConfig?.instruction ?? null,
          };
        }),
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

      const responseConversation = result.conversation ?? [];
      log.push(`✅ AI execution completed (${responseConversation.length} messages)`);
      setExecutionLog([...log]);

      // ── 7. Set conversation state (like BKStudio) ────────────────
      setConversation(responseConversation);

      // Process final output through craft engine
      if (responseConversation.length > 0) {
        const lastMessage = responseConversation[responseConversation.length - 1];
        const processed = BKCraftEngine.process(
          lastMessage.content,
          craftFormat,
        );
        setResult(processed.parsed);
      }

      // ── 8. Create Think session in IndexedDB ─────────────────────
      const thinkId = uuidv7();
      const thinkSlug = `${thought.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

      await bkThinkerDB.thinksRepo.create({
        id: thinkId,
        slug: thinkSlug,
        name: `Process: ${thought.name}`,
        description: `Auto-generated by process "${process.name}"${association ? ` using association "${association.name}"` : ""}`,
        thoughtId: thought.id,
        thoughtAssociationId: process.associationId,
        thinkConversation: responseConversation,
        status: "completed",
        createdAt: Date.now(),
      } as BKThink);

      log.push(`🧠 Think session created: ${thinkId}`);

      // ── 9. Export to Memory in IndexedDB ─────────────────────────
      const memoryId = uuidv7();
      const processedOutput = result.output ?? "";

      await bkThinkerDB.memoriesRepo.create({
        id: memoryId,
        thinkId,
        name: `${process.name} - ${new Date().toLocaleDateString()}`,
        description: `Exported from process "${process.name}"`,
        rawOutput: responseConversation[responseConversation.length - 1]?.content ?? "",
        processedOutput:
          processedOutput ||
          (responseConversation[responseConversation.length - 1]?.content ?? ""),
        format: craftFormat,
        createdAt: Date.now(),
      } as BKMemory);

      // Create memory neurons for each assistant response
      for (let i = 0; i < responseConversation.length; i++) {
        const msg = responseConversation[i];
        if (msg.role === "assistant") {
          const stepIndex = Math.floor(i / 2) - 1;
          const totStep = trainOfThoughts[stepIndex >= 0 ? stepIndex : 0];
          // Use the raw BKMemoryNeuron structure (memoryId, name, value, order)
          await bkThinkerDB.memoryNeuronsRepo.create({
            id: uuidv7(),
            memoryId,
            name: totStep?.name ?? `Neuron ${Math.floor(i / 2) + 1}`,
            value: msg.content,
            order: Math.floor(i / 2),
          } as any);
        }
      }

      log.push(`💾 Memory export: ${memoryId}`);

      // ── 10. Finalize the Process in IndexedDB ────────────────────
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
      setCurrentStepIndex(-1);
    }
  }, [process, thought, trainOfThoughts, association, pattern, craftFormat, processId, aiConfig, thinker]);

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

  // ── Derive completed steps with conversation pairs ─────────────────

  const completedSteps = trainOfThoughts
    .map((step, index) => ({
      step,
      index,
      userMessage: conversation[1 + index * 2],
      assistantMessage: conversation[2 + index * 2],
    }))
    .filter((entry) => entry.userMessage);

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
          {/* Thinker Selector */}
          <Select
            aria-label="Select thinker"
            value={thinker?.id ?? ""}
            onChange={handleThinkerChange}
            placeholder={
              thinkersLoading
                ? "Loading..."
                : thinkers.length === 0
                  ? "No thinkers"
                  : "Select thinker"
            }
            isDisabled={thinkersLoading || isRunning}
            className="w-48"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              {thinkersLoading ? (
                <ListBox key="loading">
                  <ListBox.Item
                    key="loading-item"
                    id="loading"
                    textValue="Loading thinkers..."
                    className="text-default-400 italic"
                  >
                    Loading thinkers...
                  </ListBox.Item>
                </ListBox>
              ) : thinkers.length === 0 ? (
                <ListBox key="empty">
                  <ListBox.Item
                    key="empty-item"
                    id="empty"
                    textValue="No thinkers found"
                    className="text-default-400 italic"
                  >
                    No thinkers available
                  </ListBox.Item>
                </ListBox>
              ) : (
                <ListBox key="ready">
                  <ListBox.Item
                    key=""
                    id=""
                    textValue="No persona (default)"
                  >
                    <span className="text-gray-400">
                      No persona (default)
                    </span>
                  </ListBox.Item>
                  {thinkers.map((t) => (
                    <ListBox.Item
                      key={t.id}
                      id={t.id}
                      textValue={t.name}
                    >
                      <div className="flex items-center gap-2">
                        <Brain size={14} className="text-purple-500 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {t.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {t.role.replace(/([A-Z])/g, " $1").trim()}
                            {t.specialization ? ` • ${t.specialization}` : ""}
                          </span>
                        </div>
                      </div>
                    </ListBox.Item>
                  ))}
                </ListBox>
              )}
            </Select.Popover>
          </Select>

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

      {/* Active Thinker Badge */}
      {thinker && (
        <Card className="p-4 border-none shadow-sm border-l-4 border-l-purple-500">
          <div className="flex items-start gap-3">
            <Brain size={20} className="text-purple-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Active Thinker Persona
              </h3>
              <p className="text-sm text-gray-700 mt-0.5 font-medium">
                {thinker.name}
                {thinker.role && (
                  <span className="text-gray-500 font-normal">
                    {" "}
                    —{" "}
                    {thinker.role.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                )}
              </p>
              {thinker.description && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {thinker.description}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

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

      {/* ── Train of Thoughts Steps (like BKStudio) ──────────────── */}
      {conversation.length > 0 && trainOfThoughts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Train of Thoughts Output
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setShowHistory(true)}
            >
              <MessageSquareText size={14} /> Full History
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-1.5">
            {trainOfThoughts.map((step, index) => {
              const isCompleted = conversation.length > index * 2 + 1;
              const isActive = index === activeStepIndex;

              return (
                <Button
                  key={step.id}
                  onPress={() => {
                    if (isCompleted) {
                      setActiveStepIndex(index);
                    }
                  }}
                  isDisabled={!isCompleted}
                  className={`flex items-center gap-1.5 px-3 rounded-lg py-2 text-xs font-medium rounded-t-lg transition-all min-w-0 h-auto bg-transparent data-[hover=true]:bg-transparent ${
                    isActive
                      ? "border-blue-500 text-blue-700 bg-blue-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {/* Status indicator */}
                  {isCompleted ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg
                        className="w-2 h-2 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full bg-gray-200" />
                  )}
                  <span>{step.name}</span>
                </Button>
              );
            })}
          </div>

          {/* Active Step Panel */}
          <div>
            {completedSteps
              .filter((entry) => entry.index === activeStepIndex)
              .map((entry) => (
                <BKProcessStepPanel
                  key={entry.step.id}
                  step={entry.step}
                  index={entry.index}
                  userMessage={entry.userMessage}
                  assistantMessage={entry.assistantMessage}
                />
              ))}
          </div>
        </div>
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

      {/* Processed Output Accordion (like BKStudio) */}
      {result && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowProcessedOutput(!showProcessedOutput)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              Processed Output ({craftFormat})
            </span>
            {showProcessedOutput ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </button>
          {showProcessedOutput && (
            <div
              className="p-4 bg-white prose prose-sm max-w-none border-t border-gray-200"
              dangerouslySetInnerHTML={{ __html: result }}
            />
          )}
        </div>
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

      {/* ── History Modal ──────────────────────────────────────────── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[85vh] mx-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Full Conversation History
                </h3>
                <p className="text-sm text-gray-500">
                  {conversation.length} messages across{" "}
                  {completedSteps.length} step(s)
                </p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {conversation.map((msg, index) => {
                const stepIndex = Math.floor(index / 2);
                const step = trainOfThoughts[stepIndex];
                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                          msg.role === "assistant"
                            ? "bg-green-100 text-green-700"
                            : msg.role === "system"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {msg.role === "system"
                          ? "System Context"
                          : msg.role === "user"
                            ? "You"
                            : "AI"}
                      </span>
                      {step && (
                        <span className="text-xs text-gray-400">
                          Step {stepIndex + 1}: {step.name}
                        </span>
                      )}
                      {msg.timestamp && (
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-xl border ${
                        msg.role === "assistant"
                          ? "bg-white border-gray-200"
                          : msg.role === "system"
                            ? "bg-purple-50 border-purple-100"
                            : "bg-blue-50 border-blue-100"
                      }`}
                    >
                      <div className="prose prose-sm prose-code:before:content-none prose-code:after:content-none max-w-none text-gray-700">
                        <ReactMarkdown
                          components={{
                            code({ className, children, ...props }) {
                              const isInline = !className;
                              if (isInline) {
                                return (
                                  <code
                                    className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-xs font-mono"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              }
                              const codeStr = String(children).replace(
                                /\n$/,
                                "",
                              );
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
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
