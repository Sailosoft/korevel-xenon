"use server";

// BDSpecBuilder.Server — AI spec generation, variants, and the AI Document
// Assist refinement (questions + revisions).

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import {
  bdBuildModeUser,
  bdSerializeTarget,
} from "../agent-manager/BDGeneration.Mode";
import type {
  BDSpecArtifact,
  BDSpecDocMode,
  BDSpecDraft,
  BDSpecRefineAnswer,
  BDSpecRefineOption,
  BDSpecRefineQuestion,
  BDSpecRefineRevision,
  BDSpecSectionDraft,
} from "./BDSpec.Types";

export interface BDSpecGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  /** Requested document type (architecture, plan, design, spec, adr, …). */
  type?: string;
  /** Target document structure. Defaults to "sectioned". */
  docMode?: BDSpecDocMode;
  /** Return 2-3 alternative variants instead of one. */
  variants?: number;
  targetContext?: string;
  aiConfig?: BDAIConfigOverride;
}

/** A serializable snapshot of a document sent to the refinement prompts. */
export interface BDSpecDocumentInput {
  name: string;
  type: string;
  summary?: string;
  docMode: BDSpecDocMode;
  content?: string;
  sections?: BDSpecSectionDraft[];
}

export interface BDSpecQuestionsParams {
  document: BDSpecDocumentInput;
  level: string;
  turnIndex: number;
  totalTurns: number;
  minQuestions: number;
  maxQuestions: number;
  refinementType: string;
  priorAnswers?: BDSpecRefineAnswer[];
  aiConfig?: BDAIConfigOverride;
}

export interface BDSpecRevisionParams {
  document: BDSpecDocumentInput;
  refinementType: string;
  answers: BDSpecRefineAnswer[];
  docMode: BDSpecDocMode;
  aiConfig?: BDAIConfigOverride;
}

const SPEC_DSL: HelixAISchemaOptions = {
  name: "spec_artifact",
  description: "One or more spec documents with sections.",
  properties: {
    specs: {
      type: "array",
      description: "Generated spec documents (variants).",
      items: {
        type: "object",
        description: "A spec document.",
        properties: {
          name: { type: "string", description: "Document name." },
          type: {
            type: "string",
            description:
              "One of: architecture, plan, adr, rfc, design, spec, roadmap, runbook, postmortem, readme, changelog, guide, proposal.",
          },
          status: { type: "string", description: "Document status." },
          summary: { type: "string", description: "Short summary." },
          variantLabel: {
            type: "string",
            description: "Variant label when proposing alternatives.",
          },
          content: {
            type: "string",
            description:
              "Full markdown body. Used ONLY when the target structure is " +
              "'single'; leave empty when structuring as sections.",
          },
          sections: {
            type: "array",
            description:
              "Document sections. Used ONLY when the target structure is " +
              "'sectioned'; leave empty for a single-content document.",
            items: {
              type: "object",
              description: "A section.",
              properties: {
                title: { type: "string", description: "Section title." },
                level: {
                  type: "number",
                  description: "Heading level 1-6, reflecting the section hierarchy.",
                },
                summary: {
                  type: "string",
                  description:
                    "One-sentence TL;DR of this section (max ~25 words).",
                },
                content: {
                  type: "string",
                  description:
                    "Section body in markdown, 300-500 words. Must be information-dense with no filler. " +
                    "Structure: a short lead paragraph stating the point; bullet or numbered sub-points for " +
                    "details; explicit trade-offs/decisions; and a markdown table when comparing options, " +
                    "components, or criteria. Use headings, bold, and code formatting where they aid clarity.",
                },
              },
            },
          },
        },
      },
    },
  },
};

const QUESTIONS_DSL: HelixAISchemaOptions = {
  name: "spec_refine_questions",
  description: "Refinement questions, each with four answer options.",
  properties: {
    questions: {
      type: "array",
      description: "Clarifying questions used to refine the document.",
      items: {
        type: "object",
        description: "A refinement question.",
        properties: {
          question: {
            type: "string",
            description: "A focused question about the document.",
          },
          rationale: {
            type: "string",
            description: "Why this question matters (one short sentence).",
          },
          options: {
            type: "array",
            description: "Exactly four distinct answer options.",
            items: {
              type: "object",
              description: "An answer option.",
              properties: {
                label: {
                  type: "string",
                  description: "Concise option label (a few words).",
                },
                description: {
                  type: "string",
                  description: "Optional one-line explanation of the option.",
                },
              },
            },
          },
          recommendedIndex: {
            type: "number",
            description:
              "Zero-based index (0-3) of the single best/recommended option.",
          },
        },
      },
    },
  },
};

