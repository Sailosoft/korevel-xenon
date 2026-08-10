// bc.analytics.server.ts
//
// Sentiment Analytics server action — analyzes a resolved
// conversation to find which words shifted the customer's mood, and extracts
// recommended phrasing for the playbook library.

"use server";

import type { HelixAIOption } from "@/src/modules/helix";
import { bcContainer } from "../../container/bc.container";
import type { BCWordSentiment } from "./bc.analytics.entity";

const JSON_ONLY_SYSTEM_SUFFIX = `
  \n\n
  CRITICAL: Return ONLY a valid JSON object matching the requested structure.
  Do not include markdown formatting (like \`\`\`json), explanations, or
  introduction outside of the raw JSON object.
`;

export interface BCAnalyzeSessionInput {
  transcript: Array<{ role: string; external: string; sentiment?: number }>;
  personaName: string;
  caseTitle: string;
}

export interface BCAnalyzeSessionResult {
  summary: string;
  shiftWords: BCWordSentiment[];
  recommendedPhrases: string[];
}

export async function bcAnalyzeSession(
  input: BCAnalyzeSessionInput,
  aiConfig?: HelixAIOption,
): Promise<BCAnalyzeSessionResult> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const transcript = input.transcript
    .map(
      (m) =>
        `[${m.role}] ${m.external}${
          m.sentiment != null ? ` (sentiment ${m.sentiment.toFixed(2)})` : ""
        }`,
    )
    .join("\n");

  const systemPrompt = `
    You are a sentiment-analytics analyst for a customer-service training team.
    Analyze the transcript of a resolved conversation.

    - summary: how the customer's mood evolved and how the case was resolved.
    - shiftWords: the specific words/phrases that caused the mood to shift.
      For each give the word, an impact score (-1 to 1), and whether the shift
      was positive or negative.
    - recommendedPhrases: 3-6 phrases future agents should reuse.
  ${JSON_ONLY_SYSTEM_SUFFIX}`;

  const userPrompt = `
    Persona: ${input.personaName || "(unknown)"}
    Case: ${input.caseTitle || "(unknown)"}

    Transcript:
    ${transcript || "(empty)"}
  `;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "sentiment_analytics",
        description: "Word-level sentiment analysis of a resolved conversation.",
        properties: {
          summary: {
            type: "string",
            description: "How the customer's mood evolved and how the case was resolved.",
          },
          shiftWords: {
            type: "array",
            description: "Words/phrases that caused the mood shift.",
            items: {
              type: "object",
              description: "A single mood-shifting word.",
              properties: {
                word: { type: "string", description: "The word or phrase." },
                impact: {
                  type: "number",
                  description: "Impact score from -1 to 1.",
                },
                shift: {
                  type: "string",
                  description: '"positive" or "negative".',
                },
              },
            },
          },
          recommendedPhrases: {
            type: "array",
            description: "Phrases future agents should reuse.",
            items: {
              type: "string",
              description: "A reusable phrase.",
            },
          },
        },
      },
      temperature: 0.5,
      type: "balanced",
      aiConfig,
    });

    return result as BCAnalyzeSessionResult;
  } catch (error) {
    console.error("[BunnyCase] Session analysis failed:", error);
    throw error;
  }
}
