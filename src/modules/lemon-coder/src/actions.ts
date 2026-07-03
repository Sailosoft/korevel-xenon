// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Server Actions (Helix AI Chat)
// ───────────────────────────────────────────────────────────────────────────────
// Wraps the Helix AI chat completion call in a Next.js server action,
// keeping API keys secure on the server side.
// ───────────────────────────────────────────────────────────────────────────────

"use server";

import OpenAI from "openai";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import type { LCAIResponse } from "./LCInterface";

export interface CallAIServerActionParams {
  /** The prompt text to send to the AI */
  prompt: string;
  /** The selected provider key (e.g. "ollamaLocal", "deepseek") */
  provider: string;
  /** The selected model identifier */
  model: string;
}

/**
 * Server action that calls the Helix AI provider with the given prompt.
 * API keys are resolved server-side from HELIX_AI_PROVIDERS config.
 */
export async function callHelixAI({
  prompt,
  provider,
  model,
}: CallAIServerActionParams): Promise<LCAIResponse> {
  const providerConfig = HELIX_AI_PROVIDERS.find(
    (p) => p.provider === provider,
  ) ?? HELIX_AI_PROVIDERS.find((p) => p.provider === "default");

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
        {
          role: "system",
          content:
            "You are Lemon Coder, an AI coding assistant. You help users write and modify code files. " +
            "You MUST respond with a valid JSON object containing exactly the fields requested in the user prompt. " +
            "When providing file Content, always output the COMPLETE file from the first line to the last — " +
            "never a diff, never a snippet, never placeholders like '... rest remains the same'. " +
            "The Content field must be ready to copy-paste and write directly to the file as-is.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const rawContent = response.choices[0]?.message?.content || "{}";

    // Strip markdown code fences (```json ... ```) if the AI wraps the JSON
    const content = rawContent
      .replace(/^```(?:json)?\s*/i, "") // opening fence
      .replace(/\s*```\s*$/i, "")       // closing fence
      .trim();

    const parsed = JSON.parse(content);

    return parsed as LCAIResponse;
  } catch (error) {
    console.error("Server AI call failed:", error);
    return {
      SessionID: "",
      AIMessage: `AI Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      FileContents: [],
    };
  }
}
