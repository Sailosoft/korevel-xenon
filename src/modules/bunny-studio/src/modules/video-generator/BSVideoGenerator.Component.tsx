// BSVideoGenerator.Component — AI Video Generator page for Bunny AI Studio.
//
// Composes:
//  - A prompt editor + Helix video provider/model/size selection (video config
//    defaults come from the global AI Settings → Video Generation section).
//  - An optional image upload for image-to-video models (Wan2.2-I2V-A14B) which
//    is sent as a base64 data URL to `/api/bunny-studio/video/generate`.
//  - Generation via the server route (server-side provider keys, submit → poll
//    → download orchestrated by the Helix video adapter).
//  - A cinematic, animated "directing" overlay while the video is rendering.
//  - The Video Library grid below so every result is instantly browsable,
//    playable, downloadable, and deletable.

"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  Sparkles,
  WandSparkles,
  AlertCircle,
  Rabbit,
  ArrowRight,
  Film,
  ImagePlus,
  Upload,
  X,
} from "lucide-react";
import {
  HELIX_PROVIDER_LABELS,
  HELIX_PROVIDER_VIDEO_MODELS,
  HELIX_VIDEO_MODELS,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import { useBSAISettings } from "../ai-settings/BSAISettings.Context";
import { useBSVideoGenerator } from "./BSVideoGenerator.Hooks";
import { BSVideoLibrary } from "./BSVideoLibrary.Component";
import { BSVideoCard } from "./BSVideoCard";
import { BS_VIDEO_SIZES } from "./BSVideoGenerator.Types";
import type { BSVideoSize } from "./BSVideoGenerator.Types";

// Rotating status phrases shown while generating.
const GENERATING_PHRASES = [
  "Directing your scene…",
  "Framing the shot…",
  "Rendering the frames…",
  "Adding motion…",
  "Polishing the cut…",
  "Almost there…",
];

const SELECT_STYLE =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white";

// ─── Component ──────────────────────────────────────────────────────────

export function BSVideoGeneratorComponent() {
  const { videoConfig } = useBSAISettings();
  const { state, generate } = useBSVideoGenerator();

  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<HelixAIProvider>(
    videoConfig.provider,
  );
  const [model, setModel] = useState<string>(videoConfig.model);
  const [size, setSize] = useState<BSVideoSize>("1280x720");
  // Base64 data URL for image-to-video models (Wan2.2-I2V-A14B).
  const [image, setImage] = useState<string>("");
  // Bumped after each successful generation so the Video Library grid reloads.
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  // Rotating status phrase index + a local "tick" to re-trigger animations.
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [prevVideo, setPrevVideo] = useState(videoConfig);
  const phraseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local provider/model when the global video settings change.
  if (videoConfig !== prevVideo) {
    setPrevVideo(videoConfig);
    setProvider(videoConfig.provider);
    setModel(videoConfig.model);
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

  // Only providers with video models are offered.
  const providerKeys = (
    Object.keys(HELIX_PROVIDER_VIDEO_MODELS) as HelixAIProvider[]
  ).filter((p) => p !== "default");
  const modelsForProvider = HELIX_VIDEO_MODELS[provider] ?? [];

  // Image-to-video models require an uploaded image.
  const isImageToVideo = model.includes("I2V");

  const handleProviderChange = (value: string) => {
    const p = value as HelixAIProvider;
    setProvider(p);
    setModel(HELIX_VIDEO_MODELS[p]?.[0] ?? "");
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    // Switching to a T2V model clears the image requirement.
    if (!value.includes("I2V")) setImage("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Normalize to a "data:image/*;base64,XXX" string.
      setImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || state.status === "generating") return;
    const assets = await generate({
      prompt: prompt.trim(),
      provider,
      model,
      size,
      ...(isImageToVideo && image ? { image } : {}),
    });
    // A successful generation saves to the library — tell it to reload so the
    // freshly produced video appears immediately.
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
              Video Generator
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 text-[11px] font-medium px-2.5 py-0.5">
                <Sparkles className="w-3 h-3" /> AI
              </span>
            </h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              Bring your words to life. Generated videos are saved to your Video
              Library.
            </p>
          </div>
        </div>

        {/* Generator panel */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 space-y-4">
            {/* Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void handleGenerate();
                  }
                }}
                rows={4}
                placeholder="e.g. A cyberpunk rabbit astronaut floating above a neon-red city, cinematic lighting, slow dolly shot"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Press Ctrl/⌘ + Enter to generate.
              </p>
            </div>

            {/* Provider / Model / Size */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Video AI Provider
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
                  Size
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as BSVideoSize)}
                  className={SELECT_STYLE}
                >
                  {BS_VIDEO_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Image upload — optional, only offered for image-to-video models */}
            {isImageToVideo && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Source Image (optional)
                </label>
                {image ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt="Source"
                      className="h-24 w-24 rounded-lg object-cover border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImage("");
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      title="Remove image"
                      className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-gray-900 text-white w-6 h-6 shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-red-400 hover:text-red-600 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload an image to animate
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Optional. When provided, the image is sent as a base64 data
                  URL to the image-to-video model.
                </p>
              </div>
            )}

            {/* Generate */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 transition-colors shadow-sm"
              >
                <WandSparkles className="w-4 h-4" />
                {generating ? "Generating…" : "Generate Video"}
                {!generating && <ArrowRight className="w-4 h-4" />}
              </button>
              <a
                href="/modules/bunny-studio/video-library"
                className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                <Film className="w-4 h-4" />
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

          {/* Result stage — cinematic overlay while generating, results after */}
          <div className="border-t border-gray-100">
            {generating ? (
              <div className="bs-img-gen-stage relative overflow-hidden">
                {/* aurora + core glow handled by ::before/::after in CSS */}
                <div className="bs-img-gen-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="bs-img-gen-core bs-bunny-face flex items-center justify-center text-white">
                    <Clapperboard className="w-8 h-8 bs-bunny-hop" />
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
                    “{prompt}”
                  </p>
                  <div className="bs-img-gen-progress w-64 max-w-full h-1.5 rounded-full overflow-hidden bg-white/10">
                    <span className="bs-img-gen-progress-bar block h-full w-1/3 rounded-full bg-gradient-to-r from-red-400 via-red-300 to-red-500" />
                  </div>
                  <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/40">
                    {HELIX_PROVIDER_LABELS[provider]} ·{" "}
                    {model.split("/").pop()} · {size}
                  </p>
                </div>
              </div>
            ) : state.status === "success" && state.videos.length > 0 ? (
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-red-500" />
                    Generated in {(state.elapsedMs / 1000).toFixed(1)}s
                    <span className="text-[11px] font-normal text-gray-400">
                      · saved to your Video Library
                    </span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {state.videos.map((vid) => (
                    <div key={vid.id} className="bs-img-reveal">
                      <BSVideoCard asset={vid} reveal="always" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                <ImagePlus className="w-9 h-9 mb-2 text-gray-300" />
                <p className="text-sm">
                  Your generated videos will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Library — compact preview of the newest 4 videos on the generator */}
        <BSVideoLibrary refreshKey={libraryRefreshKey} limit={4} />
      </div>
    </div>
  );
}

export default BSVideoGeneratorComponent;
