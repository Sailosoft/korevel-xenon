// ─── HelixAIUtil ─────────────────────────────────────────────────────────────
// Static utility class for LLM JSON response extraction, repair, and parsing.

export default class HelixAIUtil {
  // ── JSON extraction ────────────────────────────────────────────────────────

  /**
   * Extract the outermost JSON object (`{…}`) from a raw text response.
   * Handles preamble text, trailing text, and multiple JSON objects by finding
   * only the first complete top-level balanced brace pair, correctly tracking
   * string literals so that braces inside strings are ignored.
   */
  static extractJSONObject(raw: string): string {
    const start = raw.indexOf("{");
    if (start === -1) return raw;

    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;

    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\" && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
    }

    return end !== -1 ? raw.slice(start, end) : raw;
  }

  // ── JSON repair ────────────────────────────────────────────────────────────

  /**
   * Attempt to repair common JSON formatting issues that LLMs produce.
   * Returns the repaired string (which may still not parse correctly).
   */
  static repairJSON(raw: string): string {
    let cleaned = raw;

    // 1. Strip markdown code-block fences (```json … ``` or ``` … ```)
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "");
    cleaned = cleaned.replace(/\n?```\s*$/i, "");

    // 2. Remove BOM and zero-width characters
    cleaned = cleaned.replace(/[\uFEFF\u200B-\u200F\u2028-\u2029]/g, "");

    // 3. Remove trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

    // 4. Remove comments (// and /* */) outside strings
    const parts: string[] = [];
    let i = 0;
    let inStr = false;
    let esc = false;
    let buffer = "";

    while (i < cleaned.length) {
      const ch = cleaned[i];
      if (esc) {
        buffer += ch;
        esc = false;
        i++;
        continue;
      }
      if (ch === "\\" && inStr) {
        buffer += ch;
        esc = true;
        i++;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        buffer += ch;
        i++;
        continue;
      }

      if (!inStr) {
        // Single-line comment //
        if (ch === "/" && cleaned[i + 1] === "/") {
          parts.push(buffer);
          buffer = "";
          const nl = cleaned.indexOf("\n", i + 2);
          i = nl !== -1 ? nl + 1 : cleaned.length;
          continue;
        }
        // Multi-line comment /* */
        if (ch === "/" && cleaned[i + 1] === "*") {
          parts.push(buffer);
          buffer = "";
          const endC = cleaned.indexOf("*/", i + 2);
          i = endC !== -1 ? endC + 2 : cleaned.length;
          continue;
        }
      }

      buffer += ch;
      i++;
    }
    parts.push(buffer);
    cleaned = parts.join("");

    return cleaned.trim();
  }

  /**
   * Fix unquoted object keys (e.g. `{ title: "foo" }` → `{ "title": "foo" }`).
   * Only applies to property-key positions (before a colon).
   */
  static fixUnquotedKeys(json: string): string {
    return json.replace(
      /(\{|\,)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
      '$1 "$2":',
    );
  }

  // ── Safe parse with multiple fallback strategies ───────────────────────────

  /**
   * Attempt to parse JSON with progressively more aggressive recovery:
   *
   *   1. Standard `JSON.parse`
   *   2. Repair common issues and retry
   *   3. Extract JSON object from surrounding text and retry
   *   4. Extract from original, repair, retry
   *   5. Fix unquoted keys and retry
   */
  static safeJSONParse<T>(
    raw: string,
  ): { success: true; data: T } | { success: false; error: string } {
    // Strategy 1 – direct
    try {
      return { success: true, data: JSON.parse(raw) as T };
    } catch {
      /* fall through */
    }

    // Strategy 2 – repair + parse
    const repaired = HelixAIUtil.repairJSON(raw);
    if (repaired !== raw) {
      try {
        return { success: true, data: JSON.parse(repaired) as T };
      } catch {
        /* fall through */
      }
    }

    // Strategy 3 – extract from repaired + parse
    const extracted = HelixAIUtil.extractJSONObject(repaired);
    if (extracted !== repaired) {
      try {
        return { success: true, data: JSON.parse(extracted) as T };
      } catch {
        /* fall through */
      }
    }

    // Strategy 4 – extract from original, repair, parse
    const extractedOriginal = HelixAIUtil.extractJSONObject(raw);
    const repairedExtracted = HelixAIUtil.repairJSON(extractedOriginal);
    if (repairedExtracted !== extracted) {
      try {
        return { success: true, data: JSON.parse(repairedExtracted) as T };
      } catch {
        /* fall through */
      }
    }

    // Strategy 5 – fix unquoted keys
    try {
      const fixedKeys = HelixAIUtil.fixUnquotedKeys(repairedExtracted);
      return { success: true, data: JSON.parse(fixedKeys) as T };
    } catch {
      /* fall through */
    }

    return {
      success: false,
      error: `Failed to parse JSON after all recovery attempts. First 500 chars of response: ${raw.slice(0, 500)}`,
    };
  }
}
