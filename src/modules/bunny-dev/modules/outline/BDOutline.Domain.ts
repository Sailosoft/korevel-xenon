// BDOutline.Domain.ts — Outline domain model (knowledge base / documentation
// tree: topics, content, guides, sources, generations, reviews, exports).

import type {
  BDAppColor,
  BDArchitectureFormat,
  BDEntity,
} from "../core/BDShared.Types";

export const BDOutlineType = {
  knowledgeBase: "knowledgeBase",
  documentation: "documentation",
  guide: "guide",
  tutorial: "tutorial",
  book: "book",
  manual: "manual",
  reference: "reference",
  wiki: "wiki",
  faq: "faq",
  glossary: "glossary",
  notes: "notes",
} as const;
export type BDOutlineType = (typeof BDOutlineType)[keyof typeof BDOutlineType];

export const BDOutlineStatus = {
  draft: "draft",
  review: "review",
  published: "published",
  outdated: "outdated",
  archived: "archived",
} as const;
export type BDOutlineStatus = (typeof BDOutlineStatus)[keyof typeof BDOutlineStatus];

export const BDOutlineTopicType = {
  part: "part",
  chapter: "chapter",
  section: "section",
  topic: "topic",
  subtopic: "subtopic",
  guide: "guide",
  article: "article",
  lesson: "lesson",
  step: "step",
  exercise: "exercise",
  example: "example",
  reference: "reference",
  appendix: "appendix",
} as const;
export type BDOutlineTopicType = (typeof BDOutlineTopicType)[keyof typeof BDOutlineTopicType];

export const BDOutlineContentType = {
  heading: "heading",
  paragraph: "paragraph",
  list: "list",
  checklist: "checklist",
  table: "table",
  code: "code",
  diagram: "diagram",
  model: "model",
  image: "image",
  video: "video",
  audio: "audio",
  quote: "quote",
  callout: "callout",
  tabs: "tabs",
  steps: "steps",
  accordion: "accordion",
  formula: "formula",
  embed: "embed",
  attachment: "attachment",
  quiz: "quiz",
} as const;
export type BDOutlineContentType = (typeof BDOutlineContentType)[keyof typeof BDOutlineContentType];

export const BDOutlineDifficulty = {
  beginner: "beginner",
  easy: "easy",
  intermediate: "intermediate",
  advanced: "advanced",
  expert: "expert",
} as const;
export type BDOutlineDifficulty = (typeof BDOutlineDifficulty)[keyof typeof BDOutlineDifficulty];

export const BDOutlineAudience = {
  general: "general",
  endUser: "endUser",
  developer: "developer",
  admin: "admin",
  operator: "operator",
  executive: "executive",
} as const;
export type BDOutlineAudience = (typeof BDOutlineAudience)[keyof typeof BDOutlineAudience];

export const BDOutlineVisibility = {
  private: "private",
  project: "project",
  public: "public",
} as const;
export type BDOutlineVisibility = (typeof BDOutlineVisibility)[keyof typeof BDOutlineVisibility];

export const BDOutlineLinkType = {
  relatesTo: "relatesTo",
  prerequisite: "prerequisite",
  seeAlso: "seeAlso",
  references: "references",
  summarizes: "summarizes",
  expands: "expands",
  replaces: "replaces",
  translatedFrom: "translatedFrom",
} as const;
export type BDOutlineLinkType = (typeof BDOutlineLinkType)[keyof typeof BDOutlineLinkType];

export const BDOutlineGenerationMode = {
  outline: "outline",
  expand: "expand",
  continue: "continue",
  rewrite: "rewrite",
  summarize: "summarize",
  translate: "translate",
  restructure: "restructure",
  review: "review",
} as const;
export type BDOutlineGenerationMode = (typeof BDOutlineGenerationMode)[keyof typeof BDOutlineGenerationMode];

export const BDOutlineGenerationStatus = {
  pending: "pending",
  queued: "queued",
  generating: "generating",
  finished: "finished",
  failed: "failed",
  cancelled: "cancelled",
} as const;
export type BDOutlineGenerationStatus = (typeof BDOutlineGenerationStatus)[keyof typeof BDOutlineGenerationStatus];

export const BDOutlineSourceType = {
  text: "text",
  url: "url",
  file: "file",
  markdown: "markdown",
  diagram: "diagram",
  model: "model",
  task: "task",
  architecture: "architecture",
  comment: "comment",
  conversation: "conversation",
} as const;
export type BDOutlineSourceType = (typeof BDOutlineSourceType)[keyof typeof BDOutlineSourceType];

export const BDOutlineReviewStatus = {
  pending: "pending",
  approved: "approved",
  changesRequested: "changesRequested",
  rejected: "rejected",
} as const;
export type BDOutlineReviewStatus = (typeof BDOutlineReviewStatus)[keyof typeof BDOutlineReviewStatus];

export const BDOutlineExportFormat = {
  markdown: "markdown",
  html: "html",
  pdf: "pdf",
  epub: "epub",
  docx: "docx",
  json: "json",
} as const;
export type BDOutlineExportFormat = (typeof BDOutlineExportFormat)[keyof typeof BDOutlineExportFormat];

export interface BDOutlineSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface BDOutlineSettings {
  language?: string;
  tone?: string;
  audience?: BDOutlineAudience;
  difficulty?: BDOutlineDifficulty;
  autoNumbering?: boolean;
  includeTableOfContents?: boolean;
  includeSummaries?: boolean;
  includeDiagrams?: boolean;
  includeExamples?: boolean;
  includeExercises?: boolean;
  citationStyle?: "none" | "inline" | "footnote" | "numbered";
  maxDepth?: number;
  targetWords?: number;
  autoGenerate?: boolean;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  seo?: BDOutlineSeo;
}

