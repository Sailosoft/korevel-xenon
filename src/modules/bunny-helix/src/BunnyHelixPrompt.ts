/**
 * BunnyHelixPrompt — Prompt builders for the AI record-creation flow.
 *
 * `buildSystemPrompt` produces a default system prompt from the module title
 * and the target field guidance; consumers may override it via
 * `BunnyHelixActionConfig.systemPrompt`. `buildUserPrompt` renders the modal's
 * input values as clearly-labeled sections for the model.
 */

import type { BunnyHelixPromptContext } from "./BunnyHelix.Interface";

/**
 * Build a default system prompt from the module title and the target fields'
 * accumulated guidance.
 *
 * @param ctx - Title, collected inputs, and per-target prompt guidance.
 * @returns A system prompt instructing the model to output only record fields.
 */
export function buildSystemPrompt(
  ctx: BunnyHelixPromptContext,
): string {
  const lines = [
    `You are generating record fields for "${ctx.title}".`,
    "",
    "Return ONLY a valid JSON object with the requested fields.",
    ctx.fieldPrompts ? `Guidance per field:\n${ctx.fieldPrompts}` : "",
  ].filter(Boolean);

  return lines.join("\n\n");
}

/**
 * Build a user prompt embedding the collected input values as labeled sections.
 *
 * @param inputs - The user-facing values collected in the modal.
 * @param fieldPrompts - Per-target prompt guidance (references the targets).
 * @returns A user prompt describing what to generate.
 */
export function buildUserPrompt(
  inputs: Record<string, unknown>,
  fieldPrompts: string,
): string {
  const sections = Object.entries(inputs)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([key, value]) => `${key}: ${String(value)}`);
  const body = sections.length > 0 ? sections.join("\n") : "(no input provided)";

  return `Using the following context, generate the record fields:

---
${body}
---

${fieldPrompts ? `Field guidance:\n${fieldPrompts}` : ""}

Respond with ONLY the JSON object of generated fields.`;
}
