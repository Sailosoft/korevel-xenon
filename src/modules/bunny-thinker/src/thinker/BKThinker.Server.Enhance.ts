// BKThinker.Server.Enhance.ts
"use server";

/**
 * Server actions for AI-powered Thinker enhancement.
 * Uses Helix AI with structured output (doChatStructuredFallback).
 */

import Handlebars from "handlebars";
import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import type { HelixAIOption, HelixAISchemaOptions } from "@/src/modules/helix";
import { bkThinkerPrompts } from "./BKThinker.Prompt";

// ─── Schema ────────────────────────────────────────────────────────────

const thinkerSwarmSchema: HelixAISchemaOptions = {
  name: "thinker_swarm",
  description: "Generates multiple thinker personas",
  properties: {
    thinkers: {
      type: "array",
      description: "Array of generated thinker personas",
      items: {
        type: "object",
        description: "A thinker persona",
        properties: {
          name: { type: "string", description: "Thinker name" },
          role: { type: "string", description: "Thinker role" },
          specialization: {
            type: "string",
            description: "Area of expertise",
          },
          description: {
            type: "string",
            description: "Thinker description",
          },
        },
      },
    },
  },
};

const singleThinkerSchema: HelixAISchemaOptions = {
  name: "single_thinker",
  description: "Generates a single thinker persona",
  properties: {
    name: { type: "string", description: "Thinker name" },
    role: { type: "string", description: "Thinker role" },
    specialization: { type: "string", description: "Area of expertise" },
    description: { type: "string", description: "Thinker description" },
    rules: { type: "string", description: "Guard rails for this thinker" },
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

// ─── Thinker Swarm ─────────────────────────────────────────────────────

/**
 * Generate multiple thinkers at once based on a request (ThinkerSwarm).
 */
export async function bkEnhanceThinkerSwarm(
  request: string,
  aiConfig?: HelixAIOption,
) {
  const helix = createHelixService(aiConfig);
  const prompt = bkThinkerPrompts.enhance.find((p) => p.key === "swarm")!;

  const template = Handlebars.compile(prompt.userPrompt);
  const userPrompt = template({ request });

  try {
    const result = await helix.doChatStructuredFallback({
      system: prompt.systemPrompt,
      user: userPrompt,
      schema: thinkerSwarmSchema,
      temperature: 0.8,
      aiConfig,
    });
    return result;
  } catch (error) {
    console.error("[BKThinker.Enhance] Swarm failed:", error);
    throw error;
  }
}

// ─── Generate Single Thinker ───────────────────────────────────────────

/**
 * Generate a single thinker based on input parameters.
 */
export async function bkEnhanceGenerateThinker(
  name: string,
  role: string,
  specialization?: string,
  aiConfig?: HelixAIOption,
) {
  const helix = createHelixService(aiConfig);
  const prompt = bkThinkerPrompts.enhance.find((p) => p.key === "generate")!;

  const template = Handlebars.compile(prompt.userPrompt);
  const userPrompt = template({
    name,
    role,
    specialization: specialization
      ? `, specialization: ${specialization}`
      : "",
  });

  try {
    const result = await helix.doChatStructuredFallback({
      system: prompt.systemPrompt,
      user: userPrompt,
      schema: singleThinkerSchema,
      temperature: 0.7,
      aiConfig,
    });
    return result;
  } catch (error) {
    console.error("[BKThinker.Enhance] Generate failed:", error);
    throw error;
  }
}
