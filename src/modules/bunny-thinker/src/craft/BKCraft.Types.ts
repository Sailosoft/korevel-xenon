import { z } from "zod";

// ─── Craft Formats ───────────────────────────────────────────────────────

export const BKCraftFormats = [
  "markdown",
  "html",
  "tailwind",
  "csv",
  "json",
  "imageList",
  "mermaid",
  "plain",
] as const;

export const BKCraftFormatEnum = z.enum(BKCraftFormats);
export type BKCraftFormat = z.infer<typeof BKCraftFormatEnum>;

// ─── Craft Configuration ─────────────────────────────────────────────────

export const BKCraftConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Craft name is required"),
  format: BKCraftFormatEnum.default("markdown"),
  description: z.string().optional(),
  /**
   * Craft instruction sent to AI that dictates output formatting.
   * This is a strict formatting directive — no commentary, no wrapping, no questions.
   */
  instruction: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type BKCraftConfig = z.infer<typeof BKCraftConfigSchema>;

// ─── Prompt Descriptions ─────────────────────────────────────────────────

export const BKCraftFormatDescriptions: Record<BKCraftFormat, string> = {
  markdown:
    "Markdown output that is actually readable and well-structured. Use real Markdown syntax to structure the content: headings (#/##), bullet or numbered lists, bold (**...**) and italics (*...*) where helpful, and blank lines between paragraphs. Use fenced code blocks (```...```) ONLY if the user request includes code or needs a code block. Otherwise, avoid code fences. STRICTLY PROHIBITED: any meta-commentary, introductory phrases (\"Here is the result\", \"Sure, here's\", etc.), concluding remarks, follow-up questions, or any text outside the requested content. Output ONLY the pure formatted response — nothing before, nothing after.",
  html:
    "Strict HTML output. Use appropriate semantic tags (h1/h2/h3, p, ul/ol/li, strong/em, pre/code, a, etc.) and valid nesting. Do not output Markdown.",
  tailwind:
    "Output that uses Tailwind CSS utility class names for styling. Provide className strings/attributes as needed; do not output unrelated markup or explanations.",
  csv:
    "CSV output. First row must be the header. Subsequent rows must match the header column count. The craft engine will render it as a table.",
  json:
    "Readable JSON output. Produce valid JSON only. Keep it structured (objects/arrays) and use indentation where possible.",
  imageList:
    "Image list output. Include image URLs (from Pexels, Unsplash, Pixabay, Pinterest, StockSnap when possible). The craft engine will extract URLs and render a gallery.",
  mermaid:
    "Mermaid diagram code. Output should be Mermaid syntax compatible with mermaid. Use ```mermaid fences only if you are explicitly providing a fenced block.",
  plain:
    "Plain text output only. No Markdown code fences and no Markdown formatting syntax. Keep it readable using paragraph breaks and simple line-based structure (e.g., numbered lines like '1. ...' or short bullet-like lines). Do not wrap the text in backticks.",
};


// ─── Craft Engine Result ─────────────────────────────────────────────────

export interface BKCraftEngineResult {
  raw: string;
  parsed: string;
  format: BKCraftFormat;
  images?: Array<{ src: string; alt: string; source: string }>;
}
