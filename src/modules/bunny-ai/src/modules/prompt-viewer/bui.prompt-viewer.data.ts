// bui.prompt-viewer.data.ts
//
// Prompt Registry — collects all prompt constants used across the bunny-ai
// module into a single, normalized collection for the PromptViewer.
// To add a new prompt source, import it and push an entry into the
// `promptViewerRegistry` array.

import { buiAuthorSkillPrompt } from "../author-skills/bui.author-skills.prompt";
import { buiAuthorPrompt } from "../authors/bui.author.prompt";
import { buiBookPrompt } from "../books/bui.book.prompt";
import { buiChapterPrompt } from "../books/bui.book-chapter.prompt";
import { buiChapterPromptContent } from "../books/bui.book-chapter.prompt.content";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PromptViewerEntry {
  /** Module / feature this prompt belongs to (used as a section header). */
  module: string;
  /** Human-readable label for this prompt group. */
  label: string;
  /** Short description of what this prompt is used for. */
  description: string;
  /** List of prompt variations under this group. */
  prompts: PromptVariant[];
}

export interface PromptVariant {
  /** The prompt type key (e.g. "professional", "creative", "default"). */
  type: string;
  /** The system prompt text. */
  systemPrompt: string;
  /** The user prompt text. */
  userPrompt: string;
  /** Optional extra prompt helper text (e.g. formatting instructions). */
  extraPrompt?: string;
}

// ── Normalisation helpers ──────────────────────────────────────────────────────

function fromPromptMap(
  module: string,
  label: string,
  description: string,
  map: Record<string, { systemPrompt: string; userPrompt: string }>,
): PromptViewerEntry {
  return {
    module,
    label,
    description,
    prompts: Object.entries(map).map(([type, value]) => ({
      type,
      systemPrompt: value.systemPrompt,
      userPrompt: value.userPrompt,
    })),
  };
}

// ── Registry — add new prompt sources here ─────────────────────────────────────

export const promptViewerRegistry: PromptViewerEntry[] = [
  // ── Author Skills ──────────────────────────────────────────────────────────
  {
    module: "Author Skills",
    label: "buiAuthorSkillPrompt.enhance",
    description:
      "Prompts used to enhance author skill descriptions with AI (professional, creative, short, detailed).",
    prompts: Object.entries(buiAuthorSkillPrompt.enhance).map(
      ([type, value]) => ({
        type,
        systemPrompt: value.systemPrompt,
        userPrompt: value.userPrompt,
      }),
    ),
  },

  // ── Authors ────────────────────────────────────────────────────────────────
  {
    module: "Authors",
    label: "buiAuthorPrompt.enhance",
    description:
      "Prompts used to enhance author biographies and metadata (professional, creative, short, basic).",
    prompts: Object.entries(buiAuthorPrompt.enhance).map(([type, value]) => ({
      type,
      systemPrompt: value.systemPrompt,
      userPrompt: value.userPrompt,
    })),
  },

  // ── Books ──────────────────────────────────────────────────────────────────
  {
    module: "Books",
    label: "buiBookPrompt.enhance",
    description:
      "Prompts used to enhance book titles & descriptions (comprehensive, marketing, academic, cinematic, minimalist).",
    prompts: Object.entries(buiBookPrompt.enhance).map(([type, value]) => ({
      type,
      systemPrompt: value.systemPrompt,
      userPrompt: value.userPrompt,
    })),
  },

  // ── Book Chapters (Structure) ──────────────────────────────────────────────
  {
    module: "Book Chapters",
    label: "buiChapterPrompt.generateChapters",
    description:
      "Prompts used to generate chapter outlines / structures based on a book profile.",
    prompts: Object.entries(buiChapterPrompt.generateChapters).map(
      ([type, value]) => ({
        type,
        systemPrompt: value.systemPrompt,
        userPrompt: value.userPrompt,
      }),
    ),
    // Include the shared extra prompt as an extra variant
  },

  // ── Book Chapter Content ───────────────────────────────────────────────────
  {
    module: "Book Chapters",
    label: "buiChapterPromptContent.prompt",
    description:
      "Prompts used to write full chapter content, each with a distinct narrative voice (default, character_driven, software_engineering, technology, medical, motivational).",
    prompts: Object.entries(buiChapterPromptContent.prompt).map(
      ([type, value]) => ({
        type,
        systemPrompt: value.systemPrompt,
        userPrompt: value.userPrompt,
      }),
    ),
  },
];

/**
 * Convenience getter that returns a flat list of all PromptVariant entries
 * regardless of their parent module grouping.
 */
export function getAllPromptVariants(): (PromptVariant & {
  module: string;
  label: string;
})[] {
  const flat: (PromptVariant & { module: string; label: string })[] = [];
  for (const entry of promptViewerRegistry) {
    for (const p of entry.prompts) {
      flat.push({ ...p, module: entry.module, label: entry.label });
    }
  }
  return flat;
}
