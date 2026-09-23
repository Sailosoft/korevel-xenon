// bc.trainer.voice.tsx
//
// Text-to-speech for the BunnyCase Trainer. Provides a context provider
// (`BCVoiceProvider`) plus a hook (`useBCVoice`) wrapping the Web Speech API
// `speechSynthesis`. Supports role-specific voices: Actor 1 (the counterpart)
// and Actor 2 (the participant). Markdown symbols are stripped before
// speaking (feature: TextToSpeech).

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

/** Actor 1 = the counterpart (persona) voice; Actor 2 = the participant voice. */
export type BCSpeechRole = "actor1" | "actor2";

const BC_ACTOR1_VOICE_KEY = "bc.voice.actor1";
const BC_ACTOR2_VOICE_KEY = "bc.voice.actor2";
// Legacy keys kept so existing voice selections migrate automatically.
const BC_LEGACY_CUSTOMER_VOICE_KEY = "bc.voice.customer";
const BC_LEGACY_AGENT_VOICE_KEY = "bc.voice.agent";
const BC_AUTO_TTS_STORAGE_KEY = "bc.voice.autoTTS";

// ─── Markdown stripping (feature: TextToSpeech Markdown Issue) ─────────────

export function stripBCMarkdownForSpeech(text: string): string {
  if (!text) return "";
  let out = text;
  out = out
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~|`\-]/g, " ")
    .replace(/\[(x| )\]/g, " checked ")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

// ─── Context value ──────────────────────────────────────────────────────────

export interface BCVoiceContextValue {
  ttsSupported: boolean;
  voices: SpeechSynthesisVoice[];
  /** Actor 1 (counterpart) voice URI ("" = browser default) */
  actor1VoiceURI: string;
  /** Actor 2 (participant) voice URI ("" = browser default) */
  actor2VoiceURI: string;
  setActor1VoiceURI: (uri: string) => void;
  setActor2VoiceURI: (uri: string) => void;
  autoTTS: boolean;
  setAutoTTS: (value: boolean) => void;
  /** Speak with a specific role's configured voice. */
  speakRoleText: (
    role: BCSpeechRole,
    text: string,
    options?: { onStart?: () => void; onEnd?: () => void },
  ) => boolean;
  /** Backward-compatible speak (uses the Actor 1 voice). */
  speakText: (
    text: string,
    options?: { onStart?: () => void; onEnd?: () => void },
  ) => boolean;
  stopSpeaking: () => void;
}

const BCVoiceContext = createContext<BCVoiceContextValue | null>(null);

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

// Prime the speech engine on the first user gesture so auto-TTS isn't dropped.
let speechUnlocked = false;

function unlockSpeechSynthesis(): void {
  if (speechUnlocked || typeof window === "undefined") return;
  try {
    const synth = window.speechSynthesis;
    synth.resume();
    const priming = new SpeechSynthesisUtterance(" ");
    priming.volume = 0;
    synth.speak(priming);
    speechUnlocked = true;
  } catch {
    /* speech synthesis unavailable */
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function BCVoiceProvider({ children }: { children: ReactNode }) {
  const ttsSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [actor1VoiceURI, setActor1VoiceURIState] = useState<string>(
    () =>
      readStorage(BC_ACTOR1_VOICE_KEY) ||
      readStorage(BC_LEGACY_CUSTOMER_VOICE_KEY),
  );
  const [actor2VoiceURI, setActor2VoiceURIState] = useState<string>(
    () =>
      readStorage(BC_ACTOR2_VOICE_KEY) ||
      readStorage(BC_LEGACY_AGENT_VOICE_KEY),
  );
  const [autoTTS, setAutoTTSState] = useState<boolean>(
    () => readStorage(BC_AUTO_TTS_STORAGE_KEY) === "1",
  );
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const actor1VoiceURIRef = useRef<string>(actor1VoiceURI);
  const actor2VoiceURIRef = useRef<string>(actor2VoiceURI);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  const setActor1VoiceURI = useCallback((uri: string) => {
    setActor1VoiceURIState(uri);
    actor1VoiceURIRef.current = uri;
    writeStorage(BC_ACTOR1_VOICE_KEY, uri);
  }, []);

  const setActor2VoiceURI = useCallback((uri: string) => {
    setActor2VoiceURIState(uri);
    actor2VoiceURIRef.current = uri;
    writeStorage(BC_ACTOR2_VOICE_KEY, uri);
  }, []);

  const setAutoTTS = useCallback((value: boolean) => {
    setAutoTTSState(value);
    writeStorage(BC_AUTO_TTS_STORAGE_KEY, value ? "1" : "0");
  }, []);

  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    activeUtteranceRef.current = null;
  }, [ttsSupported]);

  const speakRoleText = useCallback(
    (
      role: BCSpeechRole,
      text: string,
      options?: { onStart?: () => void; onEnd?: () => void },
    ): boolean => {
      if (!ttsSupported || !text.trim()) return false;
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) synth.cancel();
      synth.resume();
      const utterance = new SpeechSynthesisUtterance(
        stripBCMarkdownForSpeech(text),
      );
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      const roleURI =
        role === "actor1"
          ? actor1VoiceURIRef.current
          : actor2VoiceURIRef.current;
      const selected =
        voicesRef.current.find((v) => v.voiceURI === roleURI) ||
        voicesRef.current.find((v) =>
          v.name.toLowerCase().includes("google us english"),
        );
      if (selected) utterance.voice = selected;
      const finish = () => {
        if (activeUtteranceRef.current === utterance) {
          activeUtteranceRef.current = null;
        }
        options?.onEnd?.();
      };
      utterance.onstart = () => options?.onStart?.();
      utterance.onend = finish;
      utterance.onerror = finish;
      activeUtteranceRef.current = utterance;
      synth.speak(utterance);
      return true;
    },
    [ttsSupported],
  );

  const speakText = useCallback(
    (text: string, options?: { onStart?: () => void; onEnd?: () => void }) =>
      speakRoleText("actor1", text, options),
    [speakRoleText],
  );

  useEffect(
    () => () => {
      if (ttsSupported) window.speechSynthesis.cancel();
    },
    [ttsSupported],
  );

  return (
    <BCVoiceContext.Provider
      value={{
        ttsSupported,
        voices,
        actor1VoiceURI,
        actor2VoiceURI,
        setActor1VoiceURI,
        setActor2VoiceURI,
        autoTTS,
        setAutoTTS,
        speakRoleText,
        speakText,
        stopSpeaking,
      }}
    >
      {children}
    </BCVoiceContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useBCVoice(): BCVoiceContextValue {
  const ctx = useContext(BCVoiceContext);
  if (!ctx) {
    throw new Error("useBCVoice must be used within a BCVoiceProvider");
  }
  return ctx;
}
