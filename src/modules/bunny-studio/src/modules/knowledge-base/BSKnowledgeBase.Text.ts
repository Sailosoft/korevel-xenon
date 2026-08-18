// BSKnowledgeBase.Text — Text utilities for the Knowledge Base feature.
//
// Chunks long source text into overlapping segments sized for the embedding
// model so each Orama vector document stays meaningful and within the model's
// token budget.

/** Target chunk length (characters) — comfortably inside Qwen3-Embedding-0.6B's 32768-token window. */
const CHUNK_SIZE = 1000;
/** Overlap between consecutive chunks so sentence boundaries are not lost. */
const CHUNK_OVERLAP = 150;

/** Collapse all whitespace runs into a single space and trim. */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Split raw text into overlapping chunks.
 *
 * Prefers to cut at paragraph / sentence boundaries; falls back to a hard cut
 * when a single paragraph is longer than the target size.
 */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = normalizeWhitespace(text);
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  // Split into paragraphs first, then greedily pack them into chunks.
  const paragraphs = clean
    .split(/(?:\r?\n){2,}|(?:\r?\n)/)
    .map((p) => p.trim())
    .filter(Boolean);

  let buffer = "";
  for (const para of paragraphs) {
    if (para.length > size) {
      // Hard-split an oversized paragraph into fixed-size overlapping slices.
      if (buffer) {
        chunks.push(buffer.trim());
        buffer = "";
      }
      let i = 0;
      while (i < para.length) {
        chunks.push(para.slice(i, i + size).trim());
        i += size - overlap;
      }
      continue;
    }
    const candidate = buffer ? `${buffer}\n${para}` : para;
    if (candidate.length > size && buffer) {
      chunks.push(buffer.trim());
      buffer = para;
    } else {
      buffer = candidate;
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks.filter(Boolean);
}
