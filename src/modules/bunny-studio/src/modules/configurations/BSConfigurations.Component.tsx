// BSConfigurations.Component — Studio configurations.
//
// Provides an overview of the app's AI provider configuration, the GLOBAL
// text-to-speech settings (voice + auto-TTS, feature), and quick links.
// Uses the red theme (feature: red theme instead of violet).

"use client";

import React from "react";
import { Card } from "@heroui/react";
import { Wrench, Cpu, KeyRound, FileText, Volume2, AudioLines } from "lucide-react";
import { useBSAISettings } from "../ai-settings/BSAISettings.Context";
import { useBSVoice } from "../chat/BSChat.Voice";
import Link from "next/link";

export function BSConfigurationsComponent() {
  const { aiConfig } = useBSAISettings();
  const { ttsSupported, voices, voiceURI, setVoiceURI, autoTTS, setAutoTTS } =
    useBSVoice();

  const items = [
    {
      icon: <Cpu className="w-4 h-4" />,
      title: "AI Provider & Model",
      value: `${aiConfig.provider} · ${aiConfig.model || "(none)"}`,
      href: "/modules/bunny-studio/ai-settings",
      action: "Configure",
    },
    {
      icon: <KeyRound className="w-4 h-4" />,
      title: "BYOK Streaming",
      value: "Vercel AI SDK v7 · OpenAI-compatible",
      href: "#",
      action: "Info",
    },
    {
      icon: <FileText className="w-4 h-4" />,
      title: "Documentation",
      value: "Read the module docs",
      href: "#",
      action: "Docs",
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurations</h1>
          <p className="text-gray-500 mt-1">
            Bunny AI Studio configuration overview.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <Card
              key={item.title}
              className="p-5 border-none shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 break-all">
                      {item.value}
                    </div>
                  </div>
                </div>
              </div>
              {item.href !== "#" ? (
                <Link
                  href={item.href}
                  className="inline-block mt-3 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  {item.action} →
                </Link>
              ) : (
                <div className="inline-block mt-3 text-xs font-medium text-gray-400">
                  {item.action}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Global Text-to-Speech settings (feature) — used as the default for
            every chat; individual chats may override these. */}
        <Card className="p-5 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-gray-800 text-sm">
                Text-to-Speech
              </div>
              <div className="text-xs text-gray-400">
                Global TTS defaults — chats inherit these unless overridden.
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Voice
              </label>
              {ttsSupported ? (
                <select
                  value={voiceURI}
                  onChange={(e) => setVoiceURI(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
                >
                  <option value="">Browser default</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] text-gray-400">
                  Text-to-speech is not supported by this browser.
                </p>
              )}
            </div>

            {ttsSupported && (
              <div>
                <label className="flex items-center justify-between gap-2 text-xs font-medium text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <AudioLines className="w-3.5 h-3.5" /> Auto Text-to-Speech
                  </span>
                  <button
                    role="switch"
                    aria-checked={autoTTS}
                    onClick={() => setAutoTTS(!autoTTS)}
                    className={`relative w-10 h-5 rounded-full transition ${
                      autoTTS ? "bg-red-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        autoTTS ? "left-[22px]" : "left-[2px]"
                      }`}
                    />
                  </button>
                </label>
                <p className="text-[10px] text-gray-400 mt-1">
                  Automatically read assistant messages aloud (plain text).
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 border-none shadow-sm bg-red-50">
          <div className="flex items-start gap-3">
            <Wrench className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-red-800 text-sm">
                AI Priority (least → most)
              </div>
              <p className="text-xs text-red-700 mt-1">
                AISettings (Global) → Agent AI Settings → Conversation AI
                Settings → Input AI Settings. Each level may override the one
                below it.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default BSConfigurationsComponent;
