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
import { Button, Select, ListBox } from "@heroui/react";
import {
  ArrowLeft,
  Brain,
  Plus,
  Trash2,
  RotateCcw,
  MessageSquareText,
  Download,
  Save,
  X,
  Settings2,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  GripVertical,
  List,
  Pencil,
  Link2,
  GitBranch,
} from "lucide-react";
import { useAnonymousMode } from "./BKThinkStudioAnonHooks";
import type { BKThinkStudioAnonStep } from "./BKThinkStudioAnonHooks";
import type { HelixAIOption } from "@/src/modules/helix";
import { BKCraftEngine } from "../craft/BKCraft.Engine";
import type { BKCraftFormat } from "../craft/BKCraft.Types";
import Mermaid from "react-mermaid";
import BKThinkStudioSettingsModal from "./BKThinkStudioSettingsModal";

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKThinkStudioAnonProps {
  aiConfig: HelixAIOption;
}

// ─── Step Panel Component ────────────────────────────────────────────────

function renderCraftContent(
  content: string,
  craftFormat: BKCraftFormat,
  viewMode: "view" | "raw",
) {
  // Raw mode OR markdown: always render through ReactMarkdown
  if (viewMode === "raw" || craftFormat === "markdown") {
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

  // View mode for non-markdown formats — use the Craft Engine
  const processed = BKCraftEngine.process(content, craftFormat);

  switch (craftFormat) {
    case "html":
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: processed.parsed }}
        />
      );
    case "tailwind":
      return (
        <iframe
          srcDoc={`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body>${content}</body></html>`}
          className="w-full border-0 rounded-lg"
          title="Tailwind Preview"
          style={{ minHeight: 400 }}
        />
      );
    case "csv":
      return (
        <div
          className="prose prose-sm max-w-none overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: processed.parsed }}
        />
      );
    case "json":
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: processed.parsed }}
        />
      );
    case "imageList":
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: processed.parsed }}
        />
      );
    case "mermaid":
      return (
        <div className="bg-white p-4 rounded-lg">
          <Mermaid>{content}</Mermaid>
        </div>
      );
    case "plain":
      return (
        <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
          {content}
        </pre>
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
            {/* View / Raw toggle — only for non-markdown formats */}
            {craftFormat !== "markdown" && (
              <div className="ml-auto">
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
              </div>
            )}
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

        {/* ── Thought Editor ──────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Thought Definition
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Thought Name
              </label>
              <input
                type="text"
                value={thoughtName}
                onChange={(e) => setThoughtName(e.target.value)}
                placeholder="e.g. The Nature of Consciousness"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={thoughtDescription}
                onChange={(e) => setThoughtDescription(e.target.value)}
                placeholder="Brief description of this thought"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Thought Content / System Prompt
              </label>
              <textarea
                value={thoughtContent}
                onChange={(e) => setThoughtContent(e.target.value)}
                placeholder="Write the main thought content or system prompt here..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none resize-y font-mono"
              />
            </div>
          </div>
        </section>

        {/* ── Steps Editor ────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Train of Thoughts (Steps)
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onPress={addStep}
              className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1 text-xs"
            >
              <Plus size={14} /> Add Step
            </Button>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Step {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    isDisabled={steps.length <= 1}
                    onPress={() => removeStep(index)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    aria-label={`Remove step ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Step Name
                  </label>
                  <input
                    type="text"
                    value={step.name}
                    onChange={(e) => updateStep(index, "name", e.target.value)}
                    placeholder="e.g. Define the problem"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Step Prompt
                  </label>
                  <textarea
                    value={step.thought}
                    onChange={(e) =>
                      updateStep(index, "thought", e.target.value)
                    }
                    placeholder="Write the prompt for this step..."
                    rows={3}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none resize-y font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

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

          {/* ── Thought Editor ──────────────────────────────────────── */}
          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Brain size={18} className="text-purple-600" />
              <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Thought Definition
              </h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Thought Name
                </label>
                <input
                  type="text"
                  value={thoughtName}
                  onChange={(e) => setThoughtName(e.target.value)}
                  placeholder="e.g. The Nature of Consciousness"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={thoughtDescription}
                  onChange={(e) => setThoughtDescription(e.target.value)}
                  placeholder="Brief description of this thought"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Thought Content / System Prompt
                </label>
                <textarea
                  value={thoughtContent}
                  onChange={(e) => setThoughtContent(e.target.value)}
                  placeholder="Write the main thought content or system prompt here..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none resize-y font-mono"
                />
              </div>
            </div>
          </section>

          {/* ── Steps Editor ────────────────────────────────────────── */}
          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-600" />
                <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Train of Thoughts (Steps)
                </h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onPress={addStep}
                className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1 text-xs"
              >
                <Plus size={14} /> Add Step
              </Button>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Step {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      isDisabled={steps.length <= 1}
                      onPress={() => removeStep(index)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      aria-label={`Remove step ${index + 1}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">
                      Step Name
                    </label>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) =>
                        updateStep(index, "name", e.target.value)
                      }
                      placeholder="e.g. Define the problem"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">
                      Step Prompt
                    </label>
                    <textarea
                      value={step.thought}
                      onChange={(e) =>
                        updateStep(index, "thought", e.target.value)
                      }
                      placeholder="Write the prompt for this step..."
                      rows={3}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none resize-y font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

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
                  craftFormat={craftFormat}
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
              {viewMode === "view" && craftFormat !== "markdown" ? (
                /* ── View mode: format-specific rendering ── */
                (() => {
                  const displayContent = rawResult || result;
                  switch (craftFormat) {
                    case "html":
                      return (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: displayContent }}
                        />
                      );
                    case "tailwind":
                      return (
                        <iframe
                          srcDoc={`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body>${displayContent}</body></html>`}
                          className="w-full border-0 rounded-lg"
                          title="Tailwind Preview"
                          style={{ minHeight: 400 }}
                        />
                      );
                    case "csv":
                      return (
                        <div
                          className="prose prose-sm max-w-none overflow-x-auto"
                          dangerouslySetInnerHTML={{ __html: result }}
                        />
                      );
                    case "json":
                      return (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: result }}
                        />
                      );
                    case "imageList":
                      return (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: result }}
                        />
                      );
                    case "mermaid":
                      return (
                        <div className="bg-white p-4 rounded-lg">
                          <Mermaid>{displayContent}</Mermaid>
                        </div>
                      );
                    case "plain":
                      return (
                        <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
                          {displayContent}
                        </pre>
                      );
                    default:
                      return (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: result }}
                        />
                      );
                  }
                })()
              ) : (
                /* ── Raw mode OR markdown: show raw content via ReactMarkdown ── */
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
        />
      )}
    </div>
  );
}
