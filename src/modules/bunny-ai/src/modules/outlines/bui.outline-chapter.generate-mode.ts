// bui.outline-chapter.generate-mode.ts
//
// One self-contained definition per Generation Mode: its instructions AND its
// context algorithm. Each mode's `context` decides exactly what the model sees;
// `defineMode` turns that into a structured messages array. Nothing is stuffed
// into a single prompt template — context arrives as discrete messages, and
// Chain-of-Thought replays real user/assistant turns.

import {
  BUI_OUTLINE_GENERATION_TYPES,
  type BUIOutlineGenerationType,
} from "./bui.outline.prompt";
import type { BUIOutlineParams } from "./bui.outline.entity";

export interface BUIOutlineChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const BUI_OUTLINE_BASE_SYSTEM = `You are an expert outline content writer. You write a single item as clean, engaging Markdown. The artifact you are contributing to is: {{typeFraming}} ({{typeName}}). Never describe your output as a book. Honour the outline's AI instruction and the item's additional instruction.`;

export function resolveOutlineGenerationType(
  generationType: string,
): BUIOutlineGenerationType {
  return (
    BUI_OUTLINE_GENERATION_TYPES.find((t) => t.key === generationType) ||
    BUI_OUTLINE_GENERATION_TYPES[0]
  );
}

function applyType(input: string, type: BUIOutlineGenerationType): string {
  return input
    .replace(/\{\{typeFraming\}\}/g, type.framing)
    .replace(/\{\{typeName\}\}/g, type.name);
}

// ── Shared context pieces ──────────────────────────────────────────────────

type MapItem = NonNullable<BUIOutlineParams["items"]>[number];
type PriorTurn = NonNullable<BUIOutlineParams["priorResponses"]>[number];
type ReferenceItem = NonNullable<BUIOutlineParams["siblingContext"]>[number];

function formatMapItem(item: MapItem): string {
  return `${item.number}. ${item.title}${
    item.description ? ` — ${item.description}` : ""
  }`;
}

