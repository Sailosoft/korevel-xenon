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
import type { RenderFormat } from "@/src/modules/render/src/RenderModule.Types";
import Editor from "@monaco-editor/react";
import { Button, Select, ListBox, toast } from "@heroui/react";
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
} from "lucide-react";
import { useAnonymousMode } from "./BKThinkStudioAnonHooks";
import type { BKThinkStudioAnonStep } from "./BKThinkStudioAnonHooks";
import type { HelixAIOption } from "@/src/modules/helix";
import { BKCraftEngine } from "../craft/BKCraft.Engine";
import type { BKCraftFormat, BKCraftConfig } from "../craft/BKCraft.Types";
import MermaidRenderer from "../components/MermaidRenderer";
import BKThinkStudioSettingsModal from "./BKThinkStudioSettingsModal";
import BKThoughtConfigPanel from "../thoughts/BKThoughtConfigPanel";

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKThinkStudioAnonProps {
  aiConfig: HelixAIOption;
}

// ─── Map BKCraftFormat → RenderFormat for common formats ───────────────
const BKCRAFT_TO_RENDER_FORMAT: Partial<Record<BKCraftFormat, RenderFormat>> = {
  markdown: "markdown",
  html: "html",
  tailwind: "tailwind",
  csv: "csv",
  json: "json",
  mermaid: "mermaid",
  plain: "plain",
};

function renderCraftContent(
  content: string,
  craftFormat: BKCraftFormat,
  viewMode: "view" | "raw",
) {
  // Raw mode: render through ReactMarkdown
  if (viewMode === "raw") {
    return (
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
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // View mode: use RenderView for common formats, fallback for craft-only formats
  const renderFormat = BKCRAFT_TO_RENDER_FORMAT[craftFormat];
  if (renderFormat) {
    return (
      <div className="min-h-[120px]">
        <RenderView format={renderFormat} content={content} />
      </div>
    );
  }

  // View mode for craft-only formats — use the Craft Engine + existing renderers
  const processed = BKCraftEngine.process(content, craftFormat);

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
            value={content}
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
            value={content}
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
            value={content}
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
}

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
              <ReactMarkdown>{step.thought}</ReactMarkdown>
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
            {renderCraftContent(assistantMessage.content, craftFormat, viewMode)}
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

    // Actions
    loadExistingThought,
    selectPattern,
    selectThinker,
    selectAssociation,
    addStep,
    removeStep,
    updateStep,
    startThinking,
    rethinkFromStep,
    exportAsJson,
    saveAsThought,
    resetSession,
  } = anon;

  // ── Modal state ────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
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
              <label className="text-xs font-medium text-gray-600">
                Association Override
              </label>
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
      </div>
    );
  }

  // ── Results phase UI (thinking in progress or completed) ──────────
  return (
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
            <Button
              onPress={exportAsJson}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
            >
              <Download size={16} /> Export
            </Button>
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

      {/* ── Settings Modal ────────────────────────────────────────── */}
      {showSettings && (
        <BKThinkStudioSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          thoughtPatternId={selectedThought?.patternId}
          associations={associations}
          selectedAssociationId={selectedAssociationId}
          selectedAssociation={selectedAssociation}
          associationSelectLoading={associationSelectLoading}
          onAssociationChange={(val: unknown) => {
            const id = String(val);
            selectAssociation(id);
          }}
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
    </div>
  );
}
