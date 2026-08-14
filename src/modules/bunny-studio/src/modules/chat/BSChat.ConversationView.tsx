// BSChat.ConversationView — Renders a single conversation bubble.
//
// Assistant messages render through the Render module (render view with a
// toggleable raw view + copy buttons). User/system messages render as plain
// text bubbles.
//
// Feature requests implemented here:
//  - Render/raw toggle + copy actions moved to the bottom of the bubble.
//  - "Open in editor" modal (reusable BSModal + CodeMirror) with fullscreen.
//  - Native browser text-to-speech (speak/stop) for assistant messages.
//  - Voice Settings — uses the user-selected browser voice (via BSVoiceContext).
//  - Auto TTS toggle — reads assistant messages aloud when streaming finishes.
//  - TTS Markdown fix — strips markdown symbols before reading.
//  - Time-laps ("gap") label between messages.
//  - Beating/circling-color animation on the bot avatar.

"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  User,
  Rabbit,
  Copy,
  Check,
  FileCode2,
  Volume2,
  Square,
  Clock,
  Pencil,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { RenderView } from "@/src/modules/render";
import type { RenderFormat } from "@/src/modules/render";
import { BSModal, BSCodeMirrorEditor } from "../../components";
import type { BSConversation } from "./BSChat.Types";
import { useBSVoice } from "./BSChat.Voice";

// ─── Copy hook helper ─────────────────────────────────────────────────

function useCopy(resetMs = 1500) {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetMs);
    } catch {
      /* clipboard unavailable */
    }
  };
  return { copied, copy };
}

// ─── Time-laps helper ──────────────────────────────────────────────────

function formatGap(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins ? `${hours}h ${remMins}m` : `${hours}h`;
}

// ─── AI response duration helper (feature: response time in bubble) ─────

function formatDuration(ms?: number): string {
  if (ms === undefined || ms < 0) return "";
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return `${minutes}m ${rem}s`;
}

// ─── Attached-content display helper (feature: text file upload) ────────
//
// Attached file contents are appended to the persisted message content so
// they are sent to the AI, but they are rendered as compact chips instead of
// raw text. This strips those appended blocks for display while leaving the
// full content intact for copy / edit / resend.

// Strips attached-file blocks and any legacy OCR-text blocks (messages sent
// before OCR was removed) so neither renders as raw text in the bubble.
const ATTACHED_BLOCK_START =
  /^--- (?:Attached File|OCR Text from Image): .+ ---\n/m;

