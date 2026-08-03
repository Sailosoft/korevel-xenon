// BSChat.Hooks — Streaming + persistence hook for Bunny AI Studio Chat
//
// useBSChat manages a single chat conversation: it loads the chat + its
// conversations from Dexie, sends new user messages to the vercel-ai
// streaming endpoint, accumulates streamed tokens, and persists both the
// user and assistant messages once the stream completes.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v7 as uuidv7 } from "uuid";
import type { HelixAIProvider } from "@/src/modules/helix";
import type { RenderFormat } from "@/src/modules/render";
import { bsDB } from "../../BSDatabase";
import { BSConversationHelper } from "./BSChat.Repository";
import {
  BS_API_TOKEN_HEADER,
  getBSApiToken,
} from "../../BSApiSecurity";
import type {
  BSConversation,
  BSChat,
  BSChatWireMessage,
  BSConversationType,
} from "./BSChat.Types";

// ─── Types ─────────────────────────────────────────────────────────────

export interface BSChatSendOptions {
  /** Current active message (user content) */
  content: string;
  /** Optional custom instruction (from the instruction + text mode) */
  instruction?: string;
  /** Optional system/agent persona added to system instructions */
  systemInstruction?: string;
  /** Resolved provider for this request (override chain) */
  provider?: HelixAIProvider;
  /** Resolved model for this request */
  model?: string;
  /** Render content type for the response (e.g. "markdown") */
  contentType?: RenderFormat;
  /** BYO API key (optional) */
  apiKey?: string;
  /**
   * Settings applied to the chat when it is auto-created from the initial
   * chat page (agent / provider / model picked before the first message).
   */
  chatOverrides?: Partial<BSChat>;
  /**
   * Called when a chat is auto-created (feature: Chat id on URL).
   * The callback is invoked AFTER the first stream completes so the caller
   * can safely navigate to the chat URL without unmounting the component
   * mid-stream (fix: "first user message not responding").
   */
  onChatCreated?: (chat: BSChat) => void;
}

export interface BSChatHookOptions {
  chatId?: string;
}

