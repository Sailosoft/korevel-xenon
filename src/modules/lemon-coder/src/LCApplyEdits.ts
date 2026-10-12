// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCApplyEdits
// Pure SEARCH/REPLACE matching engine.
//
// Dependency-free (only the LCFileEdit type) so it can be unit-tested in
// isolation and reused by UI handlers. `useLCChat.ts` re-exports
// `applySearchReplace` for existing consumers.
//
// Matching strategy (progressive fallback):
//   1. Exact match (indexOf) — preferred, character-perfect
//   2. Anchor match — short first/last-line anchors locate a region (uniqueness-first)
//   3. Whitespace-normalised match (fuzzyIndexOf) — tolerates whitespace differences
//   4. Trailing-whitespace-agnostic match — strips trailing whitespace per line
//   5. Partial-block match — drops first/last line of the Search block
//
// Multiple-match ambiguity is a hard error (fail loud) for non-anchor matches;
// the anchor path resolves uniqueness itself before matching.
// ───────────────────────────────────────────────────────────────────────────────

import type { LCFileEdit } from "./LCInterface";

/**
 * Normalise whitespace for fuzzy matching.
 * Collapses runs of whitespace into single spaces and normalises line endings.
 * This allows a "forgiving" match when the AI slightly differs from the file
 * on disk (e.g. extra blank line, tabs vs spaces).
 */
function collapseWhitespace(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Find the position of `search` in `content` using whitespace-agnostic matching.
 * Returns the byte offset in `content` or -1 if not found.
 *
 * Strategy: collapse whitespace in both strings, find the match position in the
 * collapsed version, then trace back through the original content to map the
 * collapsed position back to an original offset.
 */
function fuzzyIndexOf(content: string, search: string): number {
  const collapsedContent = collapseWhitespace(content);
  const collapsedSearch = collapseWhitespace(search);
  const cIdx = collapsedContent.indexOf(collapsedSearch);
  if (cIdx === -1) return -1;

  // Map collapsed position back to original position by walking through
  // the original content and collapsing as we go.
  let originalPos = 0;
  let collapsedPos = 0;
  let inWhitespace = false;

  while (collapsedPos < cIdx && originalPos < content.length) {
    const ch = content[originalPos];
    const isWS = /[\s]/.test(ch);

    if (isWS) {
      if (!inWhitespace) {
        // This is the first whitespace char — counts as 1 in collapsed form
        collapsedPos++;
        inWhitespace = true;
      }
      // Additional whitespace chars are collapsed away — don't advance collapsedPos
    } else {
      collapsedPos++;
      inWhitespace = false;
    }

    originalPos++;
  }

  // Skip any remaining leading whitespace in the actual content before the match
  while (originalPos < content.length && /[\s]/.test(content[originalPos])) {
    originalPos++;
  }

  return originalPos;
}

// ── Anchor matching (short-anchor SEARCH blocks) ─────────────────────────────
//
// A `Search` block's FIRST and LAST non-blank lines act as start/end anchors.
// The matcher locates the region they bound (uniqueness-first) so the AI can
// emit short 1-3 line blocks instead of pasting whole sections.

const ANCHOR_MAX_CHARS = 30;
const ANCHOR_MIN_CHARS = 6;
const ANCHOR_MAX_SPAN_SLACK = 2;
const ANCHOR_MAX_SCAN = 50;

/** Index just after the line break preceding `pos` (0 if none). */
function lineStartAt(content: string, pos: number): number {
  const nl = content.lastIndexOf("\n", pos - 1);
  return nl === -1 ? 0 : nl + 1;
}

/** Index of the line break at/after `pos` (content.length if none). */
function lineEndAt(content: string, pos: number): number {
  const nl = content.indexOf("\n", pos);
  return nl === -1 ? content.length : nl;
}

interface LCAnchorSet {
  start: string;
  end: string;
  middle: string[];
  single: boolean;
  /** Number of lines from the first to the last anchor line, inclusive. */
  lineCount: number;
}

/** Derive start/end/middle anchors from a Search block (first/last non-blank). */
function buildAnchors(search: string): LCAnchorSet | null {
  const lines = search.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let first = -1;
  let last = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "") {
      if (first === -1) first = i;
      last = i;
    }
  }
  if (first === -1) return null;

  const anchorOf = (line: string) => line.trim().slice(0, ANCHOR_MAX_CHARS);
  const start = anchorOf(lines[first]);
  const end = anchorOf(lines[last]);
  const middle = lines
    .slice(first + 1, last)
    .map((l) => l.trim())
    .filter((l) => l !== "");

  return {
    start,
    end,
    middle,
    single: first === last,
    lineCount: last - first + 1,
  };
}

/**
 * Find every line-leading offset whose trimmed line prefix equals `anchor`
 * (exact, or whitespace-collapsed). Returns up to `max` offsets.
 */
