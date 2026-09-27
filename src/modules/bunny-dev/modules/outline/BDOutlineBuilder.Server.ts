"use server";

// BDOutlineBuilder.Server — one-shot AI outline generation / expansion.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import type {
  BDOutlineArtifact,
  BDOutlineDraft,
  BDOutlineTopicDraft,
} from "./BDOutline.Types";

export interface BDOutlineGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  aiConfig?: BDAIConfigOverride;
}

const TOPIC_PROPERTIES = {
  title: { type: "string" as const, description: "Topic title." },
  type: {
    type: "string" as const,
    description:
      "One of: part, chapter, section, topic, subtopic, guide, article, lesson, step, reference, appendix.",
  },
  summary: { type: "string" as const, description: "One-line summary." },
  content: {
    type: "string" as const,
    description: "Markdown body content for the topic.",
  },
};

const OUTLINE_DSL: HelixAISchemaOptions = {
  name: "outline_artifact",
  description: "One or more document outlines with nested topics.",
  properties: {
    outlines: {
      type: "array",
      description: "Generated outlines.",
      items: {
        type: "object",
        description: "An outline.",
        properties: {
          name: { type: "string", description: "Outline name." },
          title: { type: "string", description: "Document title." },
          description: { type: "string", description: "What it covers." },
          type: {
            type: "string",
            description:
              "One of: knowledgeBase, documentation, guide, tutorial, book, manual, reference, wiki, faq, glossary, notes.",
          },
          topics: {
            type: "array",
            description: "Top-level topics.",
            items: {
              type: "object",
              description: "A topic.",
              properties: {
                ...TOPIC_PROPERTIES,
                children: {
                  type: "array",
                  description: "Nested subtopics (one level).",
                  items: {
                    type: "object",
                    description: "A subtopic.",
                    properties: TOPIC_PROPERTIES,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeTopic(raw: unknown): BDOutlineTopicDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const title = asString(t.title);
  if (!title) return null;
  const children = Array.isArray(t.children)
    ? t.children
        .map(normalizeTopic)
        .filter((c): c is BDOutlineTopicDraft => c !== null)
    : [];
  return {
    title,
    type: asString(t.type) || "topic",
    summary: asString(t.summary) || undefined,
    content: asString(t.content) || undefined,
    children,
  };
}

function normalizeOutline(raw: unknown): BDOutlineDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = asString(o.name);
  if (!name) return null;
  return {
    name,
    title: asString(o.title) || undefined,
    description: asString(o.description) || undefined,
    type: asString(o.type) || "documentation",
    topics: Array.isArray(o.topics)
      ? o.topics
          .map(normalizeTopic)
          .filter((t): t is BDOutlineTopicDraft => t !== null)
      : [],
  };
}

export async function bdGenerateOutline(
  params: BDOutlineGenerateParams,
): Promise<BDOutlineArtifact> {
  const system =
    "You are a technical writer. Produce well-structured outlines with " +
    "concrete, useful topics and brief markdown content where asked. Return " +
    "only the structured JSON requested.";

  const user = `Mode: ${params.mode}.\n\nInstruction: ${params.instruction}`;

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: OUTLINE_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.4,
  });

  const outlinesRaw = Array.isArray(raw.outlines) ? raw.outlines : [];
  const outlines = outlinesRaw
    .map(normalizeOutline)
    .filter((o): o is BDOutlineDraft => o !== null);

  return { outlines };
}
