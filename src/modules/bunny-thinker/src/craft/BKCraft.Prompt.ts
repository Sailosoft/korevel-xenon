// BKCraft.Prompt.ts
//
// Generative AI prompts for BKCraft output formatting.
// These prompts enforce strict formatting, no commentary, no wrapping, and no questions.

import type { BKCraftFormat } from "./BKCraft.Types";
import { BKCraftFormatDescriptions } from "./BKCraft.Types";

/**
 * Craft instruction builder — builds a strict formatting directive for AI output.
 */
export function BKPromptBuildCraftInstruction(
  format: BKCraftFormat,
  customInstruction?: string,
): string {
  const baseDescription = BKCraftFormatDescriptions[format];

  return `CRITICAL FORMATTING INSTRUCTION - Strictly enforced:

You are in CRAFT MODE (format: ${format}).

${baseDescription}

RULES:
1. OUTPUT ONLY the formatted content — NO commentary, NO explanations, NO meta-questions.
2. Do NOT wrap the output in code blocks unless the format itself requires it.
3. Do NOT include any introductory or concluding text.
4. Just output the pure ${format} content exactly as requested.
${customInstruction ? `\nCUSTOM INSTRUCTION:\n${customInstruction}` : ""}

FAILURE TO FOLLOW THESE RULES WILL RESULT IN REJECTION.`;
}

/**
 * Build the craft system prompt suffix to append to any AI call.
 */
export function BKPromptCraftSystemSuffix(
  format: BKCraftFormat,
  customInstruction?: string,
): string {
  return `\n\n---\n${BKPromptBuildCraftInstruction(format, customInstruction)}`;
}
