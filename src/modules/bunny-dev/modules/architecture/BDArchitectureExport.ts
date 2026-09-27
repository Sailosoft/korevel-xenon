// BDArchitectureExport.ts — export architecture documents to Markdown.

import type { BDArchitectureRecord } from "../../BDDomain.Types";
import { sectionMarkdown } from "./BDArchitecture.Types";

export function toArchitectureMarkdown(record: BDArchitectureRecord): string {
  const lines: string[] = [`# ${record.name}`];
  if (record.summary) lines.push("", `_${record.summary}_`);
  lines.push(
    "",
    `**Type:** ${record.type}  `,
    `**Status:** ${record.status}`,
  );
  if (record.version) lines.push(`**Version:** ${record.version}`);
  if (record.content) lines.push("", record.content);
  for (const section of record.sections ?? []) {
    lines.push("", sectionMarkdown(section));
  }
  return lines.join("\n");
}

export function toArchitectureHtml(record: BDArchitectureRecord): string {
  const markdown = toArchitectureMarkdown(record);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<title>${record.name}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width: 820px; margin: 2rem auto; padding: 0 1rem; line-height: 1.7; color: #0f172a; }
  h1, h2, h3 { color: #1565c0; }
  pre { white-space: pre-wrap; }
</style></head>
<body><pre>${markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</pre></body></html>`;
}
