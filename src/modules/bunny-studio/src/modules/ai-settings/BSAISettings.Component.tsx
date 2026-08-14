/**
 * BSAISettings.Component — UI for configuring the global AI provider + model
 * and the AI-based speech-to-text (STT) provider, model, language, and
 * endpoint override.
 *
 * Renders a form that lets the user pick a HelixAI provider and model, plus
 * the STT provider/model/language/endpoint used for server transcription.
 * Saved settings persist to IndexedDB and are consumed by chat via the
 * useBSAISettings() hook. The browser vs AI mic engine toggle lives on the
 * Configurations page. Individual chats and agents can override these global
 * settings.
 */

"use client";

import React, { useState } from "react";
import { Card, Button } from "@heroui/react";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ImagePlus,
  Clapperboard,
  AudioLines,
} from "lucide-react";
import {
  HELIX_PROVIDER_LABELS,
  HELIX_AI_MODELS,
  HELIX_STT_MODELS,
  HELIX_STT_PROVIDERS,
  HELIX_PROVIDER_IMAGE_MODELS,
  HELIX_IMAGE_MODELS,
  HELIX_PROVIDER_VIDEO_MODELS,
  HELIX_VIDEO_MODELS,
  HELIX_PROVIDER_SPEECH_MODELS,
  HELIX_SPEECH_MODELS,
  getHelixSpeechVoices,
  HELIX_SPEECH_RESPONSE_FORMATS,
  HELIX_SPEECH_SAMPLE_RATES,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import type { HelixSpeechResponseFormat } from "@/src/modules/helix";
import { useBSAISettings } from "./BSAISettings.Context";
import type {
  BSAIImageSettings,
  BSTTSSettings,
  BSVideoSettings,
} from "./BSAISettings.Types";

// ─── Save status ──────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "success" | "error";

// ─── Component ────────────────────────────────────────────────────────────

export function BSAISettingsComponent() {
  const {
    aiConfig,
    speech,
    imageConfig,
    videoConfig,
    ttsConfig,
    loading,
    saveAISettings,
    saveSpeechSettings,
    saveImageSettings,
    saveVideoSettings,
    saveTTSSettings,
  } = useBSAISettings();

  const [provider, setProvider] = useState<HelixAIProvider>(aiConfig.provider);
  const [model, setModel] = useState<string>(aiConfig.model);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // ── Speech-to-text (AI) form state ────────────────────────────────────────
  const [sttProvider, setSttProvider] = useState<HelixAIProvider>(
    speech.sttProvider,
  );
  const [sttModel, setSttModel] = useState<string>(speech.sttModel);
  const [sttLanguage, setSttLanguage] = useState<string>(speech.sttLanguage);
  const [sttEndpoint, setSttEndpoint] = useState<string>(speech.sttEndpoint);
  const [sttSaveStatus, setSttSaveStatus] = useState<SaveStatus>("idle");
  const [sttErrorMessage, setSttErrorMessage] = useState<string>("");

  // ── Image generation (AI) form state ─────────────────────────────────────
  const [imageProvider, setImageProvider] = useState<HelixAIProvider>(
    imageConfig.provider,
  );
  const [imageModel, setImageModel] = useState<string>(imageConfig.model);
  const [imageSaveStatus, setImageSaveStatus] = useState<SaveStatus>("idle");
  const [imageErrorMessage, setImageErrorMessage] = useState<string>("");

  // ── Video generation (AI) form state ─────────────────────────────────────
  const [videoProvider, setVideoProvider] = useState<HelixAIProvider>(
    videoConfig.provider,
  );
  const [videoModel, setVideoModel] = useState<string>(videoConfig.model);
  const [videoSaveStatus, setVideoSaveStatus] = useState<SaveStatus>("idle");
  const [videoErrorMessage, setVideoErrorMessage] = useState<string>("");

  // ── Speech generation (TTS) form state ────────────────────────────────────
  const [ttsProvider, setTtsProvider] = useState<HelixAIProvider>(ttsConfig.provider);
  const [ttsModel, setTtsModel] = useState<string>(ttsConfig.model);
  const [ttsVoice, setTtsVoice] = useState<string>(ttsConfig.voice);
  const [ttsFormat, setTtsFormat] = useState<HelixSpeechResponseFormat>(ttsConfig.format);
  const [ttsSampleRate, setTtsSampleRate] = useState<number>(ttsConfig.sampleRate);
  const [ttsSaveStatus, setTtsSaveStatus] = useState<SaveStatus>("idle");
  const [ttsErrorMessage, setTtsErrorMessage] = useState<string>("");

  // Track the last-seen context value so we can sync local form state when it
  // loads/changes, using React's render-time adjustment pattern.
  const [prevConfig, setPrevConfig] = useState(aiConfig);
  const [prevSpeech, setPrevSpeech] = useState(speech);
  const [prevImage, setPrevImage] = useState<BSAIImageSettings>(imageConfig);
  const [prevVideo, setPrevVideo] = useState<BSVideoSettings>(videoConfig);
  const [prevTTS, setPrevTTS] = useState<BSTTSSettings>(ttsConfig);

  if (aiConfig !== prevConfig) {
    setPrevConfig(aiConfig);
    setProvider(aiConfig.provider);
    setModel(aiConfig.model);
  }

  if (speech !== prevSpeech) {
    setPrevSpeech(speech);
    setSttProvider(speech.sttProvider);
    setSttModel(speech.sttModel);
    setSttLanguage(speech.sttLanguage);
    setSttEndpoint(speech.sttEndpoint);
  }

  if (imageConfig !== prevImage) {
    setPrevImage(imageConfig);
    setImageProvider(imageConfig.provider);
    setImageModel(imageConfig.model);
  }

  if (videoConfig !== prevVideo) {
    setPrevVideo(videoConfig);
    setVideoProvider(videoConfig.provider);
    setVideoModel(videoConfig.model);
  }

  if (ttsConfig !== prevTTS) {
    setPrevTTS(ttsConfig);
    setTtsProvider(ttsConfig.provider);
    setTtsModel(ttsConfig.model);
    setTtsVoice(ttsConfig.voice);
    setTtsFormat(ttsConfig.format);
    setTtsSampleRate(ttsConfig.sampleRate);
  }

  // Available models for the currently selected provider
  const availableModels = HELIX_AI_MODELS[provider] ?? [];
  const providerKeys = (Object.keys(
    HELIX_PROVIDER_LABELS,
  ) as HelixAIProvider[]).filter((k) => k !== "default");

  // When the provider changes, auto-select the first available model
  const handleProviderChange = (newProvider: HelixAIProvider) => {
    setProvider(newProvider);
    const models = HELIX_AI_MODELS[newProvider];
    if (models && models.length > 0) {
      setModel(models[0]);
    }
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    setErrorMessage("");

    try {
      await saveAISettings({ provider, model });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save settings",
      );
    }
  };

  // ── Speech-to-text (AI) handlers ─────────────────────────────────────

  // STT providers that expose at least one selectable model
  const sttProviderKeys = HELIX_STT_PROVIDERS;
  const sttModels = HELIX_STT_MODELS[sttProvider] ?? [];

  // When the STT provider changes, auto-select the first STT model
  const handleSttProviderChange = (newProvider: HelixAIProvider) => {
    setSttProvider(newProvider);
    const models = HELIX_STT_MODELS[newProvider];
    if (models && models.length > 0) {
      setSttModel(models[0]);
    }
  };

  const handleSaveStt = async () => {
    setSttSaveStatus("saving");
    setSttErrorMessage("");

    try {
      await saveSpeechSettings({
        ...speech,
        sttProvider,
        sttModel,
        sttLanguage: sttLanguage.trim(),
        sttEndpoint: sttEndpoint.trim(),
      });
      setSttSaveStatus("success");
      setTimeout(() => setSttSaveStatus("idle"), 2000);
    } catch (err) {
      setSttSaveStatus("error");
      setSttErrorMessage(
        err instanceof Error ? err.message : "Failed to save STT settings",
      );
    }
  };

  // ── Image generation (AI) handlers ──────────────────────────────────

  // Only providers with a populated image model collection are offered.
  const imageProviderKeys = (
    Object.keys(HELIX_PROVIDER_IMAGE_MODELS) as HelixAIProvider[]
  ).filter((k) => k !== "default");
  const imageModels = HELIX_IMAGE_MODELS[imageProvider] ?? [];

  // When the image provider changes, auto-select the first available model.
  const handleImageProviderChange = (newProvider: HelixAIProvider) => {
    setImageProvider(newProvider);
    const models = HELIX_IMAGE_MODELS[newProvider];
    if (models && models.length > 0) {
      setImageModel(models[0]);
    }
  };

  const handleSaveImage = async () => {
    setImageSaveStatus("saving");
    setImageErrorMessage("");

    try {
      await saveImageSettings({ provider: imageProvider, model: imageModel });
      setImageSaveStatus("success");
      setTimeout(() => setImageSaveStatus("idle"), 2000);
    } catch (err) {
      setImageSaveStatus("error");
      setImageErrorMessage(
        err instanceof Error ? err.message : "Failed to save image settings",
      );
    }
  };

  // ── Video generation (AI) handlers ────────────────────────────────

  // Only providers with a populated video model collection are offered.
  const videoProviderKeys = (
    Object.keys(HELIX_PROVIDER_VIDEO_MODELS) as HelixAIProvider[]
  ).filter((k) => k !== "default");
  const videoModels = HELIX_VIDEO_MODELS[videoProvider] ?? [];

  // When the video provider changes, auto-select the first available model.
  const handleVideoProviderChange = (newProvider: HelixAIProvider) => {
    setVideoProvider(newProvider);
    const models = HELIX_VIDEO_MODELS[newProvider];
    if (models && models.length > 0) {
      setVideoModel(models[0]);
    }
  };

  const handleSaveVideo = async () => {
    setVideoSaveStatus("saving");
    setVideoErrorMessage("");

    try {
      await saveVideoSettings({ provider: videoProvider, model: videoModel });
      setVideoSaveStatus("success");
      setTimeout(() => setVideoSaveStatus("idle"), 2000);
    } catch (err) {
      setVideoSaveStatus("error");
      setVideoErrorMessage(
        err instanceof Error ? err.message : "Failed to save video settings",
      );
    }
  };

  // ── Speech generation (TTS) handlers ────────────────────────────────

  // Only providers with a populated speech model collection are offered.
  const ttsProviderKeys = (
    Object.keys(HELIX_PROVIDER_SPEECH_MODELS) as HelixAIProvider[]
  ).filter((k) => k !== "default");
  const ttsModels = HELIX_SPEECH_MODELS[ttsProvider] ?? [];
  const ttsBuiltInVoices = getHelixSpeechVoices(ttsModel);

  // When the TTS provider changes, auto-select the first available model + voice.
  const handleTtsProviderChange = (newProvider: HelixAIProvider) => {
    setTtsProvider(newProvider);
    const models = HELIX_SPEECH_MODELS[newProvider];
    if (models && models.length > 0) {
      setTtsModel(models[0]);
      setTtsVoice(getHelixSpeechVoices(models[0])[0] ?? "");
    }
  };

  const handleTtsModelChange = (newModel: string) => {
    setTtsModel(newModel);
    setTtsVoice(getHelixSpeechVoices(newModel)[0] ?? "");
  };

  const handleSaveTts = async () => {
    setTtsSaveStatus("saving");
    setTtsErrorMessage("");

    try {
      await saveTTSSettings({
        provider: ttsProvider,
        model: ttsModel,
        voice: ttsVoice,
        format: ttsFormat,
        sampleRate: ttsSampleRate,
      });
      setTtsSaveStatus("success");
      setTimeout(() => setTtsSaveStatus("idle"), 2000);
    } catch (err) {
      setTtsSaveStatus("error");
      setTtsErrorMessage(
        err instanceof Error ? err.message : "Failed to save speech settings",
      );
    }
  };

  // ── Loading state ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Settings</h1>
          <p className="text-gray-500 mt-1">
            Choose the default AI provider and model, plus the AI-based
            speech-to-text provider, model, language, and endpoint override.
            Individual chats and agents can override these global settings. The
            browser/AI mic engine toggle lives under Configurations.
          </p>
        </div>

        {/* Provider + Model Selection */}
        <Card className="p-6 border-none shadow-sm">
          <div className="space-y-6">
            {/* Provider Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) =>
                  handleProviderChange(e.target.value as HelixAIProvider)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {providerKeys.map((key) => (
                  <option key={key} value={key}>
                    {HELIX_PROVIDER_LABELS[key]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The AI backend used for Bunny AI Studio conversations.
              </p>
            </div>

            {/* Model Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {availableModels.length === 0 && (
                  <option value="">No models available</option>
                )}
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The specific model to use with the selected provider.
              </p>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3">
              <Button
                onPress={handleSave}
                isDisabled={saveStatus === "saving"}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6"
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </Button>

              {saveStatus === "success" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" /> {errorMessage}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Speech-to-Text (AI) settings — provider, model, language, and
            endpoint override. The browser vs AI engine toggle lives on the
            Configurations page. */}
        <Card className="p-6 border-none shadow-sm">
          <div className="space-y-6">
            {/* STT Provider Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                STT Provider
              </label>
              <select
                value={sttProvider}
                onChange={(e) =>
                  handleSttProviderChange(e.target.value as HelixAIProvider)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {sttProviderKeys.map((key) => (
                  <option key={key} value={key}>
                    {HELIX_PROVIDER_LABELS[key] ?? key}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The provider that exposes an OpenAI-compatible transcription
                endpoint.
              </p>
            </div>

            {/* STT Model Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                STT Model
              </label>
              <select
                value={sttModel}
                onChange={(e) => setSttModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {sttModels.length === 0 && (
                  <option value="">No models available</option>
                )}
                {sttModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The model used to transcribe audio (e.g. whisper-1).
              </p>
            </div>

            {/* STT Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language (optional)
              </label>
              <input
                value={sttLanguage}
                onChange={(e) => setSttLanguage(e.target.value)}
                placeholder="e.g. en or en-US"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                BCP-47 language hint for better recognition accuracy.
              </p>
            </div>

            {/* STT Endpoint Override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                STT Endpoint Override (optional)
              </label>
              <input
                value={sttEndpoint}
                onChange={(e) => setSttEndpoint(e.target.value)}
                placeholder="https://… — leave empty to use the provider default"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Some providers (e.g. Ollama Cloud) serve transcription from a
                different endpoint than chat.
              </p>
            </div>

            {/* Save STT */}
            <div className="flex items-center gap-3">
              <Button
                onPress={handleSaveStt}
                isDisabled={saveStatus === "saving" || sttSaveStatus === "saving"}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6"
              >
                {sttSaveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save STT Settings
                  </>
                )}
              </Button>

              {sttSaveStatus === "success" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </span>
              )}
              {sttSaveStatus === "error" && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" /> {sttErrorMessage}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Image Generation (AI) settings — provider + model used by the
            Image Generator module (OpenAI-compatible image endpoint). */}
        <Card className="p-6 border-none shadow-sm">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-semibold text-gray-900">
                Image Generation
              </h2>
            </div>
            <p className="text-xs text-gray-400 -mt-3">
              The provider + model used by the Image Generator to create AI
              images via an OpenAI-compatible image endpoint.
            </p>

            {/* Image Provider Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image AI Provider
              </label>
              <select
                value={imageProvider}
                onChange={(e) =>
                  handleImageProviderChange(e.target.value as HelixAIProvider)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {imageProviderKeys.map((key) => (
                  <option key={key} value={key}>
                    {HELIX_PROVIDER_LABELS[key] ?? key}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The AI backend used to generate images.
              </p>
            </div>

            {/* Image Model Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Model
              </label>
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {imageModels.length === 0 && (
                  <option value="">No models available</option>
                )}
                {imageModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The specific image model to use with the selected provider.
              </p>
            </div>

            {/* Save Image Settings */}
            <div className="flex items-center gap-3">
              <Button
                onPress={handleSaveImage}
                isDisabled={imageSaveStatus === "saving"}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6"
              >
                {imageSaveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Image Settings
                  </>
                )}
              </Button>

              {imageSaveStatus === "success" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </span>
              )}
              {imageSaveStatus === "error" && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" /> {imageErrorMessage}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Video Generation (AI) settings — provider + model used by the
            Video Generator module (submit → poll → download video endpoint). */}
        <Card className="p-6 border-none shadow-sm">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Clapperboard className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-semibold text-gray-900">
                Video Generation
              </h2>
            </div>
            <p className="text-xs text-gray-400 -mt-3">
              The provider + model used by the Video Generator to create AI
              videos via the SiliconFlow async submit → poll → download
              endpoint.
            </p>

            {/* Video Provider Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video AI Provider
              </label>
              <select
                value={videoProvider}
                onChange={(e) =>
                  handleVideoProviderChange(e.target.value as HelixAIProvider)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {videoProviderKeys.map((key) => (
                  <option key={key} value={key}>
                    {HELIX_PROVIDER_LABELS[key] ?? key}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The AI backend used to generate videos.
              </p>
            </div>

            {/* Video Model Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video Model
              </label>
              <select
                value={videoModel}
                onChange={(e) => setVideoModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {videoModels.length === 0 && (
                  <option value="">No models available</option>
                )}
                {videoModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The specific video model to use with the selected provider.
              </p>
            </div>

            {/* Save Video Settings */}
            <div className="flex items-center gap-3">
              <Button
                onPress={handleSaveVideo}
                isDisabled={videoSaveStatus === "saving"}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6"
              >
                {videoSaveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Video Settings
                  </>
                )}
              </Button>

              {videoSaveStatus === "success" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </span>
              )}
              {videoSaveStatus === "error" && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" /> {videoErrorMessage}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Speech Generation (TTS) settings — provider + model + voice + format
            used by the Speech Generator module (text-to-speech endpoint). */}
        <Card className="p-6 border-none shadow-sm">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <AudioLines className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-semibold text-gray-900">
                Speech Generation
              </h2>
            </div>
            <p className="text-xs text-gray-400 -mt-3">
              The provider + model + voice + format used by the Speech Generator
              to synthesize spoken audio via the SiliconFlow text-to-speech
              endpoint.
            </p>

            {/* Speech Provider Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speech AI Provider
              </label>
              <select
                value={ttsProvider}
                onChange={(e) =>
                  handleTtsProviderChange(e.target.value as HelixAIProvider)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {ttsProviderKeys.map((key) => (
                  <option key={key} value={key}>
                    {HELIX_PROVIDER_LABELS[key] ?? key}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The AI backend used to generate speech.
              </p>
            </div>

            {/* Speech Model Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speech Model
              </label>
              <select
                value={ttsModel}
                onChange={(e) => handleTtsModelChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {ttsModels.length === 0 && (
                  <option value="">No models available</option>
                )}
                {ttsModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The specific speech model to use with the selected provider.
              </p>
            </div>

            {/* Speech Voice Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice
              </label>
              <select
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
                disabled={ttsBuiltInVoices.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white disabled:opacity-50"
              >
                <option value="">Model default</option>
                {ttsBuiltInVoices.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The built-in voice used to synthesize the audio.
              </p>
            </div>

            {/* Speech Format Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Format
              </label>
              <select
                value={ttsFormat}
                onChange={(e) =>
                  setTtsFormat(e.target.value as HelixSpeechResponseFormat)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {HELIX_SPEECH_RESPONSE_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f.toUpperCase()}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The audio output format (mp3, opus, wav, pcm).
              </p>
            </div>

            {/* Speech Sample Rate Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sample Rate
              </label>
              <select
                value={ttsSampleRate}
                onChange={(e) => setTtsSampleRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                <option value={0}>Model default</option>
                {HELIX_SPEECH_SAMPLE_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}Hz
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The output sample rate (0 = model default).
              </p>
            </div>

            {/* Save Speech Settings */}
            <div className="flex items-center gap-3">
              <Button
                onPress={handleSaveTts}
                isDisabled={ttsSaveStatus === "saving"}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6"
              >
                {ttsSaveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Speech Settings
                  </>
                )}
              </Button>

              {ttsSaveStatus === "success" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </span>
              )}
              {ttsSaveStatus === "error" && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" /> {ttsErrorMessage}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Priority note */}
        <Card className="p-4 border-none shadow-sm bg-red-50">
          <p className="text-sm text-red-700">
            <strong>Priority (least → most):</strong> Global AI Settings → Agent
            AI Settings → Conversation AI Settings → Input AI Settings. Leave a
            field empty to inherit from the next lower level.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default BSAISettingsComponent;
