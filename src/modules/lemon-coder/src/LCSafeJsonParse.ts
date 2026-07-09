// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCSafeJsonParse
// Safe JSON parsing with automatic recovery from common AI output issues.
//
// AI models frequently produce malformed JSON:
//   - Trailing commas in objects/arrays   →  { "a": 1, }       ✗
//   - Unescaped control characters        →  "line1\nline2"    ✗
//   - Truncated/broken output             →  { "a": 1, "b":    ✗
//   - Missing quotes around property keys →  { key: "value" }  ✗
//   - Single quotes instead of double     →  { 'a': "b" }      ✗
//
// This module attempts progressive recovery and always returns a valid
// LCAIResponse-like object rather than throwing.
// ───────────────────────────────────────────────────────────────────────────────

import type { LCAIResponse } from "./LCInterface";

// ── Types ────────────────────────────────────────────────────────────────────

interface SafeParseResult {
  /** The parsed response (or a fallback error response) */
  data: LCAIResponse;
  /** The raw content that was parsed (for debugging / display) */
  raw: string;
  /** Whether the parse succeeded (possibly after recovery) */
  ok: boolean;
  /** Human-readable description of what was repaired, if anything */
  repaired?: string;
}

// ── Progressive Recovery Strategies ──────────────────────────────────────────

type RecoveryStrategy = (input: string) => string;

/**
 * Strategy 1: Strip markdown code fences and trim whitespace.
 * Handles ```json ... ```, ``` ... ```, and plain JSON.
 */
function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

/**
 * Strategy 2: Fix trailing commas before closing braces/brackets.
 *   { "a": 1, }  →  { "a": 1 }
 *   [ 1, 2, ]    →  [ 1, 2 ]
 */
function fixTrailingCommas(json: string): string {
  return json
    .replace(/,\s*}/g, "}")
    .replace(/,\s*\]/g, "]");
}

/**
 * Strategy 3: Escape unescaped control characters (newlines, tabs, etc.)
 * inside string values. This targets the common case where the AI includes
 * literal newlines in a JSON string value without escaping them.
 *
 * We look for control characters inside double-quoted strings by scanning
 * for pattern: " ... \n ... " where \n is outside escape sequences.
 */
function escapeControlCharacters(json: string): string {
  // Replace literal newlines and tabs that appear inside string values.
  // The approach: find all string content between quotes and escape \n, \t, \r
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (escaped) {
      escaped = false;
      result += ch;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      result += ch;
      continue;
    }

    if (ch === '"' && !escaped) {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      // Escape control characters inside string values
      if (ch === "\n") {
        result += "\\n";
      } else if (ch === "\t") {
        result += "\\t";
      } else if (ch === "\r") {
        result += "\\r";
      } else {
        result += ch;
      }
    } else {
      result += ch;
    }
  }

  return result;
}

/**
 * Strategy 4: Replace single quotes with double quotes (heuristic).
 * Only replaces single quotes that appear to be JSON property quotes,
 * not apostrophes inside words.
 *
 * Pattern: replaces 'key': or 'value' patterns where single quotes
 * wrap JSON property names or string values.
 */
function fixSingleQuotes(json: string): string {
  let result = "";
  let inDoubleString = false;
  let inSingleString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (escaped) {
      escaped = false;
      result += ch;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      result += ch;
      continue;
    }

    if (ch === '"' && !inSingleString) {
      inDoubleString = !inDoubleString;
      result += ch;
      continue;
    }

    if (ch === "'" && !inDoubleString) {
      inSingleString = !inSingleString;
      result += '"'; // Replace single quote with double quote
      continue;
    }

    result += ch;
  }

  return result;
}

/**
 * Strategy 5: Fix missing quotes around property names.
 *   { key: "value" }  →  { "key": "value" }
 *
 * Matches unquoted word-characters (followed by ':') that aren't JSON keywords.
 * Does NOT match: true, false, null, numbers.
 */
