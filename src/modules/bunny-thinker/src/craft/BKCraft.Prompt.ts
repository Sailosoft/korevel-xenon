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

You are in CRAFT MODE.
Target output format: ${format}.

${baseDescription}

RULES:
1. OUTPUT ONLY the formatted ${format} content. NO commentary, NO explanations, NO meta-questions, and no labels like "Here is the result:".
2. Preserve meaningful newlines. Do not collapse everything into one paragraph.
3. Do not add any extra wrapper text outside the requested ${format} content.
4. Write the actual content fully and specifically. If the user asks for structure (sections, bullets, tables, lists), you MUST use the natural structure of the target format.
5. Do NOT wrap the output in code blocks unless the user explicitly requests a code fence OR the requested format is code-centric.
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
