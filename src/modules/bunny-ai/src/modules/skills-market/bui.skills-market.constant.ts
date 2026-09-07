// bui.skills-market.constant.ts
//
// Market catalog: the built-in list of skills offered by the Skills Market.
// These are purely browsable constants — nothing here is inserted into the
// Author Skills registry automatically. The user adds skills to Author Skills
// explicitly from the marketplace row/header actions.

import { BUISkillsMarketSkill } from "./bui.skills-market.entity";

/**
 * Marketplace skills exposed as a constant object.
 *
 * Each key is the canonical skill id; `name` is the human-readable label
 * shown in the marketplace. Descriptions mirror the author-skills tone.
 */
export const BUI_SKILLS_MARKET = {
  AnalogyBridgeSkill: {
    name: "Analogy Bridge Skill",
    description:
      "Explain abstract or complex concepts using familiar real-world metaphors and everyday scenarios.",
  },
  KeyTakeawaysSkill: {
    name: "Key Takeaways Skill",
    description:
      "Synthesize high-yield bullet points or core insights at the start or end of each major section.",
  },
  ActionableExerciseSkill: {
    name: "Actionable Exercise Skill",
    description:
      "Formulate practical assignments, prompts, or step-by-step exercises at the end of each chapter.",
  },
  GlossaryBuilderSkill: {
    name: "Glossary Builder Skill",
    description:
      "Identify key technical terms within the generated content and automatically extract them into a glossary registry.",
  },
  CommonPitfallsSkill: {
    name: "Common Pitfalls Skill",
    description:
      "Highlight frequent mistakes, misconceptions, or anti-patterns related to the current topic.",
  },
  ClaritySimplificationSkill: {
    name: "Clarity Simplification Skill",
    description:
      "Refine dense or convoluted sentences into crisp, easily digestible prose without losing nuance.",
  },
  ReadabilityOptimizerSkill: {
    name: "Readability Optimizer Skill",
    description:
      "Format and structure text (short paragraphs, bold highlights, callouts) to lower cognitive load.",
  },
  VisualCalloutSkill: {
    name: "Visual Callout Skill",
    description:
      "Design embedded sidebars, tip boxes, warnings, or deep-dive callout blocks.",
  },
  CrossReferencerSkill: {
    name: "Cross Referencer Skill",
    description:
      "Generate internal references to concepts explained in earlier or later chapters (e.g., \u201cAs discussed in Chapter 2...\u201d).",
  },
  SEOKeywordIntegratorSkill: {
    name: "SEO Keyword Integrator Skill",
    description:
      "Seamlessly incorporate targeted search terms and headings into chapter titles and body text for digital publication.",
  },
  TransitionSmoothingSkill: {
    name: "Transition Smoothing Skill",
    description:
      "Bridge thematic or temporal jumps smoothly between sub-sections and chapters.",
  },
  EpilogueSynthesisSkill: {
    name: "Epilogue Synthesis Skill",
    description:
      "Draft a concluding wrap-up or forward-looking perspective tying all main themes together.",
  },
  MentalModelBuilderSkill: {
    name: "Mental Model Builder Skill",
    description:
      "Frame new or unfamiliar concepts using established cognitive frameworks (e.g., First Principles, Inversion).",
  },
  InformationDensitySkill: {
    name: "Information Density Skill",
    description:
      "Adjust data-to-prose ratios to make technical documentation digestible without sacrificing depth.",
  },
  ExecutiveSummarySkill: {
    name: "Executive Summary Skill",
    description:
      "Generate high-level section digests tailored for readers who scan or skim through lengthy chapters.",
  },
  CognitiveLoadReducerSkill: {
    name: "Cognitive Load Reducer Skill",
    description:
      "Refactor complex multi-clause sentences into single-idea structures to lower reader fatigue.",
  },
  AntagonisticQuestionerSkill: {
    name: "Antagonistic Questioner Skill",
    description:
      "Introduce mid-chapter reader objections and answer them in real time to build trust.",
  },
  GamifiedProgressSkill: {
    name: "Gamified Progress Skill",
    description:
      "Embed interactive checkpoints, self-assessments, and milestone recap markers into instructional books.",
  },
  CuriosityGapSkill: {
    name: "Curiosity Gap Skill",
    description:
      "Formulate intriguing open loops at the end of subsections that compel the reader to continue to the next page.",
  },
  ActiveVoiceEnforcerSkill: {
    name: "Active Voice Enforcer Skill",
    description:
      "Identify and eliminate passive voice constructs across target sections to tighten prose.",
  },
  WordEconomySkill: {
    name: "Word Economy Skill",
    description:
      "Perform aggressive conciseness passes, stripping fluff words while preserving core context.",
  },
  DialogueDistinctivenessSkill: {
    name: "Dialogue Distinctiveness Skill",
    description:
      "Enforce unique syntax, vocabulary, and rhythm markers for individual speaking characters.",
  },
  ChapterMetadataSkill: {
    name: "Chapter Metadata Skill",
    description:
      "Generate chapter titles, subtitles, estimated reading times, and abstract headers.",
  },
  SideNoteCuratorSkill: {
    name: "Side Note Curator Skill",
    description:
      "Extract secondary background details or trivia into marginalia or sidebar text blocks.",
  },
  FormattingStyleEnforcerSkill: {
    name: "Formatting Style Enforcer Skill",
    description:
      "Apply consistent blockquote styles, callout formatting, and typography hierarchy.",
  },
  TableTransformerSkill: {
    name: "Table Transformer Skill",
    description:
      "Convert dense inline descriptions into organized Markdown tables for rapid scanning.",
  },
  FrontMatterGeneratorSkill: {
    name: "Front Matter Generator Skill",
    description:
      "Draft prefaces, forewords, acknowledgments, and dedication sections tailored to book theme.",
  },
  BackMatterGeneratorSkill: {
    name: "Back Matter Generator Skill",
    description:
      "Craft author bios, call-to-action pages, newsletter landing copy, and index keywords.",
  },
  RevisionDeltaSummarizerSkill: {
    name: "Revision Delta Summarizer Skill",
    description:
      "Provide changelogs comparing previous draft versions against newly generated edits.",
  },
  OutlineDeconstructorSkill: {
    name: "Outline Deconstructor Skill",
    description:
      "Reverse-engineer drafted text into structured bullet points for quick author verification.",
  },
} as const satisfies Record<string, BUISkillsMarketSkill>;

/** Returns the full market catalog as plain BUISkillsMarketSkill objects. */
export function buiSkillsMarketGetAll(): BUISkillsMarketSkill[] {
  return Object.values(BUI_SKILLS_MARKET).map((skill) => ({
    name: skill.name,
    description: skill.description,
  }));
}

/** Total number of skills offered on the marketplace. */
export function buiSkillsMarketGetTotal(): number {
  return Object.keys(BUI_SKILLS_MARKET).length;
}