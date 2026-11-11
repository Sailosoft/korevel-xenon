// BDDiagramExport.ts — export diagrams as a Mermaid (.mmd), Markdown, SVG, or
// raster image (PNG).

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

export interface BDDiagramImageOptions {
  /** Raster scale relative to the SVG's natural size. Defaults to 2. */
  scale?: number;
  /** Canvas background colour. Defaults to white so PNGs read on dark UIs. */
  background?: string;
  /** Longest-side cap in pixels. Defaults to 8192. */
  maxDimension?: number;
}

/**
 * Rasterize SVG markup to a PNG blob.
 *
 * The image size is read from the SVG's `width`/`height` attributes, then its
 * `viewBox`, then the caller's fallback size. The scale is reduced when needed
 * so the longest side never exceeds `maxDimension`.
 */
export async function svgToPngBlob(
  svg: string,
  fallbackSize?: { width: number; height: number },
  options: BDDiagramImageOptions = {},
): Promise<Blob> {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  const numeric = (value: string | null): number => {
    // Mermaid emits `width="100%"` alongside a concrete `viewBox`; a relative
    // size must not win over the viewBox or the raster would collapse.
    if (!value || value.trim().endsWith("%")) return NaN;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
  };
  const viewBox = (root.getAttribute("viewBox") ?? "")
    .split(/[\s,]+/)
    .map((part) => parseFloat(part))
    .filter((part) => Number.isFinite(part));

  const width =
    numeric(root.getAttribute("width")) ||
    viewBox[2] ||
    fallbackSize?.width ||
    800;
  const height =
    numeric(root.getAttribute("height")) ||
    viewBox[3] ||
    fallbackSize?.height ||
    600;

  const maxDimension = options.maxDimension ?? 8192;
  const requestedScale = options.scale ?? 2;
  const longest = Math.max(width, height);
  const scale =
    longest > 0 && longest * requestedScale > maxDimension
      ? maxDimension / longest
      : requestedScale;

  // Give the SVG a concrete intrinsic size before rasterizing. Mermaid's
  // `width="100%"` would otherwise make the browser pick an arbitrary
  // intrinsic size and could distort the image when drawn to the canvas.
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  const normalized = new XMLSerializer().serializeToString(root);

  const svgBlob = new Blob([normalized], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not load the SVG"));
      el.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.fillStyle = options.background ?? "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("PNG encoding failed");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Rasterize the SVG rendered inside a diagram container to a PNG blob. */
export async function toDiagramPng(
  container: HTMLElement | null,
  fallbackSize?: { width: number; height: number },
  options?: BDDiagramImageOptions,
): Promise<Blob | null> {
  const svg = toDiagramSvg(container);
  if (!svg) return null;
  return svgToPngBlob(svg, fallbackSize, options);
}
