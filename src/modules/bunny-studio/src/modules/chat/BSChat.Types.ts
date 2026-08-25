// BSChat.Types — Types for Bunny AI Studio Chat & Conversation
//
// Mirrors the PLAN.md schemas:
//  - Chat: id, title, createdDate, agentId?, agentPoolId?, provider?, model?
//  - Conversation: id, chatId, type, agentId?, provider?, model?, content, contentType?, createdDate?

import type { HelixAIProvider } from "@/src/modules/helix";
import type { RenderFormat } from "@/src/modules/render";
import type { BSKnowledgeSearchHit } from "../knowledge-base/BSKnowledgeBase.Orama";

// ─── Chat ─────────────────────────────────────────────────────────────

export interface BSChat {
  /** uuidv7 primary key */
  id: string;
  /** name of chat. for initial add, datetime. */
  title: string;
  /** ISO datetime string */
  createdDate: string;
  /** optional linked agent */
  agentId?: string;
  /** optional agent pool → display agents from that pool */
  agentPoolId?: string;
  /** optional provider override (base on helix ai provider) */
  provider?: HelixAIProvider;
  /** optional model override (base on helix ai model) */
  model?: string;
  /** optional per-chat TTS voice override ("" or undefined = global / browser default) */
  voiceURI?: string;
  /** optional per-chat auto text-to-speech override */
  autoTTS?: boolean;
  /**
   * Optional Knowledge Base group id (feature: knowledge base tool). When set,
   * each message in this chat is answered using RAG retrieval from the group's
   * indexed knowledges.
   */
  knowledgeGroupId?: string;
  /**
   * Transient display flag — whether this chat is saved in Chat Favorites.
   * Annotated by the Chat History data layer; never persisted to IndexedDB.
   */
  isFavorite?: boolean;
}

// ─── Attachments (feature: image + text file upload) ──────────────────
//
// The chat input can attach:
//  - Images (uploaded or dragged & dropped) passed along as base64 data URL
//    (multimodal) and included in the conversation.
//  - Text files (md, txt, js, ts, css, html, …) whose content is appended to
//    the prompt.

export interface BSChatImageAttachment {
  id: string;
  name: string;
  /** Base64 data URL of the (resized) image */
  dataUrl: string;
}

export interface BSChatFileAttachment {
  id: string;
  name: string;
  /** Full text content of the uploaded file */
  content: string;
}

export interface BSChatAttachments {
  images: BSChatImageAttachment[];
  files: BSChatFileAttachment[];
}

// ─── Conversation ─────────────────────────────────────────────────────

export type BSConversationType = "assistant" | "system" | "user";

export interface BSConversation {
  /** uuidv7 primary key */
  id: string;
  /** owning chat id */
  chatId: string;
  /** "assistant" | "system" | "user" */
  type: BSConversationType;
  /** optional agent override */
  agentId?: string;
  /** provider used to produce the output (especially for AI) */
  provider?: HelixAIProvider;
  /** model used to produce the output */
  model?: string;
  /**
   * The AI's private reasoning preamble, extracted from <thought>…</thought>
   * tags in the raw stream. Stored in its own column (separate from `content`)
   * and rendered in a collapsible "Thought process" panel. It is NEVER included
   * in persistence of the main content, in exports, or in the history sent
   * back to the AI on the next turn (rules: thought is display-only).
   */
  thought?: string;
  /**
   * Message content. For assistant responses this holds ONLY the actual
   * output — the <thought>…</thought> preamble is stripped out and kept in
   * the `thought` column instead.
   */
  content: string;
  /** base on render type (e.g. "markdown", "mermaid", ...) */
  contentType?: RenderFormat;
  /** ISO datetime string */
  createdDate?: string;
  /**
   * Time elapsed (in seconds) since the previous conversation in the same
   * chat. Records the "seconds / minutes laps between chat" (feature request).
   */
  gapSeconds?: number;
  /**
   * AI response duration (in milliseconds) measured from request start to
   * stream finish. Displayed in the assistant bubble actions (feature).
   */
  responseMs?: number;
  /**
   * Transient display flag — this bubble represents a chat error (e.g. 404,
   * provider failure) rather than an AI response. It is rendered in red and
   * is NEVER included when the conversation history is sent back to the AI.
   */
  isError?: boolean;
  /**
   * Base64 data URLs of images attached to this (user) message. Rendered as
   * thumbnails in the bubble and re-sent as multimodal image parts when the
   * message is the current one (feature: attach image).
   */
  imageData?: string[];
  /**
   * Names of text files attached to this (user) message. The file content is
   * already embedded in `content`; the names are kept for display (feature:
   * text file upload → append to prompt).
   */
  fileNames?: string[];
  /**
   * Orama retrieval hits (with similarity scores) that grounded this assistant
   * response (feature: collapsible knowledge base scoring). Populated when the
   * chat has an active knowledge group and persisted with the message so the
   * score panel survives a reload.
   */
  knowledgeHits?: BSKnowledgeSearchHit[];
}

// ─── Streaming request payloads ───────────────────────────────────────

/** A single message in the wire format sent to the AI endpoint */
export interface BSChatWireMessage {
  role: "system" | "user" | "assistant";
  content: string;
  /**
   * Optional base64 image data URLs attached to this message. Only set for
   * user messages; the stream route turns them into multimodal image content
   * parts (feature: attach image).
   */
  images?: string[];
}

/** Request body for the streaming AI endpoint */
export interface BSChatStreamRequest {
  /** Full conversation history (system/user/assistant) */
  messages: BSChatWireMessage[];
  /** Resolved provider override (from chat > agent > global) */
  provider?: HelixAIProvider;
  /** Resolved model override */
  model?: string;
  /** Temperature override */
  temperature?: number;
}
