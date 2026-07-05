// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Server Actions (Helix AI Chat)
// ───────────────────────────────────────────────────────────────────────────────
// Wraps the Helix AI chat completion call in a Next.js server action,
// keeping API keys secure on the server side.
//
// Two modes:
// 1. callHelixAI — single prompt (used by Code mode)
// 2. callHelixAIWithConversation — full conversation array (used by Agent/Plan/Ask)
// ───────────────────────────────────────────────────────────────────────────────

"use server";

import OpenAI from "openai";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import type { LCAIResponse, LCAIConversationMessage } from "./LCInterface";

export interface CallAIServerActionParams {
  /** The prompt text to send to the AI */
  prompt: string;
  /** The selected provider key (e.g. "ollamaLocal", "deepseek") */
  provider: string;
  /** The selected model identifier */
  model: string;
}

export interface CallAIConversationParams {
  /** The full conversation messages array (system + user + assistant turns) */
  messages: LCAIConversationMessage[];
  /** The selected provider key (e.g. "ollamaLocal", "deepseek") */
  provider: string;
  /** The selected model identifier */
  model: string;
}

// ── Shared Helpers ──────────────────────────────────────────────────────────

const SYSTEM_MESSAGE =
  "You are Lemon Coder, an AI coding assistant. You help users write and modify code files. " +
  "You MUST respond with a valid JSON object containing exactly the fields requested in the user prompt. " +
  "When providing file Content, always output the COMPLETE file from the first line to the last — " +
  "never a diff, never a snippet, never placeholders like '... rest remains the same'. " +
  "The Content field must be ready to copy-paste and write directly to the file as-is.";

function getProviderConfig(provider: string) {
  return (
    HELIX_AI_PROVIDERS.find((p) => p.provider === provider) ??
    HELIX_AI_PROVIDERS.find((p) => p.provider === "default")
  );
}

async function callOpenAI(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  model: string,
) {
  const ai = new OpenAI({
    apiKey: getProviderConfig("default")?.apiKey,
    baseURL: getProviderConfig("default")?.endpoint,
  });

  const response = await ai.chat.completions.create({
    model,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const rawContent = response.choices[0]?.message?.content || "{}";

  // Strip markdown code fences (```json ... ```) if the AI wraps the JSON
  const content = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  return JSON.parse(content) as LCAIResponse;
}

function makeErrorResponse(error: unknown): LCAIResponse {
  console.error("Server AI call failed:", error);
  return {
    SessionID: "",
    AIMessage: `AI Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    FileContents: [],
  };
}

// ── Single-Prompt Action (Code mode) ────────────────────────────────────────

/**
 * Server action that calls the Helix AI provider with a single prompt.
 * Used by Code mode — keeps the context stash intact.
 */
export async function callHelixAI({
  prompt,
  provider,
  model,
}: CallAIServerActionParams): Promise<LCAIResponse> {
  const providerConfig = getProviderConfig(provider);
  if (!providerConfig) {
    return {
      SessionID: "",
      AIMessage: "Error: No AI provider configured",
      FileContents: [],
    };
  }

  try {
    const ai = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.endpoint,
    });

    const response = await ai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const rawContent = response.choices[0]?.message?.content || "{}";
    const content = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    return JSON.parse(content) as LCAIResponse;
  } catch (error) {
    return makeErrorResponse(error);
  }
}

// ── Multi-Turn Conversation Action (Agent / Plan / Ask modes) ───────────────

/**
 * Server action that calls the Helix AI provider with the full conversation array.
 * Used by Agent, Plan, and Ask modes to preserve context build-up across turns.
 *
 * The `messages` array should follow the OpenAI format:
 *   [{ role: "system", content: "..." }, { role: "user", content: "..." }, ...]
 *
 * The first message is expected to be the system message.
 */
export async function callHelixAIWithConversation({
  messages,
  provider,
  model,
}: CallAIConversationParams): Promise<LCAIResponse> {
  const providerConfig = getProviderConfig(provider);
  if (!providerConfig) {
    return {
      SessionID: "",
      AIMessage: "Error: No AI provider configured",
      FileContents: [],
    };
  }

  try {
    const ai = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.endpoint,
    });

    const response = await ai.chat.completions.create({
      model,
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const rawContent = response.choices[0]?.message?.content || "{}";
    const content = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    return JSON.parse(content) as LCAIResponse;
  } catch (error) {
    return makeErrorResponse(error);
  }
}
