// bc.gauntlet.hooks.ts
//
// useBCGauntlet — orchestrates the stress test: the coach is removed,
// the persona may throw curveballs, and at the end the run is evaluated
// pass/fail. Passing grants certification; failing routes back to the trainer.

"use client";

import { useCallback, useEffect, useState } from "react";
import type { BCCasePersona } from "../persona-architect/bc.persona.entity";
import type { BCCaseScenario } from "../case-base/bc.case.entity";
import type {
  BCCaseMessage,
  BCEvaluationResult,
} from "../trainer/bc.trainer.entity";
import { bcDatabase } from "../../database/bc.database";
import {
  bcGauntletEvaluate,
  bcGauntletPersonaReply,
} from "./bc.gauntlet.server";
import BCSettingsRepository from "../settings/bc.settings.repository";
import type { BCGenAIOptionId } from "../generative-ai/bc.generative-ai.entity";
import {
  BC_GEN_AI_DEFAULT_OPTION_ID,
  bcGenAIIsGraded,
} from "../generative-ai/bc.generative-ai.entity";

export interface BCGauntletState {
  personas: BCCasePersona[];
  cases: BCCaseScenario[];
  personaId: number | null;
  caseId: number | null;
  sessionId: number | null;
  messages: BCCaseMessage[];
  draft: string;
  busy: boolean;
  error: string;
  evaluation: BCEvaluationResult | null;
  curveballs: number;
  /** Generative AI training-mode option. */
  aiOption: BCGenAIOptionId;
  setPersonaId: (id: number | null) => void;
  setCaseId: (id: number | null) => void;
  setDraft: (text: string) => void;
  setAiOption: (id: BCGenAIOptionId) => void;
  start: () => Promise<void>;
  send: () => Promise<void>;
  evaluate: () => Promise<void>;
  restart: () => void;
  newThread: () => void;
}

