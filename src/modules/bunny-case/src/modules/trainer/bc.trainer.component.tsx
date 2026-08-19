// bc.trainer.component.tsx
//
// Conversation Trainer — guided roleplay with a live feedback loop,
// speech-to-text input and text-to-speech for customer + agent messages
// (features: TextToSpeech / SpeechToText). Includes the "Trainer Option":
// a per-turn AI guide, validation of the trainee's draft (critique + guide),
// the ability to modify and re-validate, or send without the AI guide (#5).

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import {
  PlayCircle,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Check,
  X,
  Sparkles,
  Flag,
  Brain,
  ListChecks,
  AlertTriangle,
  RefreshCw,
  FilePlus2,
  ShieldCheck,
  History,
  Trash2,
  Loader2,
  Library,
  CheckCircle2,
} from "lucide-react";
import { useBCTrainer } from "./bc.trainer.hooks";
import { BCVoiceProvider, useBCVoice } from "./bc.trainer.voice";
import { useBCSpeechRecognition } from "./bc.trainer.input.stt.hooks";
import type { BCCaseMessage } from "./bc.trainer.entity";
import { BCGenAIOptionSelector } from "../generative-ai/bc.generative-ai.selector";
import {
  bcGenAIBubbleLabels,
  type BCGenAIBubbleLabels,
} from "../generative-ai/bc.generative-ai.entity";

function SpeakButton({
  role,
  text,
}: {
  role: "customer" | "agent";
  text: string;
}) {
  const { ttsSupported, speakRoleText } = useBCVoice();
  if (!ttsSupported || !text) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        speakRoleText(role, text);
      }}
      className={`p-1.5 rounded-lg transition-colors ${
        role === "customer"
          ? "text-rose-400 hover:text-rose-600 hover:bg-rose-50"
          : "text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
      }`}
      title={`Read ${role} message aloud`}
    >
      <Volume2 className="w-3.5 h-3.5" />
    </button>
  );
}

// Feature #9: a textarea that grows with its content so long drafts can be
// expanded instead of being trapped at a fixed height.
function BCAutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className = "",
  maxHeight = 240,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value, maxHeight]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      placeholder={placeholder}
      className={`flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[40px] ${className}`}
    />
  );
}

