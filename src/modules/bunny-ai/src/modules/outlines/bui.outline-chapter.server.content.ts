// bui.outline-chapter.server.content.ts
"use server";

import { runItemContent } from "./bui.outline-chapter.ai.server";
import { BUIOutlineParams } from "./bui.outline.entity";
import type { HelixAIOption } from "@/src/modules/helix";

/**
 * Server Action that runs a Generation Mode's context algorithm and returns
 * markdown ONLY.
 *
 * There is no prompt stuffing here: `buildItemContext` assembles a
 * structured messages array (system instruction, discrete context messages,
 * real user/assistant turns where the mode needs them, and a final task turn).
 * The array is sent verbatim through `ai.doChatWithHistory`.
 */
export async function buiOutlineChapterServerContent(
  params: BUIOutlineParams,
  generationType: string = "guide",
  generationMode: string = "sequential",
  aiConfig?: HelixAIOption,
) {
  try {
    const content = await runItemContent(
      params,
      generationType,
      generationMode,
      aiConfig,
    );

    return {
      success: true,
      content,
    };
  } catch (error) {
    console.error(
      "AI Item Content Generation failed at server layer:",
      error,
    );
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";
    throw new Error(
      `Failed to generate item content with AI.${detail ? ` ${detail}` : ""}`,
    );
  }
}
