// BSKnowledgeBase.Text — Text utilities for the Knowledge Base feature.
//
// Chunks long source text into overlapping segments sized for the embedding
// model so each Orama vector document stays meaningful and within the model's
// token budget.

/** Target chunk length (characters) — comfortably inside Qwen3-Embedding-0.6B's 32768-token window. */
const CHUNK_SIZE = 1000;
/** Overlap between consecutive chunks so sentence boundaries are not lost. */
const CHUNK_OVERLAP = 150;
/** Target chunk length (characters) for source code — smaller to keep chunks focused. */
const CODE_CHUNK_SIZE = 800;
/** Overlap (characters) carried between consecutive code chunks. */
const CODE_CHUNK_OVERLAP = 120;

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

/**
 * Split source code into overlapping chunks while preserving newlines and
 * indentation (unlike `chunkText`, which collapses whitespace). Lines are
 * packed greedily into chunks with a small line-level overlap on boundaries.
 */
export function chunkCodeText(
  text: string,
  size = CODE_CHUNK_SIZE,
  overlap = CODE_CHUNK_OVERLAP,
): string[] {
  // Normalize line endings and strip trailing spaces so chunks stay stable.
  const clean = text.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const lines = clean.split("\n");
  const chunks: string[] = [];
  let buffer: string[] = [];
  let length = 0;

  // Join the buffered lines into a chunk and push it when it has content.
  const flush = () => {
    const chunk = buffer.join("\n").trim();
    if (chunk) chunks.push(chunk);
  };

  // Keep the trailing lines of the previous buffer as the next chunk's overlap.
  const carryOverlap = () => {
    const carry: string[] = [];
    let carryLength = 0;
    for (let i = buffer.length - 1; i >= 0 && carryLength < overlap; i--) {
      carry.unshift(buffer[i]);
      carryLength += buffer[i].length + 1;
    }
    buffer = carry;
    length = carryLength;
  };

  for (const line of lines) {
    if (line.length > size) {
      // Hard-split an oversized line (e.g. minified code) into slices.
      flush();
      buffer = [];
      length = 0;
      let i = 0;
      while (i < line.length) {
        chunks.push(line.slice(i, i + size).trim());
        i += size - overlap;
      }
      continue;
    }
    const nextLength = length + line.length + (buffer.length ? 1 : 0);
    if (nextLength > size && buffer.length) {
      flush();
      carryOverlap();
    }
    buffer.push(line);
    length += line.length + 1;
  }
  flush();
  return chunks.filter(Boolean);
}
