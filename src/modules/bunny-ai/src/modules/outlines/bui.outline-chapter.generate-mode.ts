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

export const BUI_OUTLINE_BASE_SYSTEM = `You are an expert outline content writer. You write a single item as clean, engaging Markdown. The artifact you are contributing to is: {{typeFraming}} ({{typeName}}). Never describe your output as a book. Honour the outline's AI instruction, its minimum/maximum word target, and the item's additional instruction. Always write the target length: never fall short of the minimum and never exceed the maximum.`;

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

/**
 * The outline's requested word bounds as a single instruction line, or `""`
 * when neither bound is set. Shared by the artifact frame and the final task
 * turn so every mode both describes and enforces the target length.
 */
function targetLengthLine(params: BUIOutlineParams): string {
  const minWords = Number(params.outline.minWords);
  const maxWords = Number(params.outline.maxWords);
  const hasMinWords = Number.isFinite(minWords) && minWords > 0;
  const hasMaxWords = Number.isFinite(maxWords) && maxWords > 0;
  if (!hasMinWords && !hasMaxWords) return "";

  const target =
    hasMinWords && hasMaxWords
      ? `between ${minWords} and ${maxWords} words`
      : hasMinWords
        ? `at least ${minWords} words`
        : `at most ${maxWords} words`;

  return `Target length: write ${target}.`;
}

