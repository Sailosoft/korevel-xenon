// BKThoughts.Prompt.ts
//
// Generative AI prompts for BKThought domain.

import type { BKCraftFormat } from "../craft/BKCraft.Types";
import { BKPromptCraftSystemSuffix } from "../craft/BKCraft.Prompt";

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

You are participating in a preplanned chain of thought conversation. Each turn represents a step in the thinking process. Respond naturally as the thinker, building upon previous responses in the conversation.`;
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
