"use client";

// BKThinkStudioAnonHooks.ts
//
// Custom hook encapsulating all anonymous mode state and logic.
// Anonymous mode lets users write thoughts and train-of-thought steps
// from scratch on the page without DB persistence, then optionally save
// as a full thought.

import { useState, useCallback, useEffect, useRef } from "react";
import { v7 as uuidv7 } from "uuid";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import { BKCraftEngine } from "../craft/BKCraft.Engine";
import { executeThinkChatAction } from "../think/BKThink.Actions";
import type { BKThinkMessage } from "../think/BKThink.Actions";
import type { BKThought, BKTrainOfThought } from "../thoughts/BKThoughts.Types";
import type { BKConversationMessage } from "../thoughts/BKThoughts.Types";
import type { BKThinker } from "../thinker/BKThinker.Types";
import type { BKCraftFormat, BKCraftConfig } from "../craft/BKCraft.Types";
import type {
  BKThoughtAssociation,
  BKAssociationSlotValue,
} from "../thought-association/BKThoughtAssociation.Types";
import type { BKThoughtPattern } from "../thought-pattern/BKThoughtPattern.Types";
import type { HelixAIOption } from "@/src/modules/helix";

// ─── Editable step type ──────────────────────────────────────────────

export interface BKThinkStudioAnonStep {
  id: string;
  name: string;
  thought: string;
  order: number;
}

// ─── Hook return type ────────────────────────────────────────────────

export interface UseAnonymousModeReturn {
  // Loaded data
  allThoughts: BKThought[];
  allThoughtsLoading: boolean;
  thinkers: BKThinker[];
  thinkersLoading: boolean;
  associations: BKThoughtAssociation[];
  associationSelectLoading: boolean;

  // Patterns
  patterns: BKThoughtPattern[];
  patternsLoading: boolean;

  // Editable thought fields
  thoughtName: string;
  thoughtDescription: string;
  thoughtContent: string;

  // Editable steps
  steps: BKThinkStudioAnonStep[];

  // Selections
  selectedPattern: BKThoughtPattern | null;
  selectedThought: BKThought | null;
  selectedThinker: BKThinker | null;
  selectedAssociation: BKThoughtAssociation | null;
  selectedAssociationId: string | undefined;

  // Thinking state
  conversation: BKConversationMessage[];
  isThinking: boolean;
  currentStepIndex: number;
  activeStepIndex: number;
  error: string;
  result: string;
  rawResult: string;
  craftFormat: BKCraftFormat;
  trainOfThoughts: BKTrainOfThought[];
  showProcessedOutput: boolean;

  // Derived
  isReadyToThink: boolean;
  completedSteps: Array<{
    step: BKTrainOfThought;
    index: number;
    userMessage?: BKConversationMessage;
    assistantMessage?: BKConversationMessage;
  }>;
  isProcessingComplete: boolean;
  isTabPinnedRef: React.MutableRefObject<boolean>;

  // Setters / updaters
  setThoughtName: (name: string) => void;
  setThoughtDescription: (desc: string) => void;
  setThoughtContent: (content: string) => void;
  setCraftFormat: (format: BKCraftFormat) => void;
  setActiveStepIndex: (index: number) => void;
  setShowProcessedOutput: (show: boolean) => void;

  // Actions
  loadExistingThought: (thoughtId: string) => Promise<void>;
  selectPattern: (patternId: string) => Promise<void>;
  selectThinker: (thinkerId: string) => Promise<void>;
  selectAssociation: (associationId: string) => Promise<void>;
  addStep: () => void;
  removeStep: (index: number) => void;
  updateStep: (index: number, field: "name" | "thought", value: string) => void;
  startThinking: (aiConfig: HelixAIOption) => Promise<void>;
  rethinkFromStep: (
    stepIndex: number,
    aiConfig: HelixAIOption,
  ) => Promise<void>;
  exportAsJson: () => void;
  saveAsThought: () => Promise<string | null>;
  resetSession: () => void;
}

// ─── Helper: bake pattern context ───────────────────────────────────

