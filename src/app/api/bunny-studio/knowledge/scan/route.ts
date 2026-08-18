// route.ts — Bunny AI Studio Knowledge Base website scan endpoint
//
// Fetches a URL server-side (avoids browser CORS) and extracts a clean,
// human-readable text version of the page — title + main content — so the
// client can chunk and index it into a knowledge group's Orama database
// (feature: add knowledge by scanning a website).

import {
  BS_API_TOKEN_HEADER,
  BS_API_TOKEN_ENV,
} from "@/src/modules/bunny-studio/src/BSApiSecurity";

/** Cap on extracted content length so huge pages don't blow up payloads. */
const MAX_CONTENT_LENGTH = 500_000;
const FETCH_TIMEOUT_MS = 15_000;

// ─── Frontend-only access guard (same as the chat stream route) ─────────

function assertFrontendOnly(req: Request): Response | null {
  const expected = process.env[BS_API_TOKEN_ENV];
  if (!expected) return null; // no token configured → allow (local/dev mode)
  const supplied = req.headers.get(BS_API_TOKEN_HEADER);
  if (!supplied || supplied !== expected) {
    return new Response(
      JSON.stringify({ error: "Forbidden: missing or invalid frontend token." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return null;
}

// ─── HTML → text extraction (server-side, no DOM required) ──────────────

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/"/gi, '"')
    .replace(/'/gi, "'")
    .replace(/'/gi, "'")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 10)),
    );
}

function htmlToText(html: string): string {
  let text = html;
  // Drop non-content blocks entirely (scripts, styles, markup, boilerplate).
  text = text.replace(
    /<(script|style|noscript|template|svg|head|nav|footer|aside|form|button|select|option|iframe)[^>]*>[\s\S]*?<\/\1>/gi,
    " ",
  );
  // Convert block-ish closing tags into paragraph breaks.
  text = text.replace(
    /<\/(p|div|h[1-6]|li|tr|blockquote|section|article|header|main|pre|ul|ol|table)>/gi,
    "\n\n",
  );
  // Inline line breaks / rules.
  text = text.replace(/<(br|hr)[^>]*>/gi, "\n");
  // Strip every remaining tag.
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);
  // Collapse horizontal whitespace and deduplicate blank lines.
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  return decodeEntities(match[1]).replace(/[ \t]+/g, " ").trim();
}

function extractMetaDescription(html: string): string {
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  );
  return match ? decodeEntities(match[1]).trim() : "";
}

// ─── Route handler ──────────────────────────────────────────────────────

export async function POST(req: Request) {
  const denied = assertFrontendOnly(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as { url?: unknown };
    const rawUrl = typeof body.url === "string" ? body.url.trim() : "";

    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Please provide a valid absolute URL." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return new Response(
        JSON.stringify({ error: "Only http(s) URLs can be scanned." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const res = await fetch(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        // A real browser-ish UA so servers don't block the request.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: `Could not fetch the page (HTTP ${res.status}).`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const html = await res.text();
    const title = extractTitle(html) || url.hostname;
    const description = extractMetaDescription(html);
    const content = htmlToText(html).slice(0, MAX_CONTENT_LENGTH);

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No readable text found on the page." }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ title, description, content, url: url.toString() }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "The page took too long to respond."
        : error instanceof Error
          ? error.message
          : "Failed to scan the website.";
    console.error("[BS Knowledge Scan] Error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
