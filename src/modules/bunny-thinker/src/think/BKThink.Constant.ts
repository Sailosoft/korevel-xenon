/**
 * BKThink.Constant — Shared constants and configuration for BunnyAI Thinker.
 *
 * Centralises AI configuration defaults, system prompts, and schemas used
 * across BKThink server actions, ensuring a single source of truth.
 */

import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";

// ─── AI Configuration Constants ──────────────────────────────────────────

export const bkThinkConstant = {
  /**
   * Default temperature for structured JSON generation.
   * Lower values (0.5-0.7) produce more deterministic, focused output;
   * higher values (0.8-1.0) increase creativity.
   */
  DEFAULT_JSON_TEMPERATURE: 0.5,

  /** Default maximum output tokens for thought generation. */
  DEFAULT_THOUGHT_MAX_TOKENS: 6000,

  /** Default maximum output tokens for thinker swarm generation. */
  DEFAULT_SWARM_MAX_TOKENS: 4000,

  /**
   * System prompt that enforces raw JSON-only output.
   * Used for any AI call that must return parseable JSON without
   * markdown fences, preamble text, or explanatory prose.
   */
  SYSTEM_JSON_ONLY_OBJECT:
    "You are a JSON-only response generator. Output ONLY a valid JSON object. Do not wrap the JSON in markdown code blocks (do not use triple-backticks) and do not provide any explanations or conversational text outside of the JSON structure itself. However, the text values inside the JSON keys SHOULD be rich, highly detailed, and use markdown formatting (such as headers, bolding, lists, and code blocks) and explanations where appropriate.",

  SYSTEM_JSON_ONLY_ARRAY:
    "You are a JSON-only response generator. Output ONLY a valid JSON array. Do not wrap the JSON in markdown code blocks (do not use triple-backticks) and do not provide any explanations or conversational text outside of the JSON structure itself. However, the text values inside the JSON keys SHOULD be rich, highly detailed, and use markdown formatting (such as headers, bolding, lists, and code blocks) and explanations where appropriate.",

  /**
   * Schema for structured thought generation output.
   * Ensures the AI returns a properly typed thought + train-of-thoughts.
   */
  THOUGHT_GENERATION_SCHEMA: {
    name: "thought_generation",
    description: "Generated thought with ordered train-of-thought steps",
    properties: {
      thought: {
        type: "string" as const,
        description: "The main thought content describing the core idea",
      },
      trainOfThoughts: {
        type: "array" as const,
        description:
          "Ordered list of reasoning steps that form the train of thought",
        items: {
          type: "object" as const,
          description: "A single train-of-thought step",
          properties: {
            name: { type: "string" as const, description: "Step name / label" },
            thought: {
              type: "string" as const,
              description: "Step content / reasoning",
            },
            order: {
              type: "number" as const,
              description: "Step sequence position",
            },
          },
        },
      },
    },
  } satisfies HelixAISchemaOptions,
};
