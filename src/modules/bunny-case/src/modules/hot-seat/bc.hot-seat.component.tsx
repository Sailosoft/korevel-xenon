// bc.hot-seat.component.tsx
//
// Hot Seat — the reverse of the Conversation Trainer. The AI role-plays the
// persona inside a case while YOU ask the questions and challenge it. Every
// AI answer shows a dual-view (spoken words + hidden thought) and a composure
// meter; sharp questions can make the persona crack. At the end the run is
// evaluated on your questioning craft. Includes text-to-speech for the
// persona's answers and resume via `?historyId=`.

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import {
  Flame,
  Send,
  Brain,
  CheckCircle2,
  RotateCcw,
  Volume2,
  FilePlus2,
  History,
  Trash2,
  ShieldAlert,
  Award,
} from "lucide-react";
import { useBCHotSeat } from "./bc.hot-seat.hooks";
import { BCVoiceProvider, useBCVoice } from "../trainer/bc.trainer.voice";
import type { BCCaseMessage } from "../trainer/bc.trainer.entity";
import { BCGenAIOptionSelector } from "../generative-ai/bc.generative-ai.selector";
import {
  bcGenAIBubbleLabels,
  bcGenAIIsGraded,
  type BCGenAIBubbleLabels,
} from "../generative-ai/bc.generative-ai.entity";

