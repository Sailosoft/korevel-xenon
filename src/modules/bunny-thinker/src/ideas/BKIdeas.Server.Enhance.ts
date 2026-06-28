// BKIdeas.Server.Enhance.ts
"use server";

/**
 * Server actions for AI-powered Idea enhancement.
 * Uses Helix AI with structured output (doChatStructuredFallback).
 */

import Handlebars from "handlebars";
import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import type { HelixAIOption, HelixAISchemaOptions } from "@/src/modules/helix";
import { bkIdeaPrompts } from "./BKIdeas.Prompt";

// ─── Schema ────────────────────────────────────────────────────────────

const ideaSchema: HelixAISchemaOptions = {
  name: "generated_idea",
  description: "A reusable idea generated for a thought",
  properties: {
    name: { type: "string", description: "Idea name" },
    idea: {
      type: "string",
      description: "The reusable prompt / idea content",
    },
    tags: { type: "string", description: "Comma-separated tags" },
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

// ─── Generate Idea for Thought ─────────────────────────────────────────

/**
 * Generate a reusable idea specifically tailored to enhance a thought.
 */
export async function bkEnhanceGenerateIdeaForThought(
  thoughtName: string,
  thoughtContent: string,
  aiConfig?: HelixAIOption,
) {
  const helix = createHelixService(aiConfig);
  const prompt = bkIdeaPrompts.enhance.find(
    (p) => p.key === "generate-for-thought",
  )!;

  const template = Handlebars.compile(prompt.userPrompt);
  const userPrompt = template({ thoughtName, thoughtContent });

  try {
    const result = await helix.doChatStructuredFallback({
      system: prompt.systemPrompt,
      user: userPrompt,
      schema: ideaSchema,
      temperature: 0.7,
      aiConfig,
    });
    return result;
  } catch (error) {
    console.error("[BKIdeas.Enhance] Generate idea failed:", error);
    throw error;
  }
}