const REVISION_DSL: HelixAISchemaOptions = {
  name: "spec_revision",
  description: "A revised spec document.",
  properties: {
    name: { type: "string", description: "Revised document name." },
    summary: { type: "string", description: "Revised short summary." },
    content: {
      type: "string",
      description:
        "Full markdown body when the document is single-content; empty when sectioned.",
    },
    sections: {
      type: "array",
      description:
        "Full ordered sections when the document is sectioned; empty when single-content.",
      items: {
        type: "object",
        description: "A revised section.",
        properties: {
          title: { type: "string", description: "Section title." },
          level: { type: "number", description: "Heading level 1-6." },
          summary: {
            type: "string",
            description: "One-sentence TL;DR of this section.",
          },
          content: {
            type: "string",
            description: "Section body in information-dense markdown.",
          },
        },
      },
    },
  },
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeSection(raw: unknown): BDSpecSectionDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const title = asString(s.title);
  if (!title) return null;
  return {
    title,
    level: typeof s.level === "number" ? s.level : 2,
    summary: asString(s.summary) || undefined,
    content: asString(s.content) || undefined,
  };
}

function normalizeSpec(
  raw: unknown,
  defaultType: string,
): BDSpecDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const name = asString(a.name);
  if (!name) return null;
  return {
    name,
    type: asString(a.type) || defaultType,
    status: asString(a.status) || "draft",
    summary: asString(a.summary) || undefined,
    variantLabel: asString(a.variantLabel) || undefined,
    content: asString(a.content) || undefined,
    sections: Array.isArray(a.sections)
      ? a.sections
          .map(normalizeSection)
          .filter((s): s is BDSpecSectionDraft => s !== null)
      : [],
  };
}

function normalizeOptions(raw: unknown, recommendedIndex: number): BDSpecRefineOption[] {
  const list = Array.isArray(raw) ? raw : [];
  const options: BDSpecRefineOption[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const label = asString(o.label);
    if (!label) continue;
    options.push({
      label,
      description: asString(o.description) || undefined,
      recommended: false,
    });
  }

  const trimmed = options.slice(0, 4);
  while (trimmed.length < 4) {
    trimmed.push({ label: `Option ${trimmed.length + 1}`, recommended: false });
  }

  const index =
    Number.isInteger(recommendedIndex) &&
    recommendedIndex >= 0 &&
    recommendedIndex < 4
      ? recommendedIndex
      : 0;

  const [recommended] = trimmed.splice(index, 1);
  recommended.recommended = true;
  return [recommended, ...trimmed];
}

function normalizeQuestion(raw: unknown): BDSpecRefineQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;
  const question = asString(q.question);
  if (!question) return null;
  const recommendedIndex =
    typeof q.recommendedIndex === "number" ? q.recommendedIndex : 0;
  return {
    id: crypto.randomUUID(),
    question,
    rationale: asString(q.rationale) || undefined,
    options: normalizeOptions(q.options, recommendedIndex),
  };
}

export async function bdGenerateSpec(
  params: BDSpecGenerateParams,
): Promise<BDSpecArtifact> {
  const variantHint =
    params.variants && params.variants > 1
      ? ` Return ${params.variants} distinct alternatives, each with a variantLabel.`
      : "";

  const documentType = params.type?.trim() || "architecture";
  const docMode: BDSpecDocMode = params.docMode ?? "sectioned";

  const structureHint =
    docMode === "single"
      ? 'Return the ENTIRE document as one markdown body in the "content" field ' +
        "and return an empty sections array."
      : 'Organize the document into titled sections (levels 1-3) and return an ' +
        'empty "content" field.';

  const system =
    "You are a software architect. Produce clear, decision-oriented " +
    "spec documents with concrete sections and trade-offs. Every " +
    "section body must be information-dense, roughly 300-500 words, with no " +
    "filler: open with a short lead paragraph, expand with sub-points/lists, " +
    "state the trade-offs and decisions explicitly, and use a markdown table " +
    "when comparing options or criteria. Assign heading levels (1-3) that " +
    "reflect a well-defined document hierarchy for the requested type, and " +
    "give each section a one-sentence summary. When producing multiple " +
    "variants, keep each document fully self-contained. Return only the " +
    "structured JSON requested.";

  const context =
    `Document type: ${documentType}. Produce each document as that type and ` +
    `set its "type" field to "${documentType}". ${structureHint} Each section ` +
    `must have a 300-500 word information-dense "content" body and a ` +
    `one-sentence "summary". A single-content body must be equally dense and ` +
    `well-structured.${variantHint}`;

  const user = bdBuildModeUser({
    mode: params.mode,
    instruction: params.instruction,
    targetContext: params.targetContext,
    context,
  });

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: SPEC_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.4,
    // Long, multi-section documents (and variants) exceed Helix's 8000-token
    // default, which would truncate content; request a larger budget.
    maxToken: params.variants && params.variants > 1 ? 32000 : 16000,
  });

  const rawList = Array.isArray(raw.specs) ? raw.specs : [];
  const specs = rawList
    .map((entry) => normalizeSpec(entry, documentType))
    .filter((a): a is BDSpecDraft => a !== null);

  return { specs };
}

