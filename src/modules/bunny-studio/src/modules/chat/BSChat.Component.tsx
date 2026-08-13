// BSChat.Component — Main Bunny AI Studio chat view.
//
// Implements the AIChat / AIInitialChat / AIChatSettings / AIAgent /
// RenderingConversation features:
//  - Empty state: input centered on screen.
//  - Conversation state: three parts — title + provider/model (upper),
//    conversation bubbles (middle), input (lower).
//  - Provider/model priority: Global → Agent → Conversation → Input.
//
// Feature requests implemented here:
//  - More curved borders (UI layout).
//  - Virtual scroll via react-virtuoso + scroll the AI first sentence to top.
//  - Per-request render type override (resets after the request).
//  - Rename-able chat title (click title to rename).
//  - Beating/circling-color avatar animation.
//  - Gradient Background — shown on the initial chat, fades away in conversation.
//  - Red Theme — accents use the BunnyAI red (#ff2d20) instead of purple.
//  - Chat Settings Modal — the settings popup renders above the chat input.
//  - Chat id on URL — every chat has its id on the URL and is loaded by it.
//  - Spinning red line around the initial chat input.
//  - Agent skill bubbles — agent skills offered on the initial chat input.
//  - Render instruction — a per-request render-type system instruction.
//  - Seamless AI stream + virtual scrolling (follow-output, free scrolling).

"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { Rabbit, Plus, Trash2, Pencil, Star } from "lucide-react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { bsDB } from "../../BSDatabase";
import { useBSAISettings } from "../ai-settings/BSAISettings.Context";
import type { BSAgent } from "../agents/BSAgent.Types";
import type { BSAgentPool } from "../agent-pools/BSAgentPool.Types";
import type { HelixAIProvider } from "@/src/modules/helix";
import type { BSConversation } from "./BSChat.Types";
import { RenderFormats } from "@/src/modules/render";
import type { RenderFormat } from "@/src/modules/render";
import { useBSChat } from "./BSChat.Hooks";
import { BSChatConversationView } from "./BSChat.ConversationView";
import { BSChatInput } from "./BSChat.Input";
import type { BSChatInputAttachments } from "./BSChat.Input.Attachment";
import { BSChatSettingsPanel } from "./BSChat.SettingsPanel";
import { useBSVoice } from "./BSChat.Voice";

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSChatComponentProps {
  /** Optional initial chat id (from route param) */
  chatId?: string;
  /** Optional default agent pool filter for the chat settings panel */
  agentPoolId?: string;
}

// ─── Render-instruction helper (feature: Render) ───────────────────────
//
// The instruction is strict so the AI follows the render format instead of
// adding commentary, explanations, or questions (fix: render instruction).

const RENDER_STRICT_NOTE =
  "Do NOT add any commentary, explanation, preamble, closing remarks, or questions outside the requested format. Output ONLY the requested format content.";

function buildRenderInstruction(format: RenderFormat): string {
  switch (format) {
    case "mermaid":
      return `Generate your response as a Mermaid diagram definition using the "mermaid" render format.\nOutput ONLY the raw Mermaid source code — no markdown code fences, no prose. ${RENDER_STRICT_NOTE}`;
    case "mindmap":
      return `Generate your response as a Mermaid mindmap definition using the "mindmap" render format.\nOutput ONLY the raw Mermaid mindmap source code — no markdown code fences, no prose. ${RENDER_STRICT_NOTE}`;
    case "json":
      return `Generate your response as valid JSON using the "json" render format.\nOutput ONLY the JSON document. ${RENDER_STRICT_NOTE}`;
    case "yaml":
      return `Generate your response as a valid YAML document using the "yaml" render format.\nOutput ONLY the YAML. ${RENDER_STRICT_NOTE}`;
    case "csv":
      return `Generate your response as CSV data using the "csv" render format.\nOutput ONLY the CSV rows. ${RENDER_STRICT_NOTE}`;
    case "html":
      return `Generate your response as an HTML fragment using the "html" render format.\nOutput ONLY the HTML markup. ${RENDER_STRICT_NOTE}`;
    case "tailwind":
      return `Generate your response as HTML styled with Tailwind CSS classes using the "tailwind" render format.\nOutput ONLY the HTML markup with Tailwind classes. ${RENDER_STRICT_NOTE}`;
    case "plain":
      return `Generate your response as plain text using the "plain" render format.\nOutput ONLY the plain text content. ${RENDER_STRICT_NOTE}`;
    default:
      return `Generate your response using the "${format}" render format.\n${RENDER_STRICT_NOTE}`;
  }
}

