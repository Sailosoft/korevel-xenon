"use server";

// BKProcess.Actions.ts
//
// Server Actions for the Process orchestration layer.
//
// These actions run on the Next.js server and handle ONLY operations
// that require server-side execution (AI chat via Helix).
//
// All IndexedDB operations (load/save entities) are performed by the
// client-side BKProcessDetailPage, which passes pre-resolved data to
// these server actions and writes results back to IndexedDB afterward.

import { executeThinkChatAction } from "../think/BKThink.Actions";
import type { BKThinkMessage } from "../think/BKThink.Actions";
import type { BKCraftFormat } from "../craft/BKCraft.Types";
import { BKCraftEngine } from "../craft/BKCraft.Engine";
import { BKPromptBuildThoughtSystem } from "../thoughts/BKThoughts.Prompt";
import { BKPromptCraftSystemSuffix } from "../craft/BKCraft.Prompt";
import type { HelixAIOption } from "@/src/modules/helix";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface BKProcessExecutionRequest {
  /** The thought's name */
  thoughtName: string;
  /** The thought's content / system prompt */
  thoughtContent: string;
  /** Optional thinker persona */
  thinkerName?: string;
  thinkerDescription?: string;
  thinkerRole?: string;
  /**
   * Resolved association context string (slot key-value pairs).
   * Pre-resolved client-side and passed here for injection into
   * the AI system prompt.
   */
  associationContext?: string;
  /**
   * The train-of-thought steps to execute sequentially.
   * Pre-loaded from IndexedDB client-side.
   */
  trainOfThoughts: Array<{
    id: string;
    name: string;
    thought: string;
    craftId?: string | null;
    /** Resolved craft format for this specific step (from BKCraftConfig) */
    craftFormat?: BKCraftFormat | null;
    /** Resolved craft instruction for this specific step (from BKCraftConfig) */
    craftInstruction?: string | null;
  }>;
  /** Craft format for output processing */
  craftFormat?: BKCraftFormat;
  /** AI provider+model override from user settings */
  aiConfig?: HelixAIOption;
}

export interface BKProcessExecutionResponse {
  success: boolean;
  /** Full conversation generated (system + user/assistant pairs for each step) */
  conversation?: Array<{
    role: "system" | "assistant" | "user";
    content: string;
    timestamp: number;
  }>;
  /** Processed output from the last step */
  output?: string;
  /** Error message if failed */
  error?: string;
  /** Which step failed (index) */
  failedStep?: number;
}

// ─── Execute Process (server-side AI calls only) ───────────────────────────

/**
 * Execute the AI chat portion of a Process pipeline on the server.
 *
 * The client is responsible for:
 *  - Loading Process, Association, Pattern, Thought, TrainOfThoughts from IndexedDB
 *  - Building the resolved association context
 *  - Creating/updating the Think session in IndexedDB
 *  - Exporting results to Memory in IndexedDB
 *
 * This server action ONLY:
 *  1. Receives pre-resolved data
 *  2. Runs each train-of-thought step through Helix AI
 *  3. Returns the conversation + final processed output
 */
export async function bkProcessExecuteAction(
  request: BKProcessExecutionRequest,
): Promise<BKProcessExecutionResponse> {
  try {
    const {
      thoughtName,
      thoughtContent,
      thinkerName,
      thinkerDescription,
      thinkerRole,
      associationContext,
      trainOfThoughts,
      craftFormat,
      aiConfig,
    } = request;

    // ── 1. Build the initial conversation with system prompt ─────────

    let systemContent = BKPromptBuildThoughtSystem(
      thoughtName,
      thoughtContent,
      thinkerName,
      thinkerDescription,
      thinkerRole,
    );

    // Inject resolved association context as reference data
    if (associationContext) {
      systemContent += `\n\n--- Reference Context (Thought Association) ---\nThe following key-value pairs were resolved from the thought pattern/association. Use these values as context when executing the train-of-thought steps:\n${associationContext}`;
    }

    // Append craft instruction if specified
    if (craftFormat) {
      systemContent += BKPromptCraftSystemSuffix(craftFormat);
    }

    const conversation: Array<{
      role: "system" | "assistant" | "user";
      content: string;
      timestamp: number;
    }> = [
      {
        role: "system",
        content: systemContent,
        timestamp: Date.now(),
      },
    ];

    // ── 2. Execute each train-of-thought step sequentially ─────────

    for (let i = 0; i < trainOfThoughts.length; i++) {
      const step = trainOfThoughts[i];

      // Resolve per-step craft format and instruction
      const stepCraftFormat = step.craftFormat ?? craftFormat;
      const stepCraftInstruction = step.craftInstruction ?? undefined;

      // Build messages for this step (includes prior conversation)
      const messages: BKThinkMessage[] = conversation.map((msg) => ({
        role: msg.role === "system" ? "system" : msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      const response = await executeThinkChatAction({
        thinkId: "", // Not persisted server-side
        thoughtName,
        thoughtContent,
        thinkerName,
        thinkerDescription,
        thinkerRole,
        associationContext,
        messages,
        newMessage: {
          name: step.name,
          content: step.thought,
        },
        craftFormat: stepCraftFormat,
        craftInstruction: stepCraftInstruction,
        aiConfig,
      });

      if (!response.success) {
        return {
          success: false,
          error: `Step "${step.name}" failed: ${response.error}`,
          failedStep: i,
          conversation,
        };
      }

      // Add user message + assistant response to conversation
      conversation.push({
        role: "user",
        content: step.thought,
        timestamp: Date.now(),
      });
      conversation.push({
        role: "assistant",
        content: response.output,
        timestamp: Date.now(),
      });
    }

    // ── 3. Process final output through Craft Engine ────────────────

    let processedOutput = "";
    if (conversation.length > 0) {
      const lastMessage = conversation[conversation.length - 1];
      // Use the last step's craft format for post-processing
      const lastStep = trainOfThoughts[trainOfThoughts.length - 1];
      const finalFormat = lastStep?.craftFormat ?? craftFormat ?? "markdown";
      const processed = BKCraftEngine.process(
        lastMessage.content,
        finalFormat,
      );
      processedOutput = processed.parsed;
    }

    return {
      success: true,
      conversation,
      output: processedOutput,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown process execution error";
    console.error("[BKProcess.Actions] execute failed:", message);
    return { success: false, error: message };
  }
}