function SpeakButton({
  role,
  text,
}: {
  role: "actor1" | "actor2";
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
        role === "actor1"
          ? "text-rose-400 hover:text-rose-600 hover:bg-rose-50"
          : "text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
      }`}
      title={`Read ${role} message aloud`}
    >
      <Volume2 className="w-3.5 h-3.5" />
    </button>
  );
}

/** 0-10 composure meter for the persona under pressure. */
function ComposureMeter({ composure }: { composure: number }) {
  const clamped = Math.max(0, Math.min(10, Math.round(composure)));
  const tone =
    clamped >= 7
      ? "bg-emerald-500"
      : clamped >= 4
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5" title={`Composure ${clamped}/10`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Composure
      </span>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-3 rounded-sm ${
              i < clamped ? tone : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold text-slate-500">{clamped}/10</span>
    </div>
  );
}

function MessageBubble({
  message,
  labels,
  showComposure,
  composure,
}: {
  message: BCCaseMessage;
  labels: BCGenAIBubbleLabels;
  showComposure?: boolean;
  /** Live 0-10 composure from the latest AI answer (last bubble only). */
  composure?: number;
}) {
  if (message.role === "persona") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">
            {labels.counterpartInitials}
          </span>
          <span className="text-xs font-semibold text-slate-600">
            {labels.counterpartLabel}
          </span>
          <SpeakButton role="actor1" text={message.external} />
          {message.curveball && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
              <ShieldAlert className="w-3 h-3" /> CRACKED
            </span>
          )}
          {showComposure && composure != null && (
            <ComposureMeter composure={composure} />
          )}
        </div>
        <p className="text-sm text-slate-700 bg-orange-50 border border-orange-100 rounded-xl rounded-tl-sm p-3 max-w-[85%]">
          {message.external}
        </p>
        {message.internal && (
          <div className="text-xs italic text-orange-600 bg-orange-50/60 border border-orange-100 rounded-xl px-3 py-2 max-w-[85%] flex gap-1.5">
            <Brain className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold not-italic">
                Hidden thought:
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
          You ({labels.participantLabel})
        </span>
        <SpeakButton role="actor2" text={message.external} />
      </div>
      <p className="text-sm bg-slate-800 text-white rounded-xl rounded-tr-sm p-3 max-w-[85%]">
        {message.external}
      </p>
    </div>
  );
}

function HotSeatContent() {
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
    cracks,
    aiOption,
    history,
    lastComposure,
    setPersonaId,
    setCaseId,
    setDraft,
    setAiOption,
    start,
    send,
    evaluate,
    loadSession,
    deleteSession,
    clearHistory,
    newThread,
  } = useBCHotSeat();

  const [showHistory, setShowHistory] = useState(false);
  const started = sessionId != null;
  const bubbleLabels = bcGenAIBubbleLabels(aiOption);
  const isGraded = bcGenAIIsGraded(aiOption);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const lastPersonaIndex = messages.reduce(
    (acc, m, i) => (m.role === "persona" ? i : acc),
    -1,
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Hot Seat</h1>
          <p className="text-sm text-slate-400">
            The AI is in the hot seat — you ask the questions and challenge it.
          </p>
        </div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border text-slate-500 border-slate-200 hover:bg-slate-50"
          title="Session history"
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">History</span>
        </button>
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

      {showHistory && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Past Hot Seat runs
            </h2>
            {history.length > 0 && (
              <button
                onClick={() => void clearHistory()}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Clear all
              </button>
            )}
          </div>
          {history.length === 0 && (
            <p className="text-xs text-slate-400">No previous runs yet.</p>
          )}
          {history.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-2 text-sm border border-slate-100 rounded-xl px-3 py-2"
            >
              <button
                onClick={() => row.id != null && void loadSession(row.id)}
                className="flex-1 text-left text-slate-600 hover:text-orange-600"
              >
                #{row.id} · {row.status} ·{" "}
                {row.curveballs ? `${row.curveballs} cracks` : "no cracks"} ·{" "}
                {row.startedAt ? new Date(row.startedAt).toLocaleString() : ""}
              </button>
              <button
                onClick={() => row.id != null && void deleteSession(row.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                title="Delete run"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

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
                Persona (the AI in the hot seat)
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
            className="w-full bg-orange-600 text-white"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" color="current" />
                Starting…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Put the AI in the Hot Seat
              </span>
            )}
          </Button>
          <p className="text-xs text-slate-400">
            {isGraded
              ? "You are the questioner. Grill the persona, expose contradictions, and your questioning will be scored at the end."
              : "A supportive exchange — ask freely. Nothing is graded or scored."}
          </p>
        </div>
      )}

      {started && !evaluation && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 min-h-[320px]">
            {messages.length === 0 && busy && (
              <div className="flex flex-col items-center gap-2 justify-center py-10">
                <Spinner color="warning" size="lg" />
                <p className="text-sm text-slate-400">
                  The persona is taking the hot seat…
                </p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                labels={bubbleLabels}
                showComposure={idx === lastPersonaIndex}
                composure={lastComposure ?? undefined}
              />
            ))}
            <div ref={endRef} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Ask a question or challenge the persona…"
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <Button
              onPress={() => void send()}
              isDisabled={busy || !draft.trim()}
              className="bg-orange-600 text-white shrink-0"
            >
              {busy ? (
                <Spinner size="sm" color="current" />
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Ask
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
                  {isGraded ? "Evaluating…" : "Closing…"}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {isGraded ? "Evaluate My Questioning" : "Complete Session"}
                </span>
              )}
            </Button>
            {isGraded && (
              <span className="text-xs text-slate-400">
                Cracks so far: {cracks}
              </span>
            )}
          </div>
        </>
      )}

      {evaluation && (
        <div
          className={`rounded-2xl border p-5 space-y-3 ${
            isGraded
              ? "bg-orange-50 border-orange-200"
              : "bg-teal-50 border-teal-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <Award
              className={`w-8 h-8 ${
                isGraded ? "text-orange-600" : "text-teal-600"
              }`}
            />
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {isGraded ? "Your Questioning Score" : "Session Reflection"}
              </h2>
              {isGraded ? (
                <p className="text-sm text-slate-500">
                  Score: {evaluation.score}/100 · Cracks caused: {cracks}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Supportive session complete — nothing is graded or scored.
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-700">{evaluation.reason}</p>
          {evaluation.bestQuestion && (
            <p className="text-sm text-slate-700 bg-white/70 border border-orange-100 rounded-xl px-3 py-2">
              <span className="font-semibold">Best question: </span>
              {evaluation.bestQuestion}
            </p>
          )}
          {evaluation.feedback.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              {evaluation.feedback.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
          <Button
            onPress={newThread}
            className="bg-slate-800 text-white"
          >
            <span className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              {isGraded ? "Grill Another Persona" : "Start Another Session"}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function BCHotSeatComponent() {
  return (
    <BCVoiceProvider>
      <HotSeatContent />
    </BCVoiceProvider>
  );
}