function fixUnquotedKeys(json: string): string {
  // Match patterns like `keyName:` (unquoted word followed by colon)
  // inside object contexts (after { or ,)
  return json.replace(
    /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g,
    '$1"$2"$3',
  );
}

/**
 * Strategy 6: Attempt to recover truncated JSON by adding closing brackets.
 * If parsing fails at a position near the end, try to determine what
 * was expected and close it.
 */
function fixTruncatedJson(json: string): string {
  const trimmed = json.trim();

  // Count opening and closing braces/brackets
  const openBraces = (trimmed.match(/\{/g) || []).length;
  const closeBraces = (trimmed.match(/\}/g) || []).length;
  const openBrackets = (trimmed.match(/\[/g) || []).length;
  const closeBrackets = (trimmed.match(/\]/g) || []).length;

  let fixed = trimmed;

  // Fix truncated string values: if the content ends with an unclosed string
  // like `"hello` or `"hello\n`, close it
  if (fixed.length > 0) {
    // Check if we're inside a string (odd number of unescaped double quotes)
    const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      fixed += '"';
    }
  }

  // Add missing closing brackets/braces
  fixed += "}".repeat(Math.max(0, openBraces - closeBraces));
  fixed += "]".repeat(Math.max(0, openBrackets - closeBrackets));

  return fixed;
}

/**
 * Strategy 7: Fix common AI formatting issues like smart quotes,
 * non-breaking spaces, and other Unicode lookalikes.
 */
function fixUnicodeIssues(json: string): string {
  return json
    // Smart/curly quotes → straight quotes
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201B\u2032\u2035]/g, "'")
    // Non-breaking space → regular space
    .replace(/\u00A0/g, " ")
    // En-dash, Em-dash → regular dash
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    // Zero-width space → remove
    .replace(/\u200B/g, "")
    // Remove BOM
    .replace(/^\uFEFF/, "");
}

// ── Recovery Pipeline ────────────────────────────────────────────────────────

const recoveryStrategies: RecoveryStrategy[] = [
  // Each strategy receives the progressively cleaned JSON string.
  // Returning null means "skip this strategy for this input".
  // But our strategies are always applicable, so they always return a string.

  // Strategy order matters — each builds on the previous.
  (input) => fixUnicodeIssues(input),
  (input) => fixTrailingCommas(input),
  (input) => escapeControlCharacters(input),
  (input) => fixSingleQuotes(input),
  (input) => fixUnquotedKeys(input),
  (input) => fixTruncatedJson(input),
];

/**
 * Attempt to parse JSON with progressive recovery.
 *
 * Returns an object with:
 * - `data`: The parsed `LCAIResponse` (or a fallback error response).
 * - `raw`: The original raw content.
 * - `ok`: Whether parsing ultimately succeeded.
 * - `repaired`: A description of what was fixed, if recovery was applied.
 */
export function safeParseJson(raw: string): SafeParseResult {
  // Step 1: Strip markdown fences and normalise whitespace
  let cleaned = stripMarkdownFences(raw);

  // Step 2: Try direct parse first (happy path)
  try {
    const parsed = JSON.parse(cleaned);
    return { data: parsed as LCAIResponse, raw, ok: true };
  } catch {
    // Direct parse failed — proceed with recovery
  }

  // Step 3: Apply recovery strategies progressively
  let recovered = cleaned;
  let repairsApplied: string[] = [];

  for (const strategy of recoveryStrategies) {
    const before = recovered;
    const result = strategy(recovered);
    // null result means "skip this strategy"
    if (result === null) continue;
    recovered = result;
    if (before !== recovered) {
      repairsApplied.push(strategy.name || "unknown");
    }
  }

  // Step 4: Try parsing the recovered JSON
  try {
    const parsed = JSON.parse(recovered);
    const repaired = `Recovered with: ${repairsApplied.join(", ")}`;
    return {
      data: parsed as LCAIResponse,
      raw,
      ok: true,
      repaired,
    };
  } catch (parseError) {
    // Step 5: Last resort — extract what we can via regex
    const partial = extractPartialResponse(recovered);

    if (partial) {
      return {
        data: partial,
        raw,
        ok: false,
        repaired: `Partial extraction fallback (${parseError instanceof Error ? parseError.message : "unknown error"})`,
      };
    }

    // Step 6: Give up gracefully — return a structured error response
    return {
      data: {
        SessionID: "",
        AIMessage:
          `AI Error: ${parseError instanceof Error ? parseError.message : "Failed to parse AI response"}`,
        FileContents: [],
      },
      raw,
      ok: false,
      repaired: `Parse failed after all recovery attempts: ${parseError instanceof Error ? parseError.message : "unknown error"}`,
    };
  }
}

