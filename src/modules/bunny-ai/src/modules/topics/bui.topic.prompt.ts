// bui.topic.prompt.ts
//
// Topic generation is framed by one of 11 Generation Types. Each type tells the
// AI what kind of artifact the Topic belongs to (never "a book"). The AI returns
// a single reusable Topic with a title and a description.

export interface BUITopicPromptEntry {
  key: string;
  name: string;
  /** Human-readable framing of the artifact this topic serves. */
  framing: string;
  systemPrompt: string;
}

export const buiTopicPrompt: {
  generateTopic: BUITopicPromptEntry[];
  userPrompt: string;
  extraPrompt: string;
} = {
  extraPrompt: `
The result must be ONE reusable Topic (not a book, not chapters).
Return ONLY a valid JSON object (no markdown code fences, no commentary) with exactly this shape:
{ "title": "A short, specific topic title", "description": "A 2-4 sentence description of what this topic covers and why it matters." }
  `,
  userPrompt: `
Topic seed / brief:
{{brief}}
{{#if title}}
Working title (optional, may be improved): {{title}}
{{/if}}
  `,
  generateTopic: [
    {
      key: "guide",
      name: "Guide",
      framing:
        "A practical how-to topic: ordered steps, prerequisites, and outcomes.",
      systemPrompt: `You are a practical how-to topic designer. Frame the topic as an actionable guide with ordered steps, prerequisites, and clear outcomes.`,
    },
    {
      key: "architecture",
      name: "Architecture",
      framing:
        "An architecture topic: components, boundaries, data flow, decisions, and trade-offs.",
      systemPrompt: `You are a systems architecture topic designer. Frame the topic around components, boundaries, data flow, key decisions, and trade-offs.`,
    },
    {
      key: "discussion",
      name: "Discussion",
      framing:
        "A discussion topic: open questions, perspectives, arguments, and counterpoints.",
      systemPrompt: `You are a discussion topic designer. Frame the topic around open questions, multiple perspectives, arguments, and counterpoints.`,
    },
    {
      key: "lecture_lesson",
      name: "Lecture and Lesson",
      framing:
        "A teaching topic sequenced as objectives, concepts, examples, and review.",
      systemPrompt: `You are a lecture and lesson topic designer. Frame the topic as a teaching sequence: objectives, core concepts, worked examples, and review.`,
    },
    {
      key: "study",
      name: "Study",
      framing:
        "A study topic: a learning path with key ideas, drills, and spaced-repetition prompts.",
      systemPrompt: `You are a study topic designer. Frame the topic as a learning path with key ideas, practice drills, and spaced-repetition prompts.`,
    },
    {
      key: "exam_helper",
      name: "Examination Helper",
      framing:
        "An examination-helper topic: a coverage map of likely question areas, checks, and pitfalls.",
      systemPrompt: `You are an examination-helper topic designer. Frame the topic as a coverage map of likely question areas, self-checks, and common pitfalls.`,
    },
    {
      key: "tutorial",
      name: "Tutorial/Walkthrough",
      framing:
        "A hands-on tutorial topic: incremental, runnable milestones.",
      systemPrompt: `You are a hands-on tutorial topic designer. Frame the topic as an incremental walkthrough with runnable milestones a learner can follow.`,
    },
    {
      key: "reference",
      name: "Reference/Cheat Sheet",
      framing:
        "A compact reference topic: definitions, syntax, and quick rules for lookup.",
      systemPrompt: `You are a reference and cheat-sheet topic designer. Frame the topic as a compact lookup covering definitions, syntax, and quick rules.`,
    },
    {
      key: "roadmap",
      name: "Project Roadmap",
      framing:
        "A project-roadmap topic: phased deliverables, milestones, and dependencies.",
      systemPrompt: `You are a project-roadmap topic designer. Frame the topic as phased deliverables, milestones, and dependencies.`,
    },
    {
      key: "research",
      name: "Research/Literature Review",
      framing:
        "A research topic: themes, sources, hypotheses, and evidence gaps.",
      systemPrompt: `You are a research and literature-review topic designer. Frame the topic around themes, sources, hypotheses, and evidence gaps.`,
    },
    {
      key: "workshop",
      name: "Workshop/Lab",
      framing:
        "A workshop/lab topic: exercises, materials, facilitator flow, and expected results.",
      systemPrompt: `You are a workshop and lab topic designer. Frame the topic around exercises, materials, facilitator flow, and expected results.`,
    },
  ],
};