function findAnchorLinePositions(
  content: string,
  anchor: string,
  max: number,
): number[] {
  const positions: number[] = [];
  const collapsedAnchor = collapseWhitespace(anchor);
  let lineStart = 0;

  while (lineStart <= content.length && positions.length < max) {
    const lineEnd = lineEndAt(content, lineStart);
    const rawLine = content.slice(lineStart, lineEnd);
    const lead = rawLine.search(/\S/);
    if (lead !== -1) {
      const prefix = rawLine.slice(lead).slice(0, ANCHOR_MAX_CHARS);
      if (prefix === anchor || collapseWhitespace(prefix) === collapsedAnchor) {
        positions.push(lineStart + lead);
      }
    }
    if (lineEnd >= content.length) break;
    lineStart = lineEnd + 1;
  }

  return positions;
}

/** Number of lines covered by the region [rs, re). */
function regionLineCount(content: string, rs: number, re: number): number {
  return content.slice(rs, re).split("\n").length;
}

/** Trimmed middle lines of the region [rs, re) (excludes first and last line). */
function regionMiddleLines(content: string, rs: number, re: number): string[] {
  return content
    .slice(rs, re)
    .split("\n")
    .slice(1, -1)
    .map((l) => l.trim());
}

/**
 * Locate a region from a Search block's anchors (uniqueness-first).
 *
 * - Single-line: the one unique line is the region.
 * - Both anchors unique: the unambiguous span is used (no span cap).
 * - Otherwise: candidates must fall within `lineCount + slack` lines AND contain
 *   the Search's middle lines; exactly one winner is required or it throws.
 *
 * Returns null when the anchor path does not apply (fall through to the other
 * strategies). Throws when anchors are present but ambiguous (fail loud).
 */
function findAnchorRegion(
  content: string,
  search: string,
): { rs: number; re: number } | null {
  const anchors = buildAnchors(search);
  if (!anchors) return null;

  const { start, end, middle, single, lineCount } = anchors;
  if (start.length < ANCHOR_MIN_CHARS) return null;
  if (!single && end.length < ANCHOR_MIN_CHARS) return null;

  const startPositions = findAnchorLinePositions(content, start, ANCHOR_MAX_SCAN);
  if (startPositions.length === 0) return null;

  if (single) {
    // A non-unique single line is ambiguous — defer to the existing flow.
    if (startPositions.length !== 1) return null;
    const p = startPositions[0];
    return { rs: lineStartAt(content, p), re: lineEndAt(content, p) };
  }

  const endPositions = findAnchorLinePositions(content, end, ANCHOR_MAX_SCAN);
  if (endPositions.length === 0) return null;

  const candidates: Array<{ rs: number; re: number; span: number }> = [];
  for (const s of startPositions) {
    for (const e of endPositions) {
      if (e <= s) continue;
      const rs = lineStartAt(content, s);
      const re = lineEndAt(content, e + end.length);
      candidates.push({ rs, re, span: regionLineCount(content, rs, re) });
    }
  }
  if (candidates.length === 0) return null;

  const startUnique = startPositions.length === 1;
  const endUnique = endPositions.length === 1;

  if (startUnique && endUnique) {
    return { rs: candidates[0].rs, re: candidates[0].re };
  }

  if (middle.length === 0) {
    throw new Error(
      "SEARCH block anchors are not unique and the block has no middle lines " +
        "to disambiguate the region.",
    );
  }

  const maxSpan = lineCount + ANCHOR_MAX_SPAN_SLACK;
  const collapsedMiddle = middle.map((l) => collapseWhitespace(l));
  const valid = candidates.filter((c) => {
    if (c.span > maxSpan) return false;
    const regionMiddle = new Set(
      regionMiddleLines(content, c.rs, c.re)
        .map((l) => collapseWhitespace(l))
        .filter((l) => l !== ""),
    );
    return collapsedMiddle.every((m) => regionMiddle.has(m));
  });

  if (valid.length === 1) {
    return { rs: valid[0].rs, re: valid[0].re };
  }

  throw new Error(
    "SEARCH block anchors are ambiguous; could not determine a unique region " +
      `(${valid.length} candidate regions matched).`,
  );
}

/**
 * Apply SEARCH/REPLACE edits to file content.
 * Returns the new content if all edits apply successfully, or throws with details.
 *
 * Edits are applied sequentially (edit N searches in the result of edit N-1).
 * Exported so external handlers (LCApp, LCStudio) can use it directly.
 */
