// BDDocExport.ts — export a doc to Markdown, HTML, or JSON.

import { marked } from "marked";
import type { BDDoc, BDDocTopic } from "../../BDDomain.Types";
import { topicMarkdown } from "./BDDoc.Types";

function heading(level: number, text: string): string {
  const hashes = "#".repeat(Math.min(Math.max(level, 1), 6));
  return `${hashes} ${text}`;
}

function topicLines(topic: BDDocTopic, depth: number): string[] {
  const lines: string[] = [heading(depth + 1, topic.title)];
  if (topic.summary) lines.push("", `_${topic.summary}_`);
  const body = topicMarkdown(topic);
  if (body) lines.push("", body);
  for (const child of topic.children ?? []) {
    lines.push("", ...topicLines(child, depth + 1));
  }
  return lines;
}

/** Markdown document for the whole doc (includes a table of contents). */
export function toDocMarkdown(doc: BDDoc): string {
  const lines: string[] = [`# ${doc.title ?? doc.name}`];
  if (doc.description) lines.push("", doc.description);

  if (doc.settings?.includeTableOfContents !== false) {
    lines.push("", "## Table of Contents", "");
    const walk = (topics: BDDocTopic[], depth: number) => {
      for (const topic of topics) {
        lines.push(`${"  ".repeat(depth)}- ${topic.title}`);
        walk(topic.children ?? [], depth + 1);
      }
    };
    walk(doc.topics, 0);
  }

  for (const topic of doc.topics) {
    lines.push("", ...topicLines(topic, 1));
  }

  return lines.join("\n");
}

/** Standalone HTML document rendered from the doc's markdown. */
export function toDocHtml(doc: BDDoc): string {
  const markdown = toDocMarkdown(doc);
  const content = marked.parse(markdown) as string;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${doc.title ?? doc.name}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #0f172a; max-width: 820px; margin: 2rem auto; padding: 0 1rem; line-height: 1.7; }
  h1, h2, h3 { color: #1565c0; line-height: 1.3; }
  code { background: #f1f5f9; padding: .1rem .3rem; border-radius: 4px; }
  pre { background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; }
  blockquote { border-left: 4px solid #90caf9; margin: 1rem 0; padding-left: 1rem; color: #475569; }
</style>
</head>
<body>
${content}
</body>
</html>`;
}

/** JSON export of the raw doc record. */
export function toDocJson(doc: BDDoc): string {
  return JSON.stringify(doc, null, 2);
}
