// bui.book-chapter.speech.ts
//
// Mobile-safe text-to-speech helpers for the Bunny AI chapter reader.
//
// The Web Speech API is unreliable on mobile browsers when used naively:
//  - Android Chrome drops the first utterance when `cancel()` runs immediately
//    before `speak()`, and stops long utterances after ~15 seconds.
//  - iOS Safari needs the engine unlocked from a user gesture and truncates
//    very long utterances.
//  - Devices without an installed English voice stay silent when only
//    `utterance.lang` is set.
//
// The helpers below mirror the proven approach in bunny-studio's chat voice:
// unlock on gesture, resume, load/select a voice, never cancel-before-speak,
// and split long text into sentence-sized chunks.

const DEFAULT_CHUNK_LENGTH = 180;
const RESUME_WATCHDOG_MS = 10000;
const START_HINT_MS = 1500;

let speechUnlocked = false;
let cachedVoices: SpeechSynthesisVoice[] = [];

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Strip markdown/formatting so the engine reads plain words, not symbols. */
export function stripMarkdownForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/---+/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hardSplit(text: string, maxLength: number): string[] {
  const pieces: string[] = [];
  let rest = text;
  while (rest.length > maxLength) {
    let cut = rest.lastIndexOf(" ", maxLength);
    if (cut <= 0) cut = maxLength;
    const piece = rest.slice(0, cut).trim();
    if (piece) pieces.push(piece);
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

/**
 * Split text into sentence-sized chunks. Mobile speech engines stop long
 * utterances, so every chunk stays below `maxLength` characters without
 * splitting words.
 */
export function splitIntoSpeechChunks(
  text: string,
  maxLength = DEFAULT_CHUNK_LENGTH,
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences =
    normalized.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [normalized];
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) {
      chunks.push(current);
      current = "";
    }
  };

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    if (sentence.length > maxLength) {
      pushCurrent();
      chunks.push(...hardSplit(sentence, maxLength));
      continue;
    }

    if (!current) {
      current = sentence;
    } else if (current.length + 1 + sentence.length <= maxLength) {
      current += ` ${sentence}`;
    } else {
      pushCurrent();
      current = sentence;
    }
  }

  pushCurrent();
  return chunks;
}

/**
 * Prime the speech engine from a user gesture. Chrome/Edge and iOS Safari can
 * otherwise drop the first utterance queued on a fresh page load.
 */
export function unlockSpeechSynthesis(): void {
  if (speechUnlocked || !isSpeechSupported()) return;
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

/** Warm the voice list and keep it fresh when the browser loads voices late. */
export function primeVoiceList(onChange?: () => void): () => void {
  if (!isSpeechSupported()) return () => {};
  const synth = window.speechSynthesis;
  const load = () => {
    const list = synth.getVoices();
    if (list.length > 0) {
      cachedVoices = list;
      onChange?.();
    }
  };
  load();
  synth.addEventListener("voiceschanged", load);
  return () => synth.removeEventListener("voiceschanged", load);
}

/** Prefer an installed local English voice; fall back to any English voice. */
export function getPreferredVoice(): SpeechSynthesisVoice | undefined {
  if (!isSpeechSupported()) return undefined;
  const synth = window.speechSynthesis;
  const loaded = synth.getVoices();
  if (loaded.length > 0) cachedVoices = loaded;
  const voices = loaded.length > 0 ? loaded : cachedVoices;
  const english = voices.filter((voice) =>
    voice.lang?.toLowerCase().startsWith("en"),
  );
  return english.find((voice) => voice.localService) ?? english[0];
}

export interface SpeakChunksOptions {
  text: string;
  rate?: number;
  onStart?: () => void;
  onChunk?: (index: number, total: number) => void;
  onEnd?: () => void;
  onError?: (reason: string) => void;
}

export interface SpeechSession {
  cancel: () => void;
}

/**
 * Speak text as queued sentence chunks. Returns a session handle for stopping
 * playback, or null when speech is unsupported or the text is empty.
 */
export function speakChunks(options: SpeakChunksOptions): SpeechSession | null {
  if (!isSpeechSupported()) {
    options.onError?.("unsupported");
    return null;
  }

  const chunks = splitIntoSpeechChunks(options.text);
  if (chunks.length === 0) {
    options.onError?.("empty");
    return null;
  }

  const synth = window.speechSynthesis;
  // Only cancel when something is actually queued. Calling cancel() right
  // before the first speak() is a known trigger for the utterance being
  // dropped on a freshly loaded engine.
  if (synth.speaking || synth.pending) synth.cancel();
  // Unlock after cancelling so the priming utterance is not cancelled too.
  unlockSpeechSynthesis();
  synth.resume();

  const voice = getPreferredVoice();
  let cancelled = false;
  let started = false;
  let failed = false;
  let watchdog: ReturnType<typeof setInterval> | null = null;
  let startTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = () => {
    if (watchdog) {
      clearInterval(watchdog);
      watchdog = null;
    }
    if (startTimer) {
      clearTimeout(startTimer);
      startTimer = null;
    }
  };

  const session: SpeechSession = {
    cancel() {
      if (cancelled) return;
      cancelled = true;
      clearTimers();
      synth.cancel();
    },
  };

  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = options.rate ?? 1;
    utterance.pitch = 1;
    if (voice) {
      utterance.voice = voice;
    } else {
      utterance.lang = "en-US";
    }

    utterance.onstart = () => {
      if (cancelled) return;
      if (!started) {
        started = true;
        if (startTimer) {
          clearTimeout(startTimer);
          startTimer = null;
        }
        options.onStart?.();
        // Android Chrome sometimes pauses a long queue; nudge it periodically.
        watchdog = setInterval(() => {
          if (!cancelled) synth.resume();
        }, RESUME_WATCHDOG_MS);
      }
      options.onChunk?.(index, chunks.length);
    };

    utterance.onend = () => {
      if (cancelled) return;
      if (index === chunks.length - 1) {
        clearTimers();
        options.onEnd?.();
      }
    };

    utterance.onerror = (event) => {
      if (cancelled) return;
      const reason = event.error;
      if (reason === "interrupted" || reason === "canceled") {
        clearTimers();
        return;
      }
      failed = true;
      cancelled = true;
      clearTimers();
      synth.cancel();
      options.onError?.(reason);
    };

    synth.speak(utterance);
  });

  if (!started && !failed) {
    startTimer = setTimeout(() => {
      if (cancelled || started || failed) return;
      session.cancel();
      options.onError?.("start-timeout");
    }, START_HINT_MS);
  }

  return session;
}
