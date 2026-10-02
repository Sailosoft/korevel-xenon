// BDDiagramExport.ts — export diagrams as a Mermaid (.mmd), Markdown, or SVG.

import type { BDDiagramRecord } from "../../BDDomain.Types";
import { toMermaid } from "./BDDiagram.Types";

/** Raw Mermaid source for a diagram. */
export function toDiagramMermaid(diagram: BDDiagramRecord): string {
  return toMermaid(diagram);
}

/** Markdown document embedding the diagram's Mermaid block. */
export function toDiagramMarkdown(diagram: BDDiagramRecord): string {
  return [
    `# ${diagram.name}`,
    "",
    diagram.title ? `_${diagram.title}_\n` : "",
    "```mermaid",
    toMermaid(diagram),
    "```",
    "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

/** Collect the SVG markup of a rendered diagram container, if present. */
export function toDiagramSvg(container: HTMLElement | null): string | null {
  const svg = container?.querySelector("svg");
  return svg ? svg.outerHTML : null;
}
