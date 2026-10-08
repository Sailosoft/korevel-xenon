// bui.outline-chapter.prompt.content.ts
//
// Public facade for the item content prompts. The per-mode instructions
// and context algorithms live in `bui.outline-chapter.generate-mode.ts`; this
// module exposes them in the shape the UI and Prompt Viewer consume.

import {
  BUI_OUTLINE_GENERATION_TYPES,
  type BUIOutlineGenerationType,
} from "./bui.outline.prompt";
import {
  BUI_OUTLINE_GENERATE_MODES,
  buildOutlinePromptPreview,
  type BUIOutlineGenerateMode,
} from "./bui.outline-chapter.generate-mode";

/** A Generation Mode as consumed by the UI (metadata + instructions). */
export type BUIOutlineChapterPromptMode = BUIOutlineGenerateMode;

export interface BUIOutlineChapterPrompt {
  key: string;
  name: string;
  label: string;
  /** Preview of the system message (persona + mode instruction). */
  systemPrompt: string;
  /** Preview of the final task message. */
  userPrompt: string;
}

export interface BUIOutlineChapterPromptContent {
  types: BUIOutlineGenerationType[];
  modes: BUIOutlineChapterPromptMode[];
  build: (
    generationType: string,
    generationMode: string,
  ) => BUIOutlineChapterPrompt;
}

export const buiOutlineChapterPromptContent: BUIOutlineChapterPromptContent = {
  types: BUI_OUTLINE_GENERATION_TYPES,
  modes: BUI_OUTLINE_GENERATE_MODES,
  build: buildOutlinePromptPreview,
};
