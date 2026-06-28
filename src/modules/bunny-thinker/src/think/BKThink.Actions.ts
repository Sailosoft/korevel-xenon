"use server";

/**
 * BKThink.Actions — Server Actions for BunnyAI Thinker execution.
 *
 * Wraps all Helix AI chat calls in server actions so that AI API calls
 * happen server-side (API keys, model config stay secure). The client
 * passes pre-resolved thought execution data and receives results back to
 * write into IndexedDB for state tracking / display.
 */

import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import type { HelixAIOption } from "@/src/modules/helix";
import { BKPromptBuildThoughtSystem } from "../thoughts/BKThoughts.Prompt";
import { BKPromptThinkerSwarm } from "../thinker/BKThinker.Prompt";
import { BKPromptGenerateThought } from "../thoughts/BKThoughts.Prompt";
import type { BKCraftFormat } from "../craft/BKCraft.Types";
import { BKPromptCraftSystemSuffix } from "../craft/BKCraft.Prompt";

// ─── Message Types ───────────────────────────────────────────────────────

export interface BKThinkMessage {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp?: number;
}

// ─── Types ───────────────────────────────────────────────────────────────

export interface BKThinkChatRequest {
  /** Unique identifier for this conversation */
  thinkId: string;
  /** The thought (system prompt) */
  thoughtName: string;
  thoughtContent: string;
  /** Optional thinker persona */
  thinkerName?: string;
  thinkerDescription?: string;
  thinkerRole?: string;
  /**
   * Resolved thought association / pattern key-value pairs.
   * Injected into the system prompt as reference context for the AI
   * to use during train-of-thought execution.
   */
  associationContext?: string;
  /**
   * The full conversation messages so far.
   * The action will build the system prompt from thought/thinker info,
   * then serialize the remaining messages into the user prompt as context.
   */
  messages: BKThinkMessage[];
  /**
   * The new user message to append (the current train of thought step).
   * This will be appended to the messages array as the latest user turn.
   */
  newMessage: {
    name: string;
    content: string;
  };
  /** AI config override */
  aiConfig?: HelixAIOption;
  /** Craft format for output */
  craftFormat?: BKCraftFormat;
  /** Temperature override */
  temperature?: number;
}

export interface BKThinkChatResponse {
  success: boolean;
  output: string;
  error?: string;
}

export interface BKGenerateThinkersRequest {
  request: string;
  aiConfig?: HelixAIOption;
}

export interface BKGenerateThinkersResponse {
  success: boolean;
  thinkers: Array<{
    name: string;
    role: string;
    specialization?: string;
    description: string;
  }>;
  error?: string;
}

export interface BKGenerateThoughtRequest {
  request: string;
  aiConfig?: HelixAIOption;
}

export interface BKGenerateThoughtResponse {
  success: boolean;
  thought?: string;
  trainOfThoughts?: Array<{
    name: string;
    thought: string;
    order: number;
  }>;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Create a HelixAIService on the server.
 */
function createHelixService(aiConfig?: HelixAIOption): HelixAIService {
  const activeProvider = aiConfig?.provider || "default";

  const providers = HELIX_AI_PROVIDERS.map((p) => {
    if (p.provider === activeProvider && aiConfig?.model) {
      return { ...p, model: aiConfig.model };
    }
    return p;
  });

  return new HelixAIService({
    config: {
      ai: {
        activeProvider,
        providers,
      },
    },
    aiSchema: new HelixAISchemaService(),
  });
}

// ─── Think Chat Action ───────────────────────────────────────────────────

/**
 * Execute a train of thought step's AI chat on the server.
 *
 * Receives the full conversation messages and sends them to the AI using
 * OpenAI's natural conversation format — messages are passed with their
 * proper roles ("system", "user", "assistant") so the model sees the full
 * conversational context natively, rather than being serialised into a
 * single flat text block.
 */
export async function executeThinkChatAction(
  request: BKThinkChatRequest,
): Promise<BKThinkChatResponse> {
  try {
    const helix = createHelixService(request.aiConfig);

    // 1. Build the system message from thought definition and thinker persona
    let systemContent = BKPromptBuildThoughtSystem(
      request.thoughtName,
      request.thoughtContent,
      request.thinkerName,
      request.thinkerDescription,
      request.thinkerRole,
    );

    // Inject resolved association context (slot key-value pairs) as reference data
    if (request.associationContext) {
      systemContent += `\n\n--- Reference Context (Thought Association) ---\nThe following key-value pairs were resolved from the thought pattern/association. Use these values as context when executing the train-of-thought steps:\n${request.associationContext}`;
    }

    // Append craft instruction if specified
    if (request.craftFormat) {
      systemContent += BKPromptCraftSystemSuffix(request.craftFormat);
    }

    // 2. Assemble the full messages array in OpenAI's natural conversation format
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemContent },
      // Include all prior conversation messages with their original roles
      ...request.messages,
      // Append the current step as the latest user turn
      {
        role: "user",
        content: `--- Current Step: ${request.newMessage.name} ---\n${request.newMessage.content}`,
      },
    ];

    // 3. Send the entire message array to the AI — it sees the full
    //    conversational history natively, just like a direct OpenAI SDK call.
    const output = await helix.doChatWithHistory({
      messages,
      temperature: request.temperature ?? 0.7,
      maxToken: 8000,
    });

    return {
      success: true,
      output,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI chat error";
    console.error("[BKThink.Actions] executeThinkChatAction failed:", message);
    return {
      success: false,
      output: "",
      error: message,
    };
  }
}

// ─── Generate Thinkers Action ────────────────────────────────────────────

/**
 * Generate thinkers based on a request using AI.
 * Uses the prompt from BKThinker.Prompt instead of inline prompt.
 */
export async function generateThinkersAction(
  request: BKGenerateThinkersRequest,
): Promise<BKGenerateThinkersResponse> {
  try {
    const helix = createHelixService(request.aiConfig);

    // Use prompt from BKThinker.Prompt
    const prompt = BKPromptThinkerSwarm(request.request);

    const output = await helix.doChat({
      system:
        "You are a JSON-only response generator. Output ONLY valid JSON arrays, no markdown, no explanations.",
      user: prompt,
      temperature: 0.8,
      maxToken: 4000,
    });

    // Try to parse the output as JSON
    const cleaned = output
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const thinkers = JSON.parse(cleaned);

    return {
      success: true,
      thinkers: Array.isArray(thinkers) ? thinkers : [],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown generation error";
    console.error("[BKThink.Actions] generateThinkersAction failed:", message);
    return {
      success: false,
      thinkers: [],
      error: message,
    };
  }
}

// ─── Generate Thought Action ─────────────────────────────────────────────

/**
 * Generate a full thought structure (main thought + train of thoughts)
 * based on a user request. Uses prompt from BKThoughts.Prompt.
 */
export async function generateThoughtAction(
  request: BKGenerateThoughtRequest,
): Promise<BKGenerateThoughtResponse> {
  try {
    const helix = createHelixService(request.aiConfig);

    // Use prompt from BKThoughts.Prompt
    const prompt = BKPromptGenerateThought(request.request);

    const output = await helix.doChat({
      system:
        "You are a JSON-only response generator. Output ONLY valid JSON objects, no markdown, no explanations.",
      user: prompt,
      temperature: 0.7,
      maxToken: 6000,
    });

    const cleaned = output
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const result = JSON.parse(cleaned);

    return {
      success: true,
      thought: result.thought,
      trainOfThoughts: result.trainOfThoughts,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown generation error";
    console.error("[BKThink.Actions] generateThoughtAction failed:", message);
    return {
      success: false,
      error: message,
    };
  }
}