/**
 * Generate the clarifying questions for one refinement turn.
 *
 * @throws A clean `Error` when the AI call fails.
 */
export async function bdGenerateSpecQuestions(
  params: BDSpecQuestionsParams,
): Promise<BDSpecRefineQuestion[]> {
  const document = bdSerializeTarget(params.document);
  const prior =
    params.priorAnswers && params.priorAnswers.length > 0
      ? `\n\nAnswers already provided (do not repeat these questions):\n${params.priorAnswers
          .map((a) => `- ${a.question} → ${a.answer}`)
          .join("\n")}`
      : "";

  const system =
    "You are a senior technical editor refining a software document. Ask " +
    "focused, high-leverage clarifying questions whose answers let you " +
    "materially improve the document. For every question give EXACTLY four " +
    "distinct, concrete, mutually exclusive answer options and mark the single " +
    "best option with recommendedIndex. Return only the structured JSON " +
    "requested.";

  const user =
    `Document type: ${params.document.type}. Refinement type: ${params.refinementType}. ` +
    `Refinement depth: ${params.level}. ` +
    `Turn ${params.turnIndex + 1} of ${params.totalTurns}. Ask between ` +
    `${params.minQuestions} and ${params.maxQuestions} questions.\n\n` +
    `Current document:\n${document}${prior}`;

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: QUESTIONS_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.5,
    maxToken: 8000,
  });

  const rawList = Array.isArray(raw.questions) ? raw.questions : [];
  const questions = rawList
    .map(normalizeQuestion)
    .filter((q): q is BDSpecRefineQuestion => q !== null)
    .slice(0, params.maxQuestions);

  if (questions.length === 0) {
    throw new Error("The AI did not return any refinement questions.");
  }

  return questions;
}

/**
 * Revise the document given the user's answers for one turn.
 *
 * @throws A clean `Error` when the AI call fails.
 */
export async function bdReviseSpec(
  params: BDSpecRevisionParams,
): Promise<BDSpecRefineRevision> {
  const document = bdSerializeTarget(params.document);
  const answers = params.answers
    .map((a) => `- ${a.question} → ${a.answer}`)
    .join("\n");

  const structureHint =
    params.docMode === "single"
      ? 'Return the entire revised document in the "content" field and an empty sections array.'
      : 'Return the complete revised "sections" array and an empty content field. Preserve the section hierarchy.';

  const system =
    "You are a senior technical editor. Revise the document by applying the " +
    "user's chosen answers. Preserve what already works, keep the writing " +
    "information-dense and free of filler, and keep the document " +
    "self-consistent. " +
    structureHint +
    " Return only the structured JSON requested.";

  const user =
    `Document type: ${params.document.type}. Refinement type: ${params.refinementType}.\n\n` +
    `Current document:\n${document}\n\nChosen answers:\n${answers}`;

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: REVISION_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.4,
    maxToken: 16000,
  });

  const name = asString(raw.name) || params.document.name;
  const summary = asString(raw.summary) || params.document.summary;
  const content = asString(raw.content) || undefined;
  const sections = Array.isArray(raw.sections)
    ? raw.sections
        .map(normalizeSection)
        .filter((s): s is BDSpecSectionDraft => s !== null)
    : [];

  return { name, summary, content, sections };
}
