"use server";

// BKProcess.Actions.ts
//
// Server Actions for the Process orchestration layer.
//
// The Process binds three domains into an automated workflow:
//   1. Thought Association  → resolve slot values into thought context
//   2. Thought              → execute train-of-thought steps via AI
//   3. Export to Memory     → persist conversation output as memory neurons
//
// Each action transitions the Process through its status lifecycle:
//   draft → resolving → ready → processing → completed (or error)

import { v7 as uuidv7 } from "uuid";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThoughtAssociation } from "../thought-association/BKThoughtAssociation.Types";
import type { BKThoughtPattern } from "../thought-pattern/BKThoughtPattern.Types";
import type { BKThought, BKTrainOfThought } from "../thoughts/BKThoughts.Types";
import type { BKThink } from "../think/BKThink.Types";
import type { BKConversationMessage } from "../thoughts/BKThoughts.Types";
import type { BKProcess, BKProcessExecutionResult } from "./BKProcess.Types";
import type { BKMemory } from "../memory/BKMemory.Types";
import { BKCraftEngine } from "../craft/BKCraft.Engine";
import { executeThinkChatAction } from "../think/BKThink.Actions";
import type { BKThinkMessage } from "../think/BKThink.Actions";
import type { BKCraftFormat } from "../craft/BKCraft.Types";

// ─── Resolve Association ─────────────────────────────────────────────────

/**
 * Resolve a Thought Association's slot values into resolved variable strings
 * that can be injected into a thought's content.
 *
 * Takes the association's slotValues and maps them to the pattern's slot
 * definitions, producing a structured context block.
 */
export async function bkProcessResolveAssociationAction(
  associationId: string,
): Promise<{
  success: boolean;
  resolvedContext?: string;
  patternName?: string;
  error?: string;
}> {
  try {
    const assocResult = await bkThinkerDB.thoughtAssociationsRepo.get(
      associationId,
    );
    if (!assocResult.isSuccess) {
      return { success: false, error: "Association not found" };
    }
    const association: BKThoughtAssociation = assocResult.value;

    // Load the pattern to understand slot definitions
    const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
      association.patternId,
    );
    if (!patternResult.isSuccess) {
      return { success: false, error: "Associated pattern not found" };
    }
    const pattern: BKThoughtPattern = patternResult.value;

    // Build resolved context from slot values
    const resolvedLines: string[] = [];
    for (const slot of pattern.slots) {
      const slotVal = association.slotValues.find(
        (sv) => sv.slotId === slot.id,
      );
      const value = slotVal?.value ?? slot.defaultValue ?? "";
      const label = slot.label || slot.name;
      resolvedLines.push(`${label}: ${value}`);
    }

    const resolvedContext = resolvedLines.join("\n");

    return {
      success: true,
      resolvedContext,
      patternName: pattern.name,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown resolve error";
    console.error("[BKProcess.Actions] resolve failed:", message);
    return { success: false, error: message };
  }
}

// ─── Execute Process ─────────────────────────────────────────────────────

/**
 * Execute the full Process pipeline:
 *
 * 1. Resolve association slot values
 * 2. Load the thought and its train-of-thoughts
 * 3. Create a Think session
 * 4. Run each train-of-thought step through the AI
 * 5. Export the conversation to Memory with neurons
 * 6. Update the Process with final references
 */
