/**
 * BSAgentGenerate.Server — Server actions for AI-powered agent + agent pool
 * generation in Bunny AI Studio.
 *
 * Mirrors Bunny Flow's BFlowPoolAgent.Server: takes a natural-language
 * description and uses Helix AI structured output to generate:
 *   - bsAgentGenerateTeam():  a team of BSAgent definitions (name, persona, skills)
 *   - bsAgentGeneratePool():  an agent pool (name, description) + its initial agents
 *
 * The generated definitions are saved to IndexedDB by the caller (modal).
 */
"use server";

import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import {
  HELIX_AI_PROVIDERS,
  type HelixAIConfig,
  type HelixAIOption,
  type HelixAIProvider,
} from "@/src/modules/helix";

// ─── Input & Output Types ───────────────────────────────────────────

export interface BSGeneratedAgent {
  /** Unique kebab-case slug (used as display name) */
  name: string;
  /** Persona / system instruction */
  persona: string;
  /** Skill tags (joined as a comma-separated string on save) */
  skills: string[];
}

export interface BSGeneratedPool {
  name: string;
  description: string;
}

export interface BSGenerateAgentsParams {
  /** Natural-language description of the agents/team needed */
  description: string;
  /** Optional AI provider + model override */
  aiConfig?: HelixAIOption;
}

export interface BSGeneratePoolParams {
  /** Natural-language description of the pool + its agents */
  description: string;
  /** Optional AI provider + model override */
  aiConfig?: HelixAIOption;
}

// ─── Schemas for structured AI output ───────────────────────────────

const agentSchema = {
  type: "object",
  description: "A single agent definition.",
  properties: {
    name: {
      type: "string",
      description:
        "A short, unique kebab-case slug identifying this agent (e.g. 'content-writer', 'code-reviewer'). Max 48 characters, alphanumeric with hyphens only.",
    },
    persona: {
      type: "string",
      description:
        "A detailed system prompt / persona that defines the agent's expertise, behavior, methodology, output expectations, and constraints. Should be comprehensive and actionable.",
    },
    skills: {
      type: "array",
      description:
        "A list of skills or capability tags for this agent (e.g. ['Code Review', 'Debugging', 'Refactoring']).",
      items: {
        type: "string",
        description: "A single skill or capability tag.",
      },
    },
  },
} as const;

const agentTeamSchema = {
  name: "bs_agent_team_generation",
  description:
    "Generates a team of AI agents with names, personas, and skills based on a description.",
  properties: {
    agents: {
      type: "array",
      description:
        "An array of agent definitions that form the team. Each agent has a name, persona, and skills.",
      items: agentSchema,
    },
  },
} as const;

const agentPoolSchema = {
  name: "bs_agent_pool_generation",
  description:
    "Generates an agent pool definition (name + description) and a set of AI agents that belong to it.",
  properties: {
    pool: {
      type: "object",
      description: "The generated agent pool definition.",
      properties: {
        name: {
          type: "string",
          description:
            "A short, descriptive name for the agent pool (e.g. 'Content Writing Team').",
        },
        description: {
          type: "string",
          description: "A concise description of the pool's purpose.",
        },
      },
    },
    agents: {
      type: "array",
      description: "The initial set of agents that belong to this pool.",
      items: agentSchema,
    },
  },
} as const;

// ─── Prompts ─────────────────────────────────────────────────────────

const systemPrompt = `You are an expert at designing and assembling AI agent teams for complex workflows.

Given a user's description of the agents they need, you will:
1. Analyze the description to identify distinct agent roles needed
2. For each role, generate a unique agent with:
   - A short kebab-case name (e.g. "content-strategist")
   - A comprehensive persona / system prompt that defines the agent's expertise, methodology, output expectations, and constraints
   - A list of relevant skills / capability tags

QUALITY GUIDELINES FOR PERSONAS:
- Each persona should be 3-8 sentences long
- Define the agent's core expertise and area of focus
- Specify how the agent should approach tasks
- Include any relevant constraints or output expectations
- Make personas distinct from each other — no two agents should have the same persona

Return ONLY a valid JSON object matching the requested structure. Do not include any markdown formatting, explanations, or introduction outside of the raw JSON.`;

