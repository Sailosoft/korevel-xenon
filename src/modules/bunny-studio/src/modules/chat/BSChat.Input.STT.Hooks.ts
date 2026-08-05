// BSChat.Input.STT.Hooks — Separated SpeechRecognition (speech-to-text) logic.
//
// Encapsulates the builtin Web Speech API `SpeechRecognition` (a.k.a.
// `webkitSpeechRecognition`) so the chat input stays a thin UI orchestrator.
// Concerns handled here (feature: STT / builtin web SpeechRecognition):
//  - Feature detection (Chrome/Edge expose `webkitSpeechRecognition`).
//  - Session lifecycle: start / stop / abort.
//  - Transcript accumulation: final segments are merged and committed on end,
//    interim (partial) segments are surfaced live for realtime feedback.
//  - Auto-stop: when no new speech is heard for `silenceTimeout` ms the session
//    stops and commits, so dictation ends naturally a few seconds after the
//    user stops talking (feature: seamless STT).
//  - Error surfacing (not-allowed, network, etc.) with benign outcomes
//    ("aborted", "no-speech") filtered out.
//  - Cleanup of any active session on unmount.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Minimal typings for the (still non-standard) Web Speech API ───────

/** A single recognition segment (SpeechRecognitionAlternative). */
export interface BSSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

/** A recognition result (SpeechRecognitionResult, can hold alternatives). */
export interface BSSpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: BSSpeechRecognitionAlternative;
}

/** The result event payload (subset of SpeechRecognitionEvent). */
export interface BSSpeechRecognitionResultEvent {
  readonly resultIndex: number;
  readonly results: ArrayLike<BSSpeechRecognitionResultLike>;
}

/** Minimal duck-typed SpeechRecognition instance. */
export interface BSSpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: BSSpeechRecognitionResultEvent) => void) | null;
}

type BSSpeechRecognitionCtor = new () => BSSpeechRecognitionLike;

/** The constructor exposed by the browser, if supported at all. */
function getRecognitionCtor(): BSSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: BSSpeechRecognitionCtor;
    webkitSpeechRecognition?: BSSpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ─── Constants ─────────────────────────────────────────────────────────

/** Default "stop listening" delay once the user stops talking. */
const DEFAULT_SILENCE_TIMEOUT = 6000;

// ─── Hook options / return ─────────────────────────────────────────────

export interface BSSpeechRecognitionOptions {
  /** BCP-47 language tag (defaults to the browser locale) */
  lang?: string;
  /** Keep listening across pauses (default: true) */
  continuous?: boolean;
  /** Report partial transcripts while speaking (default: true) */
  interimResults?: boolean;
  /** Auto-stop after this many ms of silence (default: 6000) */
  silenceTimeout?: number;
  /** Called once per session end with the accumulated transcript */
  onFinalTranscript?: (transcript: string) => void;
  /** Called live with the current partial transcript while speaking */
  onInterimTranscript?: (transcript: string) => void;
  /** Called when the recognizer reports an error */
  onError?: (error: string) => void;
}

export interface BSSpeechRecognitionResult {
  /** True when the browser exposes a SpeechRecognition implementation */
  supported: boolean;
  /** True while a recognition session is running */
  listening: boolean;
  /** Most recent error code ("" when none) */
  error: string;
  /** Live draft (committed finals + current interim) for the active session */
  transcript: string;
  /** Current partial (unfinished) transcript ("" when not listening) */
  interimTranscript: string;
  /** Start listening (no-op when unsupported or already listening) */
  start: () => void;
  /** Stop listening and commit the session's transcript */
  stop: () => void;
  /** Cancel listening without committing the transcript */
  abort: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useBSSpeechRecognition({
  lang,
  continuous = true,
  interimResults = true,
  silenceTimeout = DEFAULT_SILENCE_TIMEOUT,
  onFinalTranscript,
  onInterimTranscript,
  onError,
}: BSSpeechRecognitionOptions = {}): BSSpeechRecognitionResult {
  const supported = useMemo(() => getRecognitionCtor() !== null, []);

  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<BSSpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const abortedRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearSilenceTimer();
    recognitionRef.current?.stop();
  }, [clearSilenceTimer]);

  const abort = useCallback(() => {
    abortedRef.current = true;
    clearSilenceTimer();
    // Drop the live draft immediately so it is not re-committed once the
    // session ends (used when the user starts typing mid-dictation).
    setTranscript("");
    setInterimTranscript("");
    recognitionRef.current?.abort();
  }, [clearSilenceTimer]);

  const start = useCallback(() => {
    if (!supported || listening || recognitionRef.current) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    const defaultLang =
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "en-US";
    recognition.lang = lang || defaultLang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    finalTranscriptRef.current = "";
    abortedRef.current = false;
    clearSilenceTimer();
    setInterimTranscript("");
    setTranscript("");
    setError("");

    // Restart the silence timer: when it fires, no new speech has arrived for
    // `silenceTimeout` ms, so commit the draft and stop listening.
    const armSilenceTimer = () => {
      clearSilenceTimer();
      silenceTimerRef.current = window.setTimeout(() => {
        silenceTimerRef.current = null;
        recognitionRef.current?.stop();
      }, silenceTimeout);
    };

    recognition.onstart = () => {
      setListening(true);
      armSilenceTimer();
    };

    recognition.onend = () => {
      setListening(false);
      clearSilenceTimer();
      recognitionRef.current = null;
      setInterimTranscript("");
      if (!abortedRef.current) {
        const final = finalTranscriptRef.current.trim();
        if (final) onFinalTranscript?.(final);
      }
      setTranscript("");
    };

    recognition.onerror = (event) => {
      const message = event.error || "unknown";
      // "aborted" (we cancelled) and "no-speech" (user stayed silent) are
      // expected outcomes rather than errors worth surfacing.
      if (message === "aborted" || message === "no-speech") return;
      setError(message);
      onError?.(message);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const segment = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscriptRef.current += segment;
        } else {
          interim += segment;
        }
      }
      setInterimTranscript(interim);
      onInterimTranscript?.(interim);
      // Live draft = committed finals + current partial utterance.
      const draft = [finalTranscriptRef.current, interim]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" ");
      setTranscript(draft);
      // New speech detected — restart the silence timer.
      armSilenceTimer();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [
    supported,
    listening,
    continuous,
    interimResults,
    lang,
    silenceTimeout,
    onFinalTranscript,
    onInterimTranscript,
    onError,
    clearSilenceTimer,
  ]);

  // Cancel any active session on unmount.
  useEffect(
    () => () => {
      clearSilenceTimer();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    [clearSilenceTimer],
  );

  return {
    supported,
    listening,
    error,
    transcript,
    interimTranscript,
    start,
    stop,
    abort,
  };
}

export default useBSSpeechRecognition;