/** Outline / topic / author / skills frame shared by every mode. */
function artifactContext(
  params: BUIOutlineParams,
  type: BUIOutlineGenerationType,
): string {
  const { outline, topic, author, skills } = params;

  const lines: string[] = [
    `### OUTLINE ARTIFACT (${type.name})`,
    `Framing: ${type.framing}`,
    `Title: ${outline.title}`,
  ];

  if (outline.description) lines.push(`Description: ${outline.description}`);
  if (outline.additionalPrompt) {
    lines.push(`Outline AI Instruction: ${outline.additionalPrompt}`);
  }

  const minWords = Number(outline.minWords);
  const maxWords = Number(outline.maxWords);
  const hasMinWords = Number.isFinite(minWords) && minWords > 0;
  const hasMaxWords = Number.isFinite(maxWords) && maxWords > 0;
  if (hasMinWords || hasMaxWords) {
    const target =
      hasMinWords && hasMaxWords
        ? `between ${minWords} and ${maxWords} words`
        : hasMinWords
          ? `at least ${minWords} words`
          : `at most ${maxWords} words`;
    lines.push(`Target length: write ${target}.`);
  }

  if (outline.summary) lines.push(`Outline Summary:\n${outline.summary}`);
  if (topic) {
    lines.push(
      `Topic: ${topic.title}${
        topic.description ? `\nContent: ${topic.description}` : ""
      }`,
    );
  }
  if (author?.name) {
    lines.push(
      `Author: ${author.name}${
        author.description ? ` — ${author.description}` : ""
      }`,
    );
  }
  if (skills?.length) {
    lines.push(
      `Author Skills:\n${skills
        .map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ""}`)
        .join("\n")}`,
    );
  }

  return lines.join("\n");
}

/** Every item in reading order (number, title, goal). No content. */
function fullMapContext(params: BUIOutlineParams): string {
  const map = params.items ?? [];
  if (map.length === 0) return "";
  return ["### FULL MAP (all items)", ...map.map(formatMapItem)].join(
    "\n",
  );
}

/** The item currently being written. */
function currentItemContext(params: BUIOutlineParams): string {
  const current = params.currentItem;
  if (!current) return "";

  const lines: string[] = [
    "### CURRENT ITEM",
    `Item ${current.number}: ${current.title}`,
  ];
  if (current.description) lines.push(`Goal: ${current.description}`);
  if (current.additionalPrompt) {
    lines.push(`Additional instruction: ${current.additionalPrompt}`);
  }
  return lines.join("\n");
}

/** The items explicitly chosen as references for a Control row. */
function referencedContext(items: ReferenceItem[]): string {
  const lines: string[] = ["### REFERENCED ITEMS"];
  for (const item of items) {
    lines.push(formatMapItem(item));
    const draft = item.content?.trim();
    if (draft) lines.push(`Draft:\n${draft}`);
  }
  lines.push("Reference this context explicitly to keep the artifact coherent.");
  return lines.join("\n");
}

/** Rebuild the user request that originally produced a prior response. */
function priorTurnRequest(prior: PriorTurn): string {
  const lines: string[] = [`Write item ${prior.number}: ${prior.title}`];
  if (prior.description) lines.push(`Goal: ${prior.description}`);
  if (prior.additionalPrompt) {
    lines.push(`Additional instruction: ${prior.additionalPrompt}`);
  }
  lines.push("Return ONLY the markdown content.");
  return lines.join("\n");
}

// ── Mode definition ────────────────────────────────────────────────────────

/**
 * A mode's `context` returns the mode-specific messages that sit between the
 * shared artifact frame and the final task turn:
 * - a `string` → wrapped as one `user` context message,
 * - a messages array → appended verbatim (used for real conversation turns),
 * - `null` → no extra context.
 */
export interface BUIOutlineGenerateMode {
  key: string;
  name: string;
  label: string;
  /** Human-readable description of the context algorithm. */
  contextInjection: string;
  /** Behaviour-only system instruction (no data). */
  systemInstruction: string;
  /** Final task instruction (no data). */
  taskInstruction: string;
  /** The mode's context algorithm. */
  build: (
    params: BUIOutlineParams,
    type: BUIOutlineGenerationType,
  ) => BUIOutlineChatMessage[];
}

type ModeContextPlan = (
  params: BUIOutlineParams,
  type: BUIOutlineGenerationType,
) => string | BUIOutlineChatMessage[] | null;

function defineMode(def: {
  key: string;
  name: string;
  label: string;
  contextInjection: string;
  systemInstruction: string;
  taskInstruction: string;
  context: ModeContextPlan;
}): BUIOutlineGenerateMode {
  const { context, ...meta } = def;

  return {
    ...meta,
    build: (params, type) => {
      const raw = context(params, type);
      const plan: BUIOutlineChatMessage[] =
        raw == null
          ? []
          : typeof raw === "string"
            ? [{ role: "user", content: raw }]
            : raw;

      return [
        {
          role: "system",
          content: applyType(
            `${BUI_OUTLINE_BASE_SYSTEM}\n${meta.systemInstruction}`,
            type,
          ),
        },
        { role: "user", content: artifactContext(params, type) },
        ...plan,
        {
          role: "user",
          content: [
            currentItemContext(params),
            applyType(meta.taskInstruction, type),
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ];
    },
  };
}

// ── The 7 modes ────────────────────────────────────────────────────────────

const sequential = defineMode({
  key: "sequential",
  name: "Sequential / Full-map",
  label: "Sequential / Full-map",
  contextInjection:
    "Context messages: outline artifact + the full map of every item, then a task naming the current item. No prior content is included.",
  systemInstruction: `You write sequentially across the full map: keep continuity with previous items and set up the following ones without repeating them.`,
  taskInstruction: `Write the full markdown content for the current item. Ensure it transitions naturally from earlier items and leads into later ones. Return ONLY the markdown content.`,
  // Full map: every item, no prior content.
  context: (params) => fullMapContext(params),
});

const chainOfThought = defineMode({
  key: "chain_of_thought",
  name: "Chain-of-Thought (multi-turn)",
  label: "Chain-of-Thought (multi-turn)",
  contextInjection:
    "Multi-turn: outline artifact, then every prior item as a user request followed by its assistant response, then the current item task.",
  systemInstruction: `This is an ongoing writing conversation. Each assistant turn is content you already wrote for an earlier item. Read the whole conversation in order, then continue it as the next response: build on the chain, never restate it.`,
  taskInstruction: `Continue the conversation from the assistant turns above. Write the full markdown content for the current item. Do not restate earlier content; extend it. Return ONLY the markdown content.`,
  // Real multi-turn: each prior item is a user request + assistant reply.
  context: (params) =>
    (params.priorResponses ?? []).flatMap<BUIOutlineChatMessage>((prior) => [
      { role: "user", content: priorTurnRequest(prior) },
      { role: "assistant", content: prior.content },
    ]),
});

const control = defineMode({
  key: "control",
  name: "Control (standalone vs referencing)",
  label: "Control (standalone vs referencing)",
  contextInjection:
    "Outline artifact, then ONLY the items chosen as references for this row (or a standalone message when none are chosen), then the current task.",
  systemInstruction: `When sibling context is present you must reference it; when it is absent you are fully standalone and must not assume any sibling content.`,
  taskInstruction: `Write the full markdown content for the current item. Return ONLY the markdown content.`,
  // Only the explicitly selected reference rows; otherwise standalone.
  context: (params) => {
    const referenced = params.siblingContext ?? [];
    return referenced.length
      ? referencedContext(referenced)
      : "### STANDALONE MODE\nNo sibling context is provided. Write this item as a self-contained unit.";
  },
});

const parallel = defineMode({
  key: "parallel",
  name: "Parallel / Independent batch",
  label: "Parallel / Independent batch",
  contextInjection:
    "Outline artifact only — no full map and no siblings. Every item is written independently, and the batch runs concurrently with per-row monitoring.",
  systemInstruction: `Write independently and completely: this item must stand on its own without depending on sibling content.`,
  taskInstruction: `Write the full markdown content for the current item as a self-contained unit. Return ONLY the markdown content.`,
  // Independent: nothing beyond the shared artifact frame.
  context: () => null,
});

const iterativeRefine = defineMode({
  key: "iterative_refine",
  name: "Iterative Refine",
  label: "Iterative Refine",
  contextInjection:
    "Outline artifact + the current item's existing content, then the refine task. Siblings are never loaded.",
  systemInstruction: `You refine and expand ONE item against the outline summary. Leave siblings untouched.`,
  taskInstruction: `Regenerate and expand ONLY the current item so it better matches the outline summary. Do not reference or modify other items. Return ONLY the refined markdown content.`,
  // Only this row's existing content.
  context: (params) => {
    const existing = params.currentItem?.content?.trim();
    return existing
      ? `### EXISTING CONTENT (refine this)\n${existing}`
      : null;
  },
});

