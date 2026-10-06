"use server";

// BDAgent.Server — one-shot AI agent-configuration generation.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "./BDGeneration.Server";
import { bdBuildModeUser } from "./BDGeneration.Mode";
import type { BDAgentArtifact, BDAgentDraft } from "./BDAgent.Types";

export interface BDAgentGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  targetContext?: string;
  aiConfig?: BDAIConfigOverride;
}

const AGENT_DSL: HelixAISchemaOptions = {
  name: "agent_artifact",
  description: "AI agent configurations.",
  properties: {
    agents: {
      type: "array",
      description: "Agent definitions.",
      items: {
        type: "object",
        description: "An agent.",
        properties: {
          name: { type: "string", description: "Agent name." },
          prompt: {
            type: "string",
            description: "System prompt / instructions for the agent.",
          },
          description: {
            type: "string",
            description: "What the agent does.",
          },
          capabilities: {
            type: "array",
            description: "Capabilities the agent has.",
            items: {
              type: "object",
              description: "A capability.",
              properties: {
                name: { type: "string", description: "Capability name." },
                description: {
                  type: "string",
                  description: "Capability description.",
                },
              },
            },
          },
        },
      },
    },
  },
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeAgent(raw: unknown): BDAgentDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const name = asString(a.name);
  const prompt = asString(a.prompt);
  if (!name || !prompt) return null;
  const capabilities = Array.isArray(a.capabilities)
    ? a.capabilities
        .map((c) => {
          if (!c || typeof c !== "object") return null;
          const cap = c as Record<string, unknown>;
          const capName = asString(cap.name);
          if (!capName) return null;
          return {
            name: capName,
            description: asString(cap.description) || undefined,
          };
        })
        .filter(
          (c): c is { name: string; description: string | undefined } =>
            c !== null,
        )
    : [];
  return {
    name,
    prompt,
    description: asString(a.description) || undefined,
    capabilities,
  };
}

export async function bdGenerateAgents(
  params: BDAgentGenerateParams,
): Promise<BDAgentArtifact> {
  const system =
    "You are an AI orchestration architect. Design focused agents with clear " +
    "system prompts and explicit capabilities. Return only the structured " +
    "JSON requested.";

  const user = bdBuildModeUser({
    mode: params.mode,
    instruction: params.instruction,
    targetContext: params.targetContext,
  });

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: AGENT_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.4,
  });

  const agentsRaw = Array.isArray(raw.agents) ? raw.agents : [];
  const agents = agentsRaw
    .map(normalizeAgent)
    .filter((a): a is BDAgentDraft => a !== null);

  return { agents };
}
