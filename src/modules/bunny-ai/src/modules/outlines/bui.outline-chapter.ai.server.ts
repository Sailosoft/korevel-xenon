// bui.outline-chapter.ai.server.ts
//
// Server-only execution of a single Generation Mode content call. Shared by the
// Server Action (`buiOutlineChapterServerContent`) and the route handler that
// powers the parallel writing pool. Route Handlers are NOT serialized the way
// Server Actions are, so the client can run several of these concurrently.

import { buiContainer } from "../../container/bui.container";
import { buildItemContext } from "./bui.outline-chapter.generate-mode";
import { BUIOutlineParams } from "./bui.outline.entity";
import type { HelixAIOption } from "@/src/modules/helix";

export async function runItemContent(
  params: BUIOutlineParams,
  generationType: string,
  generationMode: string,
  aiConfig?: HelixAIOption,
): Promise<string> {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  const messages = buildItemContext(params, generationType, generationMode);

  const response = await ai.doChatWithHistory({
    messages,
    temperature: 0.7,
    aiConfig,
  });

  return response.trim();
}