// ─── User-content helper (feature: edit / resend own chat content) ─────
//
// User messages built with the "instruction + text" input mode are persisted
// with the custom instruction wrapper. When the user edits or resends a
// message we strip that wrapper so only the real text (and instruction) are
// used.

const CUSTOM_INSTRUCTION_RE =
  /^--- Custom Instruction ---\n([\s\S]*?)\n\n--- Text ---\n([\s\S]*)$/;

function parseStoredUserContent(content: string): {
  text: string;
  instruction?: string;
} {
  const match = content.match(CUSTOM_INSTRUCTION_RE);
  if (match) {
    return { instruction: match[1], text: match[2] };
  }
  return { text: content };
}

// ─── Component ─────────────────────────────────────────────────────────

export function BSChatComponent({ chatId, agentPoolId }: BSChatComponentProps) {
  const { aiConfig: globalAI } = useBSAISettings();
  const router = useRouter();

  // Live agents across every pool + global — the settings panel filters them
  // by the selected agent pool.
  const allAgents = useLiveQuery<BSAgent[]>(async () => {
    const list = await bsDB.agentsRepo.query.getAll({
      page: 0,
      pageSize: 0,
    });
    return list.data;
  }, []);

  // Live agent pools — drives the chat settings panel's pool selector.
  const agentPools = useLiveQuery<BSAgentPool[]>(async () => {
    const list = await bsDB.agentPoolsRepo.query.getAll({
      page: 0,
      pageSize: 0,
    });
    return list.data;
  }, []);

  const {
    chat,
    conversations,
    isLoading,
    isStreaming,
    streamingAssistantId,
    createChat,
    sendMessage,
    updateChat,
    updateConversation,
    deleteChat,
    abort,
  } = useBSChat({ chatId });
  // Voice context — pushes the per-chat TTS override so speaking uses the
  // chat's voice (feature: per-chat TTS settings).
  const { setOverride } = useBSVoice();

  // Favorite status for the current chat (feature: Chat Favorites) — a live
  // query on the chatFavorites table so the star reflects add/remove instantly
  // and stays in sync with Chat History.
  const chatFavorite = useLiveQuery(
    () => (chat ? bsDB.chatFavoritesRepo.findByChat(chat.id) : undefined),
    [chat?.id],
  );
  const isFavorite = Boolean(chatFavorite);

  const handleToggleFavorite = useCallback(async () => {
    if (!chat) return;
    if (isFavorite) {
      await bsDB.chatFavoritesRepo.removeForChat(chat.id);
    } else {
      await bsDB.chatFavoritesRepo.saveForChat(chat.id, undefined);
    }
  }, [chat, isFavorite]);

  // Conversation-level override state
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(
    chat?.agentId,
  );
  const [contentType, setContentType] = useState<RenderFormat | undefined>(
    undefined,
  );
  /** Per-request render type override (resets after the request) */
  const [requestRenderType, setRequestRenderType] = useState<
    RenderFormat | undefined
  >(undefined);
  // Track the last-seen chat so we sync override state via render-time adjustment.
  const [prevChat, setPrevChat] = useState(chat);

  // Initial-page (no chat yet) provider/model overrides — applied to the chat
  // when the first message creates it (feature: Missing Chat Settings on the
  // initial chat page).
  const [pendingProvider, setPendingProvider] = useState<
    HelixAIProvider | undefined
  >(undefined);
  const [pendingModel, setPendingModel] = useState<string | undefined>(
    undefined,
  );
  const [pendingAgentPoolId, setPendingAgentPoolId] = useState<
    string | undefined
  >(undefined);

  // Initial-page (no chat yet) TTS overrides — applied to the created chat
  // and pushed to the voice context (feature: per-chat TTS settings).
  const [pendingVoiceURI, setPendingVoiceURI] = useState<string | undefined>(
    undefined,
  );
  const [pendingAutoTTS, setPendingAutoTTS] = useState<boolean | undefined>(
    undefined,
  );

  // Title rename state (feature: ChatTitle)
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Virtual scroll handle (feature: virtual scroll + seamless streaming)
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const prevStreamingIdRef = useRef<string | null>(null);

  if (chat && chat !== prevChat) {
    setPrevChat(chat);
    setSelectedAgentId(chat.agentId);
  }

  // Keep the voice context override in sync with the active chat's TTS
  // settings (or the initial-page pending settings when no chat exists yet).
  // This makes reading/speaking use the chat's own voice (feature: per-chat
  // TTS settings).
  const voiceURIOverride = chat?.voiceURI ?? pendingVoiceURI;
  const autoTTSOverride = chat?.autoTTS ?? pendingAutoTTS;

  useEffect(() => {
    setOverride({ voiceURI: voiceURIOverride, autoTTS: autoTTSOverride });
  }, [voiceURIOverride, autoTTSOverride, setOverride]);

  // Track the last chat whose conversations have been scrolled to the end
  // (feature: opening a chat history opens the LAST conversation).
  const lastLoadedChatRef = useRef<string | null>(null);

  const selectedAgent = useMemo(
    () => allAgents?.find((a) => a.id === selectedAgentId) ?? null,
    [allAgents, selectedAgentId],
  );

  // Effective provider/model: Conversation → Pending (initial) → Agent → Global
  const effectiveProvider = chat?.provider ?? pendingProvider ?? selectedAgent?.provider ?? globalAI.provider;
  const effectiveModel = chat?.model ?? pendingModel ?? selectedAgent?.model ?? globalAI.model;

  // Skill bubbles for the initial input (feature: Agent skill)
  const agentSkills = useMemo<string[]>(() => {
    if (!selectedAgent?.skills) return [];
    return selectedAgent.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [selectedAgent]);

  // Build system instruction from agent persona + skills
  const buildSystemInstruction = useCallback(
    (agent: BSAgent | null): string | undefined => {
      if (!agent) return undefined;
      const skills = agent.skills
        ? agent.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const lines = [`You are ${agent.name}.`, agent.persona];
      if (skills.length > 0) {
        lines.push(`Skills: ${skills.join(", ")}.`);
      }
      return lines.join("\n\n");
    },
    [],
  );

  // Index of the assistant bubble being streamed (for scroll anchoring).
  const streamingIndex = useMemo(() => {
    if (!streamingAssistantId) return -1;
    return conversations.findIndex((c) => c.id === streamingAssistantId);
  }, [conversations, streamingAssistantId]);

  // On stream start, scroll the AI response's first sentence to the top ONCE.
  // The user can then scroll freely while the response streams (scrolldown fix).
  useEffect(() => {
    if (isStreaming && streamingIndex >= 0) {
      if (prevStreamingIdRef.current !== streamingAssistantId) {
        prevStreamingIdRef.current = streamingAssistantId;
        virtuosoRef.current?.scrollToIndex({
          index: streamingIndex,
          align: "start",
          behavior: "auto",
        });
      }
    } else if (!isStreaming) {
      prevStreamingIdRef.current = null;
    }
  }, [isStreaming, streamingAssistantId, streamingIndex]);

  // Feature: when opening a chat (from chat history) start at the LAST
  // conversation instead of the first. Runs once per chat id load.
  useEffect(() => {
    if (isLoading || !chat || conversations.length === 0) return;
    if (lastLoadedChatRef.current === chat.id) return;
    lastLoadedChatRef.current = chat.id;
    requestAnimationFrame(() => {
      virtuosoRef.current?.scrollToIndex({
        index: conversations.length - 1,
        align: "end",
        behavior: "auto",
      });
    });
  }, [isLoading, chat, conversations]);

  const handleNewChat = useCallback(async () => {
    const created = await createChat();
    setSelectedAgentId(undefined);
    setContentType(undefined);
    setRequestRenderType(undefined);
    // Chat id on URL (feature)
    router.push(`/modules/bunny-studio/chat/${created.id}`);
  }, [createChat, router]);

  const handleSend = useCallback(
    (
      content: string,
      instruction?: string,
      skills?: string[],
      attachments?: BSChatInputAttachments,
    ) => {
      const effectiveContentType = requestRenderType ?? contentType;
      // Append selected skill bubbles to the message (feature: Agent skill)
      const contentWithSkills =
        skills && skills.length > 0
          ? `${content}\n\n[Agent skills requested: ${skills.join(", ")}]`
          : content;
      const systemParts: string[] = [];
      const base = buildSystemInstruction(selectedAgent);
      if (base) systemParts.push(base);
      // Render instruction — only when a render type is explicitly selected
      // (feature: Render). No render type = no preselected render instruction.
      if (effectiveContentType) {
        systemParts.push(buildRenderInstruction(effectiveContentType));
      }

      void sendMessage({
        content: contentWithSkills,
        instruction,
        // Attachments: base64 image URLs (multimodal) + text file contents
        attachments,
        systemInstruction: systemParts.join("\n\n"),
        provider: effectiveProvider,
        model: effectiveModel,
        contentType: effectiveContentType,
        apiKey: undefined,
        // Apply initial-page settings to the auto-created chat
        // (feature: Missing Chat Settings on the initial chat page + per-chat
        // TTS settings).
        chatOverrides: {
          agentId: selectedAgentId,
          agentPoolId: pendingAgentPoolId,
          provider: pendingProvider,
          model: pendingModel,
          voiceURI: pendingVoiceURI,
          autoTTS: pendingAutoTTS,
        },
        onChatCreated: (chat) => {
          // Chat id on URL — replace so the URL reflects the created chat.
          router.replace(`/modules/bunny-studio/chat/${chat.id}`);
        },
      });
      // Per-request render type — reset back to the conversation default.
      setRequestRenderType(undefined);
    },
    [
      sendMessage,
      selectedAgent,
      buildSystemInstruction,
      effectiveProvider,
      effectiveModel,
      contentType,
      requestRenderType,
      selectedAgentId,
      pendingAgentPoolId,
      pendingProvider,
      pendingModel,
      pendingVoiceURI,
      pendingAutoTTS,
      router,
    ],
  );

  // Feature: edit own chat content — persist the edited text back to the
  // conversation (IndexedDB + in-memory list).
  const handleEditConversation = useCallback(
    (conversation: BSConversation, newContent: string) => {
      if (!newContent.trim()) return;
      void updateConversation(conversation.id, { content: newContent });
    },
    [updateConversation],
  );

  // Feature: resend chat — re-send the user's own message to the AI. The
  // stored content may carry the "custom instruction" wrapper from the
  // instruction+text input mode, so we parse it back into text + instruction.
  const handleResendConversation = useCallback(
    (conversation: BSConversation) => {
      const { text, instruction } = parseStoredUserContent(conversation.content);
      handleSend(text, instruction);
    },
    [handleSend],
  );

  const handleAgentChange = useCallback(
    (agent: BSAgent | null) => {
      const agentIdValue = agent?.id;
      setSelectedAgentId(agentIdValue);
      void updateChat({ agentId: agentIdValue });
    },
    [updateChat],
  );

  const handleAgentPoolChange = useCallback(
    (poolId: string | undefined) => {
      if (chat) {
        void updateChat({ agentPoolId: poolId });
      } else {
        setPendingAgentPoolId(poolId);
      }
    },
    [chat, updateChat],
  );

  const handleProviderModelChange = useCallback(
    (provider: Parameters<typeof updateChat>[0]["provider"], model: string) => {
      // "default" means "inherit" — normalize it back to undefined.
      const normalizedProvider =
        provider === "default" ? undefined : provider;
      const normalizedModel = model || undefined;
      if (chat) {
        void updateChat({
          provider: normalizedProvider,
          model: normalizedModel,
        });
      } else {
        // No chat yet (initial page) — remember the override so it can be
        // applied to the chat when the first message creates it.
        setPendingProvider(normalizedProvider);
        setPendingModel(normalizedModel);
      }
    },
    [chat, updateChat],
  );

  const handleVoiceChange = useCallback(
    (uri: string | undefined) => {
      if (chat) {
        void updateChat({ voiceURI: uri });
      } else {
        setPendingVoiceURI(uri);
      }
    },
    [chat, updateChat],
  );

  const handleAutoTTSChange = useCallback(
    (value: boolean | undefined) => {
      if (chat) {
        void updateChat({ autoTTS: value });
      } else {
        setPendingAutoTTS(value);
      }
    },
    [chat, updateChat],
  );

  const handleDelete = useCallback(async () => {
    await deleteChat();
    setSelectedAgentId(undefined);
    // Chat id on URL — return to the chat home after deletion.
    router.push("/modules/bunny-studio");
  }, [deleteChat, router]);

  const commitRename = useCallback(() => {
    const title = renameValue.trim();
    if (title && chat && title !== chat.title) {
      void updateChat({ title });
    }
    setIsRenaming(false);
  }, [renameValue, chat, updateChat]);

  // ── Render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="bs-studio h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isInitial = !chat || conversations.length === 0;

  return (
    <div className="bs-studio h-full flex flex-col">
      {/* ── Upper part: title + current ai model/provider ── */}
      {chat && (
        // relative z-30 ensures the settings popup paints above the relative
        // conversation area (fix: chat settings z-index issue).
        <div className="relative z-30 flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 bg-white/70 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleNewChat}
              title="New chat"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
            <div className="min-w-0 flex items-center gap-1.5">
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") {
                      setIsRenaming(false);
                      setRenameValue(chat.title);
                    }
                  }}
                  className="w-full min-w-0 px-2 py-1 text-sm font-semibold text-gray-800 border border-red-300 rounded-lg outline-none"
                />
              ) : (
                <button
                  onClick={() => {
                    setRenameValue(chat.title);
                    setIsRenaming(true);
                  }}
                  title="Rename chat"
                  className="group flex items-center gap-1.5 text-left min-w-0"
                >
                  <span className="text-sm font-semibold text-gray-800 truncate group-hover:text-red-600 transition">
                    {chat.title}
                  </span>
                  <Pencil className="w-3 h-3 text-gray-300 group-hover:text-red-500 shrink-0" />
                </button>
              )}
              <div className="text-[11px] text-gray-400 truncate">
                {effectiveProvider} · {effectiveModel || "(no model)"}
                {selectedAgent ? ` · ${selectedAgent.name}` : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <BSChatSettingsPanel
              globalProvider={globalAI.provider}
              globalModel={globalAI.model}
              provider={chat.provider}
              model={chat.model}
              agentId={selectedAgentId}
              contentType={contentType}
              voiceURI={chat.voiceURI}
              autoTTS={chat.autoTTS}
              allAgents={allAgents ?? []}
              agentPools={agentPools ?? []}
              agentPoolId={chat.agentPoolId ?? agentPoolId}
              onAgentChange={handleAgentChange}
              onAgentPoolChange={handleAgentPoolChange}
              onProviderModelChange={handleProviderModelChange}
              onContentTypeChange={setContentType}
              onVoiceChange={handleVoiceChange}
              onAutoTTSChange={handleAutoTTSChange}
              conversations={conversations}
              chatTitle={chat.title}
            />
            <button
              onClick={() => void handleToggleFavorite()}
              title={
                isFavorite
                  ? "Remove from favorites"
                  : "Save this chat to favorites"
              }
              aria-pressed={isFavorite}
              className={`flex items-center justify-center w-8 h-8 rounded-xl transition ${
                isFavorite
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"
              }`}
            >
              <Star
                className={`w-4 h-4 ${isFavorite ? "fill-amber-400" : ""}`}
              />
            </button>
            <button
              onClick={handleDelete}
              title="Delete chat"
              className="flex items-center justify-center w-8 h-8 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Middle part: conversation bubbles OR initial center input ── */}
      <div className="flex-1 min-h-0 relative">
        {/* Gradient background (feature) — visible on initial, fades in conversation */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 bs-initial-gradient pointer-events-none ${
            isInitial ? "" : "bs-gradient-fade"
          }`}
        />

        <div className="relative h-full">
          {isInitial ? (
            <div className="relative h-full overflow-y-auto">
              {/* Chat settings on the initial chat page (feature: Missing Chat
                  Settings). Settings picked here are applied to the chat when
                  the first message creates it. */}
              <div className="absolute top-4 right-4 z-30">
                <BSChatSettingsPanel
                  globalProvider={globalAI.provider}
                  globalModel={globalAI.model}
                  provider={pendingProvider}
                  model={pendingModel}
                  agentId={selectedAgentId}
                  contentType={contentType}
                  voiceURI={pendingVoiceURI}
                  autoTTS={pendingAutoTTS}
                  allAgents={allAgents ?? []}
                  agentPools={agentPools ?? []}
                  agentPoolId={pendingAgentPoolId ?? agentPoolId}
                  onAgentChange={handleAgentChange}
                  onAgentPoolChange={handleAgentPoolChange}
                  onProviderModelChange={handleProviderModelChange}
                  onContentTypeChange={setContentType}
                  onVoiceChange={handleVoiceChange}
                  onAutoTTSChange={handleAutoTTSChange}
                  conversations={conversations}
                  chatTitle="New Chat"
                />
              </div>
              <div className="h-full flex flex-col items-center justify-center px-6 py-12 sm:px-10">
                <div className="relative mb-8 bs-rise-in">
                  <span
                    aria-hidden="true"
                    className="absolute -inset-4 rounded-[2.25rem] bg-red-500/30 blur-2xl bs-bunny-halo"
                  />
                  <span aria-hidden="true" className="bs-bunny-ring" />
                  <div className="relative w-16 h-16 rounded-3xl bs-bunny-face bs-beat flex items-center justify-center">
                    <Rabbit className="w-8 h-8 text-white bs-bunny-hop drop-shadow-md" />
                  </div>
                </div>
                <h2 className="bs-center-title bs-rise-in bs-rise-in-delay-1 text-3xl font-extrabold tracking-tight text-white mb-3">
                  Bunny AI Studio
                </h2>
                <p className="bs-center-subtitle bs-rise-in bs-rise-in-delay-2 text-sm text-white mb-10 text-center max-w-md leading-relaxed">
                  {selectedAgent
                    ? `Chatting as ${selectedAgent.name}.`
                    : "Multi-modal AI chat. Import text, code, and images; stream responses with the Vercel AI SDK."}
                </p>
                <div className="bs-rise-in bs-rise-in-delay-3 w-full flex justify-center">
                  <BSChatInput
                    onSend={handleSend}
                    isStreaming={isStreaming}
                    onStop={abort}
                    renderType={requestRenderType ?? contentType}
                    renderTypes={RenderFormats}
                    onRenderTypeChange={setRequestRenderType}
                    initial={isInitial}
                    skillSuggestions={agentSkills}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Virtuoso
              ref={virtuosoRef}
              style={{ height: "100%" }}
              data={conversations}
              computeItemKey={(index, convo) => convo.id}
              followOutput={(isAtBottomNow) => (isAtBottomNow ? "smooth" : false)}
              itemContent={(index, convo) => (
                <div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
                  <BSChatConversationView
                    conversation={convo}
                    isStreaming={isStreaming && index === streamingIndex}
                    onEditConversation={handleEditConversation}
                    onResendConversation={handleResendConversation}
                  />
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* ── Lower part: input chat ── */}
      {!isInitial && (
        <div className="px-4 py-3 border-t border-gray-200 bg-white/70 backdrop-blur">
          <BSChatInput
            onSend={handleSend}
            isStreaming={isStreaming}
            onStop={abort}
            renderType={requestRenderType ?? contentType}
            renderTypes={RenderFormats}
            onRenderTypeChange={setRequestRenderType}
          />
        </div>
      )}
    </div>
  );
}

export default BSChatComponent;
