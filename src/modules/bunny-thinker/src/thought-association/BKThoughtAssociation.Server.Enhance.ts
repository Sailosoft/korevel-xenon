// BKThoughtAssociation.Server.Enhance.ts
"use server";

/**
 * Server actions for AI-powered ThoughtAssociation enhancement.
 * Uses Helix AI with structured output (doChatStructuredFallback).
 */

import Handlebars from "handlebars";
import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import type { HelixAIOption, HelixAISchemaOptions } from "@/src/modules/helix";
import { bkThoughtAssociationPrompts } from "./BKThoughtAssociation.Prompt";

// ─── Schema ────────────────────────────────────────────────────────────

const associationSchema: HelixAISchemaOptions = {
  name: "thought_association",
  description: "Filled slot values for a thought association",
  properties: {
    slotValues: {
      type: "object",
      description: "Map of slot names to their filled values",
      properties: {},
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

// ─── Generate Association ──────────────────────────────────────────────

export interface BKEnhanceGenerateAssociationParams {
  associationName: string;
  patternName: string;
  slotsDescription: string;
  context?: string;
  aiConfig?: HelixAIOption;
}

/**
 * Generate association values for a thought pattern's slots.
 */
export async function bkEnhanceGenerateAssociation(
  params: BKEnhanceGenerateAssociationParams,
) {
  const helix = createHelixService(params.aiConfig);
  const prompt = bkThoughtAssociationPrompts.enhance.find(
    (p) => p.key === "generate",
  )!;

  const template = Handlebars.compile(prompt.userPrompt);
  const userPrompt = template({
    associationName: params.associationName,
    patternName: params.patternName,
    slotsDescription: params.slotsDescription,
    context: params.context ? `\nContext: ${params.context}` : "",
  });

  try {
    const result = await helix.doChatStructuredFallback({
      system: prompt.systemPrompt,
      user: userPrompt,
      schema: associationSchema,
      temperature: 0.7,
      aiConfig: params.aiConfig,
    });
    return result;
  } catch (error) {
    console.error(
      "[BKThoughtAssociation.Enhance] Generate failed:",
      error,
    );
    throw error;
  }
}