export function useBCGauntlet(): BCGauntletState {
  const [personas, setPersonas] = useState<BCCasePersona[]>([]);
  const [cases, setCases] = useState<BCCaseScenario[]>([]);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [caseId, setCaseId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<BCCaseMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [evaluation, setEvaluation] = useState<BCEvaluationResult | null>(null);
  const [curveballs, setCurveballs] = useState(0);
  const [aiOption, setAiOption] = useState<BCGenAIOptionId>(
    BC_GEN_AI_DEFAULT_OPTION_ID,
  );
  /** True when the selected mode is graded/scored; false for supportive modes
   * (e.g. mental-health) where nothing is certified. */
  const isGraded = bcGenAIIsGraded(aiOption);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [personaRows, caseRows] = await Promise.all([
          bcDatabase.personas.toArray(),
          bcDatabase.cases.toArray(),
        ]);
        if (!cancelled) {
          setPersonas(personaRows);
          setCases(caseRows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load a session from the `?historyId=<id>` query parameter (feature #7).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("historyId");
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const [session, messageRows, personaRows, caseRows] =
          await Promise.all([
            bcDatabase.sessions.get(id),
            bcDatabase.messages.where("sessionId").equals(id).toArray(),
            bcDatabase.personas.toArray(),
            bcDatabase.cases.toArray(),
          ]);
        if (cancelled || !session) return;
        setSessionId(id);
        setMessages(
          messageRows.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
        );
        setPersonaId(session.personaId ?? null);
        setCaseId(session.caseId ?? null);
        setPersonas(personaRows);
        setCases(caseRows);
        setCurveballs(
          messageRows.filter((m) => m.role === "persona" && m.curveball)
            .length,
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load session");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPersona = personas.find((p) => p.id === personaId) ?? null;
  const currentScenario = cases.find((c) => c.id === caseId) ?? null;

  const historyForAI = useCallback(
    () => messages.map((m) => ({ role: m.role, external: m.external })),
    [messages],
  );

  const appendMessage = useCallback(async (message: BCCaseMessage) => {
    setMessages((prev) => [...prev, message]);
    if (message.sessionId != null) {
      await bcDatabase.messages.add({
        ...message,
        createdAt: message.createdAt ?? Date.now(),
      });
    }
  }, []);

  const start = useCallback(async () => {
    setError("");
    setMessages([]);
    setEvaluation(null);
    setCurveballs(0);
    if (personaId == null || caseId == null) {
      setError("Select a persona and a case first.");
      return;
    }
    const persona = personas.find((p) => p.id === personaId);
    const scenario = cases.find((c) => c.id === caseId);
    if (!persona || !scenario) {
      setError("Could not resolve the selected persona / case.");
      return;
    }

    setBusy(true);
    try {
      const settingsRepo = new BCSettingsRepository();
      const aiConfig = await settingsRepo.getActiveAIConfig();
      const sessionIdValue = await bcDatabase.sessions.add({
        caseId,
        personaId,
        mode: "gauntlet",
        status: "active",
        resolved: false,
        startedAt: Date.now(),
      });
      setSessionId(sessionIdValue);

      const opening = await bcGauntletPersonaReply(
        {
          persona,
          scenario,
          history: [],
          userMsg: "",
          curveballHint: false,
          aiOptions: aiOption,
        },
        aiConfig,
      );
      await appendMessage({
        sessionId: sessionIdValue,
        role: "persona",
        external: opening.external,
        internal: opening.internal,
        sentiment: opening.sentiment,
        createdAt: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setBusy(false);
    }
  }, [personaId, caseId, personas, cases, appendMessage, aiOption]);

  const send = useCallback(async () => {
    setError("");
    if (!sessionId || !currentPersona || !currentScenario) {
      setError("Start a gauntlet run first.");
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) return;

    const sentCount = messages.filter((m) => m.role === "agent").length;
    const curveballHint = (sentCount + 1) % 3 === 0;

    setBusy(true);
    try {
      await appendMessage({
        sessionId,
        role: "agent",
        external: trimmed,
        createdAt: Date.now(),
      });

      const settingsRepo = new BCSettingsRepository();
      const aiConfig = await settingsRepo.getActiveAIConfig();
      const reply = await bcGauntletPersonaReply(
        {
          persona: currentPersona,
          scenario: currentScenario,
          history: historyForAI(),
          userMsg: trimmed,
          curveballHint,
          aiOptions: aiOption,
        },
        aiConfig,
      );
      await appendMessage({
        sessionId,
        role: "persona",
        external: reply.external,
        internal: reply.internal,
        sentiment: reply.sentiment,
        curveball: Boolean(reply.curveball),
        createdAt: Date.now(),
      });
      if (reply.curveball) setCurveballs((c) => c + 1);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }, [
    sessionId,
    currentPersona,
    currentScenario,
    draft,
    messages,
    historyForAI,
    appendMessage,
    aiOption,
  ]);

  const evaluate = useCallback(async () => {
    setError("");
    if (!sessionId || !currentPersona || !currentScenario) {
      setError("Start a gauntlet run first.");
      return;
    }
    setBusy(true);
    try {
      const settingsRepo = new BCSettingsRepository();
      const aiConfig = await settingsRepo.getActiveAIConfig();
      const result = await bcGauntletEvaluate(
        {
          persona: currentPersona,
          scenario: currentScenario,
          history: historyForAI(),
          transcript: historyForAI(),
          aiOptions: aiOption,
        },
        aiConfig,
      );
      setEvaluation(result);
      if (isGraded) {
        await bcDatabase.sessions.update(sessionId, {
          status: result.passed ? "certified" : "failed",
          resolved: result.passed,
          curveballs,
          endedAt: Date.now(),
          summary: result.summary,
        });
      } else {
        // Supportive, ungraded modes (e.g. mental-health): there is no
        // pass/fail certification — the session is simply completed.
        await bcDatabase.sessions.update(sessionId, {
          status: "completed",
          resolved: true,
          curveballs,
          endedAt: Date.now(),
          summary: result.summary,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setBusy(false);
    }
  }, [
    sessionId,
    currentPersona,
    currentScenario,
    historyForAI,
    curveballs,
    aiOption,
    isGraded,
  ]);

  const restart = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setEvaluation(null);
    setCurveballs(0);
    setDraft("");
    setError("");
  }, []);

  const newThread = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setEvaluation(null);
    setCurveballs(0);
    setDraft("");
    setError("");
  }, []);

  return {
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
  };
}
