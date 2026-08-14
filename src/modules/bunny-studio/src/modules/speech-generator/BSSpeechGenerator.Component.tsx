// BSSpeechGenerator.Component — AI Speech Generator page for Bunny AI Studio.
//
// Composes:
//  - A text editor + Helix speech provider/model/voice/format/sample-rate
//    selection (speech config defaults come from the global AI Settings →
//    Speech Generation section).
//  - An optional speed + gain tuning for the generated audio.
//  - Generation via the server route (server-side provider keys, text-to-speech
//    orchestrated by the Helix speech adapter).
//  - A cinematic, animated "recording" overlay while the audio is rendering.
//  - The Speech Library grid below so every result is instantly browsable,
//    listenable, downloadable, and deletable.
//
// Voices: built-in per-model voices come from the Helix speech config; the
// user's own custom voices are loaded from the provider's /audio/voice/list API
// and shown under "My Voices".

"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Sparkles,
  WandSparkles,
  AlertCircle,
  Rabbit,
  ArrowRight,
  Mic2,
  Loader2,
} from "lucide-react";
import {
  HELIX_PROVIDER_LABELS,
  HELIX_PROVIDER_SPEECH_MODELS,
  HELIX_SPEECH_MODELS,
  getHelixSpeechVoices,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import { useBSAISettings } from "../ai-settings/BSAISettings.Context";
import { useBSSpeechGenerator, useBSSpeechVoices } from "./BSSpeechGenerator.Hooks";
import { BSSpeechLibrary } from "./BSSpeechLibrary.Component";
import { BSSpeechCard } from "./BSSpeechCard";
import { BS_SPEECH_FORMATS, BS_SPEECH_SAMPLE_RATES } from "./BSSpeechGenerator.Types";
import type { BSSpeechFormat } from "./BSSpeechGenerator.Types";

// Rotating status phrases shown while generating.
const GENERATING_PHRASES = [
  "Casting your voice…",
  "Warming up the vocal cords…",
  "Speaking your words…",
  "Mastering the audio…",
  "Polishing the sound…",
  "Almost there…",
];

const SELECT_STYLE =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white";

// ─── Component ──────────────────────────────────────────────────────────

export function BSSpeechGeneratorComponent() {
  const { ttsConfig } = useBSAISettings();
  const { state, generate } = useBSSpeechGenerator();
  const { voices: customVoices, loading: voicesLoading } = useBSSpeechVoices();

  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<HelixAIProvider>(ttsConfig.provider);
  const [model, setModel] = useState<string>(ttsConfig.model);
  const [voice, setVoice] = useState<string>(ttsConfig.voice);
  const [format, setFormat] = useState<BSSpeechFormat>(ttsConfig.format);
  const [sampleRate, setSampleRate] = useState<number>(ttsConfig.sampleRate);
  const [speed, setSpeed] = useState<number>(1);
  const [gain, setGain] = useState<number>(0);
  // Bumped after each successful generation so the Speech Library grid reloads.
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  // Rotating status phrase index + a local "tick" to re-trigger animations.
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [prevTTS, setPrevTTS] = useState(ttsConfig);
  const phraseTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync local provider/model/voice when the global speech settings change.
  if (ttsConfig !== prevTTS) {
    setPrevTTS(ttsConfig);
    setProvider(ttsConfig.provider);
    setModel(ttsConfig.model);
    setVoice(ttsConfig.voice);
    setFormat(ttsConfig.format);
    setSampleRate(ttsConfig.sampleRate);
  }

  // Rotate the status phrase while generating.
  useEffect(() => {
    if (state.status === "generating") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhraseIdx(0);
      phraseTimer.current = setInterval(
        () => setPhraseIdx((i) => (i + 1) % GENERATING_PHRASES.length),
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

  // Only providers with speech models are offered.
  const providerKeys = (
    Object.keys(HELIX_PROVIDER_SPEECH_MODELS) as HelixAIProvider[]
  ).filter((p) => p !== "default");
  const modelsForProvider = HELIX_SPEECH_MODELS[provider] ?? [];
  const builtInVoices = getHelixSpeechVoices(model);

  const handleProviderChange = (value: string) => {
    const p = value as HelixAIProvider;
    setProvider(p);
    const firstModel = HELIX_SPEECH_MODELS[p]?.[0] ?? "";
    setModel(firstModel);
    setVoice(getHelixSpeechVoices(firstModel)[0] ?? "");
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    setVoice(getHelixSpeechVoices(value)[0] ?? "");
  };

  const handleGenerate = async () => {
    if (!input.trim() || state.status === "generating") return;
    const assets = await generate({
      input: input.trim(),
      provider,
      model,
      voice: voice || undefined,
      format,
      sampleRate: sampleRate || undefined,
      speed,
      gain,
    });
    // A successful generation saves to the library — tell it to reload so the
    // freshly produced audio appears immediately.
    if (assets.length > 0) {
      setLibraryRefreshKey((k) => k + 1);
    }
  };

  const generating = state.status === "generating";

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
              Speech Generator
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 text-[11px] font-medium px-2.5 py-0.5">
                <Sparkles className="w-3 h-3" /> AI
              </span>
            </h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              Turn text into spoken audio. Generated audio is saved to your
              Speech Library.
            </p>
          </div>
        </div>

        {/* Generator panel */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 space-y-4">
            {/* Input text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text to speak
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void handleGenerate();
                  }
                }}
                rows={4}
                placeholder="e.g. Hello! Welcome to Bunny AI Studio. I can read this out loud for you."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Press Ctrl/⌘ + Enter to generate.
              </p>
            </div>

            {/* Provider / Model / Voice */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Speech AI Provider
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
                  onChange={(e) => handleModelChange(e.target.value)}
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
                  Voice
                </label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  disabled={builtInVoices.length === 0 && customVoices.length === 0}
                  className={`${SELECT_STYLE} disabled:opacity-50`}
                >
                  <option value="">Model default</option>
                  {builtInVoices.length > 0 && (
                    <optgroup label="Built-in voices">
                      {builtInVoices.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {customVoices.length > 0 && (
                    <optgroup label="My voices">
                      {customVoices.map((v) => (
                        <option key={v.uri} value={v.uri}>
                          {v.customName} ({v.model.split("/").pop()})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {voicesLoading && (
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading custom voices…
                  </p>
                )}
              </div>
            </div>

            {/* Format / Sample rate / Speed / Gain */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as BSSpeechFormat)}
                  className={SELECT_STYLE}
                >
                  {BS_SPEECH_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Sample rate
                </label>
                <select
                  value={sampleRate}
                  onChange={(e) => setSampleRate(Number(e.target.value))}
                  className={SELECT_STYLE}
                >
                  <option value={0}>Model default</option>
                  {BS_SPEECH_SAMPLE_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}Hz
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Speed ({speed.toFixed(2)}×)
                </label>
                <input
                  type="range"
                  min={0.25}
                  max={4}
                  step={0.05}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full accent-red-500 mt-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Gain ({gain} dB)
                </label>
                <input
                  type="range"
                  min={-10}
                  max={10}
                  step={1}
                  value={gain}
                  onChange={(e) => setGain(Number(e.target.value))}
                  className="w-full accent-red-500 mt-2"
                />
              </div>
            </div>

            {/* Generate */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!input.trim() || generating}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 transition-colors shadow-sm"
              >
                <WandSparkles className="w-4 h-4" />
                {generating ? "Generating…" : "Generate Speech"}
                {!generating && <ArrowRight className="w-4 h-4" />}
              </button>
              <a
                href="/modules/bunny-studio/speech-library"
                className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                <Mic2 className="w-4 h-4" />
                View library
              </a>
            </div>

            {state.status === "error" && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}
          </div>

          {/* Result stage — animated overlay while generating, results after */}
          <div className="border-t border-gray-100">
            {generating ? (
              <div className="bs-img-gen-stage relative overflow-hidden">
                {/* aurora + core glow handled by ::before/::after in CSS */}
                <div className="bs-img-gen-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="bs-img-gen-core bs-bunny-face flex items-center justify-center text-white">
                    <AudioLines className="w-8 h-8 bs-bunny-hop" />
                  </div>
                </div>

                {/* floating particles */}
                <div className="bs-img-gen-orb bs-img-gen-orb-1" />
                <div className="bs-img-gen-orb bs-img-gen-orb-2" />
                <div className="bs-img-gen-orb bs-img-gen-orb-3" />

                <div className="relative z-10 flex flex-col items-center justify-center px-6 py-14 text-center">
                  <p className="bs-img-gen-shimmer text-lg font-semibold text-white mb-1.5">
                    {GENERATING_PHRASES[phraseIdx]}
                  </p>
                  <p className="text-xs text-white/50 mb-5 max-w-md line-clamp-2">
                    “{input}”
                  </p>
                  <div className="bs-img-gen-progress w-64 max-w-full h-1.5 rounded-full overflow-hidden bg-white/10">
                    <span className="bs-img-gen-progress-bar block h-full w-1/3 rounded-full bg-gradient-to-r from-red-400 via-red-300 to-red-500" />
                  </div>
                  <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/40">
                    {HELIX_PROVIDER_LABELS[provider]} ·{" "}
                    {model.split("/").pop()} ·{" "}
                    {voice || "default voice"} · {format.toUpperCase()}
                  </p>
                </div>
              </div>
            ) : state.status === "success" && state.speeches.length > 0 ? (
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-red-500" />
                    Generated in {(state.elapsedMs / 1000).toFixed(1)}s
                    <span className="text-[11px] font-normal text-gray-400">
                      · saved to your Speech Library
                    </span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {state.speeches.map((sp) => (
                    <div key={sp.id} className="bs-img-reveal">
                      <BSSpeechCard asset={sp} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                <AudioLines className="w-9 h-9 mb-2 text-gray-300" />
                <p className="text-sm">
                  Your generated speech will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Library — compact preview of the newest 4 audios on the generator */}
        <BSSpeechLibrary refreshKey={libraryRefreshKey} limit={4} />
      </div>
    </div>
  );
}

export default BSSpeechGeneratorComponent;
