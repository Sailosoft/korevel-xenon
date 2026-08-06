// BSChat.Input.STT.Hooks — Separated SpeechRecognition (speech-to-text) logic.
//
// Encapsulates both speech-to-text engines so the chat input stays a thin UI
// orchestrator:
//  - "browser" — builtin Web Speech API `SpeechRecognition` (a.k.a.
//    `webkitSpeechRecognition`); on-device, free, live interim transcript.
//  - "ai" — records audio via MediaRecorder and transcribes it through the
//    `/api/bunny-studio/chat/transcribe` route (OpenAI-compatible provider).
//
// Shared concerns handled here (feature: STT / builtin web SpeechRecognition +
// AI-based STT):
//  - Feature detection per mode.
//  - Session lifecycle: start / stop / abort.
//  - Auto-stop: when no new speech is heard for `silenceTimeout` ms the session
//    stops and commits, so dictation ends naturally a few seconds after the
//    user stops talking (feature: seamless STT).
//  - Error surfacing with benign outcomes ("aborted", "no-speech") filtered.
//  - Cleanup of any active session on unmount.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BS_API_TOKEN_HEADER,
  getBSApiToken,
} from "../../BSApiSecurity";

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

/** Server endpoint that transcribes recorded audio (OpenAI-compatible). */
const STT_TRANSCRIBE_URL = "/api/bunny-studio/chat/transcribe";

/** Pick the best MediaRecorder mime type the browser supports. */
function pickAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

// ─── Hook options / return ─────────────────────────────────────────────

/** Which speech engine the mic uses. */
export type BSSpeechRecognitionMode = "browser" | "ai";

/** AI-mode settings forwarded to the transcription route. */
export interface BSAISpeechOptions {
  /** Helix provider key (e.g. "openai", "groq") */
  provider?: string;
  /** STT model id (e.g. "whisper-1") */
  model?: string;
  /** Optional BCP-47 language hint */
  language?: string;
  /** Optional STT base URL override (e.g. Ollama Cloud) */
  endpoint?: string;
}

export interface BSSpeechRecognitionOptions {
  /** "browser" = Web Speech API, "ai" = MediaRecorder + server transcription */
  mode?: BSSpeechRecognitionMode;
  /** BCP-47 language tag (browser mode; defaults to the browser locale) */
  lang?: string;
  /** Keep listening across pauses (browser mode; default: true) */
  continuous?: boolean;
  /** Report partial transcripts while speaking (browser mode; default: true) */
  interimResults?: boolean;
  /** Auto-stop after this many ms of silence (default: 6000) */
  silenceTimeout?: number;
  /** AI-mode provider/model/language/endpoint settings */
  ai?: BSAISpeechOptions;
  /** Called once per session end with the accumulated transcript */
  onFinalTranscript?: (transcript: string) => void;
  /** Called live with the current partial transcript while speaking */
  onInterimTranscript?: (transcript: string) => void;
  /** Called when the recognizer reports an error */
  onError?: (error: string) => void;
}