function TrainerContent() {
  const {
    personas,
    cases,
    personaId,
    caseId,
    sessionId,
    messages,
    draft,
    feedback,
    guide,
    critique,
    trainerOptionEnabled,
    aiOption,
    busy,
    error,
    resolved,
    history,
    sessionSummary,
    savedToLibrary,
    savingPlaybook,
    setPersonaId,
    setCaseId,
    setDraft,
    setTrainerOptionEnabled,
    setAiOption,
    start,
    submitDraft,
    validateDraft,
    revalidateDraft,
    sendWithoutGuide,
    acceptCorrection,
    overwriteCorrection,
    loadSession,
    deleteSession,
    clearHistory,
    saveToPlaybook,
    resolveCase,
    endSession,
    newThread,
  } = useBCTrainer();

  const { ttsSupported, autoTTS, setAutoTTS, speakRoleText } = useBCVoice();

  const bubbleLabels = bcGenAIBubbleLabels(aiOption);

  const stt = useBCSpeechRecognition({
    onFinalTranscript: (text) => {
      setDraft((prev) => [prev, text].filter(Boolean).join(" ").trim());
    },
  });

  // Auto-read the latest persona message aloud when auto-TTS is enabled.
  const lastPersonaRef = useRef<string>("");
  const lastPersona = [...messages].reverse().find((m) => m.role === "persona");
  useEffect(() => {
    if (!autoTTS || !ttsSupported) return;
    if (lastPersona && lastPersona.external !== lastPersonaRef.current) {
      lastPersonaRef.current = lastPersona.external;
      speakRoleText("customer", lastPersona.external);
    }
  }, [messages, lastPersona, autoTTS, ttsSupported, speakRoleText]);

  const started = sessionId != null;

  const [showHistory, setShowHistory] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Keep the `?trainerId=<id>` query parameter in sync with the currently
  // displayed trainer session so the user can go back to it (feature #6).
  const updateTrainerParam = useCallback((id: number | null) => {
    const url = new URL(window.location.href);
    if (id == null) {
      url.searchParams.delete("trainerId");
      url.searchParams.delete("historyId");
    } else {
      url.searchParams.set("trainerId", String(id));
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
          <PlayCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">
            Conversation Trainer
          </h1>
          <p className="text-sm text-slate-400">
            Practice with a safety net: the AI Trainer coaches each response.
          </p>
        </div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
            showHistory
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
          title="Trainer history"
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">History</span>
        </button>
        {ttsSupported && (
          <button
            onClick={() => setAutoTTS(!autoTTS)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
              autoTTS
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
            title="Toggle auto text-to-speech"
          >
            {autoTTS ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Auto-read</span>
          </button>
        )}
        {started && (
          <button
            onClick={newThread}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border text-slate-500 border-slate-200 hover:bg-slate-50"
            title="Start a new thread"
          >
            <FilePlus2 className="w-4 h-4" />
            <span className="hidden sm:inline">New Thread</span>
          </button>
        )}
      </div>

      {/* ── Trainer history panel (feature #6) ─────────────────────── */}
      {showHistory && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">
              Trainer history ({history.length})
            </div>
            {history.length > 0 && (
              <button
                onClick={async () => {
                  setClearing(true);
                  await clearHistory();
                  updateTrainerParam(null);
                  setClearing(false);
                }}
                disabled={clearing}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                {clearing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete all
              </button>
            )}
          </div>
          {history.length === 0 && (
            <p className="text-sm text-slate-400">
              No trainer sessions yet — start a guided roleplay to save one.
            </p>
          )}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {history.map((rec) => {
              const caseTitle =
                cases.find((c) => c.id === rec.caseId)?.title ?? "—";
              const personaName =
                personas.find((p) => p.id === rec.personaId)?.name ?? "—";
              return (
                <div
                  key={rec.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                    sessionId === rec.id
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => {
                      if (rec.id != null) {
                        updateTrainerParam(rec.id);
                        void loadSession(rec.id);
                      }
                    }}
                  >
                    <div className="text-sm font-medium text-slate-700 truncate">
                      Trainer #{rec.id} · {caseTitle}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {personaName} · {rec.status ?? "—"} ·{" "}
                      {rec.startedAt
                        ? new Date(rec.startedAt).toLocaleString()
                        : "—"}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (rec.id != null) {
                        void deleteSession(rec.id);
                        if (sessionId === rec.id) updateTrainerParam(null);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Trainer Option toggle ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-violet-500" />
          <div>
            <div className="text-sm font-semibold text-slate-700">
              Trainer Option
            </div>
            <div className="text-xs text-slate-400">
              Show the AI guide each turn and validate your response before
              sending. You can still send without the AI guide.
            </div>
          </div>
        </div>
        <button
          onClick={() => setTrainerOptionEnabled(!trainerOptionEnabled)}
          className={`shrink-0 relative w-12 h-6 rounded-full transition-colors ${
            trainerOptionEnabled ? "bg-violet-500" : "bg-slate-300"
          }`}
          title="Toggle Trainer Option"
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
              trainerOptionEnabled ? "left-6" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* ── Configuration / start ─────────────────────────────── */}
      {!started && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Persona
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={personaId ?? ""}
                onChange={(e) =>
                  setPersonaId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Select a persona…</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Case
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={caseId ?? ""}
                onChange={(e) =>
                  setCaseId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Select a case…</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <BCGenAIOptionSelector value={aiOption} onChange={setAiOption} />
          </div>
          <Button
            onPress={() => void start()}
            isDisabled={busy}
            className="w-full bg-emerald-600 text-white"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" color="current" />
                Starting…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                Start Guided Roleplay
              </span>
            )}
          </Button>
          <p className="text-xs text-slate-400">
            The persona opens the conversation. Draft a reply and the AI Trainer
            will coach you before you send it.
          </p>
        </div>
      )}

      {/* ── Conversation ──────────────────────────────────────── */}
      {started && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 min-h-[360px]">
            {messages.length === 0 && busy && (
              <div className="flex flex-col items-center gap-2 justify-center py-10">
                <Spinner color="success" size="lg" />
                <p className="text-sm text-slate-400">Persona is speaking…</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} labels={bubbleLabels} />
            ))}
            {messages.length === 0 && !busy && (
              <p className="text-center text-sm text-slate-400 py-10">
                Starting session…
              </p>
            )}
          </div>

          {/* ── Trainer Option: per-turn guide ─────────────────── */}
          {trainerOptionEnabled && guide && !critique && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-violet-700 font-semibold text-sm">
                <ListChecks className="w-4 h-4" /> {"This turn's guide"}
              </div>
              <p className="text-sm text-violet-900">
                <span className="font-semibold">Objective: </span>
                {guide.objective}
              </p>
              {guide.steps?.length > 0 && (
                <ol className="space-y-1">
                  {guide.steps.map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-violet-800"
                    >
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              )}
              {guide.pitfalls?.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-500">
                    <AlertTriangle className="w-3.5 h-3.5" /> Avoid
                  </div>
                  {guide.pitfalls.map((p, i) => (
                    <p
                      key={i}
                      className="text-xs text-violet-700 flex items-start gap-1.5"
                    >
                      <span>•</span> {p}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Trainer Option: critique card ──────────────────── */}
          {trainerOptionEnabled && critique && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-violet-700 font-semibold text-sm">
                <Sparkles className="w-4 h-4" /> AI Trainer validation
                <span className="ml-auto text-xs font-medium text-violet-500">
                  Score: {critique.score != null ? `${critique.score}/10` : "—"}
                </span>
              </div>
              {critique.strengths?.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-emerald-600 uppercase">
                    Strengths
                  </div>
                  {critique.strengths.map((s, i) => (
                    <p key={i} className="text-sm text-violet-900 flex gap-1.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {s}
                    </p>
                  ))}
                </div>
              )}
              {critique.improvements?.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-amber-600 uppercase">
                    Improve
                  </div>
                  {critique.improvements.map((im, i) => (
                    <p key={i} className="text-sm text-violet-900 flex gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      {im}
                    </p>
                  ))}
                </div>
              )}
              {critique.suggestion && (
                <div className="bg-white/60 border border-violet-200 rounded-xl px-3 py-2 text-sm text-violet-900">
                  <span className="font-semibold">Suggested: </span>
                  {critique.suggestion}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  onPress={() => void acceptCorrection()}
                  isDisabled={busy}
                  className="bg-violet-600 text-white"
                >
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Use Suggestion
                  </span>
                </Button>
                <Button
                  onPress={() => void sendWithoutGuide()}
                  isDisabled={busy}
                  variant="outline"
                  className="text-violet-700 border-violet-300"
                >
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send My Own (no guide)
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* ── Coach feedback card (legacy, non-option path) ──── */}
          {!trainerOptionEnabled && feedback && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-violet-700 font-semibold text-sm">
                <Sparkles className="w-4 h-4" /> AI Trainer coaching
                <span className="ml-auto text-xs font-medium text-violet-500">
                  Score: {feedback.score != null ? `${feedback.score}/10` : "—"}
                </span>
              </div>
              <p className="text-sm text-violet-900">
                <span className="font-semibold">Suggested:</span>{" "}
                {feedback.suggestion}
              </p>
              <p className="text-xs text-violet-700">
                <span className="font-semibold">{"Why it's better:"}</span>{" "}
                {feedback.reason}
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  onPress={() => void acceptCorrection()}
                  isDisabled={busy}
                  className="bg-violet-600 text-white"
                >
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Accept Correction
                  </span>
                </Button>
                <Button
                  onPress={() => void overwriteCorrection()}
                  isDisabled={busy}
                  variant="outline"
                  className="text-violet-700 border-violet-300"
                >
                  <span className="flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Overwrite (send my own)
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* ── Input ───────────────────────────────────────────── */}
          {!feedback && !critique && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex items-end gap-2">
              <button
                onClick={() => (stt.listening ? stt.stop() : stt.start())}
                disabled={!stt.supported}
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  stt.listening
                    ? "bg-red-500 text-white animate-pulse"
                    : stt.supported
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-slate-100 text-slate-300"
                }`}
                title={
                  stt.supported
                    ? "Speak your response (speech-to-text)"
                    : "Speech-to-text not supported in this browser"
                }
              >
                {stt.listening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
              <BCAutoResizeTextarea
                value={draft}
                onChange={setDraft}
                placeholder={
                  stt.transcript
                    ? stt.transcript
                    : "Type your response to the customer…"
                }
              />
              <div className="flex flex-col gap-1 shrink-0">
                {trainerOptionEnabled && (
                  <Button
                    onPress={() => void validateDraft()}
                    isDisabled={busy || !draft.trim()}
                    className="bg-violet-600 text-white"
                    size="sm"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Validate
                    </span>
                  </Button>
                )}
                <Button
                  // Feature #8: "Send (no guide)" must send the draft right
                  // away instead of running the validation function.
                  onPress={() =>
                    void (trainerOptionEnabled
                      ? sendWithoutGuide()
                      : submitDraft())
                  }
                  isDisabled={busy || !draft.trim()}
                  className="bg-emerald-600 text-white"
                  size="sm"
                >
                  {busy ? (
                    <Spinner size="sm" color="current" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      {trainerOptionEnabled ? "Send (no guide)" : "Send"}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── Modify & revalidate (when critique shown) ──────── */}
          {trainerOptionEnabled && critique && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex items-end gap-2">
              <BCAutoResizeTextarea
                value={draft}
                onChange={setDraft}
                placeholder="Modify your response and revalidate, or send it as-is…"
                className="focus:ring-violet-400"
              />
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  onPress={() => void revalidateDraft()}
                  isDisabled={busy || !draft.trim()}
                  className="bg-violet-600 text-white"
                  size="sm"
                >
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Revalidate
                  </span>
                </Button>
                <Button
                  onPress={() => void sendWithoutGuide()}
                  isDisabled={busy}
                  variant="outline"
                  className="text-slate-500 border-slate-200"
                  size="sm"
                >
                  <span className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* ── Session controls ────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onPress={() => void resolveCase()}
              className="bg-emerald-600 text-white"
            >
              <span className="flex items-center gap-2">
                <Flag className="w-4 h-4" />
                Resolve Case
              </span>
            </Button>
            <Button
              // Feature #11: archive this session to the Playbook Library.
              onPress={() => void saveToPlaybook()}
              isDisabled={savingPlaybook || messages.length === 0}
              variant="outline"
              className="text-slate-500 border-slate-200"
            >
              {savingPlaybook ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" color="current" />
                  Saving…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Library className="w-4 h-4" />
                  Save to Playbook
                </span>
              )}
            </Button>
            <Button
              onPress={() => void endSession()}
              isDisabled={busy}
              variant="outline"
              className="text-slate-500 border-slate-200"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" color="current" />
                  Reviewing…
                </span>
              ) : (
                "End Session"
              )}
            </Button>
          </div>

          {savedToLibrary && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Session saved to the Playbook Library.
            </div>
          )}
        </>
      )}

      {resolved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-700 text-sm font-medium">
          Case resolved — session completed. Review it in Sentiment Analytics
          and archive it to the Playbook Library.
        </div>
      )}

      {/* ── End-of-Session Review (feature #10) ─────────────────── */}
      {sessionSummary && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <Flag className="w-4 h-4 text-emerald-500" />
              End-of-Session Review
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 shrink-0">
              Score:{" "}
              {sessionSummary.score != null
                ? `${sessionSummary.score}/10`
                : "—"}
            </span>
          </div>
          <p className="text-sm text-slate-700">{sessionSummary.summary}</p>

          {sessionSummary.guide?.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Guide
              </div>
              <ol className="space-y-1.5">
                {sessionSummary.guide.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-600"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {sessionSummary.strengths?.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Strengths
              </div>
              {sessionSummary.strengths.map((s, i) => (
                <p key={i} className="text-sm text-slate-600 flex gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  {s}
                </p>
              ))}
            </div>
          )}

          {sessionSummary.missing?.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                {"What you're missing"}
              </div>
              {sessionSummary.missing.map((m, i) => (
                <p key={i} className="text-sm text-slate-600 flex gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  {m}
                </p>
              ))}
            </div>
          )}

          {!started && (
            <Button
              onPress={newThread}
              variant="outline"
              className="w-full text-slate-500 border-slate-200"
            >
              Start a New Session
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  labels,
}: {
  message: BCCaseMessage;
  labels: BCGenAIBubbleLabels;
}) {
  const { speakRoleText } = useBCVoice();
  if (message.role === "persona") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
            {labels.counterpartInitials}
          </span>
          <span className="text-xs font-semibold text-slate-600">
            {labels.counterpartLabel}
          </span>
          <SpeakButton role="customer" text={message.external} />
        </div>
        <p className="text-sm text-slate-700 bg-rose-50 border border-rose-100 rounded-xl rounded-tl-sm p-3 max-w-[85%]">
          {message.external}
        </p>
        {/* Feature #3: play-audio button at the bottom of the bubble */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            speakRoleText("customer", message.external);
          }}
          className="flex items-center gap-1.5 text-[11px] font-medium rounded-full border border-rose-200 bg-rose-50/60 text-rose-500 hover:bg-rose-100 px-2.5 py-1 transition-colors"
          title="Play audio"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          Play audio
        </button>
        {message.internal && (
          <div className="text-xs italic text-rose-500 bg-rose-50/60 border border-rose-100 rounded-xl px-3 py-2 max-w-[85%] flex gap-1.5">
            <Brain className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold not-italic">
                {labels.counterpartLabel} thinking:
              </span>{" "}
              {message.internal}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 flex flex-col items-end">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">
          {labels.participantLabel}
        </span>
        <SpeakButton role="agent" text={message.external} />
      </div>
      <p className="text-sm text-slate-800 bg-emerald-600 text-white rounded-xl rounded-tr-sm p-3 max-w-[85%]">
        {message.external}
      </p>
      {/* Feature #3: play-audio button at the bottom of the bubble */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          speakRoleText("agent", message.external);
        }}
        className="flex items-center gap-1.5 text-[11px] font-medium rounded-full border border-emerald-200 bg-emerald-50/60 text-emerald-600 hover:bg-emerald-100 px-2.5 py-1 transition-colors"
        title="Play audio"
      >
        <PlayCircle className="w-3.5 h-3.5" />
        Play audio
      </button>
      {message.accepted != null && (
        <span className="text-[10px] text-slate-400">
          {message.accepted ? "Sent with trainer correction" : "Sent as typed"}
        </span>
      )}
    </div>
  );
}

export default function BCTrainerComponent() {
  return (
    <BCVoiceProvider>
      <TrainerContent />
    </BCVoiceProvider>
  );
}
