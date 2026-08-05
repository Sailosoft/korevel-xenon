// BSChat.Input.STTButton — Presentational speech-to-text mic button.
//
// Renders the microphone toggle for the builtin Web Speech API
// SpeechRecognition (feature: STT / builtin web SpeechRecognition). The button
// is hidden entirely when the browser does not support recognition. While
// listening it becomes a pulsing red stop button.

"use client";

import React from "react";
import { Mic, Square } from "lucide-react";

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSChatInputSTTButtonProps {
  /** True when the browser supports SpeechRecognition */
  supported: boolean;
  /** True while recognition is running */
  listening: boolean;
  /** Latest recognition error ("" when none) — shown as a tooltip */
  error?: string;
  /** Disable the button (e.g. while a stream is in progress) */
  disabled?: boolean;
  /** Start listening */
  onStart: () => void;
  /** Stop listening */
  onStop: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────

export function BSChatInputSTTButton({
  supported,
  listening,
  error = "",
  disabled = false,
  onStart,
  onStop,
}: BSChatInputSTTButtonProps) {
  if (!supported) return null;

  const title = listening
    ? "Stop voice input"
    : error
      ? `Voice input error: ${error}`
      : "Start voice input";

  return (
    <button
      type="button"
      onClick={listening ? onStop : onStart}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex items-center justify-center w-8 h-8 rounded-xl transition shrink-0 ${
        listening
          ? "bg-red-600 text-white animate-pulse shadow-sm"
          : disabled
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-400 hover:text-red-600 hover:bg-red-50"
      }`}
    >
      {listening ? (
        <Square className="w-3.5 h-3.5" />
      ) : (
        <Mic className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export default BSChatInputSTTButton;
