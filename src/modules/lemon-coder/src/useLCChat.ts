// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — useLCChat Hook
// ───────────────────────────────────────────────────────────────────────────────
// Manages chat sessions, message history, and AI communication.
//
// Key behaviors by mode:
//   Agent / Plan / Ask — Full conversation history is sent to the AI,
//                         preserving context build-up across turns.
//                         Stash is cleared after each send.
//   Code               — Single-turn prompt only (no conversation history).
//                         Stash is NOT cleared — kept across turns.
//
// File editing supports two modes:
//   - Full Content: AI returns the entire file content (new files / small files)
//   - SEARCH/REPLACE (Edits[]): AI returns only changed sections with exact
//     Search/Replace blocks (token-efficient for existing file modifications).
//     Normalized into Content for backwards compatibility on read.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useRef } from "react";
import { lcDB } from "./LCDatabase";
import { callHelixAI, callHelixAIWithConversation } from "./actions";
import type {
  LCChatSession,
  LCChatMessage,
  LCContextStashItem,
  LCFileActionResult,
  LCFileEdit,
  LCAIResponse,
  LCErrorInfo,
  LCAIConversationMessage,
} from "./LCInterface";
import { resolveFilePath } from "./LCInterface";
import type { LCPromptModeType } from "./LCPromptMode";
import {
  buildAgentPrompt,
  buildPlanPrompt,
  buildAskPrompt,
  buildCodePrompt,
} from "./LCPromptMode";

// ── SEARCH/REPLACE Normalisation ──────────────────────────────────────────────────

/**
 * Normalise whitespace for fuzzy matching.
 * Collapses runs of whitespace into single spaces and normalises line endings.
 * This allows "forgiving" match when the AI slightly differs from the file
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
 * Detect and fix double-escaped content from the AI.
 *
 * Problem: The AI sometimes writes `\\n` (double-escaped) in JSON instead of
 * the correct `\n` (single-escaped). `JSON.parse` interprets `\\n` as literal
 * backslash-n (`\n` two chars) instead of an actual newline.
 *
 * Heuristic:
 * - If Content/Search/Replace contains ZERO actual newlines but multiple
 *   literal `\n` sequences, it's double-escaped — replace `\n` with newlines.
 * - Same for `\"` → `"` (double-escaped quotes).
 *
 * This runs AFTER JSON.parse so we check the actual JavaScript string values.
 */
