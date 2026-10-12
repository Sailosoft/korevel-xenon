"use server";

// BDDocBuilder.Server — one-shot AI doc generation / expansion.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import { bdBuildModeUser } from "../agent-manager/BDGeneration.Mode";
import type {
  BDDocArtifact,
  BDDocDraft,
  BDDocTopicDraft,
} from "./BDDoc.Types";

export interface BDDocGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  targetContext?: string;
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

const DOC_DSL: HelixAISchemaOptions = {
  name: "doc_artifact",
  description: "One or more documents with nested topics.",
  properties: {
    docs: {
      type: "array",
      description: "Generated docs.",
      items: {
        type: "object",
        description: "A doc.",
        properties: {
          name: { type: "string", description: "Doc name." },
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

function normalizeTopic(raw: unknown): BDDocTopicDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const title = asString(t.title);
  if (!title) return null;
  const children = Array.isArray(t.children)
    ? t.children
        .map(normalizeTopic)
        .filter((c): c is BDDocTopicDraft => c !== null)
    : [];
  return {
    title,
    type: asString(t.type) || "topic",
    summary: asString(t.summary) || undefined,
    content: asString(t.content) || undefined,
    children,
  };
}

function normalizeDoc(raw: unknown): BDDocDraft | null {
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
          .filter((t): t is BDDocTopicDraft => t !== null)
      : [],
  };
}

export async function bdGenerateDoc(
  params: BDDocGenerateParams,
): Promise<BDDocArtifact> {
  const system =
    "You are a technical writer. Produce well-structured docs with " +
    "concrete, useful topics and brief markdown content where asked. Return " +
    "only the structured JSON requested.";

  const user = bdBuildModeUser({
    mode: params.mode,
    instruction: params.instruction,
    targetContext: params.targetContext,
  });

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: DOC_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.4,
  });

  const docsRaw = Array.isArray(raw.docs) ? raw.docs : [];
  const docs = docsRaw
    .map(normalizeDoc)
    .filter((o): o is BDDocDraft => o !== null);

  return { docs };
}
