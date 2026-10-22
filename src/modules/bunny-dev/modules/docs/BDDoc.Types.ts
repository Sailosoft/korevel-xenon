// BDDoc.Types.ts — Doc form shapes, defaults, and topic-tree helpers.

import type {
  BDDoc,
  BDDocContent,
  BDDocTopic,
  BDDocTopicType,
  BDDocType,
  BDDocVisibility,
} from "./BDDoc.Domain";
import {
  BDDocContentType,
  BDDocStatus as DocStatus,
  BDDocTopicType as TopicType,
  BDDocType as DocType,
  BDDocVisibility as Visibility,
} from "./BDDoc.Domain";

export interface BDDocForm {
  name: string;
  title: string;
  slug: string;
  description: string;
  type: BDDocType;
  visibility: BDDocVisibility;
}

export const BD_DOC_EMPTY_FORM: BDDocForm = {
  name: "",
  title: "",
  slug: "",
  description: "",
  type: DocType.documentation,
  visibility: Visibility.project,
};

const toOptions = (record: Record<string, string>) =>
  Object.keys(record).map((key) => ({ label: key, value: key }));

export const BD_DOC_TYPE_OPTIONS = toOptions(DocType);
export const BD_DOC_STATUS_OPTIONS = toOptions(DocStatus);
export const BD_DOC_VISIBILITY_OPTIONS = toOptions(Visibility);
export const BD_DOC_TOPIC_TYPE_OPTIONS = toOptions(TopicType);

export function slugify(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

export function createDoc(
  projectId: string,
  form: BDDocForm,
): Omit<BDDoc, "id"> {
  const now = new Date().toISOString();
  return {
    projectId,
    name: form.name,
    title: form.title || undefined,
    slug: form.slug || slugify(form.name),
    description: form.description || undefined,
    type: form.type,
    status: DocStatus.draft,
    format: "markdown",
    topics: [],
    guides: [],
    settings: { autoNumbering: true, includeTableOfContents: true },
    visibility: form.visibility,
    createdAt: now,
    updatedAt: now,
  };
}

export function toDocForm(doc: BDDoc): BDDocForm {
  return {
    name: doc.name,
    title: doc.title ?? "",
    slug: doc.slug,
    description: doc.description ?? "",
    type: doc.type,
    visibility: doc.visibility ?? Visibility.project,
  };
}

export function createTopic(
  title: string,
  type: BDDocTopicType = TopicType.topic,
  position = 0,
): BDDocTopic {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    children: [],
    type,
    title,
    slug: slugify(title),
    anchor: slugify(title),
    position,
    status: DocStatus.draft,
    content: [
      {
        id: crypto.randomUUID(),
        kind: BDDocContentType.paragraph,
        position: 0,
        text: "",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

// ── Tree helpers ───────────────────────────────────────────────────────────

export function findTopic(
  topics: BDDocTopic[],
  id: string,
): BDDocTopic | undefined {
  for (const topic of topics) {
    if (topic.id === id) return topic;
    const child = findTopic(topic.children ?? [], id);
    if (child) return child;
  }
  return undefined;
}

export function updateTopicInTree(
  topics: BDDocTopic[],
  id: string,
  patch: Partial<BDDocTopic>,
): BDDocTopic[] {
  return topics.map((topic) => {
    if (topic.id === id) return { ...topic, ...patch };
    if (topic.children && topic.children.length > 0) {
      return {
        ...topic,
        children: updateTopicInTree(topic.children, id, patch),
      };
    }
    return topic;
  });
}

export function addTopicToTree(
  topics: BDDocTopic[],
  parentId: string | null,
  topic: BDDocTopic,
): BDDocTopic[] {
  if (parentId === null) return [...topics, topic];
  return topics.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children ?? []), topic] };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: addTopicToTree(node.children, parentId, topic),
      };
    }
    return node;
  });
}

export function replaceSiblingsInTree(
  topics: BDDocTopic[],
  parentId: string | null,
  ordered: BDDocTopic[],
): BDDocTopic[] {
  if (parentId === null) return ordered;
  return topics.map((topic) => {
    if (topic.id === parentId) return { ...topic, children: ordered };
    if (topic.children && topic.children.length > 0) {
      return {
        ...topic,
        children: replaceSiblingsInTree(topic.children, parentId, ordered),
      };
    }
    return topic;
  });
}

export function removeTopicFromTree(
  topics: BDDocTopic[],
  id: string,
): BDDocTopic[] {
  return topics
    .filter((topic) => topic.id !== id)
    .map((topic) => ({
      ...topic,
      children: removeTopicFromTree(topic.children ?? [], id),
    }));
}

export function countTopics(topics: BDDocTopic[]): number {
  return topics.reduce(
    (sum, topic) => sum + 1 + countTopics(topic.children ?? []),
    0,
  );
}

export function topicMarkdown(topic: BDDocTopic): string {
  return (topic.content ?? [])
    .map((item) => item.text ?? "")
    .filter(Boolean)
    .join("\n\n");
}

export function createContentItem(text = ""): BDDocContent {
  return {
    id: crypto.randomUUID(),
    kind: BDDocContentType.paragraph,
    position: 0,
    text,
  };
}

// ── AI artifact drafts ─────────────────────────────────────────────────────

export interface BDDocTopicDraft {
  title: string;
  type?: string;
  summary?: string;
  content?: string;
  children?: BDDocTopicDraft[];
}

export interface BDDocDraft {
  name: string;
  title?: string;
  description?: string;
  type?: string;
  topics: BDDocTopicDraft[];
}

export interface BDDocArtifact {
  docs: BDDocDraft[];
}
