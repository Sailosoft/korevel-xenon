# Task:

## Name: Add Skills Market

## Intent:

- add new module skills market.
- This module a market place for my skills
- where it is not automatically put on author skills record
- where i could browse skills
- when skills i prefer it would add to author skills
- expectation
  - i could browse skills
  - add them
  - it will display to author skills

## Plan:

- Add new modules on src\modules\bunny-ai\src\modules skills-market
  - follow the code pattern around the modules
- generate me bunny component and modules with seperate the file.
  - component
  - interface
  - hooks
  - lib
  - constant(object list of file)
- Add skills to the market place this should be base on author-skills

```
AnalogyBridgeSkill – Explain abstract or complex concepts using familiar real-world metaphors and everyday scenarios.

KeyTakeawaysSkill – Synthesize high-yield bullet points or core insights at the start or end of each major section.

ActionableExerciseSkill – Formulate practical assignments, prompts, or step-by-step exercises at the end of each chapter.

GlossaryBuilderSkill – Identify key technical terms within the generated content and automatically extract them into a glossary registry.

CommonPitfallsSkill – Highlight frequent mistakes, misconceptions, or anti-patterns related to the current topic.

ClaritySimplificationSkill – Refine dense or convoluted sentences into crisp, easily digestible prose without losing nuance.

ReadabilityOptimizerSkill – Format and structure text (short paragraphs, bold highlights, callouts) to lower cognitive load.

VisualCalloutSkill – Design embedded sidebars, tip boxes, warnings, or deep-dive callout blocks.

CrossReferencerSkill – Generate internal references to concepts explained in earlier or later chapters (e.g., "As discussed in Chapter 2...").

SEOKeywordIntegratorSkill – Seamlessly incorporate targeted search terms and headings into chapter titles and body text for digital publication.

TransitionSmoothingSkill – Bridge thematic or temporal jumps smoothly between sub-sections and chapters.

EpilogueSynthesisSkill – Draft a concluding wrap-up or forward-looking perspective tying all main themes together.

MentalModelBuilderSkill – Frame new or unfamiliar concepts using established cognitive frameworks (e.g., First Principles, Inversion).

InformationDensitySkill – Adjust data-to-prose ratios to make technical documentation digestible without sacrificing depth.

ExecutiveSummarySkill – Generate high-level section digests tailored for readers who scan or skim through lengthy chapters.

CognitiveLoadReducerSkill – Refactor complex multi-clause sentences into single-idea structures to lower reader fatigue.

AntagonisticQuestionerSkill – Introduce mid-chapter reader objections and answer them in real time to build trust.

GamifiedProgressSkill – Embed interactive checkpoints, self-assessments, and milestone recap markers into instructional books.

CuriosityGapSkill – Formulate intriguing open loops at the end of subsections that compel the reader to continue to the next page.

ActiveVoiceEnforcerSkill – Identify and eliminate passive voice constructs across target sections to tighten prose.
WordEconomySkill – Perform aggressive conciseness passes, stripping fluff words while preserving core context.

DialogueDistinctivenessSkill – Enforce unique syntax, vocabulary, and rhythm markers for individual speaking characters.

ChapterMetadataSkill – Generate chapter titles, subtitles, estimated reading times, and abstract headers.

SideNoteCuratorSkill – Extract secondary background details or trivia into marginalia or sidebar text blocks.

FormattingStyleEnforcerSkill – Apply consistent blockquote styles, callout formatting, and typography hierarchy.

TableTransformerSkill – Convert dense inline descriptions into organized Markdown tables for rapid scanning.

FrontMatterGeneratorSkill – Draft prefaces, forewords, acknowledgments, and dedication sections tailored to book theme.


BackMatterGeneratorSkill – Craft author bios, call-to-action pages, newsletter landing copy, and index keywords.

RevisionDeltaSummarizerSkill – Provide changelogs comparing previous draft versions against newly generated edits.

OutlineDeconstructorSkill – Reverse-engineer drafted text into structured bullet points for quick author verification.
```

- in market skills i could browse skills
- then there is row action and header action button where i could put add to author skills
- add warning if author skills has existing name and could be override.

## Specs:

- src\modules\bunny-ai\src\modules\author-skills\bui.author-skills.default.ts -> reference
- src\modules\bunny-ai\src\modules\skills-market
  - where you put the component and logic.
  - Use strictly bunny modules.
    - src\modules\bunny\src\Bunny.tsx
    - on building market