export function applySearchReplace(
  originalContent: string,
  edits: LCFileEdit[],
): { content: string; applied: number } {
  // Normalize to LF to avoid CRLF/LF position mismatches in slice operations
  let content = originalContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let applied = 0;

  for (const edit of edits) {
    const label = edit.Description || `edit #${applied + 1}`;
    const search = edit.Search;

    if (search.trim() === "") {
      throw new Error(
        `SEARCH block "${label}" is empty. Provide the exact lines to find.`,
      );
    }

    // idx is the region start; regionEnd is the exclusive end of the text that
    // `Replace` overwrites (the whole Search text, or the anchored region).
    let idx = -1;
    let regionEnd = -1;
    let matchedViaAnchor = false;

    // ── Strategy 1: Exact match ──────────────────────────────────────────
    idx = content.indexOf(search);
    if (idx !== -1) regionEnd = idx + search.length;

    // ── Strategy 2: Anchor match (short first/last-line anchors) ─────────
    if (idx === -1) {
      const region = findAnchorRegion(content, search);
      if (region) {
        idx = region.rs;
        regionEnd = region.re;
        matchedViaAnchor = true;
        console.warn(
          `[applySearchReplace] "${label}" matched via anchor fallback. Verify the edit is correct.`,
        );
      }
    }

    // ── Strategy 3: Whitespace-agnostic fuzzy match ──────────────────────
    if (idx === -1) {
      idx = fuzzyIndexOf(content, search);
      if (idx !== -1) {
        regionEnd = idx + search.length;
        console.warn(
          `[applySearchReplace] "${label}" matched via whitespace-agnostic fallback ` +
          `(position ${idx}). Verify the edit is correct.`,
        );
      }
    }

    // ── Strategy 4: Trailing-whitespace-agnostic match ───────────────────
    // Strip trailing whitespace from each line in both search and content.
    // AIs commonly add or remove spaces at line ends during generation.
    if (idx === -1) {
      const trimTrailing = (s: string) => s.split("\n").map(l => l.trimEnd()).join("\n");
      const trimmedContent = trimTrailing(content);
      const trimmedSearch = trimTrailing(search);
      const trimmedIdx = trimmedContent.indexOf(trimmedSearch);
      if (trimmedIdx !== -1) {
        // Validate: check that the original content at this position, when trimmed matches
        const candidate = trimTrailing(content.slice(trimmedIdx, trimmedIdx + search.length));
        if (candidate === trimmedSearch) {
          idx = trimmedIdx;
          regionEnd = idx + search.length;
          console.warn(
            `[applySearchReplace] "${label}" matched via trailing-whitespace-agnostic fallback ` +
            `(position ${idx}). Verify the edit is correct.`,
          );
        }
      }
    }

    // ── Strategy 5: Partial-block match ──────────────────────────────────
    // When the full block fails, try dropping the first and/or last line of
    // the Search block. This tolerates surrounding context drift — the AI may
    // have included an extra adjacent line that no longer matches.
    if (idx === -1) {
      const searchLines = search.split("\n");
      if (searchLines.length >= 4) {
        // Try without the first line
        const withoutFirst = searchLines.slice(1).join("\n");
        let partialIdx = content.indexOf(withoutFirst);
        if (partialIdx === -1) partialIdx = fuzzyIndexOf(content, withoutFirst);
        if (partialIdx !== -1) {
          idx = partialIdx;
          regionEnd = idx + withoutFirst.length;
          console.warn(
            `[applySearchReplace] "${label}" matched via partial-block fallback ` +
            `(dropped first line, position ${idx}). Verify the edit is correct.`,
          );
        }
      }
      if (idx === -1 && searchLines.length >= 4) {
        // Try without the last line
        const withoutLast = searchLines.slice(0, -1).join("\n");
        let partialIdx = content.indexOf(withoutLast);
        if (partialIdx === -1) partialIdx = fuzzyIndexOf(content, withoutLast);
        if (partialIdx !== -1) {
          idx = partialIdx;
          regionEnd = idx + withoutLast.length;
          console.warn(
            `[applySearchReplace] "${label}" matched via partial-block fallback ` +
            `(dropped last line, position ${partialIdx}). Verify the edit is correct.`,
          );
        }
      }
    }

    // ── Ambiguity guard: fail loud on multiple matches (non-anchor) ──────
    // The anchor path already resolves uniqueness; for the exact/fuzzy paths a
    // second occurrence means we cannot safely choose, so refuse to guess.
    if (idx !== -1 && !matchedViaAnchor) {
      const secondIdx = content.indexOf(search, idx + 1);
      if (secondIdx !== -1) {
        throw new Error(
          `SEARCH block "${label}" matches multiple locations in the file. ` +
          `Add surrounding lines to make the Search block unique.`,
        );
      }
    }

    // ── Match failed — throw with helpful context ───────────────────────
    if (idx === -1) {
      const preview = search.slice(0, 100);
      // Find a nearby anchor point for debugging
      const contextLine = search.split("\n").find(l => l.trim().length > 20)?.trim() || preview;
      throw new Error(
        `SEARCH block "${label}" did not match the current file content.\n` +
        `Looked for ${search.length} chars starting with: "${preview}"...\n` +
        `Context anchor: "${contextLine.slice(0, 80)}"\n` +
        `AI Replace preview: "${edit.Replace.slice(0, 120)}"\n` +
        `Tip: The Search string must match the EXACT current file content. ` +
        `Check for whitespace differences, tabs vs spaces, or use smaller Search blocks.`,
      );
    }

    // ── Apply the edit ─────────────────────────────────────────────────
    content = content.slice(0, idx) + edit.Replace + content.slice(regionEnd);
    applied++;
  }

  return { content, applied };
}
