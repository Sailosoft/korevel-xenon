// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — useLCChat Hook
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback } from "react";
import { lcDB } from "./LCDatabase";
import { callHelixAI } from "./actions";
import type {
  LCChatSession,
  LCChatMessage,
  LCContextStashItem,
  LCFileActionResult,
} from "./LCInterface";

export interface UseLCChatReturn {
  sessions: LCChatSession[];
  activeSession: LCChatSession | null;
  messages: LCChatMessage[];
  isSending: boolean;
  createSession: (projectId: string) => Promise<void>;
  selectSession: (session: LCChatSession) => void;
  sendMessage: (
    content: string,
    stashItems: LCContextStashItem[],
    projectName: string,
    options?: {
      /** Read the actual content of a stashed file by its relative path */
      readFileContent?: (filePath: string) => Promise<string>;
    },
  ) => Promise<void>;
  applyFileChanges: (fileActions: LCFileActionResult[]) => Promise<void>;
}

export function useLCChat(): UseLCChatReturn {
  const [sessions, setSessions] = useState<LCChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<LCChatSession | null>(
    null,
  );
  const [messages, setMessages] = useState<LCChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const createSession = useCallback(async (projectId: string) => {
    const session = await lcDB.createChatSession(
      projectId,
      `Session ${new Date().toLocaleDateString()}`,
    );
    setSessions((prev) => [session, ...prev]);
    setActiveSession(session);
    setMessages([]);
  }, []);

  const selectSession = useCallback((session: LCChatSession) => {
    setActiveSession(session);
    setMessages(session.messages || []);
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      stashItems: LCContextStashItem[],
      projectName: string,
      options?: {
        readFileContent?: (filePath: string) => Promise<string>;
      },
    ) => {
      if (!activeSession) return;
      setIsSending(true);

      try {
        // Add user message to DB
        const userMsg = await lcDB.addChatMessage(activeSession.id, {
          role: "user",
          content,
        });

        setMessages((prev) => [...prev, userMsg]);

        // ── Build context from stash items ──────────────────────────────────
        // Collect file-level stash items (skip directories; only files have content)
        const fileStashItems = stashItems.filter((s) => !s.isDirectory);

        let stashContext = "";
        if (fileStashItems.length > 0) {
          const fileSections: string[] = [];

          for (const item of fileStashItems) {
            let fileContent = "";
            let readError = "";

            // Try to read the actual file content from disk
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

        // ── Build the prompt for the AI ─────────────────────────────────────
        const prompt = `
Project: ${projectName}

### Stashed Context Files (full contents):
${stashContext || "(No files stashed)"}

### User Instruction:
${content}

### Response Format:
You MUST respond with a valid JSON object containing exactly these two fields:
1. "AIMessage": A string — your explanation or response to the user.
2. "FileContents": An array of file objects. Each file object has:
   - "FileName": string — the file name (e.g. "App.tsx")
   - "ExistingFile": boolean — true if the file already exists, false if new
   - "FileDirectory": string — the directory path relative to project root
   - "Description": string — brief description of what changed
   - "Content": string — the COMPLETE file content, ready to copy-paste. NOT a diff or snippet. The full file from first line to last.

IMPORTANT: The "Content" field must contain the ENTIRE file — not just the changed parts, not a code snippet, not a diff. The complete source code that can be written directly to the file.
`;

        // Read AI settings from Dexie (client-side) and forward to server action
        const settings = await lcDB.aiSettings.get("default");
        const providerName = settings?.provider ?? "default";
        const model = settings?.model ?? "";

        // Call Helix AI via server action (API keys stay server-side)
        const aiResponse = await callHelixAI({
          prompt,
          provider: providerName,
          model,
        });

        // Add AI response to DB
        const aiMsg = await lcDB.addChatMessage(activeSession.id, {
          role: "assistant",
          content: aiResponse.AIMessage,
          fileContents: Array.isArray(aiResponse.FileContents)
            ? aiResponse.FileContents
            : undefined,
        });

        setMessages((prev) => [...prev, aiMsg]);
      } catch (error) {
        console.error("Failed to send message:", error);

        // Add error message
        if (activeSession) {
          const errorMsg = await lcDB.addChatMessage(activeSession.id, {
            role: "assistant",
            content: `Error: ${error instanceof Error ? error.message : "Failed to process request"}`,
          });
          setMessages((prev) => [...prev, errorMsg]);
        }
      } finally {
        setIsSending(false);
      }
    },
    [activeSession],
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
            ? `${action.FileDirectory}/${action.FileName}`
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

  return {
    sessions,
    activeSession,
    messages,
    isSending,
    createSession,
    selectSession,
    sendMessage,
    applyFileChanges,
  };
}
