// BDOutline.Types.ts — Outline form shapes, defaults, and topic-tree helpers.

import type {
  BDOutline,
  BDOutlineContent,
  BDOutlineTopic,
  BDOutlineTopicType,
  BDOutlineType,
  BDOutlineVisibility,
} from "./BDOutline.Domain";
import {
  BDOutlineContentType,
  BDOutlineStatus as OutlineStatus,
  BDOutlineTopicType as TopicType,
  BDOutlineType as OutlineType,
  BDOutlineVisibility as Visibility,
} from "./BDOutline.Domain";

export interface BDOutlineForm {
  name: string;
  title: string;
  slug: string;
  description: string;
  type: BDOutlineType;
  visibility: BDOutlineVisibility;
}

export const BD_OUTLINE_EMPTY_FORM: BDOutlineForm = {
  name: "",
  title: "",
  slug: "",
  description: "",
  type: OutlineType.documentation,
  visibility: Visibility.project,
};

const toOptions = (record: Record<string, string>) =>
  Object.keys(record).map((key) => ({ label: key, value: key }));

export const BD_OUTLINE_TYPE_OPTIONS = toOptions(OutlineType);
export const BD_OUTLINE_STATUS_OPTIONS = toOptions(OutlineStatus);
export const BD_OUTLINE_VISIBILITY_OPTIONS = toOptions(Visibility);
export const BD_OUTLINE_TOPIC_TYPE_OPTIONS = toOptions(TopicType);

export function slugify(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

export function createOutline(
  projectId: string,
  form: BDOutlineForm,
): Omit<BDOutline, "id"> {
  const now = new Date().toISOString();
  return {
    projectId,
    name: form.name,
    title: form.title || undefined,
    slug: form.slug || slugify(form.name),
    description: form.description || undefined,
    type: form.type,
    status: OutlineStatus.draft,
    format: "markdown",
    topics: [],
    guides: [],
    settings: { autoNumbering: true, includeTableOfContents: true },
    visibility: form.visibility,
    createdAt: now,
    updatedAt: now,
  };
}

export function toOutlineForm(outline: BDOutline): BDOutlineForm {
  return {
    name: outline.name,
    title: outline.title ?? "",
    slug: outline.slug,
    description: outline.description ?? "",
    type: outline.type,
    visibility: outline.visibility ?? Visibility.project,
  };
}

export function createTopic(
  title: string,
  type: BDOutlineTopicType = TopicType.topic,
  position = 0,
): BDOutlineTopic {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    children: [],
    type,
    title,
    slug: slugify(title),
    anchor: slugify(title),
    position,
    status: OutlineStatus.draft,
    content: [
      {
        id: crypto.randomUUID(),
        kind: BDOutlineContentType.paragraph,
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
  topics: BDOutlineTopic[],
  id: string,
): BDOutlineTopic | undefined {
  for (const topic of topics) {
    if (topic.id === id) return topic;
    const child = findTopic(topic.children ?? [], id);
    if (child) return child;
  }
  return undefined;
}

export function updateTopicInTree(
  topics: BDOutlineTopic[],
  id: string,
  patch: Partial<BDOutlineTopic>,
): BDOutlineTopic[] {
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
  topics: BDOutlineTopic[],
  parentId: string | null,
  topic: BDOutlineTopic,
): BDOutlineTopic[] {
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
  topics: BDOutlineTopic[],
  parentId: string | null,
  ordered: BDOutlineTopic[],
): BDOutlineTopic[] {
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
  topics: BDOutlineTopic[],
  id: string,
): BDOutlineTopic[] {
  return topics
    .filter((topic) => topic.id !== id)
    .map((topic) => ({
      ...topic,
      children: removeTopicFromTree(topic.children ?? [], id),
    }));
}

export function countTopics(topics: BDOutlineTopic[]): number {
  return topics.reduce(
    (sum, topic) => sum + 1 + countTopics(topic.children ?? []),
    0,
  );
}

export function topicMarkdown(topic: BDOutlineTopic): string {
  return (topic.content ?? [])
    .map((item) => item.text ?? "")
    .filter(Boolean)
    .join("\n\n");
}

export function createContentItem(text = ""): BDOutlineContent {
  return {
    id: crypto.randomUUID(),
    kind: BDOutlineContentType.paragraph,
    position: 0,
    text,
  };
}

// ── AI artifact drafts ─────────────────────────────────────────────────────

export interface BDOutlineTopicDraft {
  title: string;
  type?: string;
  summary?: string;
  content?: string;
  children?: BDOutlineTopicDraft[];
}

export interface BDOutlineDraft {
  name: string;
  title?: string;
  description?: string;
  type?: string;
  topics: BDOutlineTopicDraft[];
}

export interface BDOutlineArtifact {
  outlines: BDOutlineDraft[];
}
