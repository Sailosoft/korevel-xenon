"use client";

// BKThinkStudioAnon.tsx
//
// Anonymous mode component for Think Studio.
// Users can write thoughts and train-of-thought steps from scratch on the
// page, run the thinking process, review results, export as JSON, or save
// as a full persistent thought (redirects to think studio on save).

import React, { useCallback, useRef, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import RenderView from "@/src/modules/render/src/components/RenderModule.View";
import Editor from "@monaco-editor/react";
import { Button, Select, ListBox, Dropdown, Toast, toast } from "@heroui/react";
import {
  Brain,
  RotateCcw,
  MessageSquareText,
  Download,
  Save,
  X,
  Settings2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  List,
  Pencil,
  Link2,
  GitBranch,
  Plus,
  Eye,
  FileJson,
} from "lucide-react";
import { useAnonymousMode } from "./BKThinkStudioAnonHooks";
import type { BKThinkStudioAnonStep } from "./BKThinkStudioAnonHooks";
import type { HelixAIOption } from "@/src/modules/helix";
import { BKCraftEngine } from "../craft/BKCraft.Engine";
import type { BKCraftFormat } from "../craft/BKCraft.Types";
import MermaidRenderer from "../components/MermaidRenderer";
import BKThinkStudioSettingsModal from "./BKThinkStudioSettingsModal";
import BKThoughtConfigPanel from "../thoughts/BKThoughtConfigPanel";
import type { BKConfigPanelStep } from "../thoughts/BKThoughtConfigPanel.Types";
import BKGenerateStepsModal from "../thoughts/BKGenerateStepsModal";
import { BKStepActions, BKStepIdeasPicker, BKStepIdeasBubbles } from "../steps";
import BKRenderCraftContent, {
  BKCRAFT_TO_RENDER_FORMAT,
} from "./BKThinkStudioAnon.RenderCraftContent";
import type { BKGeneratedStep } from "../think/BKThink.Actions";
import type { BKStepGenerationStrategy } from "../thoughts/BKThoughtGeneration.Config";
import { v7 as uuidv7 } from "uuid";
import {
  bkViewAsHtml,
  bkDownloadHtml,
} from "../memory/BKMemory.Export";
import type { BKMemory, BKMemoryNeuron } from "../memory/BKMemory.Types";
import type { RenderFormat } from "@/src/modules/render/src/RenderModule.Types";
import BKConfirmDialog from "../components/BKConfirmDialog";

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Resolve a BKCraftFormat to a storage-friendly format string.
 * Falls back to "markdown" for craft-only formats without a RenderView map.
 */
function resolveMemoryFormat(craftFormat: BKCraftFormat): string {
  const renderFormat = BKCRAFT_TO_RENDER_FORMAT[craftFormat];
  return renderFormat ?? "markdown";
}

/** Resolve a BKCraftFormat to a RenderFormat for HTML view/download export. */
function resolveRenderFormat(craftFormat: string): RenderFormat {
  return BKCRAFT_TO_RENDER_FORMAT[craftFormat as BKCraftFormat] ?? "markdown";
}

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKThinkStudioAnonProps {
  aiConfig: HelixAIOption;
}

// ─── Step Panel ────────────────────────────────────────────────────────

function BKStepPanel({
  step,
  index,
  userMessage,
  assistantMessage,
  craftFormat,
}: {
  step: { name: string; thought: string };
  index: number;
  userMessage?: { role: string; content: string; timestamp: number };
  assistantMessage?: { role: string; content: string; timestamp: number };
  craftFormat: BKCraftFormat;
}) {
  const [viewMode, setViewMode] = useState<"view" | "raw">("view");

  return (
    <div className="space-y-4">
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
              <ReactMarkdown>{userMessage?.content ?? step.thought}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {assistantMessage ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded">
              AI Response
            </span>
            <span className="text-xs text-gray-400">
              {new Date(assistantMessage.timestamp).toLocaleTimeString()}
            </span>
            {/* Craft format badge + View/Raw toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                {craftFormat}
              </span>
              {craftFormat !== "markdown" && (
                <div
                  role="group"
                  className="inline-flex items-center rounded-lg border border-gray-200 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("view")}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                      viewMode === "view"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("raw")}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-gray-200 ${
                      viewMode === "raw"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Raw
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
            <BKRenderCraftContent
              content={assistantMessage.content}
              craftFormat={craftFormat}
              viewMode={viewMode}
            />
          </div>
        </div>
      ) : (
        <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
          <p className="text-sm text-gray-400 italic">
            Waiting for AI response...
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function BKThinkStudioAnon({
  aiConfig,
}: BKThinkStudioAnonProps) {
  const router = useRouter();
  const anon = useAnonymousMode();

  const {
    // Loaded data
    allThoughts,
    allThoughtsLoading,
    thinkers,
    thinkersLoading,
    patterns,
    patternsLoading,
    craftConfigs,
    craftConfigsLoading,
    associations,
    associationSelectLoading,
    ideas,
    ideasLoading,

    // Editable fields
    thoughtName,
    thoughtDescription,
    thoughtContent,
    steps,

    // Selections
    selectedPattern,
    selectedThought,
    selectedThinker,
    selectedAssociation,
    selectedAssociationId,

    // Thinking state
    conversation,
    isThinking,
    currentStepIndex,
    activeStepIndex,
    error,
    result,
    rawResult,
    craftFormat,
    trainOfThoughts,
    showProcessedOutput,

    // Derived
    isReadyToThink,
    completedSteps,
    isProcessingComplete,
    isTabPinnedRef,

    // Setters
    setThoughtName,
    setThoughtDescription,
    setThoughtContent,
    setCraftFormat,
    setActiveStepIndex,
    setShowProcessedOutput,

    // Custom association override state
    associationOverrideEnabled,
    onAssociationOverrideEnabledChange,
    associationOverridePersistence,
    onAssociationOverridePersistenceChange,
    associationOverrideSlotValues,
    onAssociationOverrideSlotValuesChange,
    savePersistentAssociation,
    createQuickAssociation,
    associationSaving,

    // Actions
    loadExistingThought,
    selectPattern,
    selectThinker,
    selectAssociation,
    addStep,
    addStepBefore,
    addStepAfter,
    moveStepUp,
    moveStepDown,
    removeStep,
    updateStep,
    toggleStepIdea,
    setStepIdeaIds,
    appendSteps,
    replaceAllSteps,
    startThinking,
    rethinkFromStep,
    exportAsJson,
    saveAsThought,
    resetSession,
  } = anon;

  // ── Modal state ────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [showGenerateSteps, setShowGenerateSteps] = React.useState(false);
  const [showQuickAddAssociation, setShowQuickAddAssociation] =
    React.useState(false);
  const [quickAssocName, setQuickAssocName] = React.useState("");
  const [quickAssocDescription, setQuickAssocDescription] = React.useState("");
  const [quickAssocSlotValues, setQuickAssocSlotValues] = React.useState<
    { slotId: string; value: string }[]
  >([]);
  const [quickAssocSaving, setQuickAssocSaving] = React.useState(false);

  // ── Apply generated (AI) steps to the anonymous editor ─────────────
  const anonHandleGeneratedSteps = useCallback(
    (steps: BKGeneratedStep[], strategy: BKStepGenerationStrategy) => {
      const mapped = steps.map((s) => ({
        name: s.name,
        thought: s.thought,
      }));
      if (strategy === "override") {
        replaceAllSteps(mapped);
      } else {
        appendSteps(mapped);
      }
      setShowGenerateSteps(false);
    },
    [appendSteps, replaceAllSteps],
  );

  // Reusable header action rendered beside "Add Step" in the steps editor
  const renderGenerateStepsButton = useCallback(
    () => (
      <Button
        variant="ghost"
        size="sm"
        onPress={() => setShowGenerateSteps(true)}
        className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1 text-xs"
      >
        <Sparkles size={14} /> Generate
      </Button>
    ),
    [],
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"view" | "raw">("view");

  // ── Handle save ────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const thinkId = await saveAsThought();
      if (thinkId) {
        router.push(`/modules/bunny-thinker/think/${thinkId}`);
      }
    } finally {
      setIsSaving(false);
    }
  }, [saveAsThought, router]);

  // ── HTML view/download export (parity with BKThinkStudio) ─────────
  const [showDownloadConfirm, setShowDownloadConfirm] = React.useState(false);
  const [downloadFileName, setDownloadFileName] = React.useState("");
  const pendingHtmlExportRef = useRef<{
    neurons: BKMemoryNeuron[];
    memory: BKMemory;
    getNeuronFormat: (neuronId: string) => RenderFormat;
  } | null>(null);

  const handleExportAction = useCallback(
    (actionKey: string | number) => {
      const key = String(actionKey);
      if (key === "json") {
        exportAsJson();
        return;
      }
      if (conversation.length === 0) return;

      // Build a map of step index → render format from trainOfThoughts
      const stepFormatMap = new Map<number, RenderFormat>();
      for (const step of trainOfThoughts) {
        const stepCraftConfig = step.craftId
          ? craftConfigs.find((c) => c.id === step.craftId)
          : null;
        stepFormatMap.set(
          step.order,
          resolveRenderFormat(stepCraftConfig?.format ?? craftFormat),
        );
      }

      // Build neurons from assistant responses (conversation index 2, 4, 6, ...)
      const memoryId = uuidv7();
      const neurons: BKMemoryNeuron[] = [];
      for (let i = 1; i < conversation.length; i += 2) {
        const assistantMsg = conversation[i + 1];
        if (assistantMsg && assistantMsg.role === "assistant") {
          const stepIndex = (i - 1) / 2;
          const step = trainOfThoughts[stepIndex];
          const neuronFormat = step
            ? (stepFormatMap.get(step.order) ?? "markdown")
            : "markdown";
          neurons.push({
            id: uuidv7(),
            memoryId,
            name: `Neuron ${stepIndex + 1}${step?.name ? ` - ${step.name}` : ""}`,
            value: assistantMsg.content,
            order: stepIndex,
            format: neuronFormat,
          });
        }
      }

      if (neurons.length === 0) {
        toast.warning("No assistant responses to export.");
        return;
      }

      const memory: BKMemory = {
        id: memoryId,
        thinkId: memoryId,
        name: thoughtName || "Anonymous Think",
        description: thoughtDescription || undefined,
        format: resolveMemoryFormat(craftFormat),
        createdAt: Date.now(),
      };

      const getNeuronFormat = (neuronId: string): RenderFormat => {
        const neuron = neurons.find((n) => n.id === neuronId);
        return resolveRenderFormat(neuron?.format ?? craftFormat);
      };

      if (key === "view") {
        bkViewAsHtml(neurons, memory, getNeuronFormat);
      } else if (key === "download") {
        pendingHtmlExportRef.current = { neurons, memory, getNeuronFormat };
        setDownloadFileName(memory.name || "thoughts");
        setShowDownloadConfirm(true);
      }
    },
    [
      conversation,
      trainOfThoughts,
      craftConfigs,
      craftFormat,
      thoughtName,
      thoughtDescription,
      exportAsJson,
    ],
  );

  const handleHtmlDownload = useCallback(() => {
    const pending = pendingHtmlExportRef.current;
    if (!pending) return;
    const fileName =
      downloadFileName.trim() || pending.memory.name || "thoughts";
    bkDownloadHtml(
      pending.neurons,
      pending.memory.id,
      { ...pending.memory, name: fileName },
      pending.getNeuronFormat,
    );
  }, [downloadFileName]);

  // ── Step actions with idea attachments (shared across setup/edit) ──
  const renderAnonStepActions = useCallback(
    (step: BKConfigPanelStep, index: number) => {
      const anonStep = steps.find((s) => s.id === step.id);
      return (
        <BKStepActions
          stepIndex={index}
          totalSteps={steps.length}
          onMoveUp={moveStepUp}
          onMoveDown={moveStepDown}
          onAddBefore={addStepBefore}
          onAddAfter={addStepAfter}
        >
          <BKStepIdeasPicker
            stepId={step.id}
            selectedIdeaIds={anonStep?.ideaIds ?? []}
            ideas={ideas}
            ideasLoading={ideasLoading}
            onChange={setStepIdeaIds}
          />
        </BKStepActions>
      );
    },
    [
      steps,
      ideas,
      ideasLoading,
      moveStepUp,
      moveStepDown,
      addStepBefore,
      addStepAfter,
      setStepIdeaIds,
    ],
  );

  // ── Attached idea bubbles rendered beneath each step header ────────
  const renderStepIdeasBelowHeader = useCallback(
    (step: BKConfigPanelStep) => {
      const anonStep = steps.find((s) => s.id === step.id);
      return (
        <BKStepIdeasBubbles
          stepId={step.id}
          selectedIdeaIds={anonStep?.ideaIds ?? []}
          ideas={ideas}
          onToggle={toggleStepIdea}
        />
      );
    },
    [steps, ideas, toggleStepIdea],
  );

  // ── Has thinking been started? ──────────────────────────────────────
  const hasThinkingStarted = conversation.length > 0;

  // ── Adapt steps/handlers for BKThoughtConfigPanel (craftFormat bridge) ──
  const craftConfigMapForFormat = useMemo(
    () => new Map(craftConfigs.map((c) => [c.id, c.format])),
    [craftConfigs],
  );

  const panelSteps = useMemo(
    () =>
      steps.map((s) => ({
        id: s.id,
        name: s.name,
        thought: s.thought,
        order: s.order,
        craftFormat: s.craftId
          ? craftConfigMapForFormat.get(s.craftId)
          : undefined,
      })),
    [steps, craftConfigMapForFormat],
  );

  const handleUpdateStep = useCallback(
    (
      index: number,
      field: "name" | "thought" | "craftFormat",
      value: string,
    ) => {
      if (field === "craftFormat") {
        // Find a craft config matching the selected format, or clear
        const matchingCfg = craftConfigs.find((c) => c.format === value);
        updateStep(index, "craftId", matchingCfg?.id ?? "");
      } else {
        updateStep(index, field, value);
      }
    },
    [updateStep, craftConfigs],
  );

  // ── Setup phase UI (before thinking starts) ────────────────────────
  if (!hasThinkingStarted && !isThinking) {
    return (
      <div className="bk-think-studio-anon space-y-8">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Brain size={24} className="text-purple-500" />
            <h1 className="text-xl font-semibold text-gray-900">
              Anonymous Think Studio
            </h1>
          </div>
          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
            Disposable
          </span>
        </div>

        {/* ── Load existing thought ──────────────────────────────── */}
        <section className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <List size={16} className="text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">
              Load from existing thought (optional)
            </h3>
          </div>
          <Select
            aria-label="Load existing thought"
            placeholder={
              allThoughtsLoading
                ? "Loading thoughts..."
                : "Select a thought to pre-fill..."
            }
            className="max-w-[400px]"
            isDisabled={allThoughtsLoading}
            onChange={(val: unknown) => {
              const id = String(val);
              if (id) loadExistingThought(id);
            }}
          >
            <Select.Trigger className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            <Select.Popover>
              <ListBox>
                {allThoughts.map((t) => (
                  <ListBox.Item key={t.id} id={t.id} textValue={t.name}>
                    <div className="flex flex-col">
                      <span className="text-sm">{t.name}</span>
                      {t.description && (
                        <span className="text-xs text-gray-400 truncate max-w-[240px]">
                          {t.description}
                        </span>
                      )}
                    </div>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          {selectedThought && (
            <p className="text-xs text-gray-400 mt-2">
              Loaded &ldquo;{selectedThought.name}&rdquo; — you can edit the
              fields below
            </p>
          )}
        </section>

        {/* ── Pattern & Association ───────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Pattern & Association Override (optional)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pattern Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Thought Pattern
              </label>
              <Select
                aria-label="Select pattern"
                value={selectedPattern?.id ?? ""}
                placeholder={
                  patternsLoading
                    ? "Loading patterns..."
                    : patterns.length === 0
                      ? "No patterns"
                      : "Select a pattern (optional)"
                }
                isDisabled={patternsLoading}
                onChange={(val: unknown) => {
                  const id = String(val);
                  selectPattern(id);
                }}
              >
                <Select.Trigger className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  {patternsLoading ? (
                    <ListBox key="loading">
                      <ListBox.Item
                        key="loading-item"
                        id="loading"
                        textValue="Loading..."
                        className="text-default-400 italic"
                      >
                        Loading patterns...
                      </ListBox.Item>
                    </ListBox>
                  ) : (
                    <ListBox key="ready">
                      <ListBox.Item key="" id="" textValue="No pattern">
                        <span className="text-gray-400">No pattern</span>
                      </ListBox.Item>
                      {patterns.map((p) => (
                        <ListBox.Item key={p.id} id={p.id} textValue={p.name}>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {p.name}
                            </span>
                            {p.group && (
                              <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full mt-0.5 self-start">
                                {p.group}
                              </span>
                            )}
                          </div>
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  )}
                </Select.Popover>
              </Select>
              {selectedPattern && (
                <p className="text-xs text-blue-600 mt-1">
                  <strong>{selectedPattern.name}</strong>
                  {selectedPattern.description && (
                    <> — {selectedPattern.description}</>
                  )}
                  {selectedPattern.slots.length > 0 && (
                    <>
                      {" "}
                      ({selectedPattern.slots.length} slot
                      {selectedPattern.slots.length !== 1 ? "s" : ""})
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Association Selector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">
                  Association Override
                </label>
                {selectedPattern && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAssocName("");
                      setQuickAssocDescription("");
                      setQuickAssocSlotValues(
                        (selectedPattern?.slots || []).map((s) => ({
                          slotId: s.id,
                          value: s.defaultValue || "",
                        })),
                      );
                      setShowQuickAddAssociation(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                    title="Quick-add a new association"
                  >
                    <Plus size={12} /> Add
                  </button>
                )}
              </div>
              <Select
                aria-label="Select association"
                value={selectedAssociationId ?? ""}
                placeholder={
                  associationSelectLoading
                    ? "Loading associations..."
                    : !selectedPattern
                      ? "Select a pattern first"
                      : associations.length === 0
                        ? "No associations"
                        : "Pattern defaults"
                }
                isDisabled={associationSelectLoading || !selectedPattern}
                onChange={(val: unknown) => {
                  const id = String(val);
                  selectAssociation(id);
                }}
              >
                <Select.Trigger className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  {associationSelectLoading ? (
                    <ListBox key="loading">
                      <ListBox.Item
                        key="loading-item"
                        id="loading"
                        textValue="Loading..."
                        className="text-default-400 italic"
                      >
                        Loading associations...
                      </ListBox.Item>
                    </ListBox>
                  ) : !selectedPattern ? (
                    <ListBox key="no-pattern">
                      <ListBox.Item
                        key="no-pattern-item"
                        id=""
                        textValue="Select a pattern first"
                        className="text-default-400 italic"
                      >
                        Select a pattern first
                      </ListBox.Item>
                    </ListBox>
                  ) : associations.length === 0 ? (
                    <ListBox key="empty">
                      <ListBox.Item
                        key="empty-item"
                        id=""
                        textValue="No associations"
                        className="text-default-400 italic"
                      >
                        No associations for this pattern
                      </ListBox.Item>
                    </ListBox>
                  ) : (
                    <ListBox key="ready">
                      <ListBox.Item key="" id="" textValue="Pattern defaults">
                        <span className="text-gray-400">Pattern defaults</span>
                      </ListBox.Item>
                      {associations.map((a) => (
                        <ListBox.Item key={a.id} id={a.id} textValue={a.name}>
                          <div className="flex flex-col">
                            <span className="text-sm">{a.name}</span>
                            {a.description && (
                              <span className="text-xs text-gray-400 truncate max-w-[200px]">
                                {a.description}
                              </span>
                            )}
                          </div>
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  )}
                </Select.Popover>
              </Select>
              {selectedAssociation && (
                <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-100/60 px-2.5 py-1.5 rounded-md">
                  <Link2 size={12} className="shrink-0" />
                  <span>
                    <strong>{selectedAssociation.name}</strong> —{" "}
                    {selectedAssociation.slotValues.length} slot value
                    {selectedAssociation.slotValues.length !== 1
                      ? "s"
                      : ""}{" "}
                    will override pattern defaults
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Reusable Config Panel (thought definition + steps) ──── */}
        <BKThoughtConfigPanel
          thoughtName={thoughtName}
          onThoughtNameChange={setThoughtName}
          thoughtDescription={thoughtDescription}
          onThoughtDescriptionChange={setThoughtDescription}
          thoughtContent={thoughtContent}
          onThoughtContentChange={setThoughtContent}
          steps={panelSteps}
          onAddStep={addStep}
          onRemoveStep={removeStep}
          onUpdateStep={handleUpdateStep}
          renderStepActions={renderAnonStepActions}
          renderBelowStepHeader={renderStepIdeasBelowHeader}
          renderStepsHeaderActions={renderGenerateStepsButton()}
        />

        {/* ── Thinker Selector ────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Thinker Persona (optional)
            </h3>
          </div>

          <Select
            aria-label="Select thinker"
            placeholder={
              thinkersLoading
                ? "Loading thinkers..."
                : thinkers.length === 0
                  ? "No thinkers"
                  : "No persona (default)"
            }
            className="max-w-[320px]"
            isDisabled={thinkersLoading}
            onChange={(val: unknown) => {
              const id = String(val);
              selectThinker(id);
            }}
          >
            <Select.Trigger className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
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
              ) : (
                <ListBox key="ready">
                  <ListBox.Item key="" id="" textValue="No persona (default)">
                    <span className="text-gray-400">No persona (default)</span>
                  </ListBox.Item>
                  {thinkers.map((t) => (
                    <ListBox.Item key={t.id} id={t.id} textValue={t.name}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{t.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                            {t.role.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          {t.specialization && (
                            <span className="text-xs text-gray-400 truncate max-w-[160px]">
                              {t.specialization}
                            </span>
                          )}
                        </div>
                      </div>
                    </ListBox.Item>
                  ))}
                </ListBox>
              )}
            </Select.Popover>
          </Select>

          {selectedThinker && (
            <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-100/60 px-2.5 py-1.5 rounded-md">
              <Brain size={12} className="shrink-0" />
              <span>
                <strong>{selectedThinker.name}</strong>
                {selectedThinker.role && (
                  <span>
                    {" "}
                    — {selectedThinker.role.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                )}
              </span>
            </div>
          )}
        </section>

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onPress={() => startThinking(aiConfig)}
            isDisabled={!isReadyToThink || isThinking}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 text-sm font-medium"
          >
            <Sparkles size={16} />
            Start Thinking
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onPress={resetSession}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <X size={14} /> Reset
          </Button>
        </div>

        {/* ── Error ───────────────────────────────────────────────── */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ── Generative AI Step Producer ─────────────────────────── */}
        <BKGenerateStepsModal
          isOpen={showGenerateSteps}
          onClose={() => setShowGenerateSteps(false)}
          thoughtName={thoughtName}
          thoughtDescription={thoughtDescription}
          thoughtContent={thoughtContent}
          existingSteps={steps
            .filter((s) => s.name.trim() || s.thought.trim())
            .map((s) => ({ name: s.name, thought: s.thought }))}
          aiConfig={aiConfig}
          onGenerated={anonHandleGeneratedSteps}
        />

        {/* ── Quick-Add Association Modal ─────────────────────────── */}
        {showQuickAddAssociation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Quick-Add Association
                </h3>
                <button
                  onClick={() => setShowQuickAddAssociation(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Create a new association override for{" "}
                <strong>{selectedPattern?.name}</strong>.
                {selectedPattern?.slots && selectedPattern.slots.length > 0 && (
                  <> Fill in slot values below, or leave blank to use defaults.</>
                )}
              </p>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={quickAssocName}
                    onChange={(e) => setQuickAssocName(e.target.value)}
                    placeholder="e.g. My Custom Override"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Description
                  </label>
                  <textarea
                    value={quickAssocDescription}
                    onChange={(e) => setQuickAssocDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {selectedPattern?.slots && selectedPattern.slots.length > 0 && (
                  <div className="space-y-2.5 pt-1 border-t border-gray-100">
                    <label className="text-xs font-medium text-gray-600 block">
                      Slot Values
                    </label>
                    {selectedPattern.slots.map((slot) => {
                      const slotValue = quickAssocSlotValues.find(
                        (sv) => sv.slotId === slot.id,
                      );
                      return (
                        <div key={slot.id}>
                          <label className="text-[11px] text-gray-500 mb-0.5 block">
                            {slot.label || slot.name}
                            {slot.required && (
                              <span className="text-red-500 ml-0.5">*</span>
                            )}
                            {slot.type !== "text" && (
                              <span className="text-gray-400 ml-1">
                                ({slot.type})
                              </span>
                            )}
                          </label>
                          {slot.type === "textarea" || slot.type === "editor" ? (
                            <textarea
                              value={slotValue?.value || ""}
                              onChange={(e) => {
                                setQuickAssocSlotValues((prev) => {
                                  const idx = prev.findIndex(
                                    (sv) => sv.slotId === slot.id,
                                  );
                                  if (idx >= 0) {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      value: e.target.value,
                                    };
                                    return next;
                                  }
                                  return [
                                    ...prev,
                                    { slotId: slot.id, value: e.target.value },
                                  ];
                                });
                              }}
                              placeholder={slot.defaultValue || `Enter ${slot.label || slot.name}...`}
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y font-mono"
                            />
                          ) : (
                            <input
                              type="text"
                              value={slotValue?.value || ""}
                              onChange={(e) => {
                                setQuickAssocSlotValues((prev) => {
                                  const idx = prev.findIndex(
                                    (sv) => sv.slotId === slot.id,
                                  );
                                  if (idx >= 0) {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      value: e.target.value,
                                    };
                                    return next;
                                  }
                                  return [
                                    ...prev,
                                    { slotId: slot.id, value: e.target.value },
                                  ];
                                });
                              }}
                              placeholder={slot.defaultValue || `Enter ${slot.label || slot.name}...`}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowQuickAddAssociation(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!quickAssocName.trim()) return;
                    setQuickAssocSaving(true);
                    try {
                      const created = await createQuickAssociation(
                        quickAssocName.trim(),
                        quickAssocDescription.trim() || undefined,
                        quickAssocSlotValues,
                      );
                      if (created) {
                        setShowQuickAddAssociation(false);
                        setQuickAssocName("");
                        setQuickAssocDescription("");
                        setQuickAssocSlotValues([]);
                      }
                    } finally {
                      setQuickAssocSaving(false);
                    }
                  }}
                  disabled={!quickAssocName.trim() || quickAssocSaving}
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {quickAssocSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Create
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Results phase UI (thinking in progress or completed) ──────────
  return (
    <>
      <Toast.Provider />
      <div className="bk-think-studio space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-purple-500" />
              <h2 className="text-xl font-semibold text-gray-900">
                {thoughtName || "Anonymous Think"}
              </h2>
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                Anonymous
              </span>
            </div>
            {selectedThinker && (
              <p className="text-sm text-gray-500 mt-1">
                Thinker: {selectedThinker.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {/* Start / Rethink */}
          <Button
            onPress={() => startThinking(aiConfig)}
            isDisabled={isThinking}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {isThinking ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <RotateCcw size={16} /> Rethink All
              </>
            )}
          </Button>

          {/* History */}
          {hasThinkingStarted && (
            <Button
              variant="ghost"
              size="sm"
              isDisabled={isThinking}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1.5"
              onPress={() => setShowHistory(true)}
            >
              <MessageSquareText size={16} /> History
            </Button>
          )}

          {/* Export */}
          {hasThinkingStarted && !isThinking && (
            <Dropdown>
              <Dropdown.Trigger
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
              >
                <Download size={16} /> Export <ChevronDown size={14} />
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu
                  aria-label="Export options"
                  onAction={handleExportAction}
                >
                  <Dropdown.Item id="json">
                    <div className="flex items-center gap-2">
                      <FileJson size={16} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          Export as JSON
                        </span>
                        <span className="text-xs text-gray-400">
                          Download .json file
                        </span>
                      </div>
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item id="view">
                    <div className="flex items-center gap-2">
                      <Eye size={16} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          View as HTML
                        </span>
                        <span className="text-xs text-gray-400">
                          Open in new browser tab
                        </span>
                      </div>
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item id="download">
                    <div className="flex items-center gap-2">
                      <Download size={16} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          Download as HTML
                        </span>
                        <span className="text-xs text-gray-400">
                          Save as .html file
                        </span>
                      </div>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}

          {/* Save */}
          {hasThinkingStarted && !isThinking && (
            <Button
              onPress={handleSave}
              isDisabled={isSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save
                </>
              )}
            </Button>
          )}

          {/* Edit Setup */}
          {hasThinkingStarted && !isThinking && (
            <Button
              variant="ghost"
              size="sm"
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                isEditing
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-600 text-white hover:bg-gray-700"
              }`}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Pencil size={16} /> {isEditing ? "Done Editing" : "Edit Setup"}
            </Button>
          )}

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            isDisabled={isThinking}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1.5"
            onPress={() => setShowSettings(true)}
          >
            <Settings2 size={16} /> Settings
          </Button>

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            isDisabled={isThinking}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1.5"
            onPress={resetSession}
          >
            <X size={16} /> New Session
          </Button>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ── Inline Editor (when editing) ──────────────────────────────── */}
      {isEditing && !isThinking && (
        <div className="space-y-6 border-2 border-purple-200 rounded-xl p-5 bg-purple-50/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
              Edit Thought & Steps
            </h3>
            <span className="text-[10px] text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full">
              Changes apply on next think run
            </span>
          </div>

          <BKThoughtConfigPanel
            thoughtName={thoughtName}
            onThoughtNameChange={setThoughtName}
            thoughtDescription={thoughtDescription}
            onThoughtDescriptionChange={setThoughtDescription}
            thoughtContent={thoughtContent}
            onThoughtContentChange={setThoughtContent}
            steps={panelSteps}
            onAddStep={addStep}
            onRemoveStep={removeStep}
            onUpdateStep={handleUpdateStep}
            renderStepActions={renderAnonStepActions}
            renderStepsHeaderActions={renderGenerateStepsButton()}
          />

          <p className="text-xs text-purple-500 italic">
            Click <strong>&ldquo;Rethink All&rdquo;</strong> above to run the
            thinking process with your updated values.
          </p>
        </div>
      )}

      {/* ── Train of Thoughts — Tab Navigation ──────────────────────── */}
      {trainOfThoughts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Train of Thoughts
          </h3>
          <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-1.5">
            {trainOfThoughts.map((step, index) => {
              const isCompleted = conversation.length > index * 2 + 1;
              const isProcessing = isThinking && index === currentStepIndex;
              const isActive = index === activeStepIndex;

              return (
                <Button
                  key={step.id}
                  onPress={() => {
                    if (isCompleted) {
                      setActiveStepIndex(index);
                      if (isThinking) {
                        isTabPinnedRef.current = true;
                      }
                    }
                  }}
                  isDisabled={isThinking && !isCompleted}
                  className={`flex items-center gap-1.5 px-3 rounded-lg py-2 text-xs font-medium rounded-t-lg transition-all min-w-0 h-auto bg-transparent data-[hover=true]:bg-transparent ${
                    isActive
                      ? "border-blue-500 text-blue-700 bg-blue-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {isProcessing ? (
                    <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : isCompleted ? (
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
        </div>
      )}

      {/* ── Progress Indicator ──────────────────────────────────────── */}
      {isThinking && currentStepIndex >= 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-blue-700">
              Processing step {currentStepIndex + 1} of {trainOfThoughts.length}
              : {trainOfThoughts[currentStepIndex]?.name}
            </span>
          </div>
        </div>
      )}

      {/* ── Active Step Panel ────────────────────────────────────────── */}
      {completedSteps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Step Details</h3>
            <Button
              variant="ghost"
              size="sm"
              isDisabled={isThinking}
              onPress={() => rethinkFromStep(activeStepIndex, aiConfig)}
            >
              <RotateCcw size={14} /> Rethink
            </Button>
          </div>
          <div>
            {completedSteps
              .filter((entry) => entry.index === activeStepIndex)
              .map((entry) => (
                <BKStepPanel
                  key={entry.step.id}
                  step={entry.step}
                  index={entry.index}
                  userMessage={entry.userMessage}
                  assistantMessage={entry.assistantMessage}
                  craftFormat={entry.resolvedCraftFormat}
                />
              ))}
          </div>
        </div>
      )}

      {/* ── Placeholder ──────────────────────────────────────────────── */}
      {trainOfThoughts.length > 0 && completedSteps.length === 0 && (
        <div className="p-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
          <p className="text-sm text-gray-400">Processing your request...</p>
        </div>
      )}

      {/* ── Processed Output ─────────────────────────────────────────── */}
      {result && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowProcessedOutput(!showProcessedOutput)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              Processed Output ({craftFormat})
            </span>
            <div className="flex items-center gap-2">
              {/* View / Raw toggle — only when craft is enabled and not markdown */}
              {craftFormat !== "markdown" && result && (
                <div
                  role="group"
                  className="inline-flex items-center rounded-lg border border-gray-200 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewMode("view");
                    }}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      viewMode === "view"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewMode("raw");
                    }}
                    className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-200 ${
                      viewMode === "raw"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Raw
                  </button>
                </div>
              )}
              {showProcessedOutput ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </div>
          </button>
          {showProcessedOutput && (
            <div className="p-4 bg-white border-t border-gray-200">
              {viewMode === "view" && !BKCRAFT_TO_RENDER_FORMAT[craftFormat] ? (
                /* ── View mode: craft-only formats (no RenderView equivalent) ── */
                (() => {
                  const displayContent = rawResult || result;
                  const processed = BKCraftEngine.process(displayContent, craftFormat);
                  switch (craftFormat) {
                    case "imageList":
                      return (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: processed.parsed }}
                        />
                      );
                    case "architecture":
                      return (
                        <div
                          className="border border-gray-200 rounded-lg overflow-hidden"
                          style={{ minHeight: 420 }}
                        >
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300 text-xs">
                            <span>ARCHITECTURE.md</span>
                            <span className="text-gray-500">Markdown</span>
                          </div>
                          <Editor
                            height="380px"
                            defaultLanguage="markdown"
                            value={displayContent}
                            theme="vs-dark"
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              lineNumbers: "on",
                              scrollBeyondLastLine: false,
                              wordWrap: "on",
                              tabSize: 2,
                            }}
                          />
                        </div>
                      );
                    case "agentSwarm":
                      return (
                        <div
                          className="border border-gray-200 rounded-lg overflow-hidden"
                          style={{ minHeight: 420 }}
                        >
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300 text-xs">
                            <span>AGENT.md</span>
                            <span className="text-gray-500">Markdown</span>
                          </div>
                          <Editor
                            height="380px"
                            defaultLanguage="markdown"
                            value={displayContent}
                            theme="vs-dark"
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              lineNumbers: "on",
                              scrollBeyondLastLine: false,
                              wordWrap: "on",
                              tabSize: 2,
                            }}
                          />
                        </div>
                      );
                    case "docker":
                      return (
                        <div
                          className="border border-gray-200 rounded-lg overflow-hidden"
                          style={{ minHeight: 420 }}
                        >
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300 text-xs">
                            <span>docker-compose.yaml</span>
                            <span className="text-gray-500">YAML</span>
                          </div>
                          <Editor
                            height="380px"
                            defaultLanguage="yaml"
                            value={displayContent}
                            theme="vs-dark"
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              lineNumbers: "on",
                              scrollBeyondLastLine: false,
                              wordWrap: "on",
                              tabSize: 2,
                            }}
                          />
                        </div>
                      );
                    default:
                      return (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: processed.parsed }}
                        />
                      );
                  }
                })()
              ) : (
                viewMode === "raw" ? (
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
                      {rawResult || result}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="min-h-[120px]">
                    <RenderView
                      format={BKCRAFT_TO_RENDER_FORMAT[craftFormat] ?? "markdown"}
                      content={rawResult || result}
                    />
                  </div>
                )
              )}
            </div>
          )}
        </div>
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Full Conversation History
                </h3>
                <p className="text-sm text-gray-500">
                  {conversation.length} messages across {completedSteps.length}{" "}
                  step(s)
                </p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

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

      {/* ── Generative AI Step Producer ───────────────────────────── */}
      <BKGenerateStepsModal
        isOpen={showGenerateSteps}
        onClose={() => setShowGenerateSteps(false)}
        thoughtName={thoughtName}
        thoughtDescription={thoughtDescription}
        thoughtContent={thoughtContent}
        existingSteps={steps
          .filter((s) => s.name.trim() || s.thought.trim())
          .map((s) => ({ name: s.name, thought: s.thought }))}
        aiConfig={aiConfig}
        onGenerated={anonHandleGeneratedSteps}
      />

      {/* ── Settings Modal ────────────────────────────────────────── */}
      {showSettings && (
        <BKThinkStudioSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          thoughtPatternId={
            selectedThought?.patternId ?? selectedPattern?.id
          }
          associations={associations}
          selectedAssociationId={selectedAssociationId}
          selectedAssociation={selectedAssociation}
          associationSelectLoading={associationSelectLoading}
          onAssociationChange={(val: unknown) => {
            const id = String(val);
            selectAssociation(id);
          }}
          associationOverrideEnabled={associationOverrideEnabled}
          onAssociationOverrideEnabledChange={
            onAssociationOverrideEnabledChange
          }
          associationOverridePersistence={associationOverridePersistence}
          onAssociationOverridePersistenceChange={
            onAssociationOverridePersistenceChange
          }
          associationOverrideSlotValues={associationOverrideSlotValues}
          onAssociationOverrideSlotValuesChange={
            onAssociationOverrideSlotValuesChange
          }
          onSavePersistentAssociation={savePersistentAssociation}
          associationSaving={associationSaving}
          thinkers={thinkers}
          thinkersLoading={thinkersLoading}
          selectedThinkerId={selectedThinker?.id}
          selectedThinker={selectedThinker}
          onThinkerChange={(val: unknown) => {
            const id = String(val);
            selectThinker(id);
          }}
          onClearLastThought={() => {
            if (selectedThought?.id) {
              try {
                localStorage.removeItem(
                  `bunny-last-think-${selectedThought.id}`,
                );
                toast.success("Last thought cleared");
              } catch {
                // localStorage may not be available
              }
            }
          }}
        />
      )}

      {/* ── Download HTML rename dialog ───────────────────────── */}
      <BKConfirmDialog
        isOpen={showDownloadConfirm}
        title="Download as HTML"
        message="Choose the file name to save this conversation as an HTML document before downloading."
        confirmLabel="Download"
        cancelLabel="Cancel"
        showInput
        inputLabel="File name"
        inputPlaceholder="e.g. my-thought-export"
        inputValue={downloadFileName}
        onInputChange={setDownloadFileName}
        confirmDisabled={!downloadFileName.trim()}
        onConfirm={handleHtmlDownload}
        onClose={() => setShowDownloadConfirm(false)}
      />
    </div>
    </>
  );
}
