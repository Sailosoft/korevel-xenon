// BDDoc.Domain.ts — Doc domain model (knowledge base / documentation
// tree: topics, content, guides, sources, generations, reviews, exports).

import type {
  BDAppColor,
  BDDocFormat,
  BDEntity,
} from "../core/BDShared.Types";

export const BDDocType = {
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
export type BDDocType = (typeof BDDocType)[keyof typeof BDDocType];

export const BDDocStatus = {
  draft: "draft",
  review: "review",
  published: "published",
  outdated: "outdated",
  archived: "archived",
} as const;
export type BDDocStatus = (typeof BDDocStatus)[keyof typeof BDDocStatus];

export const BDDocTopicType = {
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
export type BDDocTopicType = (typeof BDDocTopicType)[keyof typeof BDDocTopicType];

export const BDDocContentType = {
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
export type BDDocContentType = (typeof BDDocContentType)[keyof typeof BDDocContentType];

export const BDDocDifficulty = {
  beginner: "beginner",
  easy: "easy",
  intermediate: "intermediate",
  advanced: "advanced",
  expert: "expert",
} as const;
export type BDDocDifficulty = (typeof BDDocDifficulty)[keyof typeof BDDocDifficulty];

export const BDDocAudience = {
  general: "general",
  endUser: "endUser",
  developer: "developer",
  admin: "admin",
  operator: "operator",
  executive: "executive",
} as const;
export type BDDocAudience = (typeof BDDocAudience)[keyof typeof BDDocAudience];

export const BDDocVisibility = {
  private: "private",
  project: "project",
  public: "public",
} as const;
export type BDDocVisibility = (typeof BDDocVisibility)[keyof typeof BDDocVisibility];

export const BDDocLinkType = {
  relatesTo: "relatesTo",
  prerequisite: "prerequisite",
  seeAlso: "seeAlso",
  references: "references",
  summarizes: "summarizes",
  expands: "expands",
  replaces: "replaces",
  translatedFrom: "translatedFrom",
} as const;
export type BDDocLinkType = (typeof BDDocLinkType)[keyof typeof BDDocLinkType];

export const BDDocGenerationMode = {
  outline: "outline",
  expand: "expand",
  continue: "continue",
  rewrite: "rewrite",
  summarize: "summarize",
  translate: "translate",
  restructure: "restructure",
  review: "review",
} as const;
export type BDDocGenerationMode = (typeof BDDocGenerationMode)[keyof typeof BDDocGenerationMode];

export const BDDocGenerationStatus = {
  pending: "pending",
  queued: "queued",
  generating: "generating",
  finished: "finished",
  failed: "failed",
  cancelled: "cancelled",
} as const;
export type BDDocGenerationStatus = (typeof BDDocGenerationStatus)[keyof typeof BDDocGenerationStatus];

export const BDDocSourceType = {
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
export type BDDocSourceType = (typeof BDDocSourceType)[keyof typeof BDDocSourceType];

export const BDDocReviewStatus = {
  pending: "pending",
  approved: "approved",
  changesRequested: "changesRequested",
  rejected: "rejected",
} as const;
export type BDDocReviewStatus = (typeof BDDocReviewStatus)[keyof typeof BDDocReviewStatus];

export const BDDocExportFormat = {
  markdown: "markdown",
  html: "html",
  pdf: "pdf",
  epub: "epub",
  docx: "docx",
  json: "json",
} as const;
export type BDDocExportFormat = (typeof BDDocExportFormat)[keyof typeof BDDocExportFormat];

export interface BDDocSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface BDDocSettings {
  language?: string;
  tone?: string;
  audience?: BDDocAudience;
  difficulty?: BDDocDifficulty;
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
  seo?: BDDocSeo;
}

export interface BDDocContentItem {
  text: string;
  checked?: boolean;
  children?: BDDocContentItem[];
}

export interface BDDocContent {
  id: string;
  kind: BDDocContentType;
  position: number;
  title?: string;
  text?: string;
  format?: BDDocFormat;
  language?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  items?: BDDocContentItem[];
  columns?: string[];
  rows?: string[][];
  diagramId?: string;
  modelId?: string;
  attachmentId?: string;
  url?: string;
  children?: BDDocContent[];
  generated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BDDocGeneration {
  id: string;
  topicId?: string;
  mode: BDDocGenerationMode;
  status: BDDocGenerationStatus;
  instruction?: string;
  prompt?: string;
  provider?: string;
  model?: string;
  options?: Record<string, unknown>;
  result?: BDDocContent[];
  sourceIds?: string[];
  tokensUsed?: number;
  cost?: number;
  requestedAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface BDDocSource {
  id: string;
  topicId?: string;
  guideId?: string;
  type: BDDocSourceType;
  name: string;
  url?: string;
  path?: string;
  content?: string;
  attachmentId?: string;
  diagramId?: string;
  modelId?: string;
  taskId?: string;
  specId?: string;
  weight?: number;
  createdAt: string;
}

export interface BDDocTopic {
  id: string;
  parentId?: string;
  children: BDDocTopic[];
  type: BDDocTopicType;
  title: string;
  slug: string;
  anchor: string;
  number?: string;
  summary?: string;
  description?: string;
  position: number;
  status: BDDocStatus;
  content: BDDocContent[];
  sourceIds?: string[];
  generations?: BDDocGeneration[];
  diagramIds?: string[];
  modelIds?: string[];
  attachmentIds?: string[];
  links?: BDDocLink[];
  difficulty?: BDDocDifficulty;
  audience?: BDDocAudience;
  tagIds?: string[];
  visibility?: BDDocVisibility;
  estimatedReadingTime?: number;
  wordCount?: number;
  collapsed?: boolean;
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BDDocGuideStep {
  id: string;
  position: number;
  title: string;
  instruction: string;
  command?: string;
  expected?: string;
  tip?: string;
  content?: BDDocContent[];
  attachmentId?: string;
}

export interface BDDocGuide {
  id: string;
  topicId?: string;
  title: string;
  slug: string;
  summary?: string;
  description?: string;
  steps: BDDocGuideStep[];
  prerequisites?: string[];
  content?: BDDocContent[];
  diagramIds?: string[];
  attachmentIds?: string[];
  difficulty?: BDDocDifficulty;
  audience?: BDDocAudience;
  estimatedTime?: number;
  status: BDDocStatus;
  position: number;
  tagIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BDDocTemplateTopic {
  title: string;
  type: BDDocTopicType;
  summary?: string;
  prompts?: string[];
  children?: BDDocTemplateTopic[];
}

export interface BDDocTemplate {
  projectId: string;
  name: string;
  description?: string;
  type: BDDocType;
  icon?: string;
  structure: BDDocTemplateTopic[];
  settings?: BDDocSettings;
  sourceIds?: string[];
}

export interface BDDocReview {
  id: string;
  topicId?: string;
  reviewerId: string;
  status: BDDocReviewStatus;
  comment?: string;
  createdAt: string;
}

export interface BDDocComment {
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

export interface BDDocLink {
  id: string;
  topicId?: string;
  type: BDDocLinkType;
  targetTopicId?: string;
  targetDocId?: string;
  url?: string;
}

export interface BDDocStats {
  topics: number;
  completed: number;
  words: number;
  readingTime: number;
  generated: number;
  reviewed: number;
  completion: number;
}

export interface BDDocExport {
  id: string;
  format: BDDocExportFormat;
  topicIds?: string[];
  path?: string;
  includeTableOfContents?: boolean;
  includeDiagrams?: boolean;
  includeSources?: boolean;
  createdAt: string;
}

/** Aggregate root: a whole knowledge base / documentation tree. */
export interface BDDoc extends BDEntity {
  projectId: string;
  name: string;
  title?: string;
  slug: string;
  description?: string;
  type: BDDocType;
  status: BDDocStatus;
  format: BDDocFormat;
  cover?: string;
  icon?: string;
  color?: BDAppColor;
  topics: BDDocTopic[];
  guides: BDDocGuide[];
  settings: BDDocSettings;
  template?: BDDocTemplate;
  sources?: BDDocSource[];
  reviews?: BDDocReview[];
  comments?: BDDocComment[];
  links?: BDDocLink[];
  exports?: BDDocExport[];
  attachmentIds?: string[];
  tagIds?: string[];
  authorIds?: string[];
  ownerId?: string;
  stats?: BDDocStats;
  visibility?: BDDocVisibility;
  version?: string;
  publishedAt?: string;
  archivedAt?: string;
}