function buildTeamUserPrompt(description: string): string {
  return `Generate AI agents based on the following description:

---
${description}
---

Analyze this description carefully. Identify the distinct roles and specialties needed, then generate 1-8 agents that together form a cohesive team.

For each agent, provide:
- name: A unique kebab-case identifier
- persona: A detailed system prompt defining the agent's persona and expertise
- skills: A list of relevant skill tags`;
}

function buildPoolUserPrompt(description: string): string {
  return `Generate an AI agent pool based on the following description:

---
${description}
---

Analyze this description carefully. First propose a concise, descriptive name and purpose for the agent pool. Then identify the distinct roles and specialties needed, and generate 1-8 agents that together form a cohesive team for this pool.

Return:
- pool.name: A short, descriptive pool name
- pool.description: A concise description of the pool's purpose
- agents: An array of agents, each with a unique kebab-case name, a detailed persona / system prompt, and a list of skills`;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function resolveHelixService(aiConfig?: HelixAIOption): HelixAIService {
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

  return new HelixAIService({
    config: { ai: helixConfig },
    aiSchema: new HelixAISchemaService(),
  });
}

function normalizeName(raw: unknown): string {
  const name = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48)
    .trim();
  return name || `agent-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0);
}

function normalizeAgent(agent: {
  name?: string;
  persona?: string;
  skills?: string[];
}): BSGeneratedAgent {
  const name = normalizeName(agent.name);
  const role = name.replace(/-/g, " ");
  return {
    name,
    persona:
      String(agent.persona || "").trim() ||
      `You are an AI agent specialized in: ${role}.\n\nApply your expertise with precision and thoroughness.`,
    skills: normalizeSkills(agent.skills),
  };
}

// ─── Server Actions ──────────────────────────────────────────────────

/**
 * Generates a team of BSAgent definitions (name, persona, skills) using Helix AI.
 *
 * @param params - Generation parameters
 * @returns An array of generated agent definitions
 * @throws If the AI service fails or returns invalid data
 */
export async function bsAgentGenerateTeam(
  params: BSGenerateAgentsParams,
): Promise<BSGeneratedAgent[]> {
  const { description, aiConfig } = params;

  if (!description.trim()) {
    throw new Error("Description is required to generate agents.");
  }

  try {
    const ai = resolveHelixService(aiConfig);

    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: buildTeamUserPrompt(description),
      schema: agentTeamSchema,
      temperature: 0.7,
    });

    if (
      !result ||
      !Array.isArray(result.agents) ||
      result.agents.length === 0
    ) {
      throw new Error("AI returned an empty agent list. Please try again.");
    }

    return result.agents.map(normalizeAgent);
  } catch (error) {
    console.error(
      "[BSAgentGenerate.Server] Agent team generation failed:",
      error,
    );
    throw new Error(
      `Failed to generate agents: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generates an agent pool (name + description) plus its initial agents using Helix AI.
 *
 * @param params - Generation parameters
 * @returns The generated pool definition and its agents
 * @throws If the AI service fails or returns invalid data
 */
export async function bsAgentGeneratePool(
  params: BSGeneratePoolParams,
): Promise<{ pool: BSGeneratedPool; agents: BSGeneratedAgent[] }> {
  const { description, aiConfig } = params;

  if (!description.trim()) {
    throw new Error("Description is required to generate an agent pool.");
  }

  try {
    const ai = resolveHelixService(aiConfig);

    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: buildPoolUserPrompt(description),
      schema: agentPoolSchema,
      temperature: 0.7,
    });

    const poolRaw = (result?.pool ?? {}) as {
      name?: string;
      description?: string;
    };
    const pool: BSGeneratedPool = {
      name:
        String(poolRaw.name || "").trim() ||
        `Agent Pool ${new Date().toLocaleDateString()}`,
      description: String(poolRaw.description || "").trim(),
    };

    const agents = Array.isArray(result?.agents)
      ? result.agents.map(normalizeAgent)
      : [];
    if (agents.length === 0) {
      throw new Error("AI returned no agents for the pool. Please try again.");
    }

    return { pool, agents };
  } catch (error) {
    console.error("[BSAgentGenerate.Server] Pool generation failed:", error);
    throw new Error(
      `Failed to generate agent pool: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
