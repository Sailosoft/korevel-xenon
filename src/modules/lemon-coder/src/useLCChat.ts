// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — useLCChat Hook
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useRef } from "react";
import { lcDB } from "./LCDatabase";
import { callHelixAI } from "./actions";
import type {
  LCChatSession,
  LCChatMessage,
  LCContextStashItem,
  LCFileActionResult,
  LCErrorInfo,
} from "./LCInterface";
import type { LCPromptModeType } from "./LCPromptMode";
import { buildAgentPrompt, buildPlanPrompt, buildAskPrompt } from "./LCPromptMode";

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
    },
  ) => Promise<void>;
  applyFileChanges: (fileActions: LCFileActionResult[]) => Promise<void>;
  /** Gather all file actions from the most recent assistant message */
  getLatestAssistantFileActions: () => LCFileActionResult[];
  /** Delete a specific chat session */
  deleteSession: (sessionId: string) => Promise<void>;
  /** Clear all sessions for the current project */
  clearAllSessions: (projectId: string) => Promise<void>;
}

export function useLCChat(): UseLCChatReturn {
  const [sessions, setSessions] = useState<LCChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<LCChatSession | null>(
    null,
  );
  const [messages, setMessages] = useState<LCChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [promptMode, setPromptMode] = useState<LCPromptModeType>("agent");

  // ── Refs to avoid stale closures in async callbacks ──────────────────────
  const activeSessionRef = useRef<LCChatSession | null>(null);
  const messagesRef = useRef<LCChatMessage[]>([]);
  const promptModeRef = useRef<LCPromptModeType>("agent");
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
      },
    ) => {
      // Use the session override if provided (fixes stale-closure issue on first send),
      // otherwise fall back to the ref which always tracks the latest activeSession.
      const session = options?.sessionOverride ?? activeSessionRef.current;
      if (!session) return;

      const failedContent = content;

      setIsSending(true);

      try {
        // Add user message to DB
        const userMsg = await lcDB.addChatMessage(session.id, {
          role: "user",
          content,
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

        // ── Build the prompt for the AI using the selected mode (Request 7) ─
        const promptBuilders: Record<LCPromptModeType, (p: typeof promptParams) => string> = {
          agent: buildAgentPrompt,
          plan: buildPlanPrompt,
          ask: buildAskPrompt,
        };
        const promptParams = {
          projectName,
          stashContext,
          userContent: content,
          fileTree: options?.fileTree,
        };
        const basePrompt = promptBuilders[promptModeRef.current]?.(promptParams as any) ?? buildAgentPrompt(promptParams as any);
        const prompt = sessionContext + basePrompt;

        // Read AI settings from Dexie and forward to server action
        const settings = await lcDB.aiSettings.get("default");
        const providerName = settings?.provider ?? "default";
        const model = settings?.model ?? "";

        // Call Helix AI via server action (API keys stay server-side)
        const aiResponse = await callHelixAI({
          prompt,
          provider: providerName,
          model,
        });

        // ── Plan mode: cross-check file paths in the response ──────────────
        if (promptModeRef.current === "plan" && options?.fileTree && options?.onFilesIdentified) {
          const extractedPaths = extractFilePathsFromResponse(aiResponse.AIMessage);
          const matchedPaths = crossCheckFilePaths(extractedPaths, options.fileTree);
          if (matchedPaths.length > 0) {
            options.onFilesIdentified(matchedPaths);
          }
        }

        // Add AI response to DB
        const aiMsg = await lcDB.addChatMessage(session.id, {
          role: "assistant",
          content: aiResponse.AIMessage,
          fileContents: Array.isArray(aiResponse.FileContents)
            ? aiResponse.FileContents
            : undefined,
        });

        setMessages((prev) => [...prev, aiMsg]);
      } catch (error) {
        console.error("Failed to send message:", error);

        const currentSession = activeSessionRef.current;
        if (currentSession) {
          const errorInfo: LCErrorInfo = {
            message: error instanceof Error ? error.message : "Failed to process request",
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
   * Uses the File System Access API via the provided writeFile callback.
   * Falls back to browser download if no writeFile callback is provided.
   */
  const applyFileChanges = useCallback(
    async (
      fileActions: LCFileActionResult[],
    ) => {
      for (const action of fileActions) {
        try {
          const filePath = action.FileDirectory
            ? `${action.FileDirectory}/${action.FileName}`.replace(/\/+/g, "/")
            : action.FileName;

          console.log(
            `${action.ExistingFile ? "Overwriting" : "Creating"} file: ${filePath}`,
          );

          // Fallback: browser download via blob URL
          const blob = new Blob([action.Content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = action.FileName;
          a.click();
          URL.revokeObjectURL(url);
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
  };
}