export interface BSSpeechRecognitionResult {
  /** True when the current mode is supported by the browser */
  supported: boolean;
  /** True while a recognition/recording session is running */
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
  mode = "browser",
  lang,
  continuous = true,
  interimResults = true,
  silenceTimeout = DEFAULT_SILENCE_TIMEOUT,
  ai,
  onFinalTranscript,
  onInterimTranscript,
  onError,
}: BSSpeechRecognitionOptions = {}): BSSpeechRecognitionResult {
  const supported = useMemo(() => {
    if (mode === "ai") {
      return (
        typeof window !== "undefined" &&
        typeof MediaRecorder !== "undefined" &&
        typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia)
      );
    }
    return getRecognitionCtor() !== null;
  }, [mode]);

  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [transcript, setTranscript] = useState("");

  // Browser mode
  const recognitionRef = useRef<BSSpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  // AI mode
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceLoopRef = useRef<number | null>(null);
  // Shared
  const abortedRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Stop the AI-mode silence-detection rAF loop and release its AudioContext.
  const stopSilenceDetection = useCallback(() => {
    if (silenceLoopRef.current !== null) {
      window.cancelAnimationFrame(silenceLoopRef.current);
      silenceLoopRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        void audioCtxRef.current.close();
      } catch {
        /* already closed */
      }
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearSilenceTimer();
    if (mode === "ai") {
      stopSilenceDetection();
      recorderRef.current?.stop();
    } else {
      recognitionRef.current?.stop();
    }
  }, [mode, clearSilenceTimer, stopSilenceDetection]);

  const abort = useCallback(() => {
    abortedRef.current = true;
    clearSilenceTimer();
    // Drop the live draft immediately so it is not re-committed once the
    // session ends (used when the user starts typing mid-dictation).
    setTranscript("");
    setInterimTranscript("");
    if (mode === "ai") {
      stopSilenceDetection();
      recorderRef.current?.stop();
    } else {
      recognitionRef.current?.abort();
    }
  }, [mode, clearSilenceTimer, stopSilenceDetection]);

  const start = useCallback(async () => {
    if (!supported || listening) return;

    // ── AI mode: MediaRecorder → silence detection → server transcription ──
    if (mode === "ai") {
      if (recorderRef.current) return;
      abortedRef.current = false;
      setError("");
      setTranscript("");
      setInterimTranscript("");
      const mimeType = pickAudioMimeType();

      // Post the recorded blob to the server route and commit the transcript.
      const transcribeBlob = async (blob: Blob) => {
        try {
          const form = new FormData();
          // Pick an extension matching the recorded container so providers
          // that sniff the filename (e.g. Groq) accept the upload.
          const ext = mimeType?.includes("mp4")
            ? "mp4"
            : mimeType?.includes("ogg")
              ? "ogg"
              : "webm";
          form.append("file", blob, `recording.${ext}`);
          form.append("provider", ai?.provider || "openai");
          form.append("model", ai?.model || "whisper-1");
          if (ai?.language) form.append("language", ai.language);
          if (ai?.endpoint) form.append("endpoint", ai.endpoint);
          const res = await fetch(STT_TRANSCRIBE_URL, {
            method: "POST",
            // Attach the frontend token like the other Bunny Studio routes
            // (the transcribe route validates it; leave Content-Type unset so
            // the browser sets the multipart boundary automatically).
            headers: {
              [BS_API_TOKEN_HEADER]: getBSApiToken() ?? "",
            },
            body: form,
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(
              data.error || `Transcription failed (${res.status})`,
            );
          }
          const data = (await res.json()) as { text?: string };
          const text = (data.text ?? "").trim();
          if (text) onFinalTranscript?.(text);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Transcription failed";
          setError(message);
          onError?.(message);
        }
      };

      // Auto-stop when the mic stays quiet for `silenceTimeout` ms.
      const setupSilenceDetection = (stream: MediaStream) => {
        try {
          const audioCtx = new AudioContext();
          audioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          analyserRef.current = analyser;
          const data = new Uint8Array(analyser.fftSize);
          let lastSound = Date.now();
          const loop = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            if (rms > 0.015) {
              lastSound = Date.now();
            } else if (Date.now() - lastSound >= silenceTimeout) {
              stopSilenceDetection();
              recorderRef.current?.stop();
              return;
            }
            silenceLoopRef.current = window.requestAnimationFrame(loop);
          };
          silenceLoopRef.current = window.requestAnimationFrame(loop);
        } catch {
          // Silence detection unavailable — rely on manual stop.
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        const recorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined,
        );
        streamRef.current = stream;
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          recorderRef.current = null;
          stopSilenceDetection();
          clearSilenceTimer();
          setListening(false);
          setInterimTranscript("");
          if (abortedRef.current) {
            setTranscript("");
            return;
          }
          const blob = new Blob(chunksRef.current, {
            type: mimeType || "audio/webm",
          });
          chunksRef.current = [];
          void transcribeBlob(blob);
        };

        setupSilenceDetection(stream);
        recorder.start();
        setListening(true);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.name === "NotAllowedError"
              ? "Microphone access denied"
              : err.message
            : "Could not start microphone";
        setError(message);
        onError?.(message);
      }
      return;
    }

    // ── Browser mode: builtin Web Speech API ─────────────────────────────
    if (recognitionRef.current) return;
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
    mode,
    lang,
    continuous,
    interimResults,
    silenceTimeout,
    ai,
    onFinalTranscript,
    onInterimTranscript,
    onError,
    clearSilenceTimer,
    stopSilenceDetection,
  ]);

  // Cancel any active session on unmount.
  useEffect(
    () => () => {
      clearSilenceTimer();
      stopSilenceDetection();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      streamRef.current = null;
    },
    [clearSilenceTimer, stopSilenceDetection],
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
