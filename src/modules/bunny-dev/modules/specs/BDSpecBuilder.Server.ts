"use server";

// BDSpecBuilder.Server — AI spec generation, variants, patch-based document
// editing, and the AI Document Assist refinement (questions + revisions).

import type { BDGenerationMode } from "../../BDDomain.Types";
import type {
  HelixAISchemaOptions,
  HelixStrictPropertyDefinition,
} from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import {
  bdBuildModeUser,
  bdModeGuidance,
  bdSerializeTarget,
} from "../agent-manager/BDGeneration.Mode";
import { BD_MAX_PATTERN_WORDS } from "../core/BDTextPatch";
import {
  normalizeSpecPatches,
  serializeSpecTarget,
  type BDSpecPatchOp,
} from "./BDSpec.Patch";
import type {
  BDSpecArtifact,
  BDSpecAssistMode,
  BDSpecDocMode,
  BDSpecDraft,
  BDSpecEnhancementAnalysis,
  BDSpecEnhancementArea,
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
  /** Enhance mode focuses questions on the selected improvement areas. */
  mode?: BDSpecAssistMode;
  focusAreas?: string[];
  /** Optional user-authored guidance for the whole refinement flow. */
  instruction?: string;
  priorAnswers?: BDSpecRefineAnswer[];
  aiConfig?: BDAIConfigOverride;
}

export interface BDSpecRevisionParams {
  document: BDSpecDocumentInput;
  refinementType: string;
  answers: BDSpecRefineAnswer[];
  docMode: BDSpecDocMode;
  mode?: BDSpecAssistMode;
  focusAreas?: string[];
  /** Optional user-authored guidance for the whole refinement flow. */
  instruction?: string;
  aiConfig?: BDAIConfigOverride;
}