function bakePatternContext(
  pattern: BKThoughtPattern,
  slotOverrides?: BKAssociationSlotValue[],
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
      const slotValue = slotOverrides?.find((sv) => sv.slotId === slot.id);
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
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useAnonymousMode(): UseAnonymousModeReturn {
  // ── DB-loaded data ────────────────────────────────────────────────
  const [allThoughts, setAllThoughts] = useState<BKThought[]>([]);
  const [allThoughtsLoading, setAllThoughtsLoading] = useState(false);
  const [thinkers, setThinkers] = useState<BKThinker[]>([]);
  const [thinkersLoading, setThinkersLoading] = useState(false);
  const [patterns, setPatterns] = useState<BKThoughtPattern[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [associations, setAssociations] = useState<BKThoughtAssociation[]>([]);
  const [associationSelectLoading, setAssociationSelectLoading] =
    useState(false);

  // ── Selections ────────────────────────────────────────────────────
  const [selectedPattern, setSelectedPattern] =
    useState<BKThoughtPattern | null>(null);

  // ── Editable thought fields ───────────────────────────────────────
  const [thoughtName, setThoughtName] = useState("");
  const [thoughtDescription, setThoughtDescription] = useState("");
  const [thoughtContent, setThoughtContent] = useState("");

  // ── Editable steps ────────────────────────────────────────────────
  const [steps, setSteps] = useState<BKThinkStudioAnonStep[]>([
    { id: uuidv7(), name: "", thought: "", order: 0 },
  ]);

  // ── Selections ────────────────────────────────────────────────────
  const [selectedThought, setSelectedThought] = useState<BKThought | null>(
    null,
  );
  const [selectedThinker, setSelectedThinker] = useState<BKThinker | null>(
    null,
  );
  const [selectedAssociation, setSelectedAssociation] =
    useState<BKThoughtAssociation | null>(null);
  const [selectedAssociationId, setSelectedAssociationId] = useState<
    string | undefined
  >();

  // ── Thinking state ────────────────────────────────────────────────
  const [conversation, setConversation] = useState<BKConversationMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [rawResult, setRawResult] = useState("");
  const [craftFormat, setCraftFormat] = useState<BKCraftFormat>("markdown");
  const [trainOfThoughts, setTrainOfThoughts] = useState<BKTrainOfThought[]>(
    [],
  );
  const [showProcessedOutput, setShowProcessedOutput] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────
  const isReadyToThink =
    !!thoughtName && !!thoughtContent && steps.some((s) => s.name && s.thought);

  const completedSteps = trainOfThoughts
    .map((step, index) => ({
      step,
      index,
      userMessage: conversation[1 + index * 2] as
        | BKConversationMessage
        | undefined,
      assistantMessage: conversation[2 + index * 2] as
        | BKConversationMessage
        | undefined,
    }))
    .filter((entry) => entry.userMessage);

  const isProcessingComplete = completedSteps.length > 0;
  const isTabPinnedRef = useRef(false);

  // ── Load thinkers ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setThinkersLoading(true);
      try {
        const result = await bkThinkerDB.thinkersRepo.query.getAll({
          page: 0,
          pageSize: 9999,
          filters: [],
        });
        setThinkers(result.data);
      } catch (err) {
        console.error("[BKThinkStudioAnon] Failed to load thinkers:", err);
      } finally {
        setThinkersLoading(false);
      }
    };
    load();
  }, []);

  // ── Load all thoughts for selector ────────────────────────────────
  const loadAllThoughts = useCallback(async () => {
    setAllThoughtsLoading(true);
    try {
      const result = await bkThinkerDB.thoughtsRepo.query.getAll({
        page: 0,
        pageSize: 9999,
        filters: [],
      });
      setAllThoughts(result.data);
    } catch (err) {
      console.error("[BKThinkStudioAnon] Failed to load thoughts:", err);
    } finally {
      setAllThoughtsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllThoughts();
  }, [loadAllThoughts]);

  // ── Load all patterns for selector ────────────────────────────────
  const loadAllPatterns = useCallback(async () => {
    setPatternsLoading(true);
    try {
      const result = await bkThinkerDB.thoughtPatternsRepo.query.getAll({
        page: 0,
        pageSize: 9999,
        filters: [],
      });
      setPatterns(result.data);
    } catch (err) {
      console.error("[BKThinkStudioAnon] Failed to load patterns:", err);
    } finally {
      setPatternsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllPatterns();
  }, [loadAllPatterns]);

  // ── Load existing thought (populate form) ─────────────────────────
  const loadExistingThought = useCallback(async (thoughtId: string) => {
    if (!thoughtId) return;
    try {
      const result = await bkThinkerDB.thoughtsRepo.get(thoughtId);
      if (result.isSuccess) {
        const t = result.value;
        setThoughtName(t.name);
        setThoughtDescription(t.description || "");
        setThoughtContent(t.thought);
        setSelectedThought(t);

        // Reset association selection
        setSelectedAssociation(null);
        setSelectedAssociationId(undefined);

        // Load train of thoughts for this thought
        const allTrains = await bkThinkerDB.trainOfThoughtsRepo.query.getAll({
          page: 0,
          pageSize: 100,
          filters: [],
        });
        const filtered = allTrains.data
          .filter((tr: BKTrainOfThought) => tr.thoughtId === thoughtId)
          .sort(
            (a: BKTrainOfThought, b: BKTrainOfThought) => a.order - b.order,
          );

        setSteps(
          filtered.length > 0
            ? filtered.map((tr: BKTrainOfThought) => ({
                id: tr.id,
                name: tr.name,
                thought: tr.thought,
                order: tr.order,
              }))
            : [{ id: uuidv7(), name: "", thought: "", order: 0 }],
        );

        // Load associations for this thought's pattern
        if (t.patternId) {
          setAssociationSelectLoading(true);
          try {
            const items =
              await bkThinkerDB.thoughtAssociationsRepo.getByPatternId(
                t.patternId,
              );
            setAssociations(items);
          } catch (err) {
            console.error(
              "[BKThinkStudioAnon] Failed to load associations:",
              err,
            );
          } finally {
            setAssociationSelectLoading(false);
          }
        } else {
          setAssociations([]);
        }
      }
    } catch (err) {
      console.error("[BKThinkStudioAnon] Failed to load thought:", err);
    }
  }, []);

  // ── Select pattern ────────────────────────────────────────────────
  const selectPattern = useCallback(async (patternId: string) => {
    if (!patternId) {
      setSelectedPattern(null);
      setAssociations([]);
      setSelectedAssociation(null);
      setSelectedAssociationId(undefined);
      return;
    }
    try {
      const result = await bkThinkerDB.thoughtPatternsRepo.get(patternId);
      if (result.isSuccess) {
        setSelectedPattern(result.value);
        // Load associations for this pattern
        setAssociationSelectLoading(true);
        try {
          const items =
            await bkThinkerDB.thoughtAssociationsRepo.getByPatternId(patternId);
          setAssociations(items);
        } catch (err) {
          console.error(
            "[BKThinkStudioAnon] Failed to load associations:",
            err,
          );
        } finally {
          setAssociationSelectLoading(false);
        }
      }
    } catch (err) {
      console.error("[BKThinkStudioAnon] Failed to load pattern:", err);
    }
  }, []);

  // ── Select thinker ────────────────────────────────────────────────
  const selectThinker = useCallback(async (thinkerId: string) => {
    if (!thinkerId) {
      setSelectedThinker(null);
      return;
    }
    try {
      const result = await bkThinkerDB.thinkersRepo.get(thinkerId);
      if (result.isSuccess) {
        setSelectedThinker(result.value);
      }
    } catch (err) {
      console.error("[BKThinkStudioAnon] Failed to load thinker:", err);
    }
  }, []);

  // ── Select association ────────────────────────────────────────────
  const selectAssociation = useCallback(async (associationId: string) => {
    setSelectedAssociationId(associationId || undefined);
    if (!associationId) {
      setSelectedAssociation(null);
      return;
    }
    try {
      const result =
        await bkThinkerDB.thoughtAssociationsRepo.get(associationId);
      if (result.isSuccess) {
        setSelectedAssociation(result.value);
      }
    } catch (err) {
      console.error("[BKThinkStudioAnon] Failed to load association:", err);
    }
  }, []);

  // ── Step CRUD ─────────────────────────────────────────────────────
  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      { id: uuidv7(), name: "", thought: "", order: prev.length },
    ]);
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })),
    );
  }, []);

  const updateStep = useCallback(
    (index: number, field: "name" | "thought", value: string) => {
      setSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  // ── Resolve association context ───────────────────────────────────
  const resolveAssociationContext = useCallback(async (): Promise<
    string | undefined
  > => {
    if (selectedAssociation) {
      const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
        selectedAssociation.patternId,
      );
      if (patternResult.isSuccess) {
        return bakePatternContext(
          patternResult.value,
          selectedAssociation.slotValues,
        );
      }
    } else if (selectedThought?.patternId) {
      const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
        selectedThought.patternId,
      );
      if (patternResult.isSuccess) {
        return bakePatternContext(patternResult.value);
      }
    }
    return undefined;
  }, [selectedAssociation, selectedThought]);

  // ── Start thinking ────────────────────────────────────────────────
  const startThinking = useCallback(
    async (aiConfig: HelixAIOption) => {
      if (!thoughtName || !thoughtContent) return;
      if (steps.length === 0 || !steps.some((s) => s.name && s.thought)) return;

      setIsThinking(true);
      setError("");
      setResult("");

      try {
        // Convert editable steps to BKTrainOfThought for display
        const stepTrains: BKTrainOfThought[] = steps
          .filter((s) => s.name && s.thought)
          .map((s, i) => ({
            id: s.id,
            thoughtId: "anonymous",
            name: s.name,
            thought: s.thought,
            order: i,
            includeInMemory: true,
          }));

        setTrainOfThoughts(stepTrains);
        setCurrentStepIndex(0);
        setActiveStepIndex(0);
        isTabPinnedRef.current = false;

        // Resolve association context
        const associationContext = await resolveAssociationContext();

        // Build system context
        let systemContext = [
          `# ${thoughtName}`,
          ``,
          thoughtContent,
          selectedThinker?.name
            ? `\n---\n**Persona:** ${selectedThinker.name}${selectedThinker.role ? ` (${selectedThinker.role})` : ""}${selectedThinker.description ? `\n${selectedThinker.description}` : ""}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");

        if (associationContext) {
          systemContext += `\n\n---\n${associationContext}`;
        }

        const initialConversation: BKConversationMessage[] = [
          { role: "system", content: systemContext, timestamp: Date.now() },
        ];
        setConversation(initialConversation);

        // Execute each step sequentially
        for (let i = 0; i < stepTrains.length; i++) {
          const step = stepTrains[i];
          setCurrentStepIndex(i);
          if (!isTabPinnedRef.current) {
            setActiveStepIndex(i);
          }

          const conversationMessages: BKThinkMessage[] =
            initialConversation.map((msg) => ({
              role: msg.role === "system" ? "system" : msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
            }));

          const response = await executeThinkChatAction({
            thinkId: "anonymous",
            thoughtName,
            thoughtContent,
            thinkerName: selectedThinker?.name,
            thinkerDescription: selectedThinker?.description,
            thinkerRole: selectedThinker?.role,
            messages: conversationMessages,
            newMessage: { name: step.name, content: step.thought },
            craftFormat,
            associationContext,
            aiConfig,
          });

          if (!response.success) {
            setError(`Step "${step.name}" failed: ${response.error}`);
            break;
          }

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
        }

        // Process final output through craft engine
        if (initialConversation.length > 0) {
          const lastMessage =
            initialConversation[initialConversation.length - 1];
          setRawResult(lastMessage.content);
          const processed = BKCraftEngine.process(
            lastMessage.content,
            craftFormat,
          );
          setResult(processed.parsed);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown thinking error");
      } finally {
        setIsThinking(false);
        setCurrentStepIndex(-1);
      }
    },
    [
      thoughtName,
      thoughtContent,
      steps,
      selectedThinker,
      craftFormat,
      resolveAssociationContext,
    ],
  );

  // ── Rethink from a specific step ───────────────────────────────────
  const rethinkFromStep = useCallback(
    async (stepIndex: number, aiConfig: HelixAIOption) => {
      if (!conversation.length) return;

      setIsThinking(true);
      setError("");

      try {
        const truncatedConversation = conversation.slice(0, 1 + stepIndex * 2);
        setConversation(truncatedConversation);

        const associationContext = await resolveAssociationContext();
        const remainingSteps = trainOfThoughts.slice(stepIndex);

        for (let i = 0; i < remainingSteps.length; i++) {
          const step = remainingSteps[i];
          setCurrentStepIndex(stepIndex + i);
          if (!isTabPinnedRef.current) {
            setActiveStepIndex(stepIndex + i);
          }

          const conversationMessages: BKThinkMessage[] =
            truncatedConversation.map((msg) => ({
              role: msg.role === "system" ? "system" : msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
            }));

          const response = await executeThinkChatAction({
            thinkId: "anonymous",
            thoughtName,
            thoughtContent,
            thinkerName: selectedThinker?.name,
            thinkerDescription: selectedThinker?.description,
            thinkerRole: selectedThinker?.role,
            messages: conversationMessages,
            newMessage: { name: step.name, content: step.thought },
            craftFormat,
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
      conversation,
      trainOfThoughts,
      thoughtName,
      thoughtContent,
      selectedThinker,
      craftFormat,
      resolveAssociationContext,
    ],
  );

  // ── Export as JSON ────────────────────────────────────────────────
  const exportAsJson = useCallback(() => {
    try {
      const lastMessage = conversation[conversation.length - 1];
      const exportData = {
        exportedAt: new Date().toISOString(),
        thought: {
          name: thoughtName,
          content: thoughtContent,
          description: thoughtDescription,
        },
        thinker: selectedThinker
          ? {
              name: selectedThinker.name,
              role: selectedThinker.role,
              description: selectedThinker.description,
            }
          : null,
        craftFormat,
        steps: steps.map((s) => ({ name: s.name, thought: s.thought })),
        conversation: conversation.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp).toISOString(),
        })),
        processedOutput: result || lastMessage?.content || "",
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `anonymous-think-${uuidv7().slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export");
    }
  }, [
    conversation,
    thoughtName,
    thoughtContent,
    thoughtDescription,
    selectedThinker,
    craftFormat,
    steps,
    result,
  ]);

  // ── Save as persistent thought ────────────────────────────────────
  const saveAsThought = useCallback(async (): Promise<string | null> => {
    try {
      const thoughtId = uuidv7();
      const thinkId = uuidv7();
      const slug = thoughtName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);

      // Create thought in DB
      await bkThinkerDB.thoughtsRepo.create({
        id: thoughtId,
        name: thoughtName,
        thought: thoughtContent,
        description: thoughtDescription || undefined,
        ideaIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create train of thoughts in DB
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (!s.name || !s.thought) continue;
        await bkThinkerDB.trainOfThoughtsRepo.create({
          id: uuidv7(),
          thoughtId,
          name: s.name,
          thought: s.thought,
          order: i,
          includeInMemory: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Create think with conversation
      const thinkName = `Think — ${thoughtName}`;
      await bkThinkerDB.thinksRepo.create({
        id: thinkId,
        slug: slug || "anonymous-think",
        name: thinkName,
        description:
          thoughtDescription || `Thinking session for "${thoughtName}"`,
        thoughtId,
        thoughtAssociationId: selectedAssociationId,
        thinkConversation: conversation,
        status: conversation.length > 0 ? "completed" : "draft",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return thinkId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save thought");
      return null;
    }
  }, [
    thoughtName,
    thoughtContent,
    thoughtDescription,
    steps,
    selectedAssociationId,
    conversation,
  ]);

  // ── Reset session ─────────────────────────────────────────────────
  const resetSession = useCallback(() => {
    setThoughtName("");
    setThoughtDescription("");
    setThoughtContent("");
    setSteps([{ id: uuidv7(), name: "", thought: "", order: 0 }]);
    setSelectedThought(null);
    setSelectedThinker(null);
    setSelectedAssociation(null);
    setSelectedAssociationId(undefined);
    setConversation([]);
    setIsThinking(false);
    setCurrentStepIndex(-1);
    setActiveStepIndex(0);
    setError("");
    setResult("");
    setRawResult("");
    setTrainOfThoughts([]);
    setShowProcessedOutput(false);
  }, []);

  // ── Return ────────────────────────────────────────────────────────
  return {
    allThoughts,
    allThoughtsLoading,
    thinkers,
    thinkersLoading,
    patterns,
    patternsLoading,
    associations,
    associationSelectLoading,
    thoughtName,
    thoughtDescription,
    thoughtContent,
    steps,
    selectedPattern,
    selectedThought,
    selectedThinker,
    selectedAssociation,
    selectedAssociationId,
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
    isReadyToThink,
    completedSteps,
    isProcessingComplete,
    isTabPinnedRef,
    setThoughtName,
    setThoughtDescription,
    setThoughtContent,
    setCraftFormat,
    setActiveStepIndex,
    setShowProcessedOutput,
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
  };
}
