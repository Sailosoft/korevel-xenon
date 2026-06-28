// BKThoughtPattern.Server.Enhance.ts
"use server";

/**
 * Server actions for AI-powered ThoughtPattern enhancement.
 * Uses Helix AI with structured output (doChatStructuredFallback).
 */

import Handlebars from "handlebars";
import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import type { HelixAIOption, HelixAISchemaOptions } from "@/src/modules/helix";
import { bkThoughtPatternPrompts } from "./BKThoughtPattern.Prompt";

// ─── Schema ────────────────────────────────────────────────────────────

const patternSlotsSchema: HelixAISchemaOptions = {
  name: "pattern_slots",
  description: "Generated memory slots for a thought pattern",
  properties: {
    slots: {
      type: "array",
      description: "Array of memory slots",
      items: {
        type: "object",
        description: "A memory slot definition",
        properties: {
          name: { type: "string", description: "Slot identifier" },
          label: { type: "string", description: "Human-readable label" },
          type: {
            type: "string",
            description: "Input type: text, textarea, editor, or code-editor",
          },
          defaultValue: { type: "string", description: "Default value" },
          required: { type: "boolean", description: "Whether required" },
        },
      },
    },
  },
};

const derivedPatternsSchema: HelixAISchemaOptions = {
  name: "derived_patterns",
  description: "Patterns derived from a user request",
  properties: {
    patterns: {
      type: "array",
      description: "Array of derived thought patterns",
      items: {
        type: "object",
        description: "A derived thought pattern",
        properties: {
          name: { type: "string", description: "Pattern name" },
          description: { type: "string", description: "Pattern description" },
          slots: {
            type: "array",
            description: "Array of variable slots",
            items: {
              type: "object",
              description: "A variable slot",
              properties: {
                name: { type: "string", description: "Slot name" },
                type: {
                  type: "string",
                  description:
                    "Slot type: text, textarea, editor, or code-editor",
                },
                defaultValue: {
                  type: "string",
                  description: "Default value",
                },
                required: {
                  type: "boolean",
                  description: "Whether required",
                },
              },
            },
          },
        },
      },
    },
  },
};

// ─── Helper ────────────────────────────────────────────────────────────

function createHelixService(aiConfig?: HelixAIOption): HelixAIService {
  const activeProvider = aiConfig?.provider || "default";
  const providers = HELIX_AI_PROVIDERS.map((p) => {
    if (p.provider === activeProvider && aiConfig?.model) {
      return { ...p, model: aiConfig.model };
    }
    return p;
  });
  return new HelixAIService({
    config: { ai: { activeProvider, providers } },
    aiSchema: new HelixAISchemaService(),
  });
}

// ─── Generate Pattern Slots ────────────────────────────────────────────

/**
 * Generate memory slots for a thought pattern.
 */
export async function bkEnhanceGeneratePattern(
  name: string,
  description?: string,
  aiConfig?: HelixAIOption,
) {
  const helix = createHelixService(aiConfig);
  const prompt = bkThoughtPatternPrompts.enhance.find(
    (p) => p.key === "generate",
  )!;

  const template = Handlebars.compile(prompt.userPrompt);
  const userPrompt = template({
    name,
    description: description ? `\nDescription: ${description}` : "",
  });

  try {
    const result = await helix.doChatStructuredFallback({
      system: prompt.systemPrompt,
      user: userPrompt,
      schema: patternSlotsSchema,
      temperature: 0.7,
      aiConfig,
    });
    return result;
  } catch (error) {
    console.error("[BKThoughtPattern.Enhance] Generate failed:", error);
    throw error;
  }
}

// ─── Derive Patterns from Request ──────────────────────────────────────

/**
 * Derive thought patterns from a user request.
 */
export async function bkEnhanceDerivePatterns(
  request: string,
  aiConfig?: HelixAIOption,
) {
  const helix = createHelixService(aiConfig);
  const prompt = bkThoughtPatternPrompts.enhance.find(
    (p) => p.key === "derive",
  )!;

  const template = Handlebars.compile(prompt.userPrompt);
  const userPrompt = template({ request });

  try {
    const result = await helix.doChatStructuredFallback({
      system: prompt.systemPrompt,
      user: userPrompt,
      schema: derivedPatternsSchema,
      temperature: 0.7,
      aiConfig,
    });
    return result;
  } catch (error) {
    console.error("[BKThoughtPattern.Enhance] Derive failed:", error);
    throw error;
  }
}