export interface BSChatHookReturn {
  chat: BSChat | null;
  conversations: BSConversation[];
  isLoading: boolean;
  isStreaming: boolean;
  /** Id of the assistant message currently being streamed (for scroll anchoring) */
  streamingAssistantId: string | null;
  /** Create a new chat (title defaults to datetime) */
  createChat: (overrides?: Partial<BSChat>) => Promise<BSChat>;
  /** Load a chat by id */
  loadChat: (chatId: string) => Promise<void>;
  /** Send a message; streams tokens into the conversation list */
  sendMessage: (options: BSChatSendOptions) => Promise<void>;
  /** Update the chat meta (title/provider/model/agent) */
  updateChat: (patch: Partial<BSChat>) => Promise<void>;
  /** Delete a chat and all of its conversations */
  deleteChat: (chatId?: string) => Promise<void>;
  /** Abort an in-progress stream */
  abort: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function isProvider(v: string | undefined): v is HelixAIProvider {
  return typeof v === "string" && v.length > 0;
}

/**
 * Derive a short chat title from the first AI response (feature: ChatTitle).
 * Strips markdown/code fences and takes the first sentence (or ~60 chars).
 */
function deriveTitleFromContent(text: string): string | undefined {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return undefined;
  const sentence = cleaned.match(/^[^.!?\n]{1,80}[.!?]?/);
  const raw = (sentence ? sentence[0].trim() : cleaned).trim();
  const first = raw || cleaned.slice(0, 60);
  return first.length > 60
    ? `${first.slice(0, 57).trimEnd()}…`
    : first;
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useBSChat({
  chatId,
}: BSChatHookOptions = {}): BSChatHookReturn {
  const [chat, setChat] = useState<BSChat | null>(null);
  const [conversations, setConversations] = useState<BSConversation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  /** Id of the assistant bubble currently being streamed (scroll anchoring) */
  const [streamingAssistantId, setStreamingAssistantId] = useState<
    string | null
  >(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Tracks the current accumulated streamed text for abort/finally handling */
  const accumulatedRef = useRef<string>("");

  const loadChat = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const result = await bsDB.chatsRepo.get(id);
      if (result.isSuccess) {
        setChat(result.value);
      } else {
        setChat(null);
      }
      const convos = await BSConversationHelper.listForChat(
        bsDB.conversations,
        id,
      );
      setConversations(convos);
    } catch (err) {
      console.error("[BSChat] Failed to load chat:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load when chatId is provided
  useEffect(() => {
    if (chatId) {
      loadChat(chatId);
    } else {
      setIsLoading(false);
    }
  }, [chatId, loadChat]);

  const createChat = useCallback(async (overrides: Partial<BSChat> = {}) => {
    const created = await bsDB.chatsRepo.createChat(overrides);
    setChat(created);
    setConversations([]);
    return created;
  }, []);

  const updateChat = useCallback(
    async (patch: Partial<BSChat>) => {
      if (!chat) return;
      const updated = { ...chat, ...patch };
      await bsDB.chatsRepo.update(chat.id, updated);
      setChat(updated);
    },
    [chat],
  );

  const deleteChat = useCallback(
    async (id?: string) => {
      const target = id ?? chat?.id;
      if (!target) return;
      await bsDB.conversations.where("chatId").equals(target).delete();
      await bsDB.chatsRepo.delete(target);
      setChat(null);
      setConversations([]);
    },
    [chat?.id],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const persistConversation = useCallback(
    async (
      conversation: Omit<BSConversation, "id">,
    ): Promise<BSConversation> => {
      const entity: BSConversation = { id: uuidv7(), ...conversation };
      await bsDB.conversationsRepo.create(entity);
      return entity;
    },
    [],
  );

  const sendMessage = useCallback(
    async (options: BSChatSendOptions) => {
      const content = options.content.trim();
      if (!content || isStreaming) return;

      // Ensure a chat exists (auto-create if none). When the first message is
      // sent from the initial chat page a chat is created here. We defer the
      // onChatCreated notification (URL navigation) until the stream finishes
      // so the component is never unmounted mid-stream (fix: first message).
      const wasAutoCreated = !chat;
      const currentChat = chat ?? (await bsDB.chatsRepo.createChat(options.chatOverrides));
      if (wasAutoCreated) {
        setChat(currentChat);
      }

      const chatIdValue = currentChat.id;
      const provider: HelixAIProvider =
        options.provider ||
        (isProvider(currentChat.provider) ? currentChat.provider : "default");
      const model =
        options.model || currentChat.model || "gemma4:31b-cloud";

      // Time laps (seconds) since the previous message in this chat
      const lastConvo = conversations[conversations.length - 1];
      const gapSeconds = lastConvo?.createdDate
        ? Math.max(
            0,
            Math.round(
              (Date.now() - new Date(lastConvo.createdDate).getTime()) / 1000,
            ),
          )
        : undefined;

      // Auto-title the chat from the first AI response (feature: ChatTitle)
      const updateTitleFromResponse = async (text: string) => {
        const title = deriveTitleFromContent(text);
        if (!title || !currentChat.title.startsWith("New Chat —")) return;
        await bsDB.chatsRepo.update(currentChat.id, {
          ...currentChat,
          title,
        });
        setChat((c) => (c ? { ...c, title } : c));
      };

      // Build the user message content (instruction + text)
      const userContent = options.instruction
        ? `--- Custom Instruction ---\n${options.instruction}\n\n--- Text ---\n${content}`
        : content;

      // Persist user conversation immediately
      const userConvo = await persistConversation({
        chatId: chatIdValue,
        type: "user" as BSConversationType,
        content: userContent,
        contentType: undefined,
        provider,
        model,
        createdDate: new Date().toISOString(),
        gapSeconds,
      });

      // Optimistically append to the UI list
      setConversations((prev) => [...prev, userConvo]);

      // Build the wire messages (system + history + user)
      const wireMessages: BSChatWireMessage[] = [];
      if (options.systemInstruction) {
        wireMessages.push({
          role: "system",
          content: options.systemInstruction,
        });
      }
      const prior = conversations
        .filter((c) => c.id !== userConvo.id)
        .map((c) => ({
          role: (c.type === "assistant" ? "assistant" : "user") as
            | "user"
            | "assistant",
          content: c.content,
        }));
      wireMessages.push(...prior, { role: "user", content: userContent });

      // Placeholder assistant bubble (streamed into)
      const assistantId = uuidv7();
      const placeholder: BSConversation = {
        id: assistantId,
        chatId: chatIdValue,
        type: "assistant",
        content: "",
        provider,
        model,
        contentType: options.contentType,
        createdDate: new Date().toISOString(),
        gapSeconds,
      };
      setConversations((prev) => [...prev, placeholder]);

      setStreamingAssistantId(assistantId);
      setIsStreaming(true);
      abortRef.current = new AbortController();
      // AI response duration (feature: show how long the AI took to respond).
      const requestStartTime = Date.now();

      try {
        const response = await fetch("/api/bunny-studio/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [BS_API_TOKEN_HEADER]: getBSApiToken() ?? "",
          },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            messages: wireMessages,
            provider,
            model,
            apiKey: options.apiKey,
          }),
        });

        if (!response.ok) {
          let msg = `Request failed (${response.status})`;
          try {
            const data = await response.json();
            msg = data?.error || msg;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }

        if (!response.body) {
          throw new Error("Streaming not supported by the browser.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        accumulatedRef.current = "";

        // Stream tokens into the assistant bubble
        const updateStreamed = (text: string) => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === assistantId ? { ...c, content: text } : c,
            ),
          );
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulatedRef.current += decoder.decode(value, { stream: true });
          updateStreamed(accumulatedRef.current);
        }

        // Persist the final assistant message (with the measured duration).
        const finalAssistant: BSConversation = {
          ...placeholder,
          content: accumulatedRef.current,
          responseMs: Date.now() - requestStartTime,
        };
        await bsDB.conversationsRepo.create(finalAssistant);
        setConversations((prev) =>
          prev.map((c) => (c.id === assistantId ? finalAssistant : c)),
        );
        void updateTitleFromResponse(accumulatedRef.current);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User aborted — keep whatever was accumulated
          if (accumulatedRef.current) {
            await bsDB.conversationsRepo.create({
              id: assistantId,
              chatId: chatIdValue,
              type: "assistant",
              content: accumulatedRef.current,
              provider,
              model,
              contentType: options.contentType,
              createdDate: new Date().toISOString(),
              gapSeconds,
              responseMs: Date.now() - requestStartTime,
            });
            void updateTitleFromResponse(accumulatedRef.current);
          }
        } else {
          console.error("[BSChat] Streaming error:", err);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === assistantId
                ? {
                    ...c,
                    content:
                      c.content ||
                      `⚠️ ${
                        err instanceof Error ? err.message : "Generation failed."
                      }`,
                  }
                : c,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        setStreamingAssistantId(null);
        abortRef.current = null;
        // Notify the caller (e.g. to push the chat id onto the URL) only after
        // the first stream has finished and its data has been persisted. This
        // prevents the navigation from unmounting the component mid-stream and
        // losing the response (fix: "first user message not responding").
        if (wasAutoCreated) {
          options.onChatCreated?.(currentChat);
        }
      }
    },
    [chat, conversations, isStreaming, persistConversation],
  );

  return {
    chat,
    conversations,
    isLoading,
    isStreaming,
    streamingAssistantId,
    createChat,
    loadChat,
    sendMessage,
    updateChat,
    deleteChat,
    abort,
  };
}