export async function bkProcessExecuteAction(
  processId: string,
  options?: {
    craftFormat?: BKCraftFormat;
    thinkerName?: string;
    thinkerDescription?: string;
    thinkerRole?: string;
  },
): Promise<BKProcessExecutionResult> {
  try {
    // ── 1. Load the Process ───────────────────────────────────────────
    const processResult = await bkThinkerDB.processesRepo.get(processId);
    if (!processResult.isSuccess) {
      return { success: false, error: "Process not found" };
    }
    const process: BKProcess = processResult.value;

    // Update status to resolving
    await bkThinkerDB.processesRepo.update(processId, {
      ...process,
      status: "resolving",
      updatedAt: Date.now(),
    } as BKProcess);

    // ── 2. Resolve Association slot values ──────────────────────────
    const assocResult = await bkThinkerDB.thoughtAssociationsRepo.get(
      process.associationId,
    );
    if (!assocResult.isSuccess) {
      await markProcessError(processId, "Association not found");
      return { success: false, error: "Association not found" };
    }
    const association: BKThoughtAssociation = assocResult.value;

    const patternResult = await bkThinkerDB.thoughtPatternsRepo.get(
      association.patternId,
    );
    if (!patternResult.isSuccess) {
      await markProcessError(processId, "Associated pattern not found");
      return { success: false, error: "Associated pattern not found" };
    }
    const pattern: BKThoughtPattern = patternResult.value;

    // Build resolved slot context
    const resolvedContext: string[] = [];
    for (const slot of pattern.slots) {
      const slotVal = association.slotValues.find(
        (sv) => sv.slotId === slot.id,
      );
      const value = slotVal?.value ?? slot.defaultValue ?? "";
      resolvedContext.push(`${slot.label || slot.name}: ${value}`);
    }
    const slotContextStr = resolvedContext.join("\n");

    // ── 3. Load the Thought and its Train-of-Thoughts ──────────────
    const thoughtResult = await bkThinkerDB.thoughtsRepo.get(process.thoughtId);
    if (!thoughtResult.isSuccess) {
      await markProcessError(processId, "Thought not found");
      return { success: false, error: "Thought not found" };
    }
    const thought: BKThought = thoughtResult.value;

    const trainOfThoughts = await bkThinkerDB.trainOfThoughtsRepo
      .getByThoughtId(thought.id);

    if (trainOfThoughts.length === 0) {
      await markProcessError(processId, "No train-of-thoughts defined");
      return { success: false, error: "No train-of-thoughts defined" };
    }

    // Update status to ready
    await bkThinkerDB.processesRepo.update(processId, {
      ...process,
      status: "ready",
      updatedAt: Date.now(),
    } as BKProcess);

    // ── 4. Create a Think session ──────────────────────────────────
    const thinkId = uuidv7();
    const craftFormat: BKCraftFormat = options?.craftFormat ?? "markdown";
    const initialConversation: BKConversationMessage[] = [];

    // Include resolved context as the first system-like message
    if (slotContextStr) {
      initialConversation.push({
        role: "system",
        content: `Resolved Association Context (${pattern.name}):\n${slotContextStr}`,
        timestamp: Date.now(),
      });
    }

    const thinkSlug = `${thought.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    await bkThinkerDB.thinksRepo.create({
      id: thinkId,
      slug: thinkSlug,
      name: `Process: ${thought.name}`,
      description: `Auto-generated by process "${process.name}" using association "${association.name}"`,
      thoughtId: thought.id,
      thoughtAssociationId: process.associationId,
      thinkConversation: initialConversation,
      status: "draft",
      createdAt: Date.now(),
    } as BKThink);

    // Update process with thinkId and status
    await bkThinkerDB.processesRepo.update(processId, {
      ...process,
      thinkId,
      status: "processing",
      updatedAt: Date.now(),
    } as BKProcess);

    // ── 5. Execute each Train-of-Thought step ──────────────────────
    for (let i = 0; i < trainOfThoughts.length; i++) {
      const step = trainOfThoughts[i];

      // Build full conversation messages from accumulated conversation
      const conversationMessages: BKThinkMessage[] = initialConversation.map(
        (msg) => ({
          role: msg.role === "system" ? "system" : msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }),
      );

      const response = await executeThinkChatAction({
        thinkId,
        thoughtName: thought.name,
        thoughtContent: thought.thought,
        thinkerName: options?.thinkerName,
        thinkerDescription: options?.thinkerDescription,
        thinkerRole: options?.thinkerRole,
        associationContext: slotContextStr || undefined,
        messages: conversationMessages,
        newMessage: {
          name: step.name,
          content: step.thought,
        },
        craftFormat: step.craftId ? craftFormat : undefined,
      });

      if (!response.success) {
        const errMsg = `Step "${step.name}" failed: ${response.error}`;
        await bkThinkerDB.thinksRepo.update(thinkId, {
          thinkConversation: initialConversation,
          status: "error",
          updatedAt: Date.now(),
        } as BKThink);
        await markProcessError(processId, errMsg);
        return { success: false, error: errMsg };
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

      // Persist conversation progress
      await bkThinkerDB.thinksRepo.update(thinkId, {
        thinkConversation: [...initialConversation],
        status: i === trainOfThoughts.length - 1 ? "completed" : "thinking",
        updatedAt: Date.now(),
      } as BKThink);
    }

    // ── 6. Process final output through Craft Engine ───────────────
    let processedOutput = "";
    if (initialConversation.length > 0) {
      const lastMessage = initialConversation[initialConversation.length - 1];
      const processed = BKCraftEngine.process(lastMessage.content, craftFormat);
      processedOutput = processed.parsed;
    }

    // ── 7. Export to Memory ─────────────────────────────────────────
    const memoryId = uuidv7();
    const lastMsg = initialConversation[initialConversation.length - 1];

    await bkThinkerDB.memoriesRepo.create({
      id: memoryId,
      thinkId,
      name: `Memory - ${process.name} - ${new Date().toLocaleDateString()}`,
      description: `Exported from process "${process.name}"`,
      rawOutput: lastMsg?.content ?? "",
      processedOutput: processedOutput || (lastMsg?.content ?? ""),
      format: craftFormat,
      createdAt: Date.now(),
    } as BKMemory);

    // Create memory neurons for each assistant response
    for (let i = 0; i < initialConversation.length; i++) {
      const msg = initialConversation[i];
      if (msg.role === "assistant") {
        const totStep = trainOfThoughts[Math.floor(i / 2) - (initialConversation[0]?.role === "system" ? 1 : 0)];
        await bkThinkerDB.memoryNeuronsRepo.create({
          id: uuidv7(),
          memoryId,
          thoughtId: process.thoughtId,
          trainOfThoughtId: totStep?.id,
          name: totStep?.name ?? `Neuron ${Math.floor(i / 2) + 1}`,
          value: msg.content,
          order: Math.floor(i / 2),
        });
      }
    }

    // ── 8. Finalize the Process ────────────────────────────────────
    await bkThinkerDB.processesRepo.update(processId, {
      ...process,
      thinkId,
      memoryId,
      status: "completed",
      updatedAt: Date.now(),
    } as BKProcess);

    return {
      success: true,
      thinkId,
      memoryId,
      conversation: initialConversation,
      output: processedOutput,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown process execution error";
    console.error("[BKProcess.Actions] execute failed:", message);
    await markProcessError(processId, message).catch(() => {});
    return { success: false, error: message };
  }
}

// ─── Re-run Process ──────────────────────────────────────────────────────

/**
 * Re-execute a previously completed or errored process.
 * Creates a fresh Think session and Memory export.
 */
export async function bkProcessRerunAction(
  processId: string,
  options?: {
    craftFormat?: BKCraftFormat;
  },
): Promise<BKProcessExecutionResult> {
  return bkProcessExecuteAction(processId, options);
}

// ─── Helper ──────────────────────────────────────────────────────────────

/**
 * Mark a process as errored with a descriptive message.
 */
async function markProcessError(
  processId: string,
  errorMessage: string,
): Promise<void> {
  try {
    const result = await bkThinkerDB.processesRepo.get(processId);
    if (result.isSuccess) {
      await bkThinkerDB.processesRepo.update(processId, {
        ...result.value,
        status: "error",
        errorMessage,
        updatedAt: Date.now(),
      } as BKProcess);
    }
  } catch (err) {
    console.error("[BKProcess] Failed to mark error:", err);
  }
}

