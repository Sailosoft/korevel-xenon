"use server";

// BDFileAI.Server — server action that drives Helix to produce file patches.
//
// The model returns an ordered array of { patternToReplaceStart,
// patternToReplaceEnd, contentReplace } objects. The client applies them and
// shows a diff before accepting. API keys never reach the UI.

import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import {
  BD_MAX_PATTERN_WORDS,
  validatePatchPatterns,
  type BDFilePatch,
} from "./BDFile.Patch";

export interface BDFileAssistParams {
  fileName: string;
  language?: string;
  content: string;
  instruction: string;
  aiConfig?: BDAIConfigOverride;
}

/** Cap the file body sent to the model to keep prompts within budget. */
const MAX_CONTENT_CHARS = 20000;

const PATCH_DSL: HelixAISchemaOptions = {
  name: "file_patches",
  description:
    "An ordered list of patches that transform the file. Each patch replaces " +
    "an inclusive region bounded by two verbatim patterns.",
  properties: {
    patches: {
      type: "array",
      description: "Patches, applied to the file in order.",
      items: {
        type: "object",
        description: "A single replacement patch.",
        properties: {
          patternToReplaceStart: {
            type: "string",
            description:
              "First line(s) of the region to replace, copied verbatim from " +
              "the file. Must be unique in the file and at most " +
              `${BD_MAX_PATTERN_WORDS} words.`,
          },
          patternToReplaceEnd: {
            type: "string",
            description:
              "Last line(s) of the region to replace, copied verbatim from " +
              "the file (inclusive of the start when replacing one line). " +
              "Must appear after patternToReplaceStart and be at most " +
              `${BD_MAX_PATTERN_WORDS} words.`,
          },
          contentReplace: {
            type: "string",
            description:
              "Text that replaces the inclusive region bounded by the two " +
              "patterns. Use an empty string to delete the region.",
          },
        },
      },
    },
  },
};

const SYSTEM_PROMPT =
  "You are an expert code and document editor. You are given a file's current " +
  "content and a user request. Return ONLY a JSON object with a `patches` array " +
  "of replacement patches — no explanations, no markdown fences.\n\n" +
  "Rules for every patch:\n" +
  "- `patternToReplaceStart` is the first line (or lines) of the region to " +
  "change, copied EXACTLY character-for-character from the file (including " +
  "indentation), and it must be unique in the file.\n" +
  "- `patternToReplaceEnd` is the last line (or lines) of the region, copied " +
  "EXACTLY, and must appear after the start pattern. To replace a single line, " +
  "make it identical to `patternToReplaceStart`. The region is inclusive of " +
  "both patterns.\n" +
  "- `contentReplace` is the new text that replaces that inclusive region. Use " +
  "an empty string to delete it.\n" +
  "- Keep both patterns SHORT: each must be at most " +
  `${BD_MAX_PATTERN_WORDS} words (usually 1-3 lines). Use ` +
  "only as much text as needed to be unique — never paste a large block.\n" +
  "- For pure insertions, anchor on a nearby unique line and repeat it in both " +
  "patterns, putting the inserted text in `contentReplace` around the anchor.\n" +
  "- Order patches top-to-bottom where possible. Keep each region as small as " +
  "possible while staying unique.\n" +
  "- Never invent content that is not requested.";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizePatch(raw: unknown): BDFilePatch | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  const start = asString(entry.patternToReplaceStart);
  if (!start) return null;
  return {
    patternToReplaceStart: start,
    patternToReplaceEnd: asString(entry.patternToReplaceEnd),
    contentReplace: asString(entry.contentReplace),
  };
}

/**
 * Ask the AI to edit the file and return the resulting patches, ready to be
 * applied client-side with `applyFilePatches`.
 */
export async function bdFileAssist(
  params: BDFileAssistParams,
): Promise<BDFilePatch[]> {
  const language = params.language ? `Language: ${params.language}\n` : "";
  const truncated = params.content.length > MAX_CONTENT_CHARS;
  const body = truncated
    ? `${params.content.slice(0, MAX_CONTENT_CHARS)}\n…(truncated)`
    : params.content;

  const user =
    `File: ${params.fileName}\n${language}\n` +
    `### Current content:\n${body}\n\n` +
    `### Request:\n${params.instruction}`;

  const raw = await bdGenerateStructured({
    system: SYSTEM_PROMPT,
    user,
    schema: PATCH_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.2,
    maxToken: 8000,
  });

  const list = Array.isArray(raw.patches) ? raw.patches : [];
  const patches = validatePatchPatterns(
    list
      .map(normalizePatch)
      .filter((patch): patch is BDFilePatch => patch !== null),
  );

  if (patches.length === 0) {
    throw new Error("The assistant returned no changes.");
  }

  return patches;
}
