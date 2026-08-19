// bc.simulator.component.tsx
//
// Conversation Simulator — select persona + case, optionally choose an agent
// persona and how many turns the conversation should run and whether it ends
// resolved or unresolved (but always lands in a better place). The generated
// dialogue is rendered as chat bubbles with a dual-view (external = what the
// customer says, internal = the hidden emotion / agent rationale), followed by
// a summarization with tips and guides. Successful phrases can be extracted
// into a Communication Template AND the Playbook Library.
//
// Features:
//  - Persisted history: each run is saved to the `simulators` table and can be
//    reloaded via `?simulatorId=<id>` (feature #1).
//  - Agent persona selection (feature #6).
//  - Text-to-speech per turn (feature #4).

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import {
  Eye,
  Brain,
  MessagesSquare,
  Save,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ListChecks,
  AlertTriangle,
  ArrowRight,
  Volume2,
  History,
  Trash2,
  Loader2,
  PlayCircle,
  Square,
} from "lucide-react";
import { useBCSimulator } from "./bc.simulator.hooks";
import type { BCSimulatorTurn } from "./bc.simulator.entity";
import { BCVoiceProvider, useBCVoice } from "../trainer/bc.trainer.voice";
import { BCGenAIOptionSelector } from "../generative-ai/bc.generative-ai.selector";
import {
  bcGenAIBubbleLabels,
  type BCGenAIBubbleLabels,
} from "../generative-ai/bc.generative-ai.entity";
import {
  BC_PLAY_DELAY_DEFAULT,
  BC_PLAY_DELAY_STORAGE_KEY,
} from "../settings/bc.settings.constants";

