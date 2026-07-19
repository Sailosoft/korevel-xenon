/**
 * BFlowPoolAgent.Server — Server action for AI-powered agent team generation.
 *
 * Takes a natural-language description of a team and uses Helix AI to generate
 * multiple structured agent definitions (name, role, prompt, suggested model).
 *
 * Usage (client-side):
 * ```ts
 * const agents = await bflowPoolAgentGenerateTeam({
 *   poolId: "abc-123",
 *   description: "Content Writer, Code Reviewer, Data Analyst",
 *   aiConfig: { provider: "openai", model: "gpt-4o" },
 * });
 * ```
 */
"use server";

import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import {
  HELIX_AI_PROVIDERS,
  type HelixAIConfig,
  type HelixAIProvider,
} from "@/src/modules/helix";
import type { BFlowAIConfigValue } from "../ai-config/BFlowAIConfig.Types";

// ─── Input & Output Types ───────────────────────────────────────────

export interface BFlowPoolAgentGenerateTeamParams {
  /** The pool to assign agents to */
  poolId: string;
  /** Natural-language description of the team/agents needed */
  description: string;
  /** Optional AI config override (provider + model) */
  aiConfig?: BFlowAIConfigValue;
}

export interface BFlowGeneratedAgent {
  /** Unique name/slug for the agent */
  name: string;
  /** Role descriptor */
  role: string;
  /** Full system prompt / persona definition */
  prompt: string;
  /** Suggested provider (optional — inherits from pool default) */
  provider?: string;
  /** Suggested model (optional — inherits from pool default) */
  model?: string;
}

// ─── Schema for structured AI output ────────────────────────────────

const agentTeamSchema = {
  name: "agent_team_generation",
  description:
    "Generates a team of AI agents with names, roles, and system prompts based on a description.",
  properties: {
    agents: {
      type: "array",
      description:
        "An array of agent definitions that form the team. Each agent has a name, role, prompt, and optional provider/model.",
      items: {
        type: "object",
        description: "A single agent definition.",
        properties: {
          name: {
            type: "string",
            description:
              "A short, unique kebab-case slug identifying this agent (e.g. 'content-writer', 'code-reviewer'). Max 48 characters, alphanumeric with hyphens only.",
          },
          role: {
            type: "string",
            description:
              "A concise title or role descriptor for the agent (e.g. 'Content Writer', 'Senior Code Reviewer').",
          },
          prompt: {
            type: "string",
            description:
              "A detailed system prompt that defines the agent's persona, expertise, behavior, and constraints. Should be comprehensive and actionable.",
          },
        },
      },
    },
  },
} as const;

const systemPrompt = `You are an expert at designing and assembling AI agent teams for complex workflows.

Given a user's description of the team they need, you will:
1. Analyze the description to identify distinct agent roles needed
2. For each role, generate a unique agent with:
   - A short kebab-case name (e.g. "content-strategist")
   - A clear, descriptive role title
   - A comprehensive system prompt that defines the agent's persona, expertise, methodology, output expectations, and constraints

QUALITY GUIDELINES FOR SYSTEM PROMPTS:
- Each prompt should be 3-8 sentences long
- Define the agent's core expertise and area of focus
- Specify how the agent should approach tasks
- Include any relevant constraints or output expectations
- Make prompts distinct from each other — no two agents should have the same prompt

Return ONLY a valid JSON object matching the requested structure. Do not include any markdown formatting, explanations, or introduction outside of the raw JSON.`;

/**
 * Build the user prompt by injecting the description.
 */
function buildUserPrompt(description: string): string {
  return `Generate a team of AI agents based on the following description:

---
${description}
---

Analyze this description carefully. Identify the distinct roles and specialties needed, then generate 1-8 agents that together form a cohesive team.

For each agent, provide:
- name: A unique kebab-case identifier
- role: A descriptive title
- prompt: A detailed system prompt defining the agent's persona and expertise`;
}

// ─── Server Action ──────────────────────────────────────────────────

/**
 * Generates a team of AI agent definitions using Helix AI.
 * Each agent includes a name, role, and system prompt tailored to the
 * provided description.
 *
 * @param params - The generation parameters
 * @returns An array of generated agent definitions
 *
 * @throws If the AI service fails or returns invalid data
 */
export async function bflowPoolAgentGenerateTeam(
  params: BFlowPoolAgentGenerateTeamParams,
): Promise<BFlowGeneratedAgent[]> {
  const { poolId, description, aiConfig } = params;

  if (!description.trim()) {
    throw new Error("Description is required to generate agents.");
  }

  // ── 1. Resolve AI config ──────────────────────────────────────────
  const activeProvider = (aiConfig?.provider || "default") as HelixAIProvider;
  const modelOverride = aiConfig?.model;

  const providers = HELIX_AI_PROVIDERS.map((p) => {
    if (p.provider === activeProvider && modelOverride) {
      return { ...p, model: modelOverride };
    }
    return p;
  });

  const helixConfig: HelixAIConfig = {
    activeProvider,
    providers,
  };

  const ai = new HelixAIService({
    config: { ai: helixConfig },
    aiSchema: new HelixAISchemaService(),
  });

  // ── 2. Compile the user prompt ────────────────────────────────────
  const userPrompt = buildUserPrompt(description);

  // ── 3. Call AI with structured output ─────────────────────────────
  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: agentTeamSchema,
      temperature: 0.7,
    });

    if (
      !result ||
      !result.agents ||
      !Array.isArray(result.agents) ||
      result.agents.length === 0
    ) {
      throw new Error("AI returned an empty agent list. Please try again.");
    }

    // ── 4. Validate and normalize the generated agents ───────────────
    const agents: BFlowGeneratedAgent[] = result.agents.map(
      (agent: { name?: string; role?: string; prompt?: string }) => {
        const name = (agent.name || "")
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 48)
          || `agent-${Math.random().toString(36).slice(2, 8)}`;

        return {
          name,
          role: agent.role || name.replace(/-/g, " "),
          prompt:
            agent.prompt ||
            `You are an AI agent specialized in: ${agent.role || name}.\n\nApply your expertise with precision and thoroughness.`,
        };
      },
    );

    return agents;
  } catch (error) {
    console.error(
      "[BFlowPoolAgent.Server] Team generation failed:",
      error,
    );
    throw new Error(
      `Failed to generate agent team: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
