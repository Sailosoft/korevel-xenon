// bui.topic.server.ts
"use server";

import Handlebars from "handlebars";
import { buiContainer } from "../../container/bui.container";
import { buiTopicPrompt } from "./bui.topic.prompt";
import type { HelixAIOption } from "@/src/modules/helix";

export interface BUITopicServerParams {
  brief: string;
  title?: string;
}

export interface BUITopicServerResult {
  title: string;
  description: string;
}

/** Extract and parse the first JSON object from a raw AI response. */
function parseTopicJson(raw: string): BUITopicServerResult {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The AI did not return a valid topic JSON object.");
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
    title?: unknown;
    description?: unknown;
  };

  const title = String(parsed.title ?? "").trim();
  const description = String(parsed.description ?? "").trim();

  if (!title) {
    throw new Error("The AI returned a topic without a title.");
  }

  return { title, description };
}

/**
 * Server Action that compiles a Generation-Type-framed Topic prompt and runs AI
 * generation, returning a parsed reusable Topic.
 */
export async function buiTopicServerGenerate(
  params: BUITopicServerParams,
  generationType: string = "guide",
  aiConfig?: HelixAIOption,
): Promise<BUITopicServerResult> {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  const selected =
    buiTopicPrompt.generateTopic.find((p) => p.key === generationType) ||
    buiTopicPrompt.generateTopic[0];

  const systemPrompt = `${selected.systemPrompt}
Artifact framing: ${selected.framing}
${buiTopicPrompt.extraPrompt}`;

  const userPrompt = Handlebars.compile(buiTopicPrompt.userPrompt)({
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

    return parseTopicJson(response);
  } catch (error) {
    console.error("AI Topic Generation failed at server layer:", error);
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";
    throw new Error(
      `Failed to generate topic with AI.${detail ? ` ${detail}` : ""}`,
    );
  }
}
