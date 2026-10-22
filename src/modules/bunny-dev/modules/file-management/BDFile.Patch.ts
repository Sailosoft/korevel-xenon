// BDFile.Patch.ts — patch model + application engine for the file AI
// assistant. Client-safe: no server-only imports.
//
// A patch replaces an inclusive region of the file, bounded by a start pattern
// and an end pattern (both copied verbatim from the file by the model), with
// `contentReplace`. Patches are applied sequentially: each one searches in the
// result of the previous patch.

export interface BDFilePatch {
  /** First line(s) of the region to replace (verbatim, unique). */
  patternToReplaceStart: string;
  /** Last line(s) of the region to replace (verbatim, inclusive). */
  patternToReplaceEnd: string;
  /** Text that replaces the inclusive region between the two patterns. */
  contentReplace: string;
}

/**
 * Maximum number of words in a start/end pattern. Patterns are only anchors —
 * they must be long enough to be unique but short enough to stay precise, so
 * each is capped to this many words.
 */
export const BD_MAX_PATTERN_WORDS = 30;

/** Count whitespace-separated words in a pattern (0 for empty/whitespace). */
export function patternWordCount(pattern: string): number {
  const trimmed = pattern.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export class BDFilePatchError extends Error {
  constructor(
    public readonly patchIndex: number,
    public readonly pattern: string,
    message: string,
  ) {
    super(message);
    this.name = "BDFilePatchError";
  }
}

/** Normalise CRLF/CR to LF so positions map cleanly to slice operations. */
function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** Collapse whitespace runs for a forgiving match. */
function collapseWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Exact, trailing-whitespace-agnostic, then fully fuzzy match. */
function indexOfLoose(content: string, pattern: string): number {
  if (pattern === "") return -1;

  // Strategy 1 — exact.
  const exact = content.indexOf(pattern);
  if (exact !== -1) return exact;

  // Strategy 2 — ignore trailing whitespace per line.
  const trimTrailing = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n");
  const trimmedContent = trimTrailing(content);
  const trimmedPattern = trimTrailing(pattern);
  const trimmedIndex = trimmedContent.indexOf(trimmedPattern);
  if (trimmedIndex !== -1) {
    const candidate = trimTrailing(
      content.slice(trimmedIndex, trimmedIndex + pattern.length),
    );
    if (candidate === trimmedPattern) return trimmedIndex;
  }

  // Strategy 3 — whitespace-collapsed fuzzy match with position mapping.
  const collapsedContent = collapseWhitespace(content);
  const collapsedPattern = collapseWhitespace(pattern);
  const collapsedIndex = collapsedContent.indexOf(collapsedPattern);
  if (collapsedIndex === -1) return -1;

  let originalPos = 0;
  let collapsedPos = 0;
  let inWhitespace = false;
  while (collapsedPos < collapsedIndex && originalPos < content.length) {
    const isWhitespace = /[\s]/.test(content[originalPos]);
    if (isWhitespace) {
      if (!inWhitespace) {
        collapsedPos++;
        inWhitespace = true;
      }
    } else {
      collapsedPos++;
      inWhitespace = false;
    }
    originalPos++;
  }
  while (originalPos < content.length && /[\s]/.test(content[originalPos])) {
    originalPos++;
  }
  return originalPos;
}

/**
 * Keep only patches whose start/end patterns are non-empty (start) and within
 * `BD_MAX_PATTERN_WORDS`. Oversized patterns are anchors that lost their
 * precision, so they are dropped rather than applied.
 */
export function validatePatchPatterns(patches: BDFilePatch[]): BDFilePatch[] {
  return patches.filter(
    (patch) =>
      patch.patternToReplaceStart.trim().length > 0 &&
      patternWordCount(patch.patternToReplaceStart) <= BD_MAX_PATTERN_WORDS &&
      patternWordCount(patch.patternToReplaceEnd) <= BD_MAX_PATTERN_WORDS,
  );
}

/**
 * Apply every patch in order. Returns the patched content or throws
 * `BDFilePatchError` naming the first patch whose pattern is oversized or
 * cannot be found.
 */
export function applyFilePatches(
  original: string,
  patches: BDFilePatch[],
): { content: string; applied: number } {
  let content = normalizeNewlines(original);

  for (let index = 0; index < patches.length; index += 1) {
    const patch = patches[index];
    const startPattern = patch.patternToReplaceStart ?? "";
    const endPattern = patch.patternToReplaceEnd ?? "";

    const startWords = patternWordCount(startPattern);
    const endWords = patternWordCount(endPattern);
    if (startWords > BD_MAX_PATTERN_WORDS || endWords > BD_MAX_PATTERN_WORDS) {
      throw new BDFilePatchError(
        index,
        startWords > BD_MAX_PATTERN_WORDS ? startPattern : endPattern,
        `Patch #${index + 1}: patterns must be at most ` +
          `${BD_MAX_PATTERN_WORDS} words.`,
      );
    }

    const start = indexOfLoose(content, startPattern);
    if (start === -1) {
      throw new BDFilePatchError(
        index,
        startPattern,
        `Patch #${index + 1}: start pattern not found in the file. ` +
          `Looked for: "${startPattern.slice(0, 80)}".`,
      );
    }

    let end: number;
    if (endPattern === "" || endPattern === startPattern) {
      // Single-line / single-token edit: replace just the start match.
      end = start + startPattern.length;
    } else {
      const searchFrom = start + startPattern.length;
      const endRel = indexOfLoose(content.slice(searchFrom), endPattern);
      if (endRel === -1) {
        throw new BDFilePatchError(
          index,
          endPattern,
          `Patch #${index + 1}: end pattern not found after the start pattern. ` +
            `Looked for: "${endPattern.slice(0, 80)}".`,
        );
      }
      end = searchFrom + endRel + endPattern.length;
    }

    content = content.slice(0, start) + (patch.contentReplace ?? "") + content.slice(end);
  }

  return { content, applied: patches.length };
}