export interface BDOutlineContentItem {
  text: string;
  checked?: boolean;
  children?: BDOutlineContentItem[];
}

export interface BDOutlineContent {
  id: string;
  kind: BDOutlineContentType;
  position: number;
  title?: string;
  text?: string;
  format?: BDArchitectureFormat;
  language?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  items?: BDOutlineContentItem[];
  columns?: string[];
  rows?: string[][];
  diagramId?: string;
  modelId?: string;
  attachmentId?: string;
  url?: string;
  children?: BDOutlineContent[];
  generated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BDOutlineGeneration {
  id: string;
  topicId?: string;
  mode: BDOutlineGenerationMode;
  status: BDOutlineGenerationStatus;
  instruction?: string;
  prompt?: string;
  provider?: string;
  model?: string;
  options?: Record<string, unknown>;
  result?: BDOutlineContent[];
  sourceIds?: string[];
  tokensUsed?: number;
  cost?: number;
  requestedAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface BDOutlineSource {
  id: string;
  topicId?: string;
  guideId?: string;
  type: BDOutlineSourceType;
  name: string;
  url?: string;
  path?: string;
  content?: string;
  attachmentId?: string;
  diagramId?: string;
  modelId?: string;
  taskId?: string;
  architectureId?: string;
  weight?: number;
  createdAt: string;
}

export interface BDOutlineTopic {
  id: string;
  parentId?: string;
  children: BDOutlineTopic[];
  type: BDOutlineTopicType;
  title: string;
  slug: string;
  anchor: string;
  number?: string;
  summary?: string;
  description?: string;
  position: number;
  status: BDOutlineStatus;
  content: BDOutlineContent[];
  sourceIds?: string[];
  generations?: BDOutlineGeneration[];
  diagramIds?: string[];
  modelIds?: string[];
  attachmentIds?: string[];
  links?: BDOutlineLink[];
  difficulty?: BDOutlineDifficulty;
  audience?: BDOutlineAudience;
  tagIds?: string[];
  visibility?: BDOutlineVisibility;
  estimatedReadingTime?: number;
  wordCount?: number;
  collapsed?: boolean;
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BDOutlineGuideStep {
  id: string;
  position: number;
  title: string;
  instruction: string;
  command?: string;
  expected?: string;
  tip?: string;
  content?: BDOutlineContent[];
  attachmentId?: string;
}

export interface BDOutlineGuide {
  id: string;
  topicId?: string;
  title: string;
  slug: string;
  summary?: string;
  description?: string;
  steps: BDOutlineGuideStep[];
  prerequisites?: string[];
  content?: BDOutlineContent[];
  diagramIds?: string[];
  attachmentIds?: string[];
  difficulty?: BDOutlineDifficulty;
  audience?: BDOutlineAudience;
  estimatedTime?: number;
  status: BDOutlineStatus;
  position: number;
  tagIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BDOutlineTemplateTopic {
  title: string;
  type: BDOutlineTopicType;
  summary?: string;
  prompts?: string[];
  children?: BDOutlineTemplateTopic[];
}

export interface BDOutlineTemplate {
  projectId: string;
  name: string;
  description?: string;
  type: BDOutlineType;
  icon?: string;
  structure: BDOutlineTemplateTopic[];
  settings?: BDOutlineSettings;
  sourceIds?: string[];
}

export interface BDOutlineReview {
  id: string;
  topicId?: string;
  reviewerId: string;
  status: BDOutlineReviewStatus;
  comment?: string;
  createdAt: string;
}

export interface BDOutlineComment {
  id: string;
  topicId?: string;
  contentId?: string;
  authorId?: string;
  comment: string;
  resolved?: boolean;
  replyToId?: string;
  createdAt: string;
  editedAt?: string;
}

export interface BDOutlineLink {
  id: string;
  topicId?: string;
  type: BDOutlineLinkType;
  targetTopicId?: string;
  targetOutlineId?: string;
  url?: string;
}

export interface BDOutlineStats {
  topics: number;
  completed: number;
  words: number;
  readingTime: number;
  generated: number;
  reviewed: number;
  completion: number;
}

export interface BDOutlineExport {
  id: string;
  format: BDOutlineExportFormat;
  topicIds?: string[];
  path?: string;
  includeTableOfContents?: boolean;
  includeDiagrams?: boolean;
  includeSources?: boolean;
  createdAt: string;
}

/** Aggregate root: a whole knowledge base / documentation tree. */
export interface BDOutline extends BDEntity {
  projectId: string;
  name: string;
  title?: string;
  slug: string;
  description?: string;
  type: BDOutlineType;
  status: BDOutlineStatus;
  format: BDArchitectureFormat;
  cover?: string;
  icon?: string;
  color?: BDAppColor;
  topics: BDOutlineTopic[];
  guides: BDOutlineGuide[];
  settings: BDOutlineSettings;
  template?: BDOutlineTemplate;
  sources?: BDOutlineSource[];
  reviews?: BDOutlineReview[];
  comments?: BDOutlineComment[];
  links?: BDOutlineLink[];
  exports?: BDOutlineExport[];
  attachmentIds?: string[];
  tagIds?: string[];
  authorIds?: string[];
  ownerId?: string;
  stats?: BDOutlineStats;
  visibility?: BDOutlineVisibility;
  version?: string;
  publishedAt?: string;
  archivedAt?: string;
}
