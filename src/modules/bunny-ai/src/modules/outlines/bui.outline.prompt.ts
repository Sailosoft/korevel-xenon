// bui.outline.prompt.ts
//
// Structure generation (summary + item list) is mode-agnostic: one call
// takes the outline, its instruction, and the optional attached Topic. The AI is
// framed by one of 11 Generation Types and never told it is creating "a book".

export interface BUIOutlineGenerationType {
  key: string;
  name: string;
  framing: string;
}

export const BUI_OUTLINE_GENERATION_TYPES: BUIOutlineGenerationType[] = [
  {
    key: "guide",
    name: "Guide",
    framing:
      "A practical how-to: ordered steps, prerequisites, and outcomes.",
  },
  {
    key: "architecture",
    name: "Architecture",
    framing:
      "Components, boundaries, data flow, decisions, and trade-offs.",
  },
  {
    key: "discussion",
    name: "Discussion",
    framing:
      "Open questions, perspectives, arguments, and counterpoints.",
  },
  {
    key: "lecture_lesson",
    name: "Lecture and Lesson",
    framing:
      "A teaching sequence: objectives → concepts → examples → review.",
  },
  {
    key: "study",
    name: "Study",
    framing:
      "A learning path: key ideas, drills, and spaced-repetition prompts.",
  },
  {
    key: "exam_helper",
    name: "Examination Helper",
    framing:
      "A coverage map: likely question areas, checks, and pitfalls.",
  },
  {
    key: "tutorial",
    name: "Tutorial/Walkthrough",
    framing: "Hands-on, incremental, runnable milestones.",
  },
  {
    key: "reference",
    name: "Reference/Cheat Sheet",
    framing: "A compact lookup: definitions, syntax, and quick rules.",
  },
  {
    key: "roadmap",
    name: "Project Roadmap",
    framing: "Phased deliverables, milestones, and dependencies.",
  },
  {
    key: "research",
    name: "Research/Literature Review",
    framing: "Themes, sources, hypotheses, and evidence gaps.",
  },
  {
    key: "workshop",
    name: "Workshop/Lab",
    framing:
      "Exercises, materials, facilitator flow, and expected results.",
  },
];

export interface BUIOutlinePromptEntry extends BUIOutlineGenerationType {
  systemPrompt: string;
}

export interface BUIOutlineDraftPromptEntry extends BUIOutlineGenerationType {
  systemPrompt: string;
}

export const buiOutlinePrompt: {
  generateStructure: BUIOutlinePromptEntry[];
  generateOutlineDraft: BUIOutlineDraftPromptEntry[];
  extraPrompt: string;
  draftExtraPrompt: string;
  authorProfileUserPrompt: string;
  noAuthorUserPrompt: string;
  draftUserPrompt: string;
} = {
  extraPrompt: `
Produce a progressive, non-repetitive set of items that together fully
cover the outline. If the outline specifies a minimum and/or maximum number of
items, you MUST respect that range: never exceed the maximum and aim for
at least the minimum. Return ONLY a valid JSON object (no markdown code fences,
no commentary) with exactly this structure:
{
  "summary": "A concise markdown summary of the whole outline.",
  "items": [
    {
      "number": 1,
      "title": "Item title",
      "description": "2-3 sentence summary of what this item covers.",
      "additionalPrompt": "Optional extra instruction for this item."
    }
  ]
}
Ensure item numbers are sequential starting at 1, and every item
has a distinct focus with clear continuity from the previous one.
  `,
  draftExtraPrompt: `
Design ONE reusable outline record (a plan container) — NOT the full item
list. Return ONLY a valid JSON object (no markdown code fences, no commentary)
with exactly this shape:
{
  "title": "A short, specific outline title",
  "description": "A 2-4 sentence description of what this outline covers and its goal.",
  "additionalPrompt": "Optional concise AI instruction to steer this outline's structure generation."
}
  `,
  draftUserPrompt: `
Outline seed / brief:
{{brief}}
{{#if title}}
Working title (optional, may be improved): {{title}}
{{/if}}
  `,
  authorProfileUserPrompt: `
Outline Title: {{outline.title}}
{{#if outline.description}}Outline Description: {{outline.description}}
{{/if}}{{#if outline.additionalPrompt}}Outline AI Instruction: {{outline.additionalPrompt}}
{{/if}}{{#if outline.generationMode}}Preferred Generation Mode: {{outline.generationMode}}
{{/if}}{{#if outline.minItems}}Minimum items: {{outline.minItems}}
{{/if}}{{#if outline.maxItems}}Maximum items: {{outline.maxItems}}
{{/if}}
Author Name: {{author.name}}
Author Bio: {{author.description}}
{{#if skills.length}}
Author Skills:
{{#each skills}}
- {{this.name}}: {{this.description}}
{{/each}}
{{/if}}
{{#if topic}}
Topic Title: {{topic.title}}
{{#if topic.description}}Topic Content: {{topic.description}}{{/if}}
Incorporate this Topic into the summary and the item coverage.
{{/if}}
  `,
  noAuthorUserPrompt: `
Outline Title: {{outline.title}}
{{#if outline.description}}Outline Description: {{outline.description}}
{{/if}}{{#if outline.additionalPrompt}}Outline AI Instruction: {{outline.additionalPrompt}}
{{/if}}{{#if outline.generationMode}}Preferred Generation Mode: {{outline.generationMode}}
{{/if}}{{#if outline.minItems}}Minimum items: {{outline.minItems}}
{{/if}}{{#if outline.maxItems}}Maximum items: {{outline.maxItems}}
{{/if}}
{{#if topic}}
Topic Title: {{topic.title}}
{{#if topic.description}}Topic Content: {{topic.description}}{{/if}}
Incorporate this Topic into the summary and the item coverage.
{{/if}}
  `,
  generateStructure: BUI_OUTLINE_GENERATION_TYPES.map((type) => ({
    ...type,
    systemPrompt: `You are an expert outline architect. Produce a structured, progressive item plan for a ${type.framing} artifact. Never describe your output as a book; keep the framing strictly aligned to the requested Generation Type.`,
  })),
  generateOutlineDraft: BUI_OUTLINE_GENERATION_TYPES.map((type) => ({
    ...type,
    systemPrompt: `You are an expert outline designer. Design a single outline record for a ${type.framing} artifact. Never describe your output as a book; keep the framing strictly aligned to the requested Generation Type.`,
  })),
};
