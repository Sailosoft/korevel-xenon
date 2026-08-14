// BSTranscription.Component — AI Transcription (speech-to-text) page for Bunny AI Studio.
//
// Composes:
//  - An audio file picker (with an inline preview player for the selected file).
//  - Helix transcription provider/model/language selection (transcription
//    models default from the Helix speech config → SiliconFlow).
//  - Transcription via the server route (server-side provider keys, audio
//    transcription orchestrated by the Helix speech adapter).
//  - A transcript result panel with Copy + Download (.txt) actions.
//  - The Transcription Library grid below so every result is instantly
//    browsable, re-listenable, downloadable, and deletable.

"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Mic2,
  Sparkles,
  WandSparkles,
  AlertCircle,
  Rabbit,
  Upload,
  X,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import {
  HELIX_PROVIDER_LABELS,
  HELIX_PROVIDER_TRANSCRIPTION_MODELS,
  HELIX_TRANSCRIPTION_MODELS,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import { useBSAISettings } from "../ai-settings/BSAISettings.Context";
import { useBSTranscription } from "./BSTranscription.Hooks";
import { BSTranscriptionLibrary } from "./BSTranscriptionLibrary.Component";
import { downloadText } from "./BSTranscriptionCard";

// Rotating status phrases shown while transcribing.
const TRANSCRIBING_PHRASES = [
  "Listening carefully…",
  "Decoding the audio…",
  "Extracting the words…",
  "Punctuating the sentence…",
  "Polishing the transcript…",
  "Almost there…",
];

const SELECT_STYLE =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white";

const ACCEPTED_AUDIO = "audio/*,video/webm,application/ogg";

/** Providers that expose at least one transcription model (excludes "default"). */
function getTranscriptionProviderKeys(): HelixAIProvider[] {
  return (
    Object.keys(HELIX_PROVIDER_TRANSCRIPTION_MODELS) as HelixAIProvider[]
  ).filter((k) => k !== "default");
}

// ─── Component ──────────────────────────────────────────────────────────

export function BSTranscriptionComponent() {
  const { speech } = useBSAISettings();
  const { state, transcribe } = useBSTranscription();

  const [file, setFile] = useState<File | null>(null);
  // Object URL used only for the local preview of the selected file.
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [provider, setProvider] = useState<HelixAIProvider>(() => {
    const keys = getTranscriptionProviderKeys();
    return keys.includes(speech.sttProvider)
      ? speech.sttProvider
      : (keys[0] ?? "siliconFlow");
  });
  const [model, setModel] = useState<string>(() => {
    const keys = getTranscriptionProviderKeys();
    const p = keys.includes(speech.sttProvider)
      ? speech.sttProvider
      : (keys[0] ?? "siliconFlow");
    const models = HELIX_TRANSCRIPTION_MODELS[p] ?? [];
    return models.includes(speech.sttModel) ? speech.sttModel : (models[0] ?? "");
  });
  const [language, setLanguage] = useState<string>(speech.sttLanguage);
  const [copied, setCopied] = useState(false);
  // Bumped after each successful transcription so the library grid reloads.
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  // Rotating status phrase index.
  const [phraseIdx, setPhraseIdx] = useState(0);
  const phraseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate the status phrase while transcribing.
  useEffect(() => {
    if (state.status === "transcribing") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhraseIdx(0);
      phraseTimer.current = setInterval(
        () => setPhraseIdx((i) => (i + 1) % TRANSCRIBING_PHRASES.length),
        1800,
      );
    } else {
      if (phraseTimer.current) clearInterval(phraseTimer.current);
      phraseTimer.current = null;
    }
    return () => {
      if (phraseTimer.current) clearInterval(phraseTimer.current);
    };
  }, [state.status]);

  // Only providers with transcription models are offered.
  const providerKeys = getTranscriptionProviderKeys();
  const modelsForProvider = HELIX_TRANSCRIPTION_MODELS[provider] ?? [];

  const handleProviderChange = (value: string) => {
    const p = value as HelixAIProvider;
    setProvider(p);
    setModel(HELIX_TRANSCRIPTION_MODELS[p]?.[0] ?? "");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    // Clean up the previous preview URL.
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
  };

  const clearFile = () => {
    setFile(null);
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTranscribe = async () => {
    if (!file || state.status === "transcribing") return;
    const assets = await transcribe({
      file,
      provider,
      model,
      language: language.trim() || undefined,
    });
    if (assets.length > 0) {
      setLibraryRefreshKey((k) => k + 1);
    }
  };

  const handleCopy = async () => {
    const text = state.transcripts[0]?.text ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const transcribing = state.status === "transcribing";
  const latestText = state.transcripts[0]?.text ?? "";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bs-bunny-face bs-beat w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0">
            <Rabbit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Transcription
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 text-[11px] font-medium px-2.5 py-0.5">
                <Sparkles className="w-3 h-3" /> AI
              </span>
            </h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              Turn spoken audio into text. Transcripts are saved to your
              Transcription Library.
            </p>
          </div>
        </div>

        {/* Transcribe panel */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 space-y-4">
            {/* File picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio file
              </label>
              {file ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <Mic2 className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        {file.name}
                      </span>
                      <span className="text-[11px] text-gray-400 shrink-0">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      title="Remove file"
                      className="flex items-center justify-center rounded-full bg-gray-900 text-white w-6 h-6 shadow shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {filePreviewUrl && (
                    <div className="mt-2">
                      <audio
                        src={filePreviewUrl}
                        controls
                        preload="metadata"
                        className="w-full h-10"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 hover:border-red-400 hover:text-red-600 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  Choose an audio file to transcribe
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_AUDIO}
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Supported formats depend on the transcription model (e.g. mp3,
                wav, m4a, webm, ogg).
              </p>
            </div>

            {/* Provider / Model / Language */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Transcription Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className={SELECT_STYLE}
                >
                  {providerKeys.map((p) => (
                    <option key={p} value={p}>
                      {HELIX_PROVIDER_LABELS[p] ?? p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={modelsForProvider.length === 0}
                  className={`${SELECT_STYLE} disabled:opacity-50`}
                >
                  {modelsForProvider.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Language (optional)
                </label>
                <input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. en or zh"
                  className={SELECT_STYLE}
                />
              </div>
            </div>

            {/* Transcribe */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTranscribe}
                disabled={!file || transcribing}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 transition-colors shadow-sm"
              >
                <WandSparkles className="w-4 h-4" />
                {transcribing ? "Transcribing…" : "Transcribe Audio"}
              </button>
            </div>

            {state.status === "error" && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}
          </div>

          {/* Result stage — animated overlay while transcribing, transcript after */}
          <div className="border-t border-gray-100">
            {transcribing ? (
              <div className="bs-img-gen-stage relative overflow-hidden">
                {/* aurora + core glow handled by ::before/::after in CSS */}
                <div className="bs-img-gen-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="bs-img-gen-core bs-bunny-face flex items-center justify-center text-white">
                    <Mic2 className="w-8 h-8 bs-bunny-hop" />
                  </div>
                </div>

                {/* floating particles */}
                <div className="bs-img-gen-orb bs-img-gen-orb-1" />
                <div className="bs-img-gen-orb bs-img-gen-orb-2" />
                <div className="bs-img-gen-orb bs-img-gen-orb-3" />

                <div className="relative z-10 flex flex-col items-center justify-center px-6 py-14 text-center">
                  <p className="bs-img-gen-shimmer text-lg font-semibold text-white mb-1.5">
                    {TRANSCRIBING_PHRASES[phraseIdx]}
                  </p>
                  <p className="text-xs text-white/50 mb-5 max-w-md line-clamp-2">
                    {file?.name}
                  </p>
                  <div className="bs-img-gen-progress w-64 max-w-full h-1.5 rounded-full overflow-hidden bg-white/10">
                    <span className="bs-img-gen-progress-bar block h-full w-1/3 rounded-full bg-gradient-to-r from-red-400 via-red-300 to-red-500" />
                  </div>
                  <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/40">
                    {HELIX_PROVIDER_LABELS[provider]} ·{" "}
                    {model.split("/").pop()}
                  </p>
                </div>
              </div>
            ) : state.status === "success" && latestText ? (
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-red-500" />
                    Transcribed in {(state.elapsedMs / 1000).toFixed(1)}s
                    <span className="text-[11px] font-normal text-gray-400">
                      · saved to your Transcription Library
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          latestText,
                          `transcript-${state.transcripts[0]?.id.slice(0, 8) ?? "latest"}.txt`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {latestText}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                <FileText className="w-9 h-9 mb-2 text-gray-300" />
                <p className="text-sm">Your transcript will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Library — compact preview of the newest 4 transcripts */}
        <BSTranscriptionLibrary refreshKey={libraryRefreshKey} limit={4} />
      </div>
    </div>
  );
}

export default BSTranscriptionComponent;
