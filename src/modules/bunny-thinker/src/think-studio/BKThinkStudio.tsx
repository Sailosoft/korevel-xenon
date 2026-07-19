"use client";

// BKThinkStudio.tsx
//
// Think Studio — the main workspace module where users:
// - Configure thoughts with thought patterns and associations
// - Run the thinking process via OpenAI conversation
// - Review, rethink, and consolidate conversations
// - Generate and export memory

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { v7 as uuidv7 } from "uuid";
import ReactMarkdown from "react-markdown";
import RenderView from "@/src/modules/render/src/components/RenderModule.View";
import type { RenderFormat } from "@/src/modules/render/src/RenderModule.Types";
import Editor from "@monaco-editor/react";
import MermaidRenderer from "../components/MermaidRenderer";
import {
  Button,
  Select,
  ListBox,
  Toast,
  toast,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import {
  ArrowLeft,
  RotateCcw,
  MessageSquareText,
  X,
  ChevronDown,
  ChevronRight,
  Info,
  List,
  Settings2,
} from "lucide-react";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import { BKCraftEngine } from "../craft/BKCraft.Engine";
import { executeThinkChatAction } from "../think/BKThink.Actions";
import type { BKThinkMessage } from "../think/BKThink.Actions";
import type { BKThink } from "../think/BKThink.Types";
import type { BKThought, BKTrainOfThought } from "../thoughts/BKThoughts.Types";
import type { BKConversationMessage } from "../thoughts/BKThoughts.Types";
import type { BKThinker } from "../thinker/BKThinker.Types";
import type { BKCraftFormat, BKCraftConfig } from "../craft/BKCraft.Types";
import type {
  BKThoughtAssociation,
  BKAssociationSlotValue,
} from "../thought-association/BKThoughtAssociation.Types";
import type { BKThoughtPattern } from "../thought-pattern/BKThoughtPattern.Types";
import { useAISettings } from "../ai-settings/BKAISettings.Context";
import BKThinkMetaModal from "./BKThinkMetaModal";
import BKThinkStudioSettingsModal from "./BKThinkStudioSettingsModal";
import BKThinkStudioAnon from "./BKThinkStudioAnon";
import {
  bkViewAsHtml,
  bkDownloadHtml,
} from "@/src/modules/bunny-thinker/src/memory/BKMemory.Export";
import type { BKMemoryNeuron, BKMemory } from "@/src/modules/bunny-thinker/src/memory/BKMemory.Types";

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKThinkStudioProps {
  thinkId?: string; // Load existing think; when omitted, runs in anonymous mode
}

// ─── Step Panel Component ────────────────────────────────────────────────

/**
 * Resolve a BKCraftFormat to a storage-friendly format string.
 * If the craft format maps to a known RenderFormat, use it.
 * Otherwise fall back to "markdown" so craft-only formats
 * (architecture, agentSwarm, docker, imageList) don't get
 * stored as unrecognized formats.
 */
function resolveMemoryFormat(craftFormat: BKCraftFormat): string {
  const renderFormat = BKCRAFT_TO_RENDER_FORMAT[craftFormat];
  return renderFormat ?? "markdown";
}

/** Resolve a BKCraftFormat to a RenderFormat for export functions. */
function resolveRenderFormat(craftFormat: string): RenderFormat {
  return BKCRAFT_TO_RENDER_FORMAT[craftFormat as BKCraftFormat] ?? "markdown";
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
  step: BKTrainOfThought;
  index: number;
  userMessage?: BKConversationMessage;
  assistantMessage?: BKConversationMessage;
  craftFormat: BKCraftFormat;
}) {
  const [viewMode, setViewMode] = useState<"view" | "raw">("view");

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
            {/* View / Raw toggle — available for all except plain markdown */}
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

// ─── Main Component ───────────────────────────────────────────────────────

export default function BKThinkStudio({ thinkId }: BKThinkStudioProps) {
  const router = useRouter();
  const { aiConfig } = useAISettings();

  // ── Anonymous mode: delegate to BKThinkStudioAnon ─────────────────
  if (!thinkId) {
    return <BKThinkStudioAnon aiConfig={aiConfig} />;
  }

  const [think, setThink] = useState<BKThink | null>(null);
  const [thought, setThought] = useState<BKThought | null>(null);
  const [trainOfThoughts, setTrainOfThoughts] = useState<BKTrainOfThought[]>(
    [],
  );
  const [thinker, setThinker] = useState<BKThinker | null>(null);
  const [thinkers, setThinkers] = useState<BKThinker[]>([]);
  const [thinkersLoading, setThinkersLoading] = useState(false);
  const [conversation, setConversation] = useState<BKConversationMessage[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isThinking, setIsThinking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [craftFormat, setCraftFormat] = useState<BKCraftFormat>("markdown");
  const [result, setResult] = useState<string>("");
  const [rawResult, setRawResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showProcessedOutput, setShowProcessedOutput] = useState(false);
  const [viewMode, setViewMode] = useState<"view" | "raw">("view");
  const [craftConfigs, setCraftConfigs] = useState<BKCraftConfig[]>([]);

  // ── Association Select State ──────────────────────────────────────────
  const [associations, setAssociations] = useState<BKThoughtAssociation[]>([]);
  const [selectedAssociationId, setSelectedAssociationId] = useState<
    string | undefined
  >();
  const [selectedAssociation, setSelectedAssociation] =
    useState<BKThoughtAssociation | null>(null);
  const [associationSelectLoading, setAssociationSelectLoading] =
    useState(false);

  // Ref to track manual tab pinning — when the user clicks a tab during thinking,
  // auto-switch to the current processing step is suppressed so they can read
  // another completed train of thought while generation continues.
  const isTabPinnedRef = useRef(false);

  // ── Ref for last resolved craft format ────────────────────────────
  // Tracks the actual per-step format used in the last step of bkStartThink,
  // so bkGenerateMemory saves the correct format on the memory entity.
  const lastResolvedFormatRef = useRef<BKCraftFormat>("markdown");

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
      console.error("[BKThinkStudio] Failed to load thinkers:", err);
    } finally {
      setThinkersLoading(false);
    }
  }, []);

  useEffect(() => {
    bkLoadThinkers();
  }, [bkLoadThinkers]);

  // ── Thinker selection handler ───────────────────────────────────────

  const handleThinkerChange = useCallback(async (val: unknown) => {
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
      console.error("[BKThinkStudio] Failed to load selected thinker:", err);
    }
  }, []);

  // ── Load existing think ──────────────────────────────────────────────

  useEffect(() => {
    if (thinkId) {
      loadThink(thinkId);
    }
  }, [thinkId]);

  const loadThink = async (id: string) => {
    const result = await bkThinkerDB.thinksRepo.get(id);
    if (result.isSuccess) {
      const loadedThink = result.value;
      setThink(loadedThink);
      setConversation(loadedThink.thinkConversation);

      // Load associated thought
      const thoughtResult = await bkThinkerDB.thoughtsRepo.get(
        loadedThink.thoughtId,
      );
      if (thoughtResult.isSuccess) {
        setThought(thoughtResult.value);
        // Load associations for this thought's pattern
        if (thoughtResult.value.patternId) {
          loadAssociations(thoughtResult.value.patternId);
        }
      }

      // Load train of thoughts for this thought
      const allTrains = await bkThinkerDB.trainOfThoughtsRepo.query.getAll({
        page: 0,
        pageSize: 100,
        filters: [],
      });
      const filteredTrains = allTrains.data
        .filter((t: BKTrainOfThought) => t.thoughtId === loadedThink.thoughtId)
        .sort((a: BKTrainOfThought, b: BKTrainOfThought) => a.order - b.order);
      setTrainOfThoughts(filteredTrains);

      // Load craft configs for per-step craft format resolution
      const allCraftConfigs = await bkThinkerDB.craftConfigs
        .toArray() as BKCraftConfig[];
      setCraftConfigs(allCraftConfigs);

      // If think has a saved association, pre-select it
      if (loadedThink.thoughtAssociationId) {
        setSelectedAssociationId(loadedThink.thoughtAssociationId);
        const assocResult = await bkThinkerDB.thoughtAssociationsRepo.get(
          loadedThink.thoughtAssociationId,
        );
        if (assocResult.isSuccess) {
          setSelectedAssociation(assocResult.value);
        }
      }
    }
  };

  // ── Load associations for the thought's pattern ─────────────────────

  const loadAssociations = useCallback(async (patternId: string) => {
    setAssociationSelectLoading(true);
    try {
      const items =
        await bkThinkerDB.thoughtAssociationsRepo.getByPatternId(patternId);
      setAssociations(items);
    } catch (err) {
      console.error("[BKThinkStudio] Failed to load associations:", err);
    } finally {
      setAssociationSelectLoading(false);
    }
  }, []);

  // ── Effect: load associations when thought pattern changes ──────────

  useEffect(() => {
    if (thought?.patternId) {
      loadAssociations(thought.patternId);
    } else {
      setAssociations([]);
      setSelectedAssociation(null);
      setSelectedAssociationId(undefined);
    }
  }, [thought?.patternId, loadAssociations]);

  // ── Handle association selection change ─────────────────────────────

  const handleAssociationChange = useCallback(async (val: unknown) => {
    const assocId = String(val);
    setSelectedAssociationId(assocId || undefined);
    if (!assocId) {
      setSelectedAssociation(null);
      return;
    }
    try {
      const result = await bkThinkerDB.thoughtAssociationsRepo.get(assocId);
      if (result.isSuccess) {
        setSelectedAssociation(result.value);
      }
    } catch (err) {
      console.error(
        "[BKThinkStudio] Failed to load selected association:",
        err,
      );
    }
  }, []);

  // ── Run the thinking process ─────────────────────────────────────────

  const bkStartThink = useCallback(async () => {
    if (!think || !thought) return;

    setIsThinking(true);
    setError("");
    setResult("");

    try {
      // Get train of thoughts for this thought
      const allTrains = await bkThinkerDB.trainOfThoughtsRepo.query.getAll({
        page: 0,
        pageSize: 100,
        filters: [],
      });

      const filteredTrains = allTrains.data
        .filter((t: BKTrainOfThought) => t.thoughtId === thought.id)
        .sort((a: BKTrainOfThought, b: BKTrainOfThought) => a.order - b.order);

      setTrainOfThoughts(filteredTrains);
      setCurrentStepIndex(0);
      setActiveStepIndex(0);
      isTabPinnedRef.current = false;

      // Resolve thought association context (computed slot values override pattern defaults).
      // Resolve BEFORE building the system message so the pattern info is baked into the
      // client-side conversation state (visible in the history modal).
      let associationContext: string | undefined;

      // Helper to build context string from a pattern and optional slot overrides
      const bakePatternContext = (
        pattern: BKThoughtPattern,
        slotOverrides?: BKAssociationSlotValue[],
      ): string => {
        const lines: string[] = [];
        lines.push(`Thought Pattern: ${pattern.name}`);
        if (pattern.description) {
          lines.push(pattern.description);
        }
        lines.push("");
        lines.push("Slots:");
        if (pattern.slots.length > 0) {
          for (const slot of pattern.slots) {
            const slotValue = slotOverrides?.find(
              (sv) => sv.slotId === slot.id,
            );
            const resolvedValue = slotValue?.value ?? slot.defaultValue ?? "";
            const label = slot.label || slot.name;
            if (resolvedValue) {
              lines.push(`  - ${label}: ${resolvedValue}`);
            } else {
              lines.push(`  - ${label}: [not set]`);
            }
          }
        } else {
          lines.push("  (no slots defined)");
        }
        return lines.join("\n");
      };

      // Resolve association context — priority: selected association > saved association > pattern defaults
      if (selectedAssociation) {
        // User-selected association from dropdown — slot values override pattern defaults
        const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
          selectedAssociation.patternId,
        );
        if (patternResult.isSuccess) {
          associationContext = bakePatternContext(
            patternResult.value,
            selectedAssociation.slotValues,
          );
        }
      } else if (think.thoughtAssociationId) {
        // Association exists on saved think — use its slot values as overrides
        const assocResult = await bkThinkerDB.thoughtAssociationsRepo.get(
          think.thoughtAssociationId,
        );
        if (assocResult.isSuccess) {
          const assoc: BKThoughtAssociation = assocResult.value;
          const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
            assoc.patternId,
          );
          if (patternResult.isSuccess) {
            associationContext = bakePatternContext(
              patternResult.value,
              assoc.slotValues,
            );
          }
        }
      } else if (thought?.patternId) {
        // No association — fall back to the thought's own pattern with default values
        const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
          thought.patternId,
        );
        if (patternResult.isSuccess) {
          associationContext = bakePatternContext(patternResult.value);
        }
      }

      // Load craft configs to resolve per-step craft formats
      const allCraftConfigs = await bkThinkerDB.craftConfigs
        .toArray() as BKCraftConfig[];
      const craftConfigMap = new Map(
        allCraftConfigs.map((c) => [c.id, c]),
      );

      // Build system context (thought + thinker), appending pattern context if resolved
      let systemContext = [
        `# ${thought.name}`,
        ``,
        thought.thought,
        thinker?.name
          ? `\n---\n**Persona:** ${thinker.name}${thinker.role ? ` (${thinker.role})` : ""}${thinker.description ? `\n${thinker.description}` : ""}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      // Bake pattern context into the system message so it appears in client-side
      // conversation state and is visible in the history modal.
      if (associationContext) {
        systemContext += `\n\n---\n${associationContext}`;
      }

      const initialConversation: BKConversationMessage[] = [
        {
          role: "system",
          content: systemContext,
          timestamp: Date.now(),
        },
      ];
      setConversation(initialConversation);

      // Execute each train of thought step sequentially
      for (let i = 0; i < filteredTrains.length; i++) {
        const step = filteredTrains[i];
        setCurrentStepIndex(i);
        if (!isTabPinnedRef.current) {
          setActiveStepIndex(i);
        }

        // Build full conversation messages from accumulated conversation
        const conversationMessages: BKThinkMessage[] = initialConversation.map(
          (msg) => ({
            role: msg.role === "system" ? "system" : msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          }),
        );

        // Resolve per-step craft format and instruction from BKCraftConfig
        const stepCraftConfig = step.craftId
          ? craftConfigMap.get(step.craftId)
          : null;

        console.log(
          `[BKThinkStudio] Sending conversation to Helix (step ${i + 1}/${filteredTrains.length}):`,
          JSON.stringify(conversationMessages, null, 2),
        );
        const response = await executeThinkChatAction({
          thinkId: think.id,
          thoughtName: thought.name,
          thoughtContent: thought.thought,
          thinkerName: thinker?.name,
          thinkerDescription: thinker?.description,
          thinkerRole: thinker?.role,
          messages: conversationMessages,
          newMessage: {
            name: step.name,
            content: step.thought,
          },
          craftFormat: stepCraftConfig?.format ?? craftFormat,
          craftInstruction: stepCraftConfig?.instruction ?? undefined,
          associationContext,
          aiConfig,
        });

        // Track the resolved format so bkGenerateMemory uses the correct one
        lastResolvedFormatRef.current = stepCraftConfig?.format ?? craftFormat;

        if (!response.success) {
          setError(`Step "${step.name}" failed: ${response.error}`);
          break;
        }

        // Add to conversation
        initialConversation.push({
          role: "user",
          content: step.thought,
          timestamp: Date.now(),
        });
        initialConversation.push({
          role: "assistant",
          content: response.output,
          timestamp: Date.now(),
        });

        setConversation([...initialConversation]);

        // Update think conversation
        if (think) {
          await bkThinkerDB.thinksRepo.update(think.id, {
            ...think,
            thinkConversation: initialConversation,
            status: i === filteredTrains.length - 1 ? "completed" : "thinking",
            updatedAt: Date.now(),
          });
        }
      }

      // Process final output through craft engine — use the last resolved step format
      if (initialConversation.length > 0) {
        const lastMessage = initialConversation[initialConversation.length - 1];
        setRawResult(lastMessage.content);
        const finalFormat = lastResolvedFormatRef.current;
        const processed = BKCraftEngine.process(
          lastMessage.content,
          finalFormat,
        );
        setResult(processed.parsed);
      }

      // ── Store last think ID in localStorage ──────────────────────
      if (think?.id && thought?.id) {
        try {
          localStorage.setItem(
            `bunny-last-think-${thought.id}`,
            think.id,
          );
        } catch {
          // localStorage may not be available
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown thinking error");
    } finally {
      setIsThinking(false);
      setCurrentStepIndex(-1);
    }
  }, [think, thought, thinker, craftFormat, selectedAssociation]);

  // ── Rethink from a specific step ─────────────────────────────────────

  const bkRethinkFromStep = useCallback(
    async (stepIndex: number) => {
      if (!think || !thought) return;

      setIsThinking(true);
      setError("");

      try {
        // Truncate conversation to before the specified step (keep system message at index 0)
        const truncatedConversation = conversation.slice(0, 1 + stepIndex * 2);
        setConversation(truncatedConversation);

        // Resolve thought association context (reuse the same resolution as bkStartThink)
        let associationContext: string | undefined;

        // Helper to build context string from a pattern and optional slot overrides
        const bakePatternContext = (
          pattern: BKThoughtPattern,
          slotOverrides?: BKAssociationSlotValue[],
        ): string => {
          const lines: string[] = [];
          lines.push(`Thought Pattern: ${pattern.name}`);
          if (pattern.description) {
            lines.push(pattern.description);
          }
          lines.push("");
          lines.push("Slots:");
          if (pattern.slots.length > 0) {
            for (const slot of pattern.slots) {
              const slotValue = slotOverrides?.find(
                (sv) => sv.slotId === slot.id,
              );
              const resolvedValue = slotValue?.value ?? slot.defaultValue ?? "";
              const label = slot.label || slot.name;
              if (resolvedValue) {
                lines.push(`  - ${label}: ${resolvedValue}`);
              } else {
                lines.push(`  - ${label}: [not set]`);
              }
            }
          } else {
            lines.push("  (no slots defined)");
          }
          return lines.join("\n");
        };

        // Resolve association context — priority: selected association > saved association > pattern defaults
        if (selectedAssociation) {
          // User-selected association from dropdown — slot values override pattern defaults
          const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
            selectedAssociation.patternId,
          );
          if (patternResult.isSuccess) {
            associationContext = bakePatternContext(
              patternResult.value,
              selectedAssociation.slotValues,
            );
          }
        } else if (think.thoughtAssociationId) {
          // Association exists on saved think — use its slot values as overrides
          const assocResult = await bkThinkerDB.thoughtAssociationsRepo.get(
            think.thoughtAssociationId,
          );
          if (assocResult.isSuccess) {
            const assoc: BKThoughtAssociation = assocResult.value;
            const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
              assoc.patternId,
            );
            if (patternResult.isSuccess) {
              associationContext = bakePatternContext(
                patternResult.value,
                assoc.slotValues,
              );
            }
          }
        } else if (thought?.patternId) {
          // No association — fall back to thought's own pattern with default values
          const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
            thought.patternId,
          );
          if (patternResult.isSuccess) {
            associationContext = bakePatternContext(patternResult.value);
          }
        }

        // Load craft configs to resolve per-step craft formats
        const allCraftConfigs = await bkThinkerDB.craftConfigs
          .toArray() as BKCraftConfig[];
        const rethinkCraftConfigMap = new Map(
          allCraftConfigs.map((c) => [c.id, c]),
        );

        // Resume from this step
        const remainingSteps = trainOfThoughts.slice(stepIndex);

        for (let i = 0; i < remainingSteps.length; i++) {
          const step = remainingSteps[i];
          setCurrentStepIndex(stepIndex + i);
          if (!isTabPinnedRef.current) {
            setActiveStepIndex(stepIndex + i);
          }

          // Build full conversation messages from truncated conversation
          const conversationMessages: BKThinkMessage[] =
            truncatedConversation.map((msg) => ({
              role: msg.role === "system" ? "system" : msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
            }));

          // Resolve per-step craft format and instruction from BKCraftConfig
          const stepCraftConfig = step.craftId
            ? rethinkCraftConfigMap.get(step.craftId)
            : null;

          console.log(
            `[BKThinkStudio] Rethink sending conversation to Helix (step ${stepIndex + i + 1}):`,
            JSON.stringify(conversationMessages, null, 2),
          );
          const response = await executeThinkChatAction({
            thinkId: think.id,
            thoughtName: thought.name,
            thoughtContent: thought.thought,
            thinkerName: thinker?.name,
            thinkerDescription: thinker?.description,
            thinkerRole: thinker?.role,
            messages: conversationMessages,
            newMessage: {
              name: step.name,
              content: step.thought,
            },
            craftFormat: stepCraftConfig?.format ?? craftFormat,
            craftInstruction: stepCraftConfig?.instruction ?? undefined,
            associationContext,
            aiConfig,
          });

          if (!response.success) {
            setError(`Step "${step.name}" failed: ${response.error}`);
            break;
          }

          truncatedConversation.push({
            role: "user",
            content: step.thought,
            timestamp: Date.now(),
          });
          truncatedConversation.push({
            role: "assistant",
            content: response.output,
            timestamp: Date.now(),
          });

          setConversation([...truncatedConversation]);
        }

        // Process final output
        if (truncatedConversation.length > 0) {
          const lastMessage =
            truncatedConversation[truncatedConversation.length - 1];
          setRawResult(lastMessage.content);
          const processed = BKCraftEngine.process(
            lastMessage.content,
            craftFormat,
          );
          setResult(processed.parsed);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unknown rethinking error",
        );
      } finally {
        setIsThinking(false);
        setCurrentStepIndex(-1);
      }
    },
    [
      think,
      thought,
      thinker,
      conversation,
      trainOfThoughts,
      craftFormat,
      selectedAssociation,
    ],
  );

  // ── Generate Memory ─────────────────────────────────────────────────

  const bkGenerateMemory = useCallback(async () => {
    if (!think || conversation.length === 0) return;

    try {
      const memoryId = uuidv7();
      const lastMessage = conversation[conversation.length - 1];

      await bkThinkerDB.memoriesRepo.create({
        id: memoryId,
        thinkId: think.id,
        name: `Memory - ${think.name} - ${new Date().toLocaleDateString()}`,
        rawOutput: lastMessage.content,
        processedOutput: result || lastMessage.content,
        format: resolveMemoryFormat(lastResolvedFormatRef.current),
        createdAt: Date.now(),
      });

      // Load craft configs to resolve per-step neuron formats
      const allCraftConfigs = await bkThinkerDB.craftConfigs
        .toArray() as BKCraftConfig[];
      const craftConfigMap = new Map(
        allCraftConfigs.map((c) => [c.id, c]),
      );

      // Create memory neurons from assistant responses only.
      // Conversation structure:
      //   [0] system message
      //   [1] user message (step 0 prompt)
      //   [2] assistant message (step 0 response)
      //   [3] user message (step 1 prompt)
      //   [4] assistant message (step 1 response)
      //   ...
      // Start at i=1 to skip the system message, then take every
      // even-indexed message (which is the assistant response).
      for (let i = 1; i < conversation.length; i += 2) {
        const assistantMsg = conversation[i + 1];

        if (assistantMsg && assistantMsg.role === "assistant") {
          const stepIndex = (i - 1) / 2;
          const step = trainOfThoughts[stepIndex];

          // Resolve per-neuron format based on step's craft config.
          // If the step has no craftId, default to "markdown".
          const stepCraftConfig = step?.craftId
            ? craftConfigMap.get(step.craftId)
            : null;
          const neuronFormat = resolveMemoryFormat(
            stepCraftConfig?.format ?? "markdown",
          );

          await bkThinkerDB.memoryNeuronsRepo.create({
            id: uuidv7(),
            memoryId,
            name: `Neuron ${stepIndex + 1}${step?.name ? ` - ${step.name}` : ""}`,
            value: assistantMsg.content,
            order: stepIndex,
            format: neuronFormat,
          });
        }
      }

      toast.success("Memory saved successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate memory";
      setError(msg);
      toast.danger(msg);
    }
  }, [think, conversation, result, trainOfThoughts]);

  // ── Handle memory actions (save / view HTML / download HTML) ──────────

  const handleMemoryAction = useCallback((actionKey: string | number) => {
    if (!think || conversation.length === 0) return;

    const key = String(actionKey);

    if (key === "save") {
      bkGenerateMemory();
      return;
    }

    // Build a map of step index → craft format from trainOfThoughts
    const stepFormatMap = new Map<number, RenderFormat>();
    for (const step of trainOfThoughts) {
      const stepCraftConfig = step.craftId
        ? craftConfigs.find((c) => c.id === step.craftId)
        : null;
      // If the step has no craft config, default to "markdown"
      stepFormatMap.set(
        step.order,
        resolveRenderFormat(stepCraftConfig?.format ?? "markdown"),
      );
    }

    // Build neurons from assistant messages for view/download,
    // each with its own format resolved from the corresponding step.
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
          memoryId: think.id,
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
      id: think.id,
      thinkId: think.id,
      name: think.name || "Memory Export",
      format: resolveMemoryFormat(lastResolvedFormatRef.current),
      createdAt: Date.now(),
    };

    // Resolve neuron format: check the neuron's own format field, fall back to memory format
    const getNeuronFormat = (neuronId: string): RenderFormat => {
      const neuron = neurons.find((n) => n.id === neuronId);
      return resolveRenderFormat(neuron?.format ?? lastResolvedFormatRef.current);
    };

    if (key === "view") {
      bkViewAsHtml(neurons, memory, getNeuronFormat);
    } else if (key === "download") {
      bkDownloadHtml(neurons, think.id, memory, getNeuronFormat);
    }
  }, [think, conversation, bkGenerateMemory, trainOfThoughts, craftConfigs]);

  // ── Derive completed steps with conversation pairs ───────────────────

  const completedSteps = trainOfThoughts
    .map((step, index) => {
      // Resolve per-step craft format from the step's craftId → BKCraftConfig
      const stepCraftConfig = step.craftId
        ? craftConfigs.find((c) => c.id === step.craftId)
        : null;
      const resolvedCraftFormat = stepCraftConfig?.format ?? craftFormat;

      return {
        step,
        index,
        userMessage: conversation[1 + index * 2],
        assistantMessage: conversation[2 + index * 2],
        resolvedCraftFormat,
      };
    })
    .filter((entry) => entry.userMessage);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <>
      <Toast.Provider />
      <div className="bk-think-studio space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {think && thought && (
            <>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="Back to Thought"
                onPress={() =>
                  router.push(`/modules/bunny-thinker/thoughts/${thought.id}`)
                }
              >
                <ArrowLeft size={18} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="Thought List"
                onPress={() => router.push("/modules/bunny-thinker/thoughts")}
              >
                <List size={18} />
              </Button>
            </>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {think?.name || "Think Studio"}
            </h2>
            {thought && (
              <p className="text-sm text-gray-500 mt-1">
                Thought: {thought.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {think && (
            <Button
              onPress={bkStartThink}
              isDisabled={isThinking}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isThinking ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Thinking...
                </>
              ) : conversation.length > 0 ? (
                <>
                  <RotateCcw size={16} /> Rethink
                </>
              ) : (
                "Start Thinking"
              )}
            </Button>
          )}
          {think && conversation.length > 0 && (
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
          {think && conversation.length > 0 && !isThinking && (
            <Dropdown>
              <Dropdown.Trigger>
                <Button
                  isDisabled={isThinking}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  Save to Memory
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu
                  aria-label="Memory actions"
                  onAction={handleMemoryAction}
                >
                  <Dropdown.Item id="save">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Save to Memory</span>
                        <span className="text-xs text-gray-400">Persist to database</span>
                      </div>
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item id="view">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">View as HTML</span>
                        <span className="text-xs text-gray-400">Open in new browser tab</span>
                      </div>
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item id="download">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Download as HTML</span>
                        <span className="text-xs text-gray-400">Save as .html file</span>
                      </div>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
          {think && (
            <Button
              variant="ghost"
              size="sm"
              isDisabled={isThinking}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1.5"
              onPress={() => setShowSettings(true)}
            >
              <Settings2 size={16} /> Settings
            </Button>
          )}
          {think && (
            <Button
              variant="ghost"
              size="sm"
              isDisabled={isThinking}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1.5"
              onPress={() => setShowMeta(true)}
            >
              <Info size={16} /> Meta
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Train of Thoughts — Tab Navigation */}
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
                      // Pin the tab so auto-switch stops — allows reading
                      // another train of thought while thinking continues.
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
                  {/* Status indicator */}
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

      {/* Progress Indicator */}
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

      {/* Active Step Panel — Tab Content */}
      {completedSteps.length > 0 && (
        <div className="space-y-3">
          {/* Step header with rethink button */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Step Details</h3>
            <Button
              variant="ghost"
              size="sm"
              isDisabled={isThinking}
              onPress={() => bkRethinkFromStep(activeStepIndex)}
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

      {/* No steps completed yet — show placeholder */}
      {trainOfThoughts.length > 0 && completedSteps.length === 0 && (
        <div className="p-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
          <p className="text-sm text-gray-400">
            Click &ldquo;Start Thinking&rdquo; to begin the process.
          </p>
        </div>
      )}

      {/* Result — Accordion */}
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
              {/* View / Raw toggle — available for all except plain markdown */}
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
                /* ── View mode for craft-only formats (no RenderView equivalent) ── */
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
                /* ── Use RenderView for common formats or raw mode ── */
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
            {/* Modal header */}
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

            {/* Modal body — scrollable conversation (all messages including system context) */}
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
      {showSettings && think && (
        <BKThinkStudioSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          thoughtPatternId={thought?.patternId}
          associations={associations}
          selectedAssociationId={selectedAssociationId}
          selectedAssociation={selectedAssociation}
          associationSelectLoading={associationSelectLoading}
          onAssociationChange={handleAssociationChange}
          thinkers={thinkers}
          thinkersLoading={thinkersLoading}
          selectedThinkerId={thinker?.id}
          selectedThinker={thinker}
          onThinkerChange={handleThinkerChange}
          onClearLastThought={() => {
            if (thought?.id) {
              try {
                localStorage.removeItem(
                  `bunny-last-think-${thought.id}`,
                );
                toast.success("Last thought cleared");
              } catch {
                // localStorage may not be available
              }
            }
          }}
        />
      )}

      {/* ── Meta Modal ──────────────────────────────────────────── */}
      {showMeta && think && (
        <BKThinkMetaModal
          think={think}
          thought={thought!}
          trainOfThoughts={trainOfThoughts}
          aiConfig={aiConfig}
          activeAssociation={selectedAssociation}
          onClose={() => setShowMeta(false)}
        />
      )}
      </div>
    </>
  );
}
