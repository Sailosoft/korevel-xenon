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

// ─── Bubble ───────────────────────────────────────────────────────────

export interface BSChatConversationViewProps {
  conversation: BSConversation;
  /** If true, this bubble is the currently-streaming assistant message */
  isStreaming?: boolean;
}

export function BSChatConversationView({
  conversation,
  isStreaming = false,
}: BSChatConversationViewProps) {
  const isUser = conversation.type === "user";
  const isSystem = conversation.type === "system";
  const { copied, copy } = useCopy();
  const {
    ttsSupported,
    speakText,
    stopSpeaking,
    effectiveAutoTTS,
  } = useBSVoice();

  const renderFormat: RenderFormat | undefined =
    conversation.contentType || "markdown";

  // Render toggle state only applies to assistant messages
  const [view, setView] = useState<"render" | "raw">("render");
  const showRenderToggle = !isUser && !isSystem;

  // "Open in editor" modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorValue, setEditorValue] = useState(conversation.content);

  // Local "is speaking" for the manual read-aloud toggle
  const [speaking, setSpeaking] = useState(false);

  const openEditor = () => {
    setEditorValue(conversation.content);
    setEditorOpen(true);
  };

  const handleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const started = speakText(conversation.content, () => setSpeaking(false));
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
      conversation.content &&
      ttsSupported
    ) {
      // Mark this bubble as speaking so the rainbow ring appears while the
      // message is actually being read aloud (feature: TTS bubble animation).
      const started = speakText(conversation.content, () => setSpeaking(false));
      if (started) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSpeaking(true);
      }
    }
  }, [isStreaming, effectiveAutoTTS, isUser, isSystem, conversation.content, ttsSupported, speakText]);

  // Stop speech when this bubble unmounts.
  useEffect(
    () => () => {
      if (speaking) stopSpeaking();
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
          <div className="relative w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center bs-beat bs-beat-color">
            <Rabbit className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Bubble — wrapped so a rainbow ring can surround it while speaking */}
      <div
        className={
          speaking ? "bs-speak-ring max-w-[85%]" : "max-w-[85%]"
        }
      >
      <div
        className={`${
          speaking ? "bs-speak-ring-inner " : ""
        }rounded-3xl px-4 py-3 text-sm shadow-sm ${
          isUser
            ? "bg-red-600 text-white rounded-br-lg"
            : "bg-white border border-gray-200 rounded-bl-lg text-gray-800"
        }`}
      >
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
                  title={speaking ? "Stop reading" : "Read aloud"}
                  className={`flex items-center justify-center w-6 h-6 rounded-md transition ${
                    speaking
                      ? "text-red-600 bg-red-50"
                      : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  {speaking ? (
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
          <div className="whitespace-pre-wrap break-words">{conversation.content}</div>
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
      </div>
    </div>
  );
}

export default BSChatConversationView;
