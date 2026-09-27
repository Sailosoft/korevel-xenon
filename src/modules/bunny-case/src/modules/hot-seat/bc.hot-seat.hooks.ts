// bc.hot-seat.hooks.ts
//
// useBCHotSeat — orchestrates the reverse-trainer flow: the AI role-plays the
// persona inside a case while the trainee asks the questions.
//   1. Start → the persona opens (states the problem / position).
//   2. The trainee sends a question / challenge.
//   3. The persona answers with a dual-view (external + hidden internal
//      thought) plus a composure score; sharp questions can make it crack.
//   4. End → the run is evaluated on the TRAINEE'S questioning craft.
//
// Sessions persist to Dexie with mode "hot-seat"; a `historyId` query
// parameter can reload a previous run.

"use client";

import { useCallback, useEffect, useState } from "react";
import type { BCCasePersona } from "../persona-architect/bc.persona.entity";
import { bcPersonaMatchesMode } from "../persona-architect/bc.persona.entity";
import type { BCCaseScenario } from "../case-base/bc.case.entity";
import type {
  BCCaseMessage,
  BCCaseSession,
} from "../trainer/bc.trainer.entity";
import type {
  BCHotSeatEvaluation,
  BCHotSeatReply,
} from "./bc.hot-seat.entity";
import { bcDatabase } from "../../database/bc.database";
import {
  bcHotSeatEvaluate,
  bcHotSeatPersonaReply,
} from "./bc.hot-seat.server";
import BCSettingsRepository from "../settings/bc.settings.repository";
import type { BCGenAIOptionId } from "../generative-ai/bc.generative-ai.entity";
import {
  BC_GEN_AI_DEFAULT_OPTION_ID,
  bcGenAIIsGraded,
} from "../generative-ai/bc.generative-ai.entity";

export interface BCHotSeatState {
  personas: BCCasePersona[];
  cases: BCCaseScenario[];
  personaId: number | null;
  caseId: number | null;
  sessionId: number | null;
  messages: BCCaseMessage[];
  draft: string;
  busy: boolean;
  error: string;
  evaluation: BCHotSeatEvaluation | null;
  /** How many times the persona conceded / contradicted itself. */
  cracks: number;
  /** Composure (0-10) from the persona's latest answer. */
  lastComposure: number | null;
  /** Generative AI training-mode option. */
  aiOption: BCGenAIOptionId;
  /** Past hot-seat runs (newest first). */
  history: BCCaseSession[];
  setPersonaId: (id: number | null) => void;
  setCaseId: (id: number | null) => void;
  setDraft: (text: string) => void;
  setAiOption: (id: BCGenAIOptionId) => void;
  start: () => Promise<void>;
  send: () => Promise<void>;
  evaluate: () => Promise<void>;
  loadSession: (id: number) => Promise<void>;
  deleteSession: (id: number) => Promise<void>;
  clearHistory: () => Promise<void>;
  newThread: () => void;
}