// ── Partial Extraction Fallback ──────────────────────────────────────────────

/**
 * When full JSON parsing fails, attempt to extract structured data
 * from the malformed response using regex patterns.
 *
 * This is a last-resort fallback that tries to salvage what the AI
 * produced rather than showing a raw error.
 */
function extractPartialResponse(content: string): LCAIResponse | null {
  try {
    let aimessage = "";
    let sessionId = "";
    const fileContents: LCAIResponse["FileContents"] = [];

    // Extract SessionID
    const sessionMatch = content.match(/"SessionID"\s*[:=]\s*"([^"]+)"/);
    if (sessionMatch) {
      sessionId = sessionMatch[1];
    }

    // Extract AIMessage — match the value after "AIMessage":
    const aiMessageMatch = content.match(/"AIMessage"\s*[:=]\s*"([^"]+)"/);
    if (aiMessageMatch) {
      aimessage = aiMessageMatch[1];
    } else {
      // Try multiline AIMessage (non-greedy until next key or end)
      // Use [\s\S] instead of /s flag for ES target compatibility
      const multilineMatch = content.match(
        /"AIMessage"\s*[:=]\s*"((?:[^"\\]|[\s\S](?!\s*[:=]\s*"))*)"/,
      );
      if (multilineMatch) {
        aimessage = multilineMatch[1];
      } else {
        // Fallback: use the entire raw content as a message
        aimessage =
          "⚠️ AI returned malformed JSON. Raw response below:\n\n" +
          content.slice(0, 2000);
      }
    }

    // Extract FileContents array items
    const fileContentBlocks = content.match(
      /\{(?:[^{}]|(?:[^{}]*\{[^{}]*\}[^{}]*))*\}/g,
    );
    if (fileContentBlocks) {
      for (const block of fileContentBlocks) {
        try {
          // Try to parse each block individually
          const cleaned = fixTrailingCommas(
            escapeControlCharacters(
              fixUnquotedKeys(fixSingleQuotes(block)),
            ),
          );
          const parsed = JSON.parse(cleaned);
          if (parsed.FileName && (parsed.Content !== undefined || parsed.Edits !== undefined)) {
            fileContents.push({
              FileName: parsed.FileName || "unknown",
              ExistingFile: !!parsed.ExistingFile,
              FileDirectory: parsed.FileDirectory || "",
              Description: parsed.Description || "",
              Content: parsed.Content || "",
              Edits: Array.isArray(parsed.Edits) ? parsed.Edits : undefined,
            });
          }
        } catch {
          // Skip blocks that can't be parsed individually
        }
      }
    }

    return {
      SessionID: sessionId,
      AIMessage: aimessage || "⚠️ AI returned an unparseable response.",
      FileContents: fileContents,
    };
  } catch {
    return null;
  }
}

/**
 * Convenience wrapper that returns just the parsed data (always).
 * Never throws — always returns an LCAIResponse-like object.
 */
export function parseLCAIResponse(raw: string): LCAIResponse {
  const result = safeParseJson(raw);
  return result.data;
}
