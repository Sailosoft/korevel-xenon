// bui.outline.server.ts
"use server";

import Handlebars from "handlebars";
import { buiContainer } from "../../container/bui.container";
import { buiOutlinePrompt } from "./bui.outline.prompt";
import { BUIOutlineParams } from "./bui.outline.entity";
import type { HelixAIOption } from "@/src/modules/helix";

/**
 * Server Action that compiles the outline structure prompt and returns the raw
 * AI response (a JSON string with `summary` + `items`).
 */
export async function buiOutlineServerGenerate(
  params: BUIOutlineParams,
  generationType: string = "guide",
  includeTopic: boolean = true,
  aiConfig?: HelixAIOption,
): Promise<string> {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  const selected =
    buiOutlinePrompt.generateStructure.find((p) => p.key === generationType) ||
    buiOutlinePrompt.generateStructure[0];

  // The selected Topic is included by default; omit it only when opted out.
  const structureParams = {
    ...params,
    topic: includeTopic ? params.topic : undefined,
  };

  const hasAuthor =
    !!params.author && !!(params.author.name || params.author.description);
  const templateSource = hasAuthor
    ? buiOutlinePrompt.authorProfileUserPrompt
    : buiOutlinePrompt.noAuthorUserPrompt;

  const systemPrompt = `${selected.systemPrompt}\n${buiOutlinePrompt.extraPrompt}`;
  const userPrompt = Handlebars.compile(templateSource)(structureParams);

  try {
    const response = await ai.doChat({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.7,
      aiConfig,
    });

    return response;
  } catch (error) {
    console.error("AI Outline Structure Generation failed at server layer:", error);
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";
    throw new Error(
      `Failed to generate the outline structure with AI.${detail ? ` ${detail}` : ""}`,
    );
  }
}

export interface BUIOutlineDraftParams {
  brief: string;
  title?: string;
}

export interface BUIOutlineDraftResult {
  title: string;
  description: string;
  additionalPrompt?: string;
}

/** Extract and parse the first JSON object from a raw AI response. */
function parseDraftJson(raw: string): BUIOutlineDraftResult {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The AI did not return a valid outline JSON object.");
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
    title?: unknown;
    description?: unknown;
    additionalPrompt?: unknown;
  };

  const title = String(parsed.title ?? "").trim();
  if (!title) {
    throw new Error("The AI returned an outline without a title.");
  }

  return {
    title,
    description: String(parsed.description ?? "").trim(),
    additionalPrompt:
      parsed.additionalPrompt != null
        ? String(parsed.additionalPrompt).trim()
        : undefined,
  };
}

/**
 * Server Action that AI-generates a single outline record (title, description,
 * optional AI instruction), framed by a Generation Type.
 */
export async function buiOutlineServerGenerateDraft(
  params: BUIOutlineDraftParams,
  generationType: string = "guide",
  aiConfig?: HelixAIOption,
): Promise<BUIOutlineDraftResult> {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  const selected =
    buiOutlinePrompt.generateOutlineDraft.find((p) => p.key === generationType) ||
    buiOutlinePrompt.generateOutlineDraft[0];

  const systemPrompt = `${selected.systemPrompt}
Artifact framing: ${selected.framing}
${buiOutlinePrompt.draftExtraPrompt}`;

  const userPrompt = Handlebars.compile(buiOutlinePrompt.draftUserPrompt)({
    brief: params.brief,
    title: params.title ?? "",
  });

  try {
    const response = await ai.doChat({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.7,
      aiConfig,
    });

    return parseDraftJson(response);
  } catch (error) {
    console.error("AI Outline Draft Generation failed at server layer:", error);
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";
    throw new Error(
      `Failed to generate the outline with AI.${detail ? ` ${detail}` : ""}`,
    );
  }
}
