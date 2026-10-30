// bui.book-chapter.read-content.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Volume2, VolumeX, Copy } from "lucide-react";
import {
  isSpeechSupported,
  primeVoiceList,
  speakChunks,
  stripMarkdownForSpeech,
  type SpeechSession,
} from "./bui.book-chapter.speech";

interface BUIBookChapterReadContentModuleProps {
  content: string;
}

type SpeechStatus = "idle" | "starting" | "speaking" | "error";

interface SpeechProgress {
  index: number;
  total: number;
}

const AUDIO_HINT =
  "No audio started. Check your device's silent mode / media volume, or that a text-to-speech voice is installed.";

export default function BUIBookChapterReadContentModule({
  content,
}: BUIBookChapterReadContentModuleProps) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [hint, setHint] = useState<string | null>(null);
  const [progress, setProgress] = useState<SpeechProgress | null>(null);

  const sessionRef = useRef<SpeechSession | null>(null);
  const generationRef = useRef(0);

  const stopTextToSpeech = useCallback(() => {
    generationRef.current += 1;
    sessionRef.current?.cancel();
    sessionRef.current = null;
    setStatus("idle");
    setProgress(null);
  }, []);

  const handleTextToSpeech = () => {
    if (!isSpeechSupported()) {
      setStatus("error");
      setHint("Text to speech is not supported in this browser.");
      return;
    }

    if (status === "speaking" || status === "starting") {
      stopTextToSpeech();
      return;
    }

    const plainText = stripMarkdownForSpeech(content);
    if (!plainText) {
      setStatus("error");
      setHint("There is no text to read in this chapter.");
      return;
    }

    setHint(null);
    setProgress(null);
    setStatus("starting");
    generationRef.current += 1;
    const generation = generationRef.current;

    const session = speakChunks({
      text: plainText,
      onStart: () => {
        if (generation !== generationRef.current) return;
        setStatus("speaking");
      },
      onChunk: (index, total) => {
        if (generation !== generationRef.current) return;
        setProgress({ index: index + 1, total });
      },
      onEnd: () => {
        if (generation !== generationRef.current) return;
        sessionRef.current = null;
        setStatus("idle");
        setProgress(null);
      },
      onError: (reason) => {
        if (generation !== generationRef.current) return;
        sessionRef.current = null;
        setProgress(null);
        if (reason === "empty") {
          setStatus("error");
          setHint("There is no text to read in this chapter.");
          return;
        }
        if (reason === "interrupted" || reason === "canceled") {
          setStatus("idle");
          return;
        }
        setStatus("error");
        setHint(AUDIO_HINT);
      },
    });

    if (!session) {
      setStatus("error");
      setHint(AUDIO_HINT);
      return;
    }

    sessionRef.current = session;
  };

  // Warm the voice list so a voice is available on the first tap.
  useEffect(() => primeVoiceList(), []);

  // Stop speech when the component unmounts (e.g., modal closed).
  useEffect(() => {
    return () => {
      generationRef.current += 1;
      sessionRef.current?.cancel();
      sessionRef.current = null;
    };
  }, []);

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error("Failed to copy content:", error);
    }
  };

  const isBusy = status === "speaking" || status === "starting";

  return (
    <div className="flex h-full flex-col">
      {/* Toolbox */}
      <div className="mb-2 flex w-full flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={handleTextToSpeech}
          title={isBusy ? "Stop" : "Text to Speech"}
          aria-pressed={isBusy}
          className="flex items-center gap-1.5 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
        >
          {status === "speaking" ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : status === "starting" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
          {progress && status === "speaking" && (
            <span className="text-[10px] tabular-nums text-slate-500">
              {progress.index}/{progress.total}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={handleCopyContent}
          title="Copy Content"
          className="flex items-center gap-1.5 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        {hint && (
          <span className="text-[11px] leading-snug text-amber-600">
            {hint}
          </span>
        )}
      </div>
      <hr className="my-2 border-slate-200" />
      {/* Content */}
      <div className="flex-1 text-sm text-slate-800 leading-relaxed space-y-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-slate-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_a]:text-[#ff2d20] [&_a]:underline [&_img]:rounded-lg [&_img]:max-w-full [&_hr]:my-6 [&_hr]:border-slate-200 [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-xs [&_thead]:bg-slate-50 [&_th]:border [&_th]:border-slate-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_tr]:hover:bg-slate-50">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