export function useBCHotSeat(): BCHotSeatState {
  const [personas, setPersonas] = useState<BCCasePersona[]>([]);
  const [cases, setCases] = useState<BCCaseScenario[]>([]);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [caseId, setCaseId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<BCCaseMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [evaluation, setEvaluation] = useState<BCHotSeatEvaluation | null>(
    null,
  );
  const [cracks, setCracks] = useState(0);
  const [lastComposure, setLastComposure] = useState<number | null>(null);
  const [aiOption, setAiOption] = useState<BCGenAIOptionId>(
    BC_GEN_AI_DEFAULT_OPTION_ID,
  );
  const [history, setHistory] = useState<BCCaseSession[]>([]);
  const isGraded = bcGenAIIsGraded(aiOption);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [personaRows, caseRows, sessionRows] = await Promise.all([
          bcDatabase.personas.toArray(),
          bcDatabase.cases.toArray(),
          bcDatabase.sessions.where("mode").equals("hot-seat").toArray(),
        ]);
        if (!cancelled) {
          setPersonas(personaRows.filter((p) => bcPersonaMatchesMode(p, "person")));
          setCases(caseRows);
          setHistory(sessionRows.reverse());
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

  // Load a session from the `?historyId=<id>` query parameter.
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
        const sorted = messageRows.sort(
          (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
        );
        setSessionId(id);
        setMessages(sorted);
        setPersonaId(session.personaId ?? null);
        setCaseId(session.caseId ?? null);
        setPersonas(personaRows.filter((p) => bcPersonaMatchesMode(p, "person")));
        setCases(caseRows);
        setCracks(sorted.filter((m) => m.role === "persona" && m.curveball).length);
        const lastPersona = [...sorted]
          .reverse()
          .find((m) => m.role === "persona");
        if (lastPersona?.sentiment != null) {
          // Composure is not persisted per message; sentiment is the closest
          // stored proxy, so reloads approximate the final composure.
          setLastComposure(Math.round(((lastPersona.sentiment + 1) / 2) * 10));
        }
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

  const refreshHistory = useCallback(async () => {
    const rows = await bcDatabase.sessions
      .where("mode")
      .equals("hot-seat")
      .toArray();
    setHistory(rows.reverse());
  }, []);

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
    setCracks(0);
    setLastComposure(null);
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
        mode: "hot-seat",
        status: "active",
        resolved: false,
        startedAt: Date.now(),
      });
      setSessionId(sessionIdValue);

      const opening = await bcHotSeatPersonaReply(
        {
          persona,
          scenario,
          history: [],
          userMsg: "",
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
      setLastComposure(opening.composure);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setBusy(false);
    }
  }, [personaId, caseId, personas, cases, appendMessage, aiOption]);

  const send = useCallback(async () => {
    setError("");
    if (!sessionId || !currentPersona || !currentScenario) {
      setError("Start a hot-seat session first.");
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) return;

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
      const reply = await bcHotSeatPersonaReply(
        {
          persona: currentPersona,
          scenario: currentScenario,
          history: historyForAI(),
          userMsg: trimmed,
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
        // Reuse the curveball flag to persist "the persona cracked" per turn.
        curveball: Boolean(reply.cracked),
        createdAt: Date.now(),
      });
      setLastComposure(reply.composure);
      if (reply.cracked) setCracks((c) => c + 1);
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
    historyForAI,
    appendMessage,
    aiOption,
  ]);

  const evaluate = useCallback(async () => {
    setError("");
    if (!sessionId || !currentPersona || !currentScenario) {
      setError("Start a hot-seat session first.");
      return;
    }
    setBusy(true);
    try {
      const settingsRepo = new BCSettingsRepository();
      const aiConfig = await settingsRepo.getActiveAIConfig();
      const result = await bcHotSeatEvaluate(
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
      await bcDatabase.sessions.update(sessionId, {
        status: isGraded
          ? result.score >= 70
            ? "certified"
            : "completed"
          : "completed",
        resolved: true,
        curveballs: cracks,
        endedAt: Date.now(),
        summary: result.summary,
      });
      await refreshHistory();
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
    cracks,
    aiOption,
    isGraded,
    refreshHistory,
  ]);

  const loadSession = useCallback(async (id: number) => {
    setError("");
    setEvaluation(null);
    try {
      const [session, messageRows, personaRows, caseRows] = await Promise.all([
        bcDatabase.sessions.get(id),
        bcDatabase.messages.where("sessionId").equals(id).toArray(),
        bcDatabase.personas.toArray(),
        bcDatabase.cases.toArray(),
      ]);
      if (!session) {
        setError("Session not found.");
        return;
      }
      const sorted = messageRows.sort(
        (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
      );
      setSessionId(id);
      setMessages(sorted);
      setPersonaId(session.personaId ?? null);
      setCaseId(session.caseId ?? null);
      setPersonas(personaRows.filter((p) => bcPersonaMatchesMode(p, "person")));
      setCases(caseRows);
      setCracks(sorted.filter((m) => m.role === "persona" && m.curveball).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    }
  }, []);

  const deleteSession = useCallback(
    async (id: number) => {
      setError("");
      try {
        await bcDatabase.sessions.delete(id);
        await bcDatabase.messages
          .where("sessionId")
          .equals(id)
          .delete();
        if (sessionId === id) {
          setSessionId(null);
          setMessages([]);
          setEvaluation(null);
          setCracks(0);
          setLastComposure(null);
        }
        await refreshHistory();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete session");
      }
    },
    [sessionId, refreshHistory],
  );

  const clearHistory = useCallback(async () => {
    setError("");
    try {
      const rows = await bcDatabase.sessions
        .where("mode")
        .equals("hot-seat")
        .toArray();
      await Promise.all(
        rows.map((r) =>
          bcDatabase.messages.where("sessionId").equals(r.id as number).delete(),
        ),
      );
      await Promise.all(rows.map((r) => bcDatabase.sessions.delete(r.id as number)));
      setHistory([]);
      setSessionId(null);
      setMessages([]);
      setEvaluation(null);
      setCracks(0);
      setLastComposure(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear history");
    }
  }, []);

  const newThread = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setEvaluation(null);
    setCracks(0);
    setLastComposure(null);
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
    cracks,
    lastComposure,
    aiOption,
    history,
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
  };
}
