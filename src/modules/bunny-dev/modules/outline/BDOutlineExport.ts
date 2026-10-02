// BDOutlineExport.ts — export an outline to Markdown, HTML, or JSON.

import { marked } from "marked";
import type { BDOutline, BDOutlineTopic } from "../../BDDomain.Types";
import { topicMarkdown } from "./BDOutline.Types";

function heading(level: number, text: string): string {
  const hashes = "#".repeat(Math.min(Math.max(level, 1), 6));
  return `${hashes} ${text}`;
}

function topicLines(topic: BDOutlineTopic, depth: number): string[] {
  const lines: string[] = [heading(depth + 1, topic.title)];
  if (topic.summary) lines.push("", `_${topic.summary}_`);
  const body = topicMarkdown(topic);
  if (body) lines.push("", body);
  for (const child of topic.children ?? []) {
    lines.push("", ...topicLines(child, depth + 1));
  }
  return lines;
}

/** Markdown document for the whole outline (includes a table of contents). */
export function toOutlineMarkdown(outline: BDOutline): string {
  const lines: string[] = [`# ${outline.title ?? outline.name}`];
  if (outline.description) lines.push("", outline.description);

  if (outline.settings?.includeTableOfContents !== false) {
    lines.push("", "## Table of Contents", "");
    const walk = (topics: BDOutlineTopic[], depth: number) => {
      for (const topic of topics) {
        lines.push(`${"  ".repeat(depth)}- ${topic.title}`);
        walk(topic.children ?? [], depth + 1);
      }
    };
    walk(outline.topics, 0);
  }

  for (const topic of outline.topics) {
    lines.push("", ...topicLines(topic, 1));
  }

  return lines.join("\n");
}

/** Standalone HTML document rendered from the outline's markdown. */
export function toOutlineHtml(outline: BDOutline): string {
  const markdown = toOutlineMarkdown(outline);
  const content = marked.parse(markdown) as string;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${outline.title ?? outline.name}</title>
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

/** JSON export of the raw outline record. */
export function toOutlineJson(outline: BDOutline): string {
  return JSON.stringify(outline, null, 2);
}