function SentimentBadge({ sentiment }: { sentiment?: number }) {
  if (sentiment == null) return null;
  const tone =
    sentiment > 0.2
      ? "bg-emerald-50 text-emerald-600"
      : sentiment < -0.2
        ? "bg-red-50 text-red-500"
        : "bg-amber-50 text-amber-600";
  const label =
    sentiment > 0.2
      ? "Positive"
      : sentiment < -0.2
        ? "Negative"
        : "Neutral";
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tone}`}
    >
      {label} · {sentiment.toFixed(2)}
    </span>
  );
}

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

function TurnBubble({
  turn,
  index,
  labels,
}: {
  turn: BCSimulatorTurn;
  index: number;
  labels: BCGenAIBubbleLabels;
}) {
  const isPersona = turn.speaker === "persona";
  const { speakRoleText } = useBCVoice();
  return (
    <div
      className={`flex flex-col gap-1.5 ${
        isPersona ? "items-start" : "items-end"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${
            isPersona ? "bg-rose-500" : "bg-emerald-500"
          }`}
        >
          {isPersona ? labels.counterpartInitials : labels.participantInitials}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {isPersona ? labels.counterpartLabel : labels.participantLabel}
          </span>
          <span className="text-[10px] text-slate-400">Turn {index + 1}</span>
          <SentimentBadge sentiment={turn.sentiment} />
          <SpeakButton
            role={isPersona ? "customer" : "agent"}
            text={turn.external}
          />
        </div>
      </div>

      <p
        className={`text-sm rounded-2xl p-3 max-w-[85%] whitespace-pre-wrap ${
          isPersona
            ? "bg-rose-50 text-slate-700 border border-rose-100 rounded-tl-sm"
            : "bg-emerald-600 text-white rounded-tr-sm"
        }`}
      >
        {turn.external}
      </p>

      {/* Feature #3: play-audio button at the bottom of the chat bubble */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          speakRoleText(
            isPersona ? "customer" : "agent",
            turn.external,
          );
        }}
        className={`flex items-center gap-1.5 text-[11px] font-medium rounded-full border px-2.5 py-1 transition-colors ${
          isPersona
            ? "text-rose-500 border-rose-200 bg-rose-50/60 hover:bg-rose-100"
            : "text-emerald-600 border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100"
        }`}
        title={`Play ${isPersona ? "customer" : "agent"} audio`}
      >
        <PlayCircle className="w-3.5 h-3.5" />
        Play audio
      </button>

      {turn.internal && (
        <div
          className={`text-xs italic rounded-xl px-3 py-2 max-w-[85%] flex gap-1.5 ${
            isPersona
              ? "text-rose-500 bg-rose-50/60 border border-rose-100"
              : "text-emerald-600 bg-emerald-50/60 border border-emerald-100"
          }`}
        >
          <Brain className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold not-italic">
              {isPersona
                ? `${labels.counterpartLabel} thinking`
                : `${labels.participantLabel} reasoning`}
              :
            </span>{" "}
            {turn.internal}
          </span>
        </div>
      )}
    </div>
  );
}

function SimulatorContent() {
  const {
    personas,
    cases,
    agentPersonas,
    personaId,
    caseId,
    agentPersonaId,
    turnCount,
    outcome,
    aiOption,
    result,
    simulatorId,
    history,
    loading,
    extracting,
    savedTemplateId,
    savedToLibrary,
    error,
    setPersonaId,
    setCaseId,
    setAgentPersonaId,
    setTurnCount,
    setOutcome,
    setAiOption,
    generate,
    loadSimulator,
    deleteSimulator,
    clearHistory,
    extractTemplate,
  } = useBCSimulator();

  const [showHistory, setShowHistory] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [playingAll, setPlayingAll] = useState(false);
  // Delay (ms) between turns for Play All — configured in the Settings module.
  const [playDelay] = useState<number>(() => {
    if (typeof window === "undefined") return BC_PLAY_DELAY_DEFAULT;
    const v = Number(window.localStorage.getItem(BC_PLAY_DELAY_STORAGE_KEY));
    return Number.isFinite(v) && v >= 0 ? v : BC_PLAY_DELAY_DEFAULT;
  });
  const loadedParamRef = useRef<number | null>(null);
  const playAllRef = useRef(false);

  const { ttsSupported, speakRoleText, stopSpeaking } = useBCVoice();

  // Feature #2: play every turn's audio in sequence with a configurable delay
  // in between (default 500ms). Each utterance chains its `onEnd` into the
  // next turn.
  const playAllAudio = useCallback(() => {
    if (!result || result.turns.length === 0) return;
    setPlayingAll(true);
    playAllRef.current = true;
    const turns = result.turns;
    const delayMs = Math.max(0, playDelay);
    let index = 0;
    const speakNext = () => {
      if (!playAllRef.current) return;
      const turn = turns[index];
      if (!turn?.external) {
        index += 1;
        if (index < turns.length) {
          window.setTimeout(speakNext, delayMs);
        } else {
          setPlayingAll(false);
        }
        return;
      }
      speakRoleText(
        turn.speaker === "persona" ? "customer" : "agent",
        turn.external,
        {
          onEnd: () => {
            if (!playAllRef.current) return;
            index += 1;
            if (index < turns.length) {
              window.setTimeout(speakNext, delayMs);
            } else {
              setPlayingAll(false);
            }
          },
        },
      );
    };
    speakNext();
  }, [result, speakRoleText, playDelay]);

  const stopPlayAll = useCallback(() => {
    playAllRef.current = false;
    stopSpeaking();
    setPlayingAll(false);
  }, [stopSpeaking]);

  // Keep the `?simulatorId=<id>` query parameter in sync with the currently
  // displayed simulator (set or remove it without a full navigation).
  const updateSimulatorParam = useCallback((id: number | null) => {
    const url = new URL(window.location.href);
    if (id == null) {
      url.searchParams.delete("simulatorId");
    } else {
      url.searchParams.set("simulatorId", String(id));
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Load a simulator from the `?simulatorId=<id>` query parameter.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("simulatorId");
    if (raw) {
      const id = Number(raw);
      if (Number.isFinite(id) && id > 0 && loadedParamRef.current !== id) {
        loadedParamRef.current = id;
        void loadSimulator(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolved = result?.outcome !== "unresolved";
  const bubbleLabels = bcGenAIBubbleLabels(aiOption);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
          <MessagesSquare className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">
            Conversation Simulator
          </h1>
          <p className="text-sm text-slate-400">
            Observe what an ideal agent does, with dual-view insight.
          </p>
        </div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
            showHistory
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
          title="Simulator history"
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">History</span>
        </button>
        {/* Feature #2: play every turn's audio in sequence with a delay
            (the delay is configured in the Settings module) */}
        <button
          onClick={() => (playingAll ? stopPlayAll() : playAllAudio())}
          disabled={!ttsSupported || !result}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border disabled:opacity-40 disabled:cursor-not-allowed ${
            playingAll
              ? "bg-rose-50 text-rose-600 border-rose-200"
              : "text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
          title="Play all audio with a delay between each turn"
        >
          {playingAll ? (
            <Square className="w-4 h-4" />
          ) : (
            <PlayCircle className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {playingAll ? "Stop All" : "Play All"}
          </span>
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* ── History panel ─────────────────────────────────────── */}
      {showHistory && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">
              Generated simulations ({history.length})
            </div>
            {history.length > 0 && (
              <button
                onClick={async () => {
                  setClearing(true);
                  await clearHistory();
                  updateSimulatorParam(null);
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
              No simulations yet — generate one to save it to history.
            </p>
          )}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {history.map((rec) => (
              <div
                key={rec.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  simulatorId === rec.id
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <button
                  className="flex-1 text-left min-w-0"
                  onClick={() => {
                    if (rec.id != null) {
                      updateSimulatorParam(rec.id);
                      void loadSimulator(rec.id);
                    }
                  }}
                >
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {rec.caseTitle ?? "Untitled case"}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {rec.personaName ?? "—"} ·{" "}
                    {rec.agentPersonaName ?? "Generic agent"} ·{" "}
                    {rec.result?.outcome ?? "—"} ·{" "}
                    {rec.createdAt
                      ? new Date(rec.createdAt).toLocaleString()
                      : "—"}
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (rec.id != null) {
                      void deleteSimulator(rec.id);
                      if (simulatorId === rec.id) updateSimulatorParam(null);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                  title="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Configuration ─────────────────────────────────────── */}
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
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Agent Persona{" "}
              <span className="normal-case text-slate-400">(optional)</span>
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={agentPersonaId ?? ""}
              onChange={(e) =>
                setAgentPersonaId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">Generic ideal agent</option>
              {agentPersonas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Shape the ideal agent — build one in Agent Personas.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Number of turns{" "}
              <span className="normal-case text-slate-400">(optional)</span>
            </label>
            <input
              type="number"
              min={2}
              max={24}
              placeholder="Auto (6–10)"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={turnCount ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setTurnCount(null);
                } else {
                  const n = Number(v);
                  setTurnCount(
                    Number.isFinite(n) && n > 0 ? Math.floor(n) : null,
                  );
                }
              }}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Leave empty to let the AI pick (6–10 turns).
            </p>
          </div>
          <div className="md:col-span-2">
            <BCGenAIOptionSelector value={aiOption} onChange={setAiOption} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Ending
            </label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOutcome("resolved")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  outcome === "resolved"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> Resolved
              </button>
              <button
                type="button"
                onClick={() => setOutcome("unresolved")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  outcome === "unresolved"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <XCircle className="w-4 h-4" /> Unresolved
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Unresolved still ends in a better place — with a clear path
              forward.
            </p>
          </div>
        </div>

        <Button
          onPress={async () => {
            const id = await generate();
            if (id != null) updateSimulatorParam(id);
          }}
          isDisabled={loading}
          className="w-full bg-emerald-600 text-white"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" color="current" />
              Generating…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Ideal Simulation
            </span>
          )}
        </Button>
      </div>

      {/* ── Results ───────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center gap-2 justify-center py-10">
          <Spinner color="success" size="lg" />
          <p className="text-sm text-slate-400">Simulating…</p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-5">
          {simulatorId != null && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500">
              <span>
                Saved to history — id{" "}
                <span className="font-mono font-semibold">{simulatorId}</span>
              </span>
              <span>
                Share / reload via{" "}
                <span className="font-mono">
                  ?simulatorId={simulatorId}
                </span>
              </span>
            </div>
          )}

          {/* Summary + outcome */}
          <div
            className={`rounded-2xl p-4 border ${
              resolved
                ? "bg-emerald-50 border-emerald-100"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  resolved
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {resolved ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                {resolved ? "Resolved" : "Unresolved"}
              </span>
              <span
                className={`flex items-center gap-1.5 ${
                  resolved ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                <Eye className="w-4 h-4" /> Summary
              </span>
            </div>
            <p
              className={`text-sm ${
                resolved ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              {result.summary}
            </p>
            {!resolved && result.nextSteps && (
              <p
                className={`text-sm mt-2 pt-2 border-t ${
                  resolved
                    ? "border-emerald-100 text-emerald-700"
                    : "border-amber-200 text-amber-700"
                }`}
              >
                <span className="font-semibold">Next steps: </span>
                {result.nextSteps}
              </p>
            )}
          </div>

          {/* Chat bubbles */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Simulated conversation · {result.turns.length} turns
            </div>
            {result.turns.map((turn, idx) => (
              <TurnBubble key={idx} turn={turn} index={idx} labels={bubbleLabels} />
            ))}
          </div>

          {/* Summarization — tips & guides */}
          {result.tips && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Tips & Guides
              </div>

              {result.tips.keyPhrases?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Key phrases
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.tips.keyPhrases.map((phrase, i) => (
                      <span
                        key={i}
                        className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1"
                      >
                        “{phrase}”
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.tips.guide?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <ListChecks className="w-3.5 h-3.5" /> Step-by-step guide
                  </div>
                  <ol className="space-y-1.5">
                    {result.tips.guide.map((step, i) => (
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

              {result.tips.pitfalls?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> Pitfalls to avoid
                  </div>
                  <ul className="space-y-1.5">
                    {result.tips.pitfalls.map((pitfall, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-red-600 bg-red-50/60 border border-red-100 rounded-xl px-3 py-2"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {pitfall}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Button
            onPress={() => void extractTemplate()}
            isDisabled={extracting}
            className="w-full bg-slate-800 text-white"
          >
            {extracting ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" color="current" />
                Extracting…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Extract Playbook → Save to Library & Templates
              </span>
            )}
          </Button>

          {savedTemplateId != null && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Template saved to the Communication Templates library.
              </div>
              {savedToLibrary && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Playbook saved to the Playbook Library.
                </div>
              )}
            </div>
          )}

          {result.outcome === "unresolved" && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm">
              <ArrowRight className="w-4 h-4 shrink-0" />
              This conversation did not fully close the case — use the guide
              above to practice taking it to a resolved ending.
            </div>
          )}
        </div>
      )}

      {!result && !loading && (
        <p className="text-center text-sm text-slate-400 py-10">
          Select a persona and a case, then generate a simulation to see the
          ideal conversation.
        </p>
      )}
    </div>
  );
}

export default function BCSimulatorComponent() {
  return (
    <BCVoiceProvider>
      <SimulatorContent />
    </BCVoiceProvider>
  );
}
