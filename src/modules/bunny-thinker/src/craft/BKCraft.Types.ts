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
  markdown: "Default markdown response with proper formatting",
  html: "Output that should be in strict HTML format",
  tailwind: "Output that should use Tailwind CSS class names",
  csv: "Output as CSV format; the craft engine will render it as a table",
  json: "Output as readable JSON format",
  imageList:
    "AI will attempt to find image links from Pexels, Unsplash, Pixabay, Pinterest, and StockSnap",
  mermaid: "Convert output to Mermaid diagram format",
  plain: "Just plain text output, no formatting",
};

// ─── Craft Engine Result ─────────────────────────────────────────────────

export interface BKCraftEngineResult {
  raw: string;
  parsed: string;
  format: BKCraftFormat;
  images?: Array<{ src: string; alt: string; source: string }>;
}