function sanitiseEscapedContent(value: string): string {
  // Skip short strings (no room for meaningful escaping)
  if (value.length < 10) return value;

  const hasActualNewline = value.includes("\n");
  const hasLiteralEscapedNewline = value.includes("\\n");
  const hasActualQuote = value.includes('"');
  const hasLiteralEscapedQuote = value.includes('\\"');

  let result = value;

  // If no actual newlines but many literal \n → fix
  if (!hasActualNewline && hasLiteralEscapedNewline) {
    // Count literal \n occurrences to be sure it's not just one-off
    const count = (result.match(/\\n/g) || []).length;
    if (count >= 2 || (count >= 1 && result.length > 50)) {
      result = result.replace(/\\n/g, "\n");
    }
  }

  // If no actual double-quotes but many \" → fix
  if (!hasActualQuote && hasLiteralEscapedQuote) {
    const count = (result.match(/\\"/g) || []).length;
    if (count >= 2 || (count >= 1 && result.length > 50)) {
      result = result.replace(/\\"/g, '"');
    }
  }

  // Also fix \\t and \\r (less common but same pattern)
  if (!result.includes("\t") && result.includes("\\t")) {
    result = result.replace(/\\t/g, "\t");
  }
  if (!result.includes("\r") && result.includes("\\r")) {
    result = result.replace(/\\r/g, "\r");
  }

  // ── Fix broken closing HTML/JSX tags ──────────────────────────────────
  //
  // Problem: The AI sometimes writes `<\/style>` in JSON (escaping the `/`),
  // which JSON.parse interprets as `\/` → `/`, yielding `/style>` — the `<`
  // is lost. This produces broken output like:
  //
  //   .btn-success { ... }/style>
  //
  // Fix: Look for `/tagname>` patterns that appear after content (closing
  // brace `}`, newline, or start-of-line position) — these are virtually
  // always meant to be `</tagname>`.
  result = result.replace(
    /(^|[\n}])\/([a-zA-Z]\w*)\s*>/gm,
    (_, before, tagName) => `${before}</${tagName}>`,
  );

  return result;
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

/**
 * Normalise a raw AI response so all file entries have a `Content` field.
 *
 * Handles two patterns:
 * 1. Top-level `FileEdits[]` → merged into `FileContents[]` as entries with Edits
 * 2. Per-file `Edits[]` within FileContents — Content is already present from AI
 *
 * This ensures backward compatibility: all downstream code (DB storage, diff view,
 * file application) can always read `.Content` regardless of whether the AI used
 * the SEARCH/REPLACE format or the full-content format.
 */
function normaliseFileEdits(aiResponse: LCAIResponse): LCAIResponse {
  const fileContents = [...(aiResponse.FileContents ?? [])];

  // Merge top-level FileEdits into FileContents (if any)
  if (Array.isArray(aiResponse.FileEdits)) {
    for (const fe of aiResponse.FileEdits) {
      // Avoid duplicates: skip if FileName+FileDirectory already exists
      const exists = fileContents.some(
        (fc) => fc.FileName === fe.FileName && fc.FileDirectory === fe.FileDirectory,
      );
      if (!exists) {
        fileContents.push({
          FileName: fe.FileName,
          ExistingFile: true,
          FileDirectory: fe.FileDirectory,
          Description: fe.Description ?? `Edit ${fe.FileName}`,
          Content: "",
          Edits: fe.Edits,
        });
      }
    }
  }

  // Sanitise double-escaped content in ALL file entries
  for (const fc of fileContents) {
    fc.Content = sanitiseEscapedContent(fc.Content);

    if (Array.isArray(fc.Edits)) {
      for (const edit of fc.Edits) {
        edit.Search = sanitiseEscapedContent(edit.Search);
        edit.Replace = sanitiseEscapedContent(edit.Replace);
      }
    }
  }

  return { ...aiResponse, FileContents: fileContents };
}

/**
 * Apply SEARCH/REPLACE edits to file content.
 * Returns the new content if all edits apply successfully, or throws with details.
 *
 * Matching strategy (progressive fallback):
 *   1. Exact match (indexOf) — preferred, character-perfect
 *   2. Whitespace-normalised match (fuzzyIndexOf) — tolerates whitespace differences
 *   3. Trailing-whitespace-agnostic match — strips trailing whitespace per line
 *   4. Partial-block match — drops first/last line of Search block to tolerate surrounding context drift
 *   5. Multiple-match detection — warns and uses lastIndexOf (prefers end-of-file)
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

    // ── Strategy 1: Exact match ──────────────────────────────────────────
    let idx = content.indexOf(search);

    // ── Strategy 2: Whitespace-agnostic fuzzy match ──────────────────────
    if (idx === -1) {
      idx = fuzzyIndexOf(content, search);
      if (idx !== -1) {
        console.warn(
          `[applySearchReplace] "${label}" matched via whitespace-agnostic fallback ` +
          `(position ${idx}). Verify the edit is correct.`,
        );
      }
    }

    // ── Strategy 3: Trailing-whitespace-agnostic match ───────────────────
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
          console.warn(
            `[applySearchReplace] "${label}" matched via trailing-whitespace-agnostic fallback ` +
            `(position ${idx}). Verify the edit is correct.`,
          );
        }
      }
    }

    // ── Strategy 4: Partial-block match ──────────────────────────────────
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
          console.warn(
            `[applySearchReplace] "${label}" matched via partial-block fallback ` +
            `(dropped last line, position ${partialIdx}). Verify the edit is correct.`,
          );
        }
      }
    }

    // ── Strategy 5: Detect multiple matches (use last occurrence) ───────
    if (idx !== -1) {
      const secondIdx = content.indexOf(search, idx + 1);
      if (secondIdx !== -1) {
        console.warn(
          `[applySearchReplace] "${label}" matched ${content.indexOf(search) !== -1 ? 'multiple' : 'at least 2'} locations. ` +
          `Using the last occurrence (position ${content.lastIndexOf(search)}). ` +
          `If this is wrong, make the Search block more specific.`,
        );
        idx = content.lastIndexOf(search);
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
    content = content.slice(0, idx) + edit.Replace + content.slice(idx + search.length);
    applied++;
  }

  return { content, applied };
}

/**
 * Extract a short session title from the first AI response content.
 * Takes the first meaningful sentence/phrase, strips markdown formatting,
 * and truncates to a reasonable length for display.
 * Returns null if no suitable title can be derived.
 */
export function extractTitleFromAIResponse(content: string): string | null {
  // Strip markdown formatting: bold, italic, inline code, links
  const clean = content
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();

  if (!clean) return null;

  // Take the first sentence (up to first period, exclamation, or question mark)
  const sentenceMatch = clean.match(/^(.+?)[.!?](?:\s|$)/);
  let title = sentenceMatch ? sentenceMatch[1].trim() : "";

  // If no sentence boundary found, take the first line
  if (!title) {
    const firstLine = clean.split("\n")[0]?.trim();
    title = firstLine || "";
  }

  // If still empty, take the first ~50 chars
  if (!title) {
    title = clean.slice(0, 50).trim();
  }

  // Clean up: remove leading/trailing quotes
  title = title.replace(/^["'""']+|["'""']+$/g, "").trim();

  // Truncate to 60 chars max with ellipsis
  if (title.length > 60) {
    title = title.slice(0, 57).trim() + "...";
  }

  return title || null;
}

export interface UseLCChatReturn {
  sessions: LCChatSession[];
  activeSession: LCChatSession | null;
  messages: LCChatMessage[];
  isSending: boolean;
  promptMode: LCPromptModeType;
  setPromptMode: (mode: LCPromptModeType) => void;
  createSession: (projectId: string, sessionTitle?: string) => Promise<LCChatSession>;
  selectSession: (session: LCChatSession) => void;
  sendMessage: (
    content: string,
    stashItems: LCContextStashItem[],
    projectName: string,
    options?: {
      /** Read the actual content of a stashed file by its relative path */
      readFileContent?: (filePath: string) => Promise<string>;
      /** If provided, use this session instead of activeSession (avoids stale closure on first send) */
      sessionOverride?: LCChatSession;
      /** File tree listing for plan mode cross-referencing */
      fileTree?: Array<{ path: string; isDirectory: boolean }>;
      /** Callback when plan mode identifies relevant files */
      onFilesIdentified?: (filePaths: string[]) => void;
      /** Clear the context stash after the message is sent (non-Code modes) */
      clearStash?: () => Promise<void>;
      /** Instruction stash items to include in the system prompt */
      instructionStashContext?: string;
    },
  ) => Promise<void>;
  applyFileChanges: (
    fileActions: LCFileActionResult[],
    options?: {
      /** Read the current content of a file by its resolved path */
      readFileContent?: (filePath: string) => Promise<string>;
      /** Write content to a file by its resolved path */
      writeFileContent?: (filePath: string, content: string) => Promise<void>;
    },
  ) => Promise<void>;
  /** Gather all file actions from the most recent assistant message */
  getLatestAssistantFileActions: () => LCFileActionResult[];
  /** Delete a specific chat session */
  deleteSession: (sessionId: string) => Promise<void>;
  /** Clear all sessions for the current project */
  clearAllSessions: (projectId: string) => Promise<void>;
  /** The current conversation mode label (derived from promptMode) */
  conversationModeLabel: string;
}

export function useLCChat(): UseLCChatReturn {
  const [sessions, setSessions] = useState<LCChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<LCChatSession | null>(
    null,
  );
  const [messages, setMessages] = useState<LCChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [promptMode, setPromptMode] = useState<LCPromptModeType>("code");

  // ── Refs to avoid stale closures in async callbacks ──────────────────────
  const activeSessionRef = useRef<LCChatSession | null>(null);
  const messagesRef = useRef<LCChatMessage[]>([]);
  const promptModeRef = useRef<LCPromptModeType>("code");
  // Keep refs in sync with state
  activeSessionRef.current = activeSession;
  messagesRef.current = messages;
  promptModeRef.current = promptMode;

  const createSession = useCallback(async (projectId: string, sessionTitle?: string): Promise<LCChatSession> => {
    const title = sessionTitle || `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const session = await lcDB.createChatSession(projectId, title);
    setSessions((prev) => [session, ...prev]);
    setActiveSession(session);
    setMessages([]);
    return session;
  }, []);

  const selectSession = useCallback((session: LCChatSession) => {
    setActiveSession(session);
    setMessages(session.messages || []);
  }, []);

  /** Parse the AI response for file path references (e.g. "@/src/modules/...", "../modules/...") */
  const extractFilePathsFromResponse = useCallback(
    (responseContent: string): string[] => {
      const patterns = [
        // Match @/src/... paths
        /@\/src\/[^\s'"`,)\]]+/g,
        // Match relative paths starting with ../
        /\.\.\/[^\s'"`,)\]]+/g,
        // Match relative paths starting with ./
        /\.\/[^\s'"`,)\]]+/g,
        // Match src/... paths
        /src\/[^\s'"`,)\]]+/g,
      ];

      const foundPaths = new Set<string>();
      for (const pattern of patterns) {
        const matches = responseContent.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Normalize: remove trailing punctuation
            const clean = match.replace(/[.,;:!?]$/, "");
            foundPaths.add(clean);
          }
        }
      }

      return Array.from(foundPaths);
    },
    [],
  );

  /** Cross-check extracted file paths against the available file tree */
  const crossCheckFilePaths = useCallback(
    (extractedPaths: string[], fileTree: Array<{ path: string; isDirectory: boolean }>): string[] => {
      if (!fileTree || fileTree.length === 0) return [];

      const matchedPaths: string[] = [];
      const allPaths = fileTree.map((f) => f.path);

      for (const extractedPath of extractedPaths) {
        // Normalize the extracted path: remove @/ prefix, resolve relative paths
        let normalizedPath = extractedPath;

        // Handle @/src/... → src/...
        if (normalizedPath.startsWith("@/")) {
          normalizedPath = normalizedPath.slice(2);
        }

        // Handle relative paths by resolving against project root
        // For simplicity, just check against known paths
        // Exact match
        if (allPaths.includes(normalizedPath)) {
          matchedPaths.push(normalizedPath);
          continue;
        }

        // Fuzzy match: find paths that end with the same filename
        const fileName = normalizedPath.split("/").pop() || "";
        if (fileName) {
          const fuzzyMatches = allPaths.filter((p) => p.endsWith(`/${fileName}`) || p === fileName);
          if (fuzzyMatches.length > 0) {
            matchedPaths.push(...fuzzyMatches);
            continue;
          }
        }

        // Partial path match: check if any part of the path matches
        const pathParts = normalizedPath.split("/");
        for (let i = pathParts.length - 1; i >= 0; i--) {
          const partial = pathParts.slice(i).join("/");
          if (partial && allPaths.includes(partial)) {
            matchedPaths.push(partial);
            break;
          }
        }
      }

      // Remove duplicates
      return Array.from(new Set(matchedPaths));
    },
    [],
  );

  const sendMessage = useCallback(
    async (
      content: string,
      stashItems: LCContextStashItem[],
      projectName: string,
      options?: {
        readFileContent?: (filePath: string) => Promise<string>;
        sessionOverride?: LCChatSession;
        fileTree?: Array<{ path: string; isDirectory: boolean }>;
        onFilesIdentified?: (filePaths: string[]) => void;
        clearStash?: () => Promise<void>;
        instructionStashContext?: string;
      },
    ) => {
      // Use the session override if provided (fixes stale-closure issue on first send),
      // otherwise fall back to the ref which always tracks the latest activeSession.
      const session = options?.sessionOverride ?? activeSessionRef.current;
      if (!session) return;

      const failedContent = content;
      const currentMode = promptModeRef.current;
      const isConversationMode = currentMode !== "code";

      setIsSending(true);

      try {
        // ── Gather context file names for the bubble display ───────────────
        const contextFileNames = stashItems
          .filter((s) => !s.isDirectory)
          .map((s) => s.name);

        // Add user message to DB (with context files attached)
        const userMsg = await lcDB.addChatMessage(session.id, {
          role: "user",
          content,
          contextFiles:
            contextFileNames.length > 0 ? contextFileNames : undefined,
        });

        setMessages((prev) => [...prev, userMsg]);

        // ── Build context from stash items ──────────────────────────────────
        const fileStashItems = stashItems.filter((s) => !s.isDirectory);

        let stashContext = "";
        if (fileStashItems.length > 0) {
          const fileSections: string[] = [];

          for (const item of fileStashItems) {
            let fileContent = "";
            let readError = "";

            if (options?.readFileContent) {
              try {
                fileContent = await options.readFileContent(item.path);
              } catch (err) {
                readError = `(could not read: ${err instanceof Error ? err.message : "unknown error"})`;
              }
            }

            const contentBlock = fileContent
              ? `\`\`\`\n${fileContent}\n\`\`\``
              : readError || "(content not available)";

            fileSections.push(
              `--- File: ${item.path} ---\n${contentBlock}`,
            );
          }

          stashContext = fileSections.join("\n\n");
        }

        // ── Include session title in the first prompt (Request 9) ──────────
        const sessionContext = session.title
          ? `\n### Session: ${session.title}\n`
          : "";

        // ── Instruction stash (user-authored instructions for the AI) ──────
        const instructionContext = options?.instructionStashContext
          ? `\n### User Instructions (from Instruction Stash):\n${options.instructionStashContext}\n`
          : "";

        // ── Build the prompt for the AI using the selected mode ────────────
        const promptBuilders: Record<LCPromptModeType, (p: typeof promptParams) => string> = {
          agent: buildAgentPrompt,
          plan: buildPlanPrompt,
          ask: buildAskPrompt,
          code: buildCodePrompt,
        };
        const promptParams = {
          projectName,
          stashContext,
          userContent: content,
          fileTree: options?.fileTree,
        };
        const basePrompt =
          promptBuilders[currentMode]?.(promptParams as any) ??
          buildAgentPrompt(promptParams as any);
        const prompt = sessionContext + instructionContext + basePrompt;

        // Read AI settings from Dexie and forward to server action
        const settings = await lcDB.aiSettings.get("default");
        const providerName = settings?.provider ?? "default";
        const model = settings?.model ?? "";

        // ── AI Call: Conversation modes vs Code mode ───────────────────────
        let aiResponse: Awaited<ReturnType<typeof callHelixAI>>;

        if (isConversationMode) {
          // ── Agent / Plan / Ask: Pass full conversation history ───────────
          // Collect all previous messages (user + assistant) from history
          const prevMessages = messagesRef.current;

          // Build the conversation array:
          // System message + previous turns + new user prompt
          const conversationMessages: LCAIConversationMessage[] = [
            // Static system instructions shared across all turns
            {
              role: "system",
              content:
                "You are Lemon Coder, an AI coding assistant. You help users write and modify code files. " +
                "You MUST respond with a valid JSON object containing exactly the fields requested in the user prompt. " +
                "When providing file Content, always output the COMPLETE file from the first line to the last — " +
                "never a diff, never a snippet, never placeholders like '... rest remains the same'. " +
                "The Content field must be ready to copy-paste and write directly to the file as-is. " +
                "CRITICAL: The Content field is a JSON string — you MUST escape all double quotes as \\\", backslashes as \\\\, " +
                "and replace literal newlines with \\n. Never use trailing commas in objects or arrays. " +
                "Verify your JSON is valid before responding.",
            },
          ];

          // Add previous turns (excluding the user message we just added,
          // since it will be included in the full prompt below)
          for (const msg of prevMessages) {
            if (msg.role === "user" || msg.role === "assistant") {
              conversationMessages.push({
                role: msg.role,
                content: msg.content,
              });
            }
          }

          // The new user turn includes the full built prompt (system instructions + stash + user content)
          // This ensures the AI has the latest stash context for this turn.
          conversationMessages.push({
            role: "user",
            content: prompt,
          });

          aiResponse = await callHelixAIWithConversation({
            messages: conversationMessages,
            provider: providerName,
            model,
          });
        } else {
          // ── Code mode: Single-turn prompt (keep stash) ───────────────────
          aiResponse = await callHelixAI({
            prompt,
            provider: providerName,
            model,
          });
        }

        // ── Normalise SEARCH/REPLACE Edits → Content for backwards compat ──
        const normalised = normaliseFileEdits(aiResponse);

        // Add AI response to DB (with context files attached)
        const aiMsg = await lcDB.addChatMessage(session.id, {
          role: "assistant",
          content: normalised.AIMessage,
          fileContents: Array.isArray(normalised.FileContents)
            ? normalised.FileContents
            : undefined,
          questions:
            Array.isArray(normalised.Questions) &&
            normalised.Questions.length > 0
              ? normalised.Questions
              : undefined,
          contextFiles:
            contextFileNames.length > 0 ? contextFileNames : undefined,
        });

        setMessages((prev) => [...prev, aiMsg]);

        // ── Auto-rename session from the first AI response ──────────────
        // If no assistant messages existed before this response, derive a
        // short title from the AI response content and update the session.
        const prevMsgs = messagesRef.current;
        const hasAssistant = prevMsgs.some((m) => m.role === "assistant");
        if (!hasAssistant) {
          const aiTitle = extractTitleFromAIResponse(aiResponse.AIMessage);
          if (aiTitle) {
            await lcDB.updateChatSessionTitle(session.id, aiTitle);
            setActiveSession((prev) =>
              prev ? { ...prev, title: aiTitle } : null,
            );
            setSessions((prev) =>
              prev.map((s) =>
                s.id === session.id ? { ...s, title: aiTitle } : s,
              ),
            );
          }
        }

        // ── Clear old stash context FIRST, then set new identified files ──
        // Code mode keeps the stash intact across turns.
        if (isConversationMode && options?.clearStash) {
          await options.clearStash();
        }

        // ── Plan mode: cross-check file paths in the response ──────────────
        if (currentMode === "plan" && options?.fileTree && options?.onFilesIdentified) {
          const extractedPaths = extractFilePathsFromResponse(
            aiResponse.AIMessage,
          );
          const matchedPaths = crossCheckFilePaths(
            extractedPaths,
            options.fileTree,
          );
          if (matchedPaths.length > 0) {
            options.onFilesIdentified(matchedPaths);
          }
        }
      } catch (error) {
        console.error("Failed to send message:", error);

        const currentSession = activeSessionRef.current;
        if (currentSession) {
          const errorInfo: LCErrorInfo = {
            message:
              error instanceof Error
                ? error.message
                : "Failed to process request",
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined,
            timestamp: new Date(),
            failedContent,
          };

          const errorMsg = await lcDB.addChatMessage(currentSession.id, {
            role: "assistant",
            content: `Error: ${errorInfo.message}`,
            error: errorInfo,
          });
          setMessages((prev) => [...prev, errorMsg]);
        }
      } finally {
        setIsSending(false);
      }
    },
    // activeSession deliberately omitted: we use activeSessionRef.current instead
    // to avoid stale-closure bugs when sendMessage is called after createSession.
    [extractFilePathsFromResponse, crossCheckFilePaths],
  );

  /**
   * Apply file changes — writes the AI-generated file contents to disk.
   * Supports both full-content writes and SEARCH/REPLACE (Edits[]) patches.
   *
   * Strategy:
   * - NEW files (ExistingFile=false): always write the full Content.
   * - Existing files with Edits[]:
   *     - If readFileContent is available → read current file, apply patches, write result
   *     - If Content is also provided → fall back to Content (AI provided full file)
   *     - If Content is empty and no readFileContent → error (can't reconstruct)
   * - Existing files with Content only (no Edits): write Content as-is.
   *
   * Falls back to browser download if no writeFileContent callback is provided.
   */
  const applyFileChanges = useCallback(
    async (
      fileActions: LCFileActionResult[],
      options?: {
        /** Read the current content of a file by its resolved path */
        readFileContent?: (filePath: string) => Promise<string>;
        /** Write content to a file by its resolved path */
        writeFileContent?: (filePath: string, content: string) => Promise<void>;
      },
    ) => {
      for (const action of fileActions) {
        try {
          const filePath = resolveFilePath(action);
          let outputContent = action.Content;
          const hasEdits =
            action.ExistingFile &&
            Array.isArray(action.Edits) &&
            action.Edits.length > 0;

          // ── SEARCH/REPLACE: patch the current file content ──────────────
          if (hasEdits) {
            if (options?.readFileContent) {
              // Read the current file from disk and apply patches
              const currentContent = await options.readFileContent(filePath);
              const result = applySearchReplace(currentContent, action.Edits!);
              outputContent = result.content;
              console.log(
                `Applied ${result.applied} SEARCH/REPLACE edit(s) to ${filePath}`,
              );
            } else if (!outputContent) {
              // Edits present, but no readFileContent AND no Content → can't proceed
              throw new Error(
                `Cannot apply SEARCH/REPLACE to ${filePath}: ` +
                `no readFileContent provided and Content is empty. ` +
                `Provide a readFileContent callback or ensure the AI includes Content.`,
              );
            } else {
              // Can't read current file — use Content as-is (AI-provided full result)
              console.warn(
                `No readFileContent provided; using AI-provided Content for ${filePath}`,
              );
            }
          }

          // ── Write the output ────────────────────────────────────────────
          if (!outputContent && !hasEdits) {
            throw new Error(
              `Cannot write ${filePath}: Content is empty and no Edits provided.`,
            );
          }

          if (options?.writeFileContent) {
            await options.writeFileContent(filePath, outputContent);
            console.log(
              `${action.ExistingFile ? "Overwritten" : "Created"} file: ${filePath}`,
            );
          } else {
            // Fallback: browser download via blob URL
            console.log(
              `Downloading ${action.ExistingFile ? "updated" : "new"} file: ${filePath}`,
            );
            const blob = new Blob([outputContent], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = action.FileName;
            a.click();
            URL.revokeObjectURL(url);
          }
        } catch (error) {
          console.error(`Failed to apply changes to ${action.FileName}:`, error);
        }
      }
    },
    [],
  );

  /**
   * Get all file actions from the most recent assistant message.
   * Used for "Accept All" and "View All Changes" features.
   */
  const getLatestAssistantFileActions = useCallback((): LCFileActionResult[] => {
    const msgs = messagesRef.current;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i];
      if (msg.role === "assistant" && msg.fileContents && msg.fileContents.length > 0) {
        return msg.fileContents;
      }
    }
    return [];
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    await lcDB.deleteChatSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionRef.current?.id === sessionId) {
      setActiveSession(null);
      setMessages([]);
    }
  }, []);

  const clearAllSessions = useCallback(async (projectId: string) => {
    await lcDB.clearAllChatSessions(projectId);
    setSessions([]);
    setActiveSession(null);
    setMessages([]);
  }, []);

  // Derived label describing the current conversation mode behavior
  const conversationModeLabel =
    promptMode === "code"
      ? "Single-turn · Stash kept"
      : "Multi-turn · Stash cleared";

  return {
    sessions,
    activeSession,
    messages,
    isSending,
    promptMode,
    setPromptMode,
    createSession,
    selectSession,
    sendMessage,
    applyFileChanges,
    getLatestAssistantFileActions,
    deleteSession,
    clearAllSessions,
    conversationModeLabel,
  };
}