/** Per-item content cap when a mode receives sibling content. */
const MAX_MAP_CONTENT_ITEM_CHARS = 1500;
/** Global content cap across the whole map. */
const MAX_MAP_CONTENT_TOTAL_CHARS = 16000;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max))}…`;
}

function formatMapItem(
  item: MapItem,
  options?: { includeId?: boolean },
): string {
  const prefix =
    options?.includeId && item.id != null ? `[item ${item.id}] ` : "";
  return `${prefix}${item.number}. ${item.title}${
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

  const targetLength = targetLengthLine(params);
  if (targetLength) lines.push(targetLength);

  if (outline.summary) lines.push(`Outline Summary:\n${outline.summary}`);
  if (topic) {
    lines.push(
      `Topic: ${topic.title}${
        topic.description ? `\nContent: ${topic.description}` : ""
      }`,
    );
    lines.push(
      "Ground this item in the Topic above; its title and content are the subject matter.",
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
function fullMapContext(
  params: BUIOutlineParams,
  options?: { includeContent?: boolean },
): string {
  const map = params.items ?? [];
  if (map.length === 0) return "";

  const includeContent = options?.includeContent === true;
  const lines: string[] = ["### FULL MAP (all items)"];
  let budget = MAX_MAP_CONTENT_TOTAL_CHARS;

  for (const item of map) {
    lines.push(formatMapItem(item, { includeId: includeContent }));
    if (!includeContent) continue;

    const content = item.content?.trim();
    if (!content) {
      lines.push("Content: (no content)");
      continue;
    }

    const allowed = Math.min(MAX_MAP_CONTENT_ITEM_CHARS, budget);
    const shown = truncate(content, allowed);
    lines.push(`Content:\n${shown}`);
    budget -= shown.length;
  }

  return lines.join("\n");
}

/** The content of a single merge group, for the consolidate call. */
function mergeGroupContext(params: BUIOutlineParams): string {
  const group = params.mergeGroup;
  if (!group) return fullMapContext(params, { includeContent: true });

  const map = params.items ?? [];
  const ids = new Set([group.anchorId, ...group.sourceIds]);
  const selected = map.filter((item) => item.id != null && ids.has(item.id));

  const lines: string[] = [
    "### MERGE GROUP",
    `Anchor item id: ${group.anchorId}`,
    `Source item ids: ${group.sourceIds.join(", ")}`,
  ];

  for (const item of selected) {
    lines.push("");
    lines.push(formatMapItem(item, { includeId: true }));
    if (item.description) lines.push(`Goal: ${item.description}`);
    const content = item.content?.trim();
    lines.push(
      content
        ? `Content:\n${truncate(content, MAX_MAP_CONTENT_ITEM_CHARS)}`
        : "Content: (no content)",
    );
  }

  return lines.join("\n");
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
  /** The kind of artifact this mode returns. */
  output: "markdown" | "json";
  /**
   * Plan-only modes never persist their raw output as item content; they feed
   * the Refine wizard instead.
   */
  planOnly?: boolean;
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
  output?: "markdown" | "json";
  planOnly?: boolean;
  context: ModeContextPlan;
}): BUIOutlineGenerateMode {
  const { context, ...meta } = def;

  return {
    ...meta,
    output: meta.output ?? "markdown",
    planOnly: meta.planOnly ?? false,
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
            targetLengthLine(params),
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
    "Outline artifact + the current item's existing content (and any refinement directive), then the refine task. Siblings are never loaded.",
  systemInstruction: `You refine and expand ONE item against the outline summary. Leave siblings untouched.`,
  taskInstruction: `Regenerate and expand ONLY the current item so it better matches the outline summary and, when a refinement directive is provided, satisfies it. Do not reference or modify other items. Return ONLY the refined markdown content.`,
  output: "markdown",
  // Only this row's existing content (plus any wizard directive).
  context: (params) => {
    const parts: string[] = [];
    const existing = params.currentItem?.content?.trim();
    if (existing) parts.push(`### EXISTING CONTENT (refine this)\n${existing}`);
    if (params.refineDirective?.trim()) {
      parts.push(`### REFINEMENT DIRECTIVE\n${params.refineDirective.trim()}`);
    }
    return parts.length > 0 ? parts.join("\n\n") : null;
  },
});

const critique = defineMode({
  key: "critique",
  name: "Critique / Gap review",
  label: "Critique / Gap review",
  contextInjection:
    "Outline artifact + the full map with capped sibling content, then the audit task. The model returns a structured, actionable plan and never rewrites content.",
  systemInstruction: `You are auditing, not rewriting. Identify gaps, overlaps, ordering problems, and refinement needs, and return a single actionable plan. Do not rewrite existing item content.`,
  taskInstruction: `Audit the full map above and return ONLY a JSON object with this exact shape:
{
  "findings": [
    { "id": "f1", "type": "insert", "title": "...", "description": "...", "rationale": "..." },
    { "id": "f2", "type": "merge", "anchorId": 3, "sourceIds": [4, 5], "rationale": "..." },
    { "id": "f3", "type": "reorder", "order": [1, 3, 2], "rationale": "..." },
    { "id": "f4", "type": "refine", "itemId": 2, "directive": "...", "rationale": "..." }
  ]
}
Use the bracketed [item <id>] ids from the map for anchorId, sourceIds, order and itemId. "insert" adds missing coverage; "merge" consolidates overlapping/duplicate items; "reorder" gives the full desired order of item ids; "refine" asks an existing item to be improved for a stated gap. Return ONLY the JSON object, with no prose.`,
  output: "json",
  planOnly: true,
  // Full map with capped content so gaps and overlaps are real.
  context: (params) => fullMapContext(params, { includeContent: true }),
});

const consolidate = defineMode({
  key: "consolidate",
  name: "Consolidate / Merge",
  label: "Consolidate / Merge",
  contextInjection:
    "Outline artifact + the merge group (or the full map with capped content), then the merge task. Returns the merged anchor content as structured JSON.",
  systemInstruction: `You merge overlapping or duplicate items into a single, coherent unit with no duplicated coverage.`,
  taskInstruction: `Merge the items in the MERGE GROUP above into one coherent markdown unit anchored on the anchor item. Remove redundancy while preserving all unique coverage. Return ONLY a JSON object with this exact shape:
{ "anchorId": <number>, "sourceIds": [<number>, ...], "mergedContent": "<markdown>" }
"mergedContent" is the full merged markdown for the anchor item. Return ONLY the JSON object, with no prose.`,
  output: "json",
  planOnly: true,
  // The merge group when scoped; otherwise the full map with content.
  context: (params) => mergeGroupContext(params),
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
