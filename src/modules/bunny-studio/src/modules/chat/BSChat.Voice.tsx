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
import { usePathname } from "next/navigation";

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
  /** Read a plain-text string aloud, returning false when not supported.
   *  `onStart` fires when the utterance truly begins; `onEnd` fires when it
   *  finishes or is interrupted (including when a newer utterance cancels it).
   *  Pass `key` (e.g. the conversation id) so `speakingKey` reports which
   *  bubble is being read aloud (fix: TTS ring animation survives remount).
   *  Pass `chatId` so the provider can stop the speech when the user leaves
   *  that chat (fix: closing the chat kept the TTS running). */
  speakText: (
    text: string,
    options?: {
      key?: string;
      chatId?: string;
      onStart?: () => void;
      onEnd?: () => void;
    },
  ) => boolean;
  /** Stop any in-progress speech */
  stopSpeaking: () => void;
  /**
   * Conversation (bubble) id currently being spoken aloud, or null when idle.
   * Kept on the provider so it survives the conversation-view remount that
   * happens when the first message navigates to the chat URL (fix: the auto-TTS
   * ring animation was removed early even though the audio kept playing).
   */
  speakingKey: string | null;
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

// ─── Speech engine unlock (fix: TTS aborts on first load) ──────────────────
//
// Chrome/Edge require a user gesture on the page before `speechSynthesis` will
// actually play audio. When auto-TTS calls speak() from a useEffect (no
// gesture), the first utterance is queued then immediately aborted — the
// bubble appears to "start speaking" then cuts out with no audio. We prime the
// engine (resume + a silent utterance) on the first user gesture so later
// speak() calls — including ones fired from effects — are not silently dropped.

let speechUnlocked = false;

function unlockSpeechSynthesis(): void {
  if (speechUnlocked || typeof window === "undefined") return;
  try {
    const synth = window.speechSynthesis;
    synth.resume();
    const priming = new SpeechSynthesisUtterance(" ");
    priming.volume = 0;
    priming.rate = 1;
    priming.pitch = 1;
    synth.speak(priming);
    speechUnlocked = true;
  } catch {
    /* speech synthesis unavailable */
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
  // Conversation (bubble) id of the utterance currently being spoken. Lives on
  // the provider (not the bubble) so the speaking animation survives the
  // conversation-view remount after the first-message chat navigation (fix).
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  // Chat id the utterance currently being spoken belongs to. Used to stop the
  // speech when the user navigates away from that chat (fix: closing the chat
  // kept the TTS running).
  const [speakingChatId, setSpeakingChatId] = useState<string | null>(null);
  // Pathname of the chat page we were on, so we can detect "leaving the chat".
  const pathname = usePathname();
  const prevPathChatIdRef = useRef<string | null>(null);

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

  // Prime/unlock the speech engine on the first user gesture so auto-TTS and
  // the first manual read don't get silently aborted on a fresh page load
  // (fix: TTS aborts on first load).
  useEffect(() => {
    if (!ttsSupported) return;
    const onGesture = () => unlockSpeechSynthesis();
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    window.addEventListener("touchstart", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("touchstart", onGesture);
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
    setSpeakingKey(null);
    setSpeakingChatId(null);
  }, [ttsSupported]);

  const speakText = useCallback(
    (
      text: string,
      options?: {
        key?: string;
        chatId?: string;
        onStart?: () => void;
        onEnd?: () => void;
      },
    ): boolean => {
      if (!ttsSupported || !text.trim()) return false;
      const synth = window.speechSynthesis;
      // Only cancel when something is actually queued/spoken. Calling cancel()
      // right before the very first speak() on a freshly loaded engine is a
      // known trigger for the utterance being dropped immediately (fix: TTS
      // aborts on first load).
      if (synth.speaking || synth.pending) synth.cancel();
      // Defensive: Chrome sometimes keeps the engine paused until a resume().
      synth.resume();
      const utterance = new SpeechSynthesisUtterance(
        stripMarkdownForSpeech(text),
      );
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      // Prefer the effective voice (per-chat override wins over global);
      // otherwise fall back to a Google US English voice.
      const effectiveURI =
        overrideRef.current?.voiceURI ?? voiceURIRef.current;
      const selected =
        voicesRef.current.find((v) => v.voiceURI === effectiveURI) ||
        voicesRef.current.find((v) =>
          v.name.toLowerCase().includes("google us english"),
        );
      // Only assign a voice when one is actually found. On first load the voice
      // list is still empty, and assigning `undefined` can trip the engine
      // before `onvoiceschanged` fires (fix: TTS aborts on first load).
      if (selected) utterance.voice = selected;
      const finish = () => {
        // Only clear the ref if this utterance is still the active one, so an
        // older overlapping utterance ending later can't clear a newer one.
        if (activeUtteranceRef.current === utterance) {
          activeUtteranceRef.current = null;
          // Clear the speaking animation only when this utterance is the one
          // still active (a newer utterance that cancelled it keeps its key).
          setSpeakingKey((prev) =>
            prev === options?.key ? null : prev,
          );
          setSpeakingChatId((prev) =>
            prev === options?.chatId ? null : prev,
          );
        }
        options?.onEnd?.();
      };
      utterance.onstart = () => {
        setSpeakingKey(options?.key ?? null);
        setSpeakingChatId(options?.chatId ?? null);
        options?.onStart?.();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      activeUtteranceRef.current = utterance;
      // Optimistically mark the key as speaking so the ring shows immediately,
      // even before onstart fires (which can lag on some engines).
      setSpeakingKey(options?.key ?? null);
      setSpeakingChatId(options?.chatId ?? null);
      synth.speak(utterance);
      return true;
    },
    [ttsSupported],
  );

  // Stop the TTS when the user navigates away from the chat that is being
  // spoken (closing the chat / switching chats / leaving to another page).
  // Auto-TTS speech survives the bubble unmount so the first-message navigation
  // to the chat URL doesn't cut it off — but it must NOT keep running after the
  // user actually leaves the chat (fix: closing the chat kept the TTS running).
  // Rule: only stop when we were previously ON the speaking chat's page and now
  // we are somewhere else. The first-message navigation goes FROM a non-chat
  // page TO the newly-created chat URL, so it never triggers this stop.
  useEffect(() => {
    if (!ttsSupported) return;
    const chatMatch = pathname?.match(
      /\/modules\/bunny-studio\/chat\/([^/]+)/,
    );
    const currentChatId = chatMatch ? chatMatch[1] : null;
    const prevChatId = prevPathChatIdRef.current;
    prevPathChatIdRef.current = currentChatId;
    if (
      speakingChatId &&
      prevChatId === speakingChatId &&
      currentChatId !== speakingChatId
    ) {
      stopSpeaking();
    }
  }, [pathname, speakingChatId, stopSpeaking, ttsSupported]);

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
        speakingKey,
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
