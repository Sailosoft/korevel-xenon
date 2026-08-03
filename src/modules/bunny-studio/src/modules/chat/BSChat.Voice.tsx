// BSChat.Voice — Voice / text-to-speech settings for Bunny AI Studio Chat.
//
// Implements feature requests:
//  - Voice Settings: select a browser speech voice (if available & supported).
//  - Auto TTS toggle: automatically read assistant messages aloud.
//  - TTS Markdown fix: strip markdown symbols before reading (read plain text).
//
// Voice preference + auto-TTS flag are persisted to localStorage so they survive
// reloads. The list of voices comes from the Web Speech API (`speechSynthesis`).

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ─── Constants ─────────────────────────────────────────────────────────────

const BS_VOICE_STORAGE_KEY = "bs.voice.uri";
const BS_AUTO_TTS_STORAGE_KEY = "bs.voice.autoTTS";

// ─── Markdown stripping (feature: TextToSpeech Markdown Issue) ─────────────

/**
 * Strip markdown/formatting symbols from text so TTS reads plain words instead
 * of symbols like `#`, `*`, backticks, links, images, tables, etc.
 */
export function stripMarkdownForSpeech(text: string): string {
  if (!text) return "";
  let out = text;
  // Code fences (```lang ... ```) and inline code (`...`)
  out = out
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1");
  // Images ![alt](url) → alt
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Links [text](url) → text
  out = out.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // HTML tags
  out = out.replace(/<[^>]+>/g, " ");
  // Headings markers, bold/italic/underline/strike markers, blockquotes, lists
  out = out
    .replace(/[#>*_~|`\-]/g, " ")
    .replace(/\[(x| )\]/g, " checked ")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

// ─── Context type ──────────────────────────────────────────────────────────

/** Per-chat TTS override applied on top of the global (localStorage) settings. */
export interface BSVoiceOverride {
  voiceURI?: string;
  autoTTS?: boolean;
}

export interface BSVoiceContextValue {
  /** True when the browser supports the Web Speech API */
  ttsSupported: boolean;
  /** Voices exposed by the browser (empty when unsupported / not loaded yet) */
  voices: SpeechSynthesisVoice[];
  /** Global selected voice URI ("" = browser default) — set in Configurations */
  voiceURI: string;
  /** Select a voice by its URI (global setting) */
  setVoiceURI: (uri: string) => void;
  /** Global auto-read flag (set in Configurations) */
  autoTTS: boolean;
  /** Toggle global auto-TTS */
  setAutoTTS: (value: boolean) => void;
  /** Per-chat override applied on top of the global settings (null = none) */
  override: BSVoiceOverride | null;
  /** Set / clear the per-chat TTS override (feature: per-chat TTS) */
  setOverride: (override: BSVoiceOverride | null) => void;
  /** Effective voice URI — per-chat override wins over the global setting */
  effectiveVoiceURI: string;
  /** Effective auto-TTS — per-chat override wins over the global setting */
  effectiveAutoTTS: boolean;
  /** Read a plain-text string aloud, returning false when not supported */
  speakText: (text: string, onEnd?: () => void) => boolean;
  /** Stop any in-progress speech */
  stopSpeaking: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────

const BSVoiceContext = createContext<BSVoiceContextValue | null>(null);

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

// ─── Provider ──────────────────────────────────────────────────────────────

export function BSVoiceProvider({ children }: { children: ReactNode }) {
  const ttsSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURIState] = useState<string>(() =>
    readStorage(BS_VOICE_STORAGE_KEY),
  );
  const [autoTTS, setAutoTTSState] = useState<boolean>(
    () => readStorage(BS_AUTO_TTS_STORAGE_KEY) === "1",
  );
  // Per-chat TTS override (feature: per-chat TTS settings).
  const [override, setOverrideState] = useState<BSVoiceOverride | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const voiceURIRef = useRef<string>(voiceURI);
  const autoTTSRef = useRef<boolean>(autoTTS);
  const overrideRef = useRef<BSVoiceOverride | null>(override);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Effective values — per-chat override wins over the global setting.
  const effectiveVoiceURI = override?.voiceURI ?? voiceURI;
  const effectiveAutoTTS = override?.autoTTS ?? autoTTS;

  // Load voices (onvoiceschanged fires when the voice list becomes available).
  useEffect(() => {
    if (!ttsSupported) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) {
        voicesRef.current = list;
        setVoices(list);
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [ttsSupported]);

  const setVoiceURI = useCallback((uri: string) => {
    setVoiceURIState(uri);
    voiceURIRef.current = uri;
    writeStorage(BS_VOICE_STORAGE_KEY, uri);
  }, []);

  const setAutoTTS = useCallback((value: boolean) => {
    setAutoTTSState(value);
    autoTTSRef.current = value;
    writeStorage(BS_AUTO_TTS_STORAGE_KEY, value ? "1" : "0");
  }, []);

  const setOverride = useCallback((next: BSVoiceOverride | null) => {
    setOverrideState(next);
    overrideRef.current = next;
  }, []);

  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    activeUtteranceRef.current = null;
  }, [ttsSupported]);

  const speakText = useCallback(
    (text: string, onEnd?: () => void): boolean => {
      if (!ttsSupported || !text.trim()) return false;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text));
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      // Prefer the effective voice (per-chat override wins over global);
      // otherwise fall back to the first voice.
      const effectiveURI =
        overrideRef.current?.voiceURI ?? voiceURIRef.current;
      const selected = voicesRef.current.find(
        (v) => v.voiceURI === effectiveURI,
      );
      utterance.voice =
        selected ||
        voicesRef.current.find((v) =>
          v.name.toLowerCase().includes("google us english"),
        ) ||
        voicesRef.current[0];
      const finish = () => {
        activeUtteranceRef.current = null;
        onEnd?.();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    },
    [ttsSupported],
  );

  // Cancel any speech when the provider unmounts.
  useEffect(
    () => () => {
      if (ttsSupported) window.speechSynthesis.cancel();
    },
    [ttsSupported],
  );

  return (
    <BSVoiceContext.Provider
      value={{
        ttsSupported,
        voices,
        voiceURI,
        setVoiceURI,
        autoTTS,
        setAutoTTS,
        override,
        setOverride,
        effectiveVoiceURI,
        effectiveAutoTTS,
        speakText,
        stopSpeaking,
      }}
    >
      {children}
    </BSVoiceContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useBSVoice(): BSVoiceContextValue {
  const ctx = useContext(BSVoiceContext);
  if (!ctx) {
    throw new Error("useBSVoice must be used within a BSVoiceProvider");
  }
  return ctx;
}
