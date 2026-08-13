// BKThoughts.Prompt.ts
//
// Generative AI prompts for BKThought domain.

import type { BKCraftFormat } from "../craft/BKCraft.Types";
import { BKPromptCraftSystemSuffix } from "../craft/BKCraft.Prompt";
import type {
  BKStepGenerationMode,
  BKStepGenerationStrategy,
} from "./BKThoughtGeneration.Config";
import { bkGetStepGenerationMode } from "./BKThoughtGeneration.Config";

/**
 * Build the system prompt for a thought with its train of thoughts.
 */
export function BKPromptBuildThoughtSystem(
  thoughtName: string,
  thoughtContent: string,
  thinkerName?: string,
  thinkerDescription?: string,
  thinkerRole?: string,
): string {
  const personaSection = thinkerName
    ? `\n\nYou are embodying the persona of "${thinkerName}"${thinkerRole ? ` (${thinkerRole})` : ""}.${thinkerDescription ? `\n${thinkerDescription}` : ""}`
    : "";

  return `You are engaged in a structured thinking process called "${thoughtName}".

Core Thought:
${thoughtContent}${personaSection}

You are participating in a preplanned chain of thought conversation. Each turn represents a step in the thinking process.

CRITICAL INSTRUCTION — Strictly enforced:
1. OUTPUT ONLY the direct result for the current step — NO meta-questions, NO commentary, NO explanations, NO introductory phrases.
2. Do NOT ask questions or seek clarification. Just produce the output requested.
3. Do NOT wrap your response in conversational framing like "Here is my response:" or "I think...".
4. Build upon previous responses naturally by incorporating the context, but output only the substance.
5. If the step asks for a specific format or output, provide ONLY that output without additional text.

FAILURE TO FOLLOW THESE RULES WILL RESULT IN REJECTION.`;
}

/**
 * Build the user prompt for a specific train of thought step.
 */
export function BKPromptBuildTrainOfThought(
  name: string,
  thought: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  craftFormat?: BKCraftFormat,
): string {
  const historySection = conversationHistory?.length
    ? `\n\nConversation so far:\n${conversationHistory.map((m) => `[${m.role}]: ${m.content}`).join("\n")}\n`
    : "";

  const craftSuffix = craftFormat
    ? BKPromptCraftSystemSuffix(craftFormat)
    : "";

  return `${historySection}
--- Current Step: ${name} ---
${thought}${craftSuffix}`;
}

/**
 * Generic thought generation prompt.
 */
export function BKPromptGenerateThought(request: string): string {
  return `Generate a comprehensive thought structure based on the following request:

Request: ${request}

Create:
1. A main thought (system prompt / idea)
2. A series of train of thought steps (preplanned conversation turns)

For each train of thought step, include:
- name: A short name for this step
- thought: The content/instruction for this step
- order: The sequence number

Output as a JSON object with "thought" (string) and "trainOfThoughts" (array) fields.`;
}

/**
 * Prompt for generative AI step production.
 *
 * Produces a sequence of train-of-thought steps for the given thought using
 * the selected production mode and merge strategy (append vs override).
 */
export function BKPromptGenerateSteps(params: {
  mode: BKStepGenerationMode;
  strategy: BKStepGenerationStrategy;
  request: string;
  thoughtName: string;
  thoughtDescription?: string;
  thoughtContent: string;
  existingSteps?: Array<{ name: string; thought: string }>;
  /**
   * When true, the thought description is treated as the primary direction
   * for the generated steps (merged with any manual request).
   */
  useDescriptionAsDirection?: boolean;
}): string {
  const modeCfg = bkGetStepGenerationMode(params.mode);

  const existingSection =
    params.existingSteps && params.existingSteps.length > 0
      ? `\nExisting steps (keep generated steps coherent with these):\n${params.existingSteps
          .map((s, i) => `${i + 1}. ${s.name} — ${s.thought}`)
          .join("\n")}`
      : "";

  const strategySection =
    params.strategy === "append"
      ? "The generated steps will be APPENDED after the user's existing steps, so continue the sequence naturally and avoid duplicating what already exists."
      : "The generated steps will REPLACE the user's existing steps entirely, so produce a complete, self-contained sequence of steps.";

  const useDescAsDirection =
    params.useDescriptionAsDirection && !!params.thoughtDescription?.trim();

  const manualRequest = params.request?.trim();

  const directionSection = useDescAsDirection
    ? `User direction for the steps (from the thought description):\n${params.thoughtDescription?.trim()}${
        manualRequest
          ? `\n\nAdditional user direction:\n${manualRequest}`
          : ""
      }`
    : `User direction for the steps: ${
        manualRequest || "(generate a natural progression for the thought)"
      }`;

  return `Generate a sequence of train-of-thought steps for the thought below.

Thought Name: ${params.thoughtName}
Thought Description: ${params.thoughtDescription || "(none)"}
Thought Content:
${params.thoughtContent}${existingSection}

${directionSection}

MODE: ${modeCfg.label}
${modeCfg.instruction}

${strategySection}

For each step, provide:
- name: A short, descriptive label for the step
- thought: The detailed prompt/instruction the AI should execute for this step (rich markdown)
- order: The sequential index starting at 0

Output a JSON object with a "steps" array field. Each element is an object with "name" (string), "thought" (string), and "order" (number).`;
}