function stripAttachedBlocks(content: string): string {
  const idx = content.search(ATTACHED_BLOCK_START);
  if (idx === -1) return content;
  return content
    .slice(0, idx)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Bubble ───────────────────────────────────────────────────────────

export interface BSChatConversationViewProps {
  conversation: BSConversation;
  /** If true, this bubble is the currently-streaming assistant message */
  isStreaming?: boolean;
  /**
   * Persist an edited user message. The parent updates the conversation row
   * and (optionally) resends the edited content to the AI.
   */
  onEditConversation?: (conversation: BSConversation, newContent: string) => void;
  /** Resend a user message to the AI (feature: resend chat) */
  onResendConversation?: (conversation: BSConversation) => void;
}

export function BSChatConversationView({
  conversation,
  isStreaming = false,
  onEditConversation,
  onResendConversation,
}: BSChatConversationViewProps) {
  const isUser = conversation.type === "user";
  const isSystem = conversation.type === "system";
  /** Chat error bubble (e.g. 404 / provider failure) — rendered red, never sent to the AI */
  const isError = conversation.isError === true;
  const { copied, copy } = useCopy();
  const {
    ttsSupported,
    speakText,
    stopSpeaking,
    effectiveAutoTTS,
    speakingKey,
  } = useBSVoice();

  const renderFormat: RenderFormat | undefined =
    conversation.contentType || "markdown";

  // Display text for user messages: attached file blocks are appended to the
  // message for the AI but hidden from the bubble — they show as compact chips
  // below instead of raw appended text (feature).
  const displayContent = isUser
    ? stripAttachedBlocks(conversation.content)
    : conversation.content;

  // Render toggle state only applies to assistant messages
  const [view, setView] = useState<"render" | "raw">("render");
  const showRenderToggle = !isUser && !isSystem && !isError;

  // "Open in editor" modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorValue, setEditorValue] = useState(conversation.content);

  // Local "is speaking" for the manual read-aloud toggle
  const [speaking, setSpeaking] = useState(false);

  // Whether the active utterance was started by AUTO-TTS (vs. the manual
  // read-aloud button). Auto-TTS speech is allowed to survive the bubble
  // unmounting — e.g. the first-message navigation from the initial chat page
  // to the chat URL remounts the component tree, and cancelling there would cut
  // the auto-read off a few seconds in (fix: auto TTS stops on first message).
  const autoTTSSpeechRef = useRef(false);

  // Effective "this bubble is being spoken" flag. The local `speaking` state
  // covers the current mount, while `speakingKey` (held on the voice provider,
  // which survives the chat-URL remount) keeps the ring + stop button active for
  // as long as the audio is actually playing (fix: animation removed early).
  const isThisSpeaking = speaking || speakingKey === conversation.id;

  const openEditor = () => {
    setEditorValue(conversation.content);
    setEditorOpen(true);
  };

  // "Edit user message" modal state (feature: edit own chat content)
  const [userEditOpen, setUserEditOpen] = useState(false);
  const [userEditValue, setUserEditValue] = useState(conversation.content);

  // Image viewer modal state (feature: attach image — click thumbnail to view)
  const [imageViewerIndex, setImageViewerIndex] = useState<number | null>(null);

  const openUserEdit = () => {
    setUserEditValue(conversation.content);
    setUserEditOpen(true);
  };

  const saveUserEdit = () => {
    onEditConversation?.(conversation, userEditValue);
    setUserEditOpen(false);
  };

  const handleSpeak = () => {
    if (isThisSpeaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    // Manual read-aloud — keep the existing unmount behaviour (stop speech when
    // this bubble unmounts, e.g. scrolled out of the virtualized list).
    autoTTSSpeechRef.current = false;
    const started = speakText(conversation.content, {
      key: conversation.id,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
    // Optimistic fallback: show the speaking state immediately; onStart keeps it
    // in sync if the engine starts asynchronously, and onEnd clears it on abort.
    if (started) setSpeaking(true);
  };

  // Auto TTS (feature): when a streamed message finishes and auto-TTS is on,
  // read it aloud automatically (per-chat override wins over the global).
  const prevStreamingRef = useRef(isStreaming);
  useEffect(() => {
    const finished =
      prevStreamingRef.current && !isStreaming;
    prevStreamingRef.current = isStreaming;
    if (
      finished &&
      effectiveAutoTTS &&
      !isUser &&
      !isSystem &&
      !isError &&
      conversation.content &&
      ttsSupported
    ) {
      // Mark this bubble as speaking so the rainbow ring appears while the
      // message is actually being read aloud (feature: TTS bubble animation).
      autoTTSSpeechRef.current = true;
      const started = speakText(conversation.content, {
        key: conversation.id,
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      });
      if (started) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSpeaking(true);
      }
    }
  }, [isStreaming, effectiveAutoTTS, isUser, isSystem, isError, conversation.content, conversation.id, ttsSupported, speakText]);

  // Stop speech when this bubble unmounts — but only for manual read-aloud.
  // Auto-TTS speech is left running so the first-message navigation (which
  // remounts the conversation view via the chat URL) does not cut the auto-read
  // off after a few seconds (fix: auto TTS stops on the first conversation).
  useEffect(
    () => () => {
      if (speaking && !autoTTSSpeechRef.current) stopSpeaking();
    },
    [speaking, stopSpeaking],
  );

  // Show a subtle time-laps divider when there was a notable pause.
  const showGap = (conversation.gapSeconds ?? 0) >= 60;

  return (
    <div className="flex flex-col w-full gap-1.5">
      {/* Gap label (time laps between messages) */}
      {showGap && (
        <div className="w-full flex justify-center">
          <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">
            {formatGap(conversation.gapSeconds ?? 0)} later
          </span>
        </div>
      )}

      <div className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}>

      {/* Avatar */}
      {!isUser && (
        <div className="relative w-8 h-8 shrink-0">
          <span
            className={`absolute inset-0 rounded-full bg-red-400/50 ${
              isStreaming ? "animate-ping" : ""
            }`}
          />
          <div className="relative w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center bs-beat">
            <Rabbit className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Bubble — wrapped so a rainbow ring can surround it while speaking */}
      <div
        className={
          isThisSpeaking ? "bs-speak-ring max-w-[85%]" : "max-w-[85%]"
        }
      >
      <div
        className={`${
          isThisSpeaking ? "bs-speak-ring-inner " : ""
        }rounded-3xl px-4 py-3 text-sm shadow-sm ${
          isError
            ? "bg-red-50 border border-red-300 rounded-bl-lg text-red-700"
            : isUser
              ? "bg-red-600 text-white rounded-br-lg"
              : "bg-white border border-gray-200 rounded-bl-lg text-gray-800"
        }`}
      >
        {isError && (
          <div className="flex items-center gap-2 text-xs font-semibold text-red-600 mb-1">
            <span>⚠️ Error</span>
          </div>
        )}

        {isSystem && (
          <div className="flex items-center gap-2 text-xs text-amber-600 mb-1">
            <span className="font-semibold">System</span>
          </div>
        )}

        {/* Assistant render / raw content */}
        {showRenderToggle ? (
          <div>
            {view === "render" ? (
              conversation.content ? (
                <RenderView format={renderFormat} content={conversation.content} />
              ) : (
                <div className="flex items-center gap-2 text-gray-400 min-h-6">
                  {isStreaming && (
                    <>
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                    </>
                  )}
                </div>
              )
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs text-gray-600 bg-gray-50 rounded-xl p-3 max-h-96 overflow-auto">
                {conversation.content}
              </pre>
            )}

            {/* Actions at the bottom of the bubble (feature) */}
            <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 text-[10px] bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setView("render")}
                  className={`px-2 py-0.5 rounded-md transition ${
                    view === "render"
                      ? "bg-white shadow text-red-600 font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Render
                </button>
                <button
                  onClick={() => setView("raw")}
                  className={`px-2 py-0.5 rounded-md transition ${
                    view === "raw"
                      ? "bg-white shadow text-red-600 font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Raw
                </button>
              </div>

              {/* AI response duration (feature: time from request start to finish) */}
              {conversation.responseMs !== undefined &&
                conversation.responseMs >= 0 && (
                  <span
                    className="flex items-center gap-1 text-[10px] text-gray-400 px-1"
                    title="AI response time"
                  >
                    <Clock className="w-3 h-3" />
                    {formatDuration(conversation.responseMs)}
                  </span>
                )}

              <div className="flex-1" />

              {ttsSupported && conversation.content && (
                <button
                  onClick={handleSpeak}
                  title={isThisSpeaking ? "Stop reading" : "Read aloud"}
                  className={`flex items-center justify-center w-6 h-6 rounded-md transition ${
                    isThisSpeaking
                      ? "text-red-600 bg-red-50"
                      : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  {isThisSpeaking ? (
                    <Square className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              <button
                onClick={openEditor}
                title="Open in editor"
                className="flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
              >
                <FileCode2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => copy(conversation.content)}
                title="Copy"
                className="flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Attached images — base64 thumbnails (feature: attach image) */}
            {isUser &&
              conversation.imageData &&
              conversation.imageData.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {conversation.imageData.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`Attached image ${i + 1}`}
                      onClick={() => setImageViewerIndex(i)}
                      title="View image"
                      className="w-24 h-24 object-cover rounded-xl border border-white/20 cursor-pointer hover:ring-2 hover:ring-red-400 transition"
                    />
                  ))}
                </div>
              )}

            {/* Attached file chips — the full content is sent to the AI but
                hidden from the bubble (rendered as icon + name, not raw text) */}
            {isUser &&
              conversation.fileNames &&
              conversation.fileNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {conversation.fileNames.map((name, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5"
                    >
                      <FileCode2 className="w-3 h-3" />
                      {name}
                    </span>
                  ))}
                </div>
              )}

            <div className="whitespace-pre-wrap break-words">
              {displayContent}
            </div>

            {/* User actions: copy / edit / resend own content (feature) */}
            {isUser && (
              <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-white/20">
                <button
                  onClick={() => copy(conversation.content)}
                  title="Copy"
                  className="flex items-center justify-center w-6 h-6 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={openUserEdit}
                  title="Edit"
                  className="flex items-center justify-center w-6 h-6 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onResendConversation?.(conversation)}
                  title="Resend"
                  disabled={isStreaming}
                  className="flex items-center justify-center w-6 h-6 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Meta (provider/model) */}
        {!isUser && conversation.provider && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
            <span>{conversation.provider}</span>
            {conversation.model && <span>· {conversation.model}</span>}
          </div>
        )}
      </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}

      {/* Open-in-editor modal (reusable modal + CodeMirror, fullscreen support) */}
      <BSModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={`Editor · ${renderFormat}`}
        sizeClassName="max-w-3xl h-[80vh]"
      >
        <div className="h-full">
          <BSCodeMirrorEditor
            value={editorValue}
            onChange={setEditorValue}
            height="100%"
            className="rounded-none"
          />
        </div>
      </BSModal>

      {/* Edit user message modal (feature: edit own chat content) */}
      <BSModal
        open={userEditOpen}
        onClose={() => setUserEditOpen(false)}
        title="Edit message"
        sizeClassName="max-w-3xl h-[80vh]"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setUserEditOpen(false)}
              className="px-4 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={saveUserEdit}
              className="px-4 py-1.5 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white font-medium transition"
            >
              Save
            </button>
          </div>
        }
      >
        <div className="h-full">
          <BSCodeMirrorEditor
            value={userEditValue}
            onChange={setUserEditValue}
            height="100%"
            className="rounded-none"
          />
        </div>
      </BSModal>

      {/* Image viewer modal (feature: attach image — simple lightbox) */}
      <BSModal
        open={imageViewerIndex !== null}
        onClose={() => setImageViewerIndex(null)}
        title={
          imageViewerIndex !== null &&
          conversation.imageData &&
          conversation.imageData.length > 1
            ? `Image ${imageViewerIndex + 1} of ${conversation.imageData.length}`
            : "Image"
        }
        sizeClassName="max-w-3xl"
      >
        <div className="p-4">
          <div className="flex items-center justify-center bg-gray-900 rounded-xl min-h-[50vh] overflow-hidden">
            {imageViewerIndex !== null &&
              conversation.imageData?.[imageViewerIndex] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={conversation.imageData[imageViewerIndex]}
                  alt={`Attached image ${imageViewerIndex + 1}`}
                  className="max-w-full max-h-[65vh] object-contain rounded-lg"
                />
              )}
          </div>

          {conversation.imageData && conversation.imageData.length > 1 && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                onClick={() =>
                  setImageViewerIndex((prev) =>
                    prev !== null ? Math.max(0, prev - 1) : prev,
                  )
                }
                disabled={imageViewerIndex === 0}
                title="Previous image"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-xs text-gray-500">
                {(imageViewerIndex ?? 0) + 1} / {conversation.imageData.length}
              </span>
              <button
                onClick={() =>
                  setImageViewerIndex((prev) =>
                    prev !== null
                      ? Math.min(conversation.imageData!.length - 1, prev + 1)
                      : prev,
                  )
                }
                disabled={
                  imageViewerIndex !== null &&
                  imageViewerIndex >= conversation.imageData.length - 1
                }
                title="Next image"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition disabled:opacity-40 disabled:pointer-events-none"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </BSModal>
      </div>
    </div>
  );
}

export default BSChatConversationView;