export interface BDSpecEnhancementParams {
  document: BDSpecDocumentInput;
  docMode: BDSpecDocMode;
  /** Optional user-authored guidance for the analysis and later turns. */
  instruction?: string;
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

const ENHANCEMENT_DSL: HelixAISchemaOptions = {
  name: "spec_enhancement_analysis",
  description: "An assessment of a document and its highest-impact gaps.",
  properties: {
    summary: {
      type: "string",
      description:
        "One or two sentences diagnosing the document's main weakness and what enhancement should achieve.",
    },
    areas: {
      type: "array",
      description:
        "Two to five distinct, concrete improvement areas, ordered by impact.",
      items: {
        type: "object",
        description: "An improvement area.",
        properties: {
          label: {
            type: "string",
            description:
              "Short action-oriented label, e.g. 'Clarify system boundaries'.",
          },
          rationale: {
            type: "string",
            description:
              "Why this area matters for this specific document (one sentence).",
          },
          recommended: {
            type: "boolean",
            description:
              "True for the highest-impact area(s) the editor recommends.",
          },
        },
      },
    },
  },
};

const PATCH_SECTION_PROPERTIES: Record<
  string,
  HelixStrictPropertyDefinition
> = {
  sectionId: {
    type: "string",
    description:
      "Existing section id to preserve identity, or \"\" for a new section.",
  },
  title: { type: "string", description: "Section title." },
  level: { type: "number", description: "Heading level 1-6." },
  summary: {
    type: "string",
    description: "One-sentence TL;DR; empty for none.",
  },
  content: {
    type: "string",
    description: "Section body in information-dense markdown.",
  },
};

const SPEC_PATCH_DSL: HelixAISchemaOptions = {
  name: "spec_patches",
  description:
    "Ordered patch operations that modify a spec document without rewriting it.",
  properties: {
    patches: {
      type: "array",
      description: "Patch operations, applied to the document in order.",
      items: {
        type: "object",
        description:
          "A single patch operation. Always include every field; use \"\" or 0 when unused.",
        properties: {
          op: {
            type: "string",
            description:
              "One of: setMeta, updateSection, insertSection, deleteSection, replaceSections, replaceContent.",
          },
          sectionId: {
            type: "string",
            description:
              "For updateSection/deleteSection: exact id of the existing " +
              "section (or its exact title if the id cannot be copied). For " +
              "replaceSections items: the existing section id to preserve " +
              "identity; empty for a new section.",
          },
          afterSectionId: {
            type: "string",
            description:
              "For insertSection: exact id of the section to insert after; " +
              "empty to append at the end.",
          },
          title: {
            type: "string",
            description:
              "Section title for updateSection/insertSection; empty to keep " +
              "the existing title on update.",
          },
          level: {
            type: "number",
            description:
              "Heading level 1-6 for updateSection/insertSection; 0 to keep " +
              "the existing level (update) or default to 2 (insert).",
          },
          summary: {
            type: "string",
            description:
              "Section summary. For updateSection an empty string clears it; " +
              "for insertSection empty means none.",
          },
          content: {
            type: "string",
            description:
              "Section body markdown for updateSection/insertSection. For " +
              "updateSection an empty string clears the body; copy the " +
              "current content to keep it. For replaceContent, the text that " +
              "replaces the anchored region.",
          },
          name: {
            type: "string",
            description:
              "For setMeta: new document name; empty keeps the current name.",
          },
          docSummary: {
            type: "string",
            description:
              "For setMeta: new document summary; empty keeps the current " +
              "summary.",
          },
          status: {
            type: "string",
            description:
              "For setMeta: new status; empty keeps the current status.",
          },
          docType: {
            type: "string",
            description:
              "For setMeta: new document type; empty keeps the current type.",
          },
          sections: {
            type: "array",
            description:
              "For replaceSections: the complete ordered section set.",
            items: {
              type: "object",
              description: "A replacement section.",
              properties: PATCH_SECTION_PROPERTIES,
            },
          },
          patternStart: {
            type: "string",
            description:
              "For replaceContent: first line(s) of the region to replace, " +
              "copied verbatim and unique.",
          },
          patternEnd: {
            type: "string",
            description:
              "For replaceContent: last line(s) of the region, copied " +
              "verbatim and inclusive; empty replaces just the start match.",
          },
        },
      },
    },
  },
};

const SPEC_PATCH_RULES =
  "Rules for every patch:\n" +
  "- Return only the smallest set of operations that satisfies the request; " +
  "never return the whole document.\n" +
  "- Always emit every schema field; use \"\" or 0 for unused fields.\n" +
  "- Target existing sections with their exact `sectionId` copied from the " +
  "document. If you cannot copy the id, use the exact section title.\n" +
  "- `updateSection` replaces the section fields with the values you return; " +
  "copy the current title/level/summary/content for fields you do not change. " +
  "An empty `summary` or `content` clears that field.\n" +
  "- `insertSection` adds a new section after `afterSectionId` (empty appends).\n" +
  "- `deleteSection` removes a section and its children; use it only when the " +
  "request explicitly asks to remove it.\n" +
  "- `replaceSections` supplies the complete ordered section set and is only " +
  "for replace mode.\n" +
  "- Single-content documents use `setMeta` and `replaceContent` only. " +
  "`replaceContent` replaces the inclusive region from `patternStart` to " +
  "`patternEnd` (both copied verbatim; keep them short, unique, and at most " +
  `${BD_MAX_PATTERN_WORDS} words; an empty \`patternEnd\` replaces just the ` +
  "start match).\n" +
  "- Sectioned documents never use `replaceContent`; single-content documents " +
  "never use section operations.\n" +
  "- Preserve everything the user did not ask to change. Never invent content.";

function patchModeRule(
  mode: Exclude<BDGenerationMode, "create">,
  docMode: BDSpecDocMode,
): string {
  if (docMode === "single") {
    switch (mode) {
      case "append":
        return (
          "This is a single-content document: use replaceContent to insert " +
          "the new text at an anchored position near the end, plus setMeta " +
          "only when metadata must change. Never use section operations."
        );
      case "update":
        return (
          "This is a single-content document: use setMeta and replaceContent " +
          "for changed regions only. Never use section operations."
        );
      case "replace":
        return (
          "This is a single-content document: use replaceContent with the " +
          "complete replacement region(s), plus setMeta when metadata " +
          "changes. Never use section operations."
        );
    }
  }

  switch (mode) {
    case "append":
      return (
        "Return only insertSection operations, plus setMeta only when metadata " +
        "must change. Do not modify existing sections."
      );
    case "update":
      return (
        "Return setMeta/updateSection/insertSection operations for new or " +
        "changed sections only. Do not repeat unchanged sections. Do not " +
        "delete unless the instruction explicitly asks."
      );
    case "replace":
      return (
        "Return one replaceSections operation with the COMPLETE ordered " +
        "section set, plus setMeta when metadata changes."
      );
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

const MAX_INSTRUCTION_LENGTH = 2000;

/** Normalize optional user guidance into a consistent prompt block. */
function instructionBlock(instruction?: string): string {
  const trimmed = (instruction ?? "").trim().slice(0, MAX_INSTRUCTION_LENGTH);
  if (!trimmed) return "";
  return (
    "\n\nUser instruction (follow this; it takes precedence over generic " +
    `focus when they conflict):\n${trimmed}`
  );
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

function normalizeEnhancementArea(
  raw: unknown,
): BDSpecEnhancementArea | null {
  if (!raw || typeof raw !== "object") return null;
  const area = raw as Record<string, unknown>;
  const label = asString(area.label).trim();
  if (!label) return null;
  return {
    id: crypto.randomUUID(),
    label,
    rationale: asString(area.rationale) || undefined,
    recommended: area.recommended === true,
  };
}

/**
 * Assess a document and propose the highest-impact improvement areas for the
 * Enhance mode. Never throws for empty AI output: a generic fallback area keeps
 * the flow usable.
 *
 * @throws A clean `Error` when the AI call itself fails.
 */
export async function bdAnalyzeSpecEnhancement(
  params: BDSpecEnhancementParams,
): Promise<BDSpecEnhancementAnalysis> {
  const document = bdSerializeTarget(params.document);

  const system =
    "You are a senior technical editor. Assess the document against its " +
    "declared type and identify the highest-impact ways to improve it. " +
    "Propose two to five distinct, concrete improvement areas that do not " +
    "overlap; never suggest cosmetic rewording when a structural gap exists. " +
    "Prioritize the user's instruction when selecting and ordering areas. " +
    "Mark the single highest-impact area (or the few that are clearly equally " +
    "critical) as recommended. Return only the structured JSON requested.";

  const user =
    `Document type: ${params.document.type}.` +
    instructionBlock(params.instruction) +
    `\n\nCurrent document:\n${document}`;

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: ENHANCEMENT_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.4,
    maxToken: 8000,
  });

  const summary =
    asString(raw.summary).trim() ||
    "The document can be made clearer and more complete.";

  const seen = new Set<string>();
  const areas: BDSpecEnhancementArea[] = [];
  for (const entry of Array.isArray(raw.areas) ? raw.areas : []) {
    const area = normalizeEnhancementArea(entry);
    if (!area || seen.has(area.label.toLowerCase())) continue;
    seen.add(area.label.toLowerCase());
    areas.push(area);
    if (areas.length >= 5) break;
  }

  if (areas.length === 0) {
    areas.push({
      id: crypto.randomUUID(),
      label: "Overall clarity and completeness",
      rationale:
        "The AI did not identify specific areas, so improve the document end to end.",
      recommended: true,
    });
  }

  if (!areas.some((area) => area.recommended)) {
    areas[0].recommended = true;
  }

  return { summary, areas };
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

  const isEnhance = params.mode === "enhance";
  const focus =
    isEnhance && params.focusAreas && params.focusAreas.length > 0
      ? `\n\nSelected improvement areas (focus the questions here): ${params.focusAreas.join(
          ", ",
        )}.`
      : "";

  const system =
    "You are a senior technical editor refining a software document. Ask " +
    "focused, high-leverage clarifying questions whose answers let you " +
    "materially improve the document. " +
    (isEnhance
      ? "The goal is enhancement: close the gaps in the selected improvement areas rather than re-asking general clarification. "
      : "") +
    "Follow the user's instruction when one is provided. " +
    "For every question give EXACTLY four distinct, concrete, mutually " +
    "exclusive answer options and mark the single best option with " +
    "recommendedIndex. Return only the structured JSON requested.";

  const user =
    `Document type: ${params.document.type}. Refinement type: ${params.refinementType}. ` +
    `Refinement depth: ${params.level}. ` +
    `Turn ${params.turnIndex + 1} of ${params.totalTurns}. Ask between ` +
    `${params.minQuestions} and ${params.maxQuestions} questions.${focus}` +
    `${instructionBlock(params.instruction)}\n\n` +
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

function requireSpecPatches(raw: Record<string, unknown>): BDSpecPatchOp[] {
  const patches = normalizeSpecPatches(raw);
  if (patches.length === 0) {
    throw new Error("The assistant returned no changes.");
  }
  return patches;
}

export interface BDSpecPatchParams {
  /** Serialized target document, including section ids/anchors. */
  documentContext: string;
  /** How the target document is structured. */
  docMode?: BDSpecDocMode;
  mode: Exclude<BDGenerationMode, "create">;
  instruction: string;
  aiConfig?: BDAIConfigOverride;
}

/**
 * Ask the AI to edit an existing document and return patch operations. The
 * client validates and stages them; nothing is persisted here.
 *
 * @throws A clean `Error` when the AI call fails or returns no changes.
 */
export async function bdPatchSpec(
  params: BDSpecPatchParams,
): Promise<{ patches: BDSpecPatchOp[] }> {
  const system =
    "You are a senior technical editor editing an existing document. Return " +
    "only patch operations — never rewrite the whole document. " +
    SPEC_PATCH_RULES +
    " Return only the structured JSON requested.";

  const user =
    `Mode: ${params.mode}. ${bdModeGuidance(params.mode)}\n` +
    `${patchModeRule(params.mode, params.docMode ?? "sectioned")}\n\n` +
    `### Current document:\n${params.documentContext}\n\n` +
    `### Instruction:\n${params.instruction}`;

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: SPEC_PATCH_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.3,
    // Replace mode can return a complete section set for a long document;
    // append/update only return minimal patches.
    maxToken: params.mode === "replace" ? 32000 : 16000,
  });

  return { patches: requireSpecPatches(raw) };
}

/**
 * Revise the document given the user's answers for one turn. Returns patch
 * operations so the document is hot-swapped instead of rewritten.
 *
 * @throws A clean `Error` when the AI call fails or returns no changes.
 */
export async function bdReviseSpec(
  params: BDSpecRevisionParams,
): Promise<BDSpecRefineRevision> {
  const document = serializeSpecTarget(params.document);
  const answers = params.answers
    .map((a) => `- ${a.question} → ${a.answer}`)
    .join("\n");

  const focus =
    params.focusAreas && params.focusAreas.length > 0
      ? `\n\nSelected improvement areas (address these in the revision): ${params.focusAreas.join(
          ", ",
        )}.`
      : "";

  const structureHint =
    params.docMode === "single"
      ? "This is a single-content document: use setMeta and replaceContent " +
        "with short, unique anchored regions."
      : "This is a sectioned document: use setMeta/updateSection/" +
        "insertSection/deleteSection with the provided section ids.";

  const system =
    "You are a senior technical editor revising a document. Apply the user's " +
    "chosen answers and instruction by returning a minimal set of patch " +
    "operations — never rewrite the whole document. Preserve what already " +
    "works, keep the writing information-dense and free of filler, and keep " +
    "the document self-consistent. " +
    structureHint +
    "\n\n" +
    SPEC_PATCH_RULES +
    " Return only the structured JSON requested.";

  const user =
    `Document type: ${params.document.type}. Refinement type: ${params.refinementType}.\n\n` +
    `Current document:\n${document}\n\nChosen answers:\n${answers}${focus}` +
    instructionBlock(params.instruction);

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: SPEC_PATCH_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.4,
    maxToken: 16000,
  });

  return { patches: requireSpecPatches(raw) };
}
