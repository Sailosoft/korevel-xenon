// bc.gauntlet.component.tsx
//
// Stress-Test Gauntlet — the final exam. No coach. The persona may
// throw curveballs. At the end the run is evaluated pass/fail; passing grants
// certification, failing routes the user back to the Conversation Trainer.
// Includes text-to-speech for customer + agent messages (#4) and the ability
// to resume a session via `?historyId=` or start a new thread (#7).

"use client";

import React from "react";
import { Button, Spinner } from "@heroui/react";
import {
  Swords,
  Send,
  Brain,
  Flag,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Siren,
  Volume2,
  FilePlus2,
} from "lucide-react";
import { useBCGauntlet } from "./bc.gauntlet.hooks";
import { BCVoiceProvider, useBCVoice } from "../trainer/bc.trainer.voice";
import type { BCCaseMessage } from "../trainer/bc.trainer.entity";
import { BCGenAIOptionSelector } from "../generative-ai/bc.generative-ai.selector";

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

function MessageBubble({ message }: { message: BCCaseMessage }) {
  if (message.role === "persona") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
            CU
          </span>
          <span className="text-xs font-semibold text-slate-600">Customer</span>
          <SpeakButton role="customer" text={message.external} />
          {message.curveball && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
              <Siren className="w-3 h-3" /> CURVEBALL
            </span>
          )}
        </div>
        <p className="text-sm text-slate-700 bg-rose-50 border border-rose-100 rounded-xl rounded-tl-sm p-3 max-w-[85%]">
          {message.external}
        </p>
        {message.internal && (
          <div className="text-xs italic text-rose-500 bg-rose-50/60 border border-rose-100 rounded-xl px-3 py-2 max-w-[85%] flex gap-1.5">
            <Brain className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold not-italic">
                Customer thinking:
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
        <span className="text-xs font-semibold text-slate-500">You</span>
        <SpeakButton role="agent" text={message.external} />
      </div>
      <p className="text-sm text-slate-800 bg-slate-700 text-white rounded-xl rounded-tr-sm p-3 max-w-[85%]">
        {message.external}
      </p>
    </div>
  );
}

function GauntletContent() {
  const {
    personas,
    cases,
    personaId,
    caseId,
    sessionId,
    messages,
    draft,
    busy,
    error,
    evaluation,
    curveballs,
    aiOption,
    setPersonaId,
    setCaseId,
    setDraft,
    setAiOption,
    start,
    send,
    evaluate,
    restart,
    newThread,
  } = useBCGauntlet();

  const started = sessionId != null;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-rose-100">
          <Swords className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">
            Stress-Test Gauntlet
          </h1>
          <p className="text-sm text-slate-400">
            The final exam. No coach. Curveballs included.
          </p>
        </div>
        {started && !evaluation && (
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

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {!started && !evaluation && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Persona
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
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
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
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
            className="w-full bg-rose-600 text-white"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" color="current" />
                Starting…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Swords className="w-4 h-4" />
                Begin the Final Exam
              </span>
            )}
          </Button>
          <p className="text-xs text-slate-400">
            Resolve the case without coaching. The persona may throw unexpected
            curveballs.
          </p>
        </div>
      )}

      {started && !evaluation && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 min-h-[320px]">
            {messages.length === 0 && busy && (
              <div className="flex flex-col items-center gap-2 justify-center py-10">
                <Spinner color="danger" size="lg" />
                <p className="text-sm text-slate-400">The gauntlet begins…</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Your response to the customer…"
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <Button
              onPress={() => void send()}
              isDisabled={busy || !draft.trim()}
              className="bg-rose-600 text-white shrink-0"
            >
              {busy ? (
                <Spinner size="sm" color="current" />
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send
                </span>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onPress={() => void evaluate()}
              isDisabled={busy}
              className="bg-slate-800 text-white"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" color="current" />
                  Evaluating…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Submit for Evaluation
                </span>
              )}
            </Button>
            <span className="text-xs text-slate-400">
              Curveballs so far: {curveballs}
            </span>
          </div>
        </>
      )}

      {evaluation && (
        <div
          className={`rounded-2xl border p-5 space-y-3 ${
            evaluation.passed
              ? "bg-emerald-50 border-emerald-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {evaluation.passed ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {evaluation.passed
                  ? "Certification Granted"
                  : "Certification Not Granted"}
              </h2>
              <p className="text-sm text-slate-500">
                Score: {evaluation.score}/100 · Curveballs: {curveballs}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-700">{evaluation.reason}</p>
          {evaluation.feedback.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              {evaluation.feedback.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
          {!evaluation.passed && (
            <p className="text-sm text-red-600 font-medium">
              Route back to the Conversation Trainer for more practice, then
              retry the gauntlet.
            </p>
          )}
          <Button onPress={restart} className="bg-slate-800 text-white">
            <span className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              {evaluation.passed ? "Run Another Exam" : "Practice & Retry"}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function BCGauntletComponent() {
  return (
    <BCVoiceProvider>
      <GauntletContent />
    </BCVoiceProvider>
  );
}
