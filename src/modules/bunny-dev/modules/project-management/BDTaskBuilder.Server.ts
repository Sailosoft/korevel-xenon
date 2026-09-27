"use server";

// BDTaskBuilder.Server — one-shot AI task/backlog generation for the board.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import type {
  BDBoardDraft,
  BDTaskArtifact,
  BDTaskDraft,
} from "./BDTask.Types";

export interface BDTaskGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  /** Existing column status names the AI should use. */
  statuses?: string[];
  aiConfig?: BDAIConfigOverride;
}

const TASK_DSL: HelixAISchemaOptions = {
  name: "task_artifact",
  description: "Board task/backlog items.",
  properties: {
    boards: {
      type: "array",
      description: "Boards with tasks.",
      items: {
        type: "object",
        description: "A board.",
        properties: {
          name: { type: "string", description: "Board name." },
          tasks: {
            type: "array",
            description: "Tasks on the board.",
            items: {
              type: "object",
              description: "A task.",
              properties: {
                name: { type: "string", description: "Task title." },
                description: {
                  type: "string",
                  description: "Task description.",
                },
                type: {
                  type: "string",
                  description: "epic, story, task, bug, subtask or spike.",
                },
                priority: {
                  type: "string",
                  description:
                    "lowest, low, medium, high, highest or blocker.",
                },
                status: {
                  type: "string",
                  description: "Column status name (e.g. To Do).",
                },
                storyPoints: {
                  type: "number",
                  description: "Estimate in story points.",
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

function normalizeTask(raw: unknown): BDTaskDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const name = asString(t.name);
  if (!name) return null;
  return {
    key: asString(t.key) || undefined,
    name,
    description: asString(t.description) || undefined,
    type: asString(t.type) || "task",
    priority: asString(t.priority) || "medium",
    status: asString(t.status) || undefined,
    storyPoints: typeof t.storyPoints === "number" ? t.storyPoints : undefined,
  };
}

function normalizeBoard(raw: unknown): BDBoardDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const name = asString(b.name) || "Generated Board";
  return {
    name,
    tasks: Array.isArray(b.tasks)
      ? b.tasks.map(normalizeTask).filter((t): t is BDTaskDraft => t !== null)
      : [],
  };
}

export async function bdGenerateTasks(
  params: BDTaskGenerateParams,
): Promise<BDTaskArtifact> {
  const statusHint =
    params.statuses && params.statuses.length > 0
      ? `\nUse only these column statuses: ${params.statuses.join(", ")}.`
      : "";

  const system =
    "You are a product/project manager. Break work into clear, actionable " +
    "tasks with sensible types and priorities. Return only the structured " +
    "JSON requested.";

  const user = `Mode: ${params.mode}.${statusHint}\n\nInstruction: ${params.instruction}`;

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: TASK_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.4,
  });

  const boardsRaw = Array.isArray(raw.boards) ? raw.boards : [];
  const boards = boardsRaw
    .map(normalizeBoard)
    .filter((b): b is BDBoardDraft => b !== null);

  return { boards };
}