const critique = defineMode({
  key: "critique",
  name: "Critique / Gap review",
  label: "Critique / Gap review",
  contextInjection:
    "Outline artifact + the full map, then the audit task. The model audits; it never rewrites existing content.",
  systemInstruction: `You are auditing, not rewriting. Identify gaps, overlaps, and ordering problems, and propose insertions. Do not rewrite existing item content.`,
  taskInstruction: `Audit the full map above. Produce a markdown report that lists:
- Gaps: missing coverage.
- Overlaps: duplicated or conflicting items.
- Ordering: suggested reordering.
- Proposed insertions: new items (title + description), without rewriting existing ones.
Return ONLY the markdown report.`,
  // Full map for the audit.
  context: (params) => fullMapContext(params),
});

const consolidate = defineMode({
  key: "consolidate",
  name: "Consolidate / Merge",
  label: "Consolidate / Merge",
  contextInjection:
    "Outline artifact + the full map, then the merge task. The model merges overlapping items into one coherent unit.",
  systemInstruction: `You detect overlapping or duplicate items and merge them into a single, coherent unit with no duplicated coverage.`,
  taskInstruction: `Merge the overlapping/duplicate items among the map above (starting from the current item) into one coherent markdown unit. Remove redundancy while preserving all unique coverage. Return ONLY the merged markdown content.`,
  // Full map for the merge.
  context: (params) => fullMapContext(params),
});

export const BUI_OUTLINE_GENERATE_MODES: BUIOutlineGenerateMode[] = [
  sequential,
  chainOfThought,
  control,
  parallel,
  iterativeRefine,
  critique,
  consolidate,
];

export function resolveOutlineGenerateMode(
  generationMode: string,
): BUIOutlineGenerateMode {
  return (
    BUI_OUTLINE_GENERATE_MODES.find((mode) => mode.key === generationMode) ||
    BUI_OUTLINE_GENERATE_MODES[0]
  );
}

/** Run a Generation Mode's context algorithm for one item. */
export function buildItemContext(
  params: BUIOutlineParams,
  generationType: string,
  generationMode: string,
): BUIOutlineChatMessage[] {
  const type = resolveOutlineGenerationType(generationType);
  const mode = resolveOutlineGenerateMode(generationMode);
  return mode.build(params, type);
}

/** Instruction-only preview of a mode (used by the Prompt Viewer). */
export function buildOutlinePromptPreview(
  generationType: string,
  generationMode: string,
): {
  key: string;
  name: string;
  label: string;
  systemPrompt: string;
  userPrompt: string;
} {
  const type = resolveOutlineGenerationType(generationType);
  const mode = resolveOutlineGenerateMode(generationMode);

  return {
    key: mode.key,
    name: mode.name,
    label: mode.label,
    systemPrompt: applyType(
      `${BUI_OUTLINE_BASE_SYSTEM}\n${mode.systemInstruction}`,
      type,
    ),
    userPrompt: applyType(mode.taskInstruction, type),
  };
}
