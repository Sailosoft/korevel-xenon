// BDGeneration.Mode.ts — client-safe helpers shared by every BunnyDev
// AI-generation panel and server action.
//
// This module is intentionally NOT a "use server" file: it exports plain
// constants and pure functions that both the browser panel and the server
// actions import.

import type { BDGenerationMode } from "../../BDDomain.Types";

export const BD_GENERATION_MODE_LABELS: Record<BDGenerationMode, string> = {
  create: "Create",
  append: "Append",
  update: "Update",
  replace: "Replace",
};

/** One-line instruction describing how the AI should treat the target. */
export function bdModeGuidance(mode: BDGenerationMode): string {
  switch (mode) {
    case "append":
      return (
        "Existing target content is provided. Add ONLY new items to it; do " +
        "not repeat or modify existing items. Return only the new items."
      );
    case "update":
      return (
        "Existing target content is provided. Modify it per the instruction. " +
        "Return ONLY items that are new or changed; do not repeat unchanged " +
        "items."
      );
    case "replace":
      return (
        "Existing target content is provided. Return the COMPLETE replacement " +
        "set of items for the target; it will fully replace the existing " +
        "contents."
      );
    case "create":
    default:
      return "Create brand-new records from scratch; ignore existing records.";
  }
}

/** Pretty-print a target record for the prompt, capped to `maxChars`. */
export function bdSerializeTarget(record: unknown, maxChars = 12000): string {
  let json: string;
  try {
    json = JSON.stringify(record, null, 2) ?? "null";
  } catch {
    json = String(record);
  }
  if (json.length <= maxChars) return json;
  return `${json.slice(0, maxChars)}\n…(truncated)`;
}

/** Compose the shared user-prompt prefix for a generation call. */
export function bdBuildModeUser(params: {
  mode: BDGenerationMode;
  instruction: string;
  targetContext?: string;
  /** Subsystem-specific context (schema basis, statuses, doc type, …). */
  context?: string;
}): string {
  const context = params.context ? `\n${params.context}` : "";
  const target = params.targetContext
    ? `\n\nExisting target:\n${params.targetContext}`
    : "";
  return (
    `Mode: ${params.mode}. ${bdModeGuidance(params.mode)}${context}${target}` +
    `\n\nInstruction: ${params.instruction}`
  );
}
