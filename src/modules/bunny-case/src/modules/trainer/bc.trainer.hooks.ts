// bc.trainer.hooks.ts
//
// useBCTrainer — orchestrates the guided roleplay + feedback loop:
//   1. Start → persona opens the conversation.
//   2. (Optional, Trainer Option) the AI Trainer shows a per-turn guide.
//   3. User drafts a response → the Trainer Option validates it with AI
//      (critique + guide), lets the user modify and revalidate, or send
//      without the AI guide.
//   4. The final response is sent to the persona and the conversation evolves.
//
// Messages are persisted to Dexie (session + messages). A `historyId` query
// parameter can reload a previous session (feature #7).

"use client";

import { useCallback, useEffect, useState } from "react";
import type { BCCasePersona } from "../persona-architect/bc.persona.entity";
import type { BCCaseScenario } from "../case-base/bc.case.entity";
import type {
  BCCaseMessage,
  BCCaseSession,
  BCTrainerCritique,
  BCTrainerFeedback,
  BCTrainerGuide,
  BCTrainerSessionSummary,
} from "./bc.trainer.entity";
import { bcDatabase } from "../../database/bc.database";
import {
  bcTrainerCoachFeedback,
  bcTrainerCritiqueDraft,
  bcTrainerPersonaReply,
  bcTrainerSessionSummary,
  bcTrainerTurnGuide,
} from "./bc.trainer.server";
import BCSettingsRepository from "../settings/bc.settings.repository";
import type { BCGenAIOptionId } from "../generative-ai/bc.generative-ai.entity";
import { BC_GEN_AI_DEFAULT_OPTION_ID } from "../generative-ai/bc.generative-ai.entity";

export interface BCTrainerState {
  personas: BCCasePersona[];
  cases: BCCaseScenario[];
  personaId: number | null;
  caseId: number | null;
  sessionId: number | null;
  messages: BCCaseMessage[];
  draft: string;
  pendingDraft: string;
  feedback: BCTrainerFeedback | null;
  /** Trainer Option: the AI per-turn guide. */
  guide: BCTrainerGuide | null;
  /** Trainer Option: AI critique of the current draft. */
  critique: BCTrainerCritique | null;
  /** Whether the Trainer Option (guide/validate) is enabled. */
  trainerOptionEnabled: boolean;
  /** Generative AI training-mode option. */
  aiOption: BCGenAIOptionId;
  busy: boolean;
  error: string;
  resolved: boolean;
  /** History of past trainer sessions (feature #6). */
  history: BCCaseSession[];
  /** End-of-session summary + rating (feature #10). */
  sessionSummary: BCTrainerSessionSummary | null;
  /** True after the current session is saved to the playbook library (feature #11). */
  savedToLibrary: boolean;
  /** True while saving the current session to the playbook. */
  savingPlaybook: boolean;
  setPersonaId: (id: number | null) => void;
  setCaseId: (id: number | null) => void;
  setDraft: (text: string | ((prev: string) => string)) => void;
  setTrainerOptionEnabled: (value: boolean) => void;
  setAiOption: (id: BCGenAIOptionId) => void;
  loadSession: (id: number) => Promise<void>;
  deleteSession: (id: number) => Promise<void>;
  clearHistory: () => Promise<void>;
  saveToPlaybook: () => Promise<void>;
  start: () => Promise<void>;
  submitDraft: () => Promise<void>;
  validateDraft: () => Promise<void>;
  revalidateDraft: () => Promise<void>;
  sendWithoutGuide: () => Promise<void>;
  acceptCorrection: () => Promise<void>;
  overwriteCorrection: () => Promise<void>;
  resolveCase: () => Promise<void>;
  endSession: () => Promise<void>;
  newThread: () => void;
}

export function useBCTrainer(): BCTrainerState {
  const [personas, setPersonas] = useState<BCCasePersona[]>([]);
  const [cases, setCases] = useState<BCCaseScenario[]>([]);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [caseId, setCaseId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<BCCaseMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingDraft, setPendingDraft] = useState("");
  const [feedback, setFeedback] = useState<BCTrainerFeedback | null>(null);
  const [guide, setGuide] = useState<BCTrainerGuide | null>(null);
  const [critique, setCritique] = useState<BCTrainerCritique | null>(null);
  const [trainerOptionEnabled, setTrainerOptionEnabled] = useState(true);
  const [aiOption, setAiOption] = useState<BCGenAIOptionId>(
    BC_GEN_AI_DEFAULT_OPTION_ID,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resolved, setResolved] = useState(false);
  const [history, setHistory] = useState<BCCaseSession[]>([]);
  const [sessionSummary, setSessionSummary] =
    useState<BCTrainerSessionSummary | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [savingPlaybook, setSavingPlaybook] = useState(false);

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

  // Load the trainer history (feature #6).
  const refreshHistory = useCallback(async () => {
    try {
      const rows = await bcDatabase.sessions
        .where("mode")
        .equals("trainer")
        .toArray();
      setHistory(rows.reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    }
  }, []);

  useEffect(() => {
    // Wrap in an async IIFE so the setState inside refreshHistory happens in
    // a microtask (avoids a synchronous setState within the effect body).
    void (async () => {
      await refreshHistory();
    })();
  }, [refreshHistory]);

  // Load a session from `?trainerId=<id>` or `?historyId=<id>` so the user can
  // go back to a specific trainer session (feature #6 / session-history resume).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("trainerId") ?? params.get("historyId");
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
        setResolved(session.resolved ?? false);
        setSessionSummary(session.summaryData ?? null);
        setPersonas(personaRows);
        setCases(caseRows);
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
    setFeedback(null);
    setGuide(null);
    setCritique(null);
    setResolved(false);
    setSessionSummary(null);
    setSavedToLibrary(false);
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
        mode: "trainer",
        status: "active",
        resolved: false,
        startedAt: Date.now(),
      });
      setSessionId(sessionIdValue);

      const opening = await bcTrainerPersonaReply(
        { persona, scenario, history: [], userMsg: "", aiOptions: aiOption },
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

      // Trainer Option: show the initial guide for the first turn.
      if (trainerOptionEnabled) {
        try {
          const guideValue = await bcTrainerTurnGuide(
            { persona, scenario, history: [], aiOptions: aiOption },
            aiConfig,
          );
          setGuide(guideValue);
        } catch {
          // Guide is optional — continue without it.
          setGuide(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setBusy(false);
    }
  }, [personaId, caseId, personas, cases, appendMessage, trainerOptionEnabled, aiOption]);

  const submitDraft = useCallback(async () => {
    setError("");
    setFeedback(null);
    setCritique(null);
    if (!sessionId || !currentPersona || !currentScenario) {
      setError("Start a training session first.");
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) return;

    setPendingDraft(trimmed);
    setBusy(true);
    try {
      const settingsRepo = new BCSettingsRepository();
      const aiConfig = await settingsRepo.getActiveAIConfig();
      if (trainerOptionEnabled) {
        const critiqueValue = await bcTrainerCritiqueDraft(
          {
            persona: currentPersona,
            scenario: currentScenario,
            history: historyForAI(),
            draft: trimmed,
            aiOptions: aiOption,
          },
          aiConfig,
        );
        setCritique(critiqueValue);
      } else {
        const coach = await bcTrainerCoachFeedback(
          {
            persona: currentPersona,
            scenario: currentScenario,
            history: historyForAI(),
            draft: trimmed,
            aiOptions: aiOption,
          },
          aiConfig,
        );
        setFeedback(coach);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coaching failed");
    } finally {
      setBusy(false);
    }
  }, [
    sessionId,
    currentPersona,
    currentScenario,
    draft,
    historyForAI,
    trainerOptionEnabled,
    aiOption,
  ]);

  const validateDraft = useCallback(async () => {
    if (!sessionId || !currentPersona || !currentScenario) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    setError("");
    setCritique(null);
    setFeedback(null);
    setPendingDraft(trimmed);
    setBusy(true);
    try {
      const settingsRepo = new BCSettingsRepository();
      const aiConfig = await settingsRepo.getActiveAIConfig();
      const critiqueValue = await bcTrainerCritiqueDraft(
        {
          persona: currentPersona,
          scenario: currentScenario,
          history: historyForAI(),
          draft: trimmed,
          aiOptions: aiOption,
        },
        aiConfig,
      );
      setCritique(critiqueValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setBusy(false);
    }
  }, [
    sessionId,
    currentPersona,
    currentScenario,
    draft,
    historyForAI,
    aiOption,
  ]);

  const sendAgentMessage = useCallback(
    async (text: string, correction?: string, correctionReason?: string) => {
      if (!sessionId || !currentPersona || !currentScenario) return;
      await appendMessage({
        sessionId,
        role: "agent",
        external: text,
        correction,
        correctionReason,
        createdAt: Date.now(),
      });

      const settingsRepo = new BCSettingsRepository();
      const aiConfig = await settingsRepo.getActiveAIConfig();
      const reply = await bcTrainerPersonaReply(
        {
          persona: currentPersona,
          scenario: currentScenario,
          history: historyForAI(),
          userMsg: text,
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
        createdAt: Date.now(),
      });

      // Show the next turn's guide when the Trainer Option is enabled.
      if (trainerOptionEnabled) {
        try {
          const guideValue = await bcTrainerTurnGuide(
            {
              persona: currentPersona,
              scenario: currentScenario,
              history: historyForAI(),
              aiOptions: aiOption,
            },
            aiConfig,
          );
          setGuide(guideValue);
        } catch {
          setGuide(null);
        }
      } else {
        setGuide(null);
      }
    },
    [
      sessionId,
      currentPersona,
      currentScenario,
      historyForAI,
      appendMessage,
      trainerOptionEnabled,
      aiOption,
    ],
  );

  const acceptCorrection = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const suggestion = critique?.suggestion ?? feedback?.suggestion ?? pendingDraft;
      await sendAgentMessage(suggestion, suggestion, critique?.improvements?.join(" ") ?? feedback?.reason);
      setDraft("");
      setPendingDraft("");
      setFeedback(null);
      setCritique(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }, [critique, feedback, pendingDraft, sendAgentMessage]);

  const overwriteCorrection = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await sendAgentMessage(
        pendingDraft,
        critique?.suggestion ?? feedback?.suggestion,
        critique?.improvements?.join(" ") ?? feedback?.reason,
      );
      setDraft("");
      setPendingDraft("");
      setFeedback(null);
      setCritique(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }, [pendingDraft, critique, feedback, sendAgentMessage]);

  /** Send the draft without any AI guide (feature #5). */
  const sendWithoutGuide = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await sendAgentMessage(pendingDraft || draft.trim());
      setDraft("");
      setPendingDraft("");
      setFeedback(null);
      setCritique(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }, [pendingDraft, draft, sendAgentMessage]);

  /** Re-validate the modified draft (feature #5). */
  const revalidateDraft = useCallback(async () => {
    if (!sessionId || !currentPersona || !currentScenario) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    setError("");
    setBusy(true);
    try {
      const settingsRepo = new BCSettingsRepository();
      const aiConfig = await settingsRepo.getActiveAIConfig();
      const critiqueValue = await bcTrainerCritiqueDraft(
        {
          persona: currentPersona,
          scenario: currentScenario,
          history: historyForAI(),
          draft: trimmed,
          aiOptions: aiOption,
        },
        aiConfig,
      );
      setCritique(critiqueValue);
      setPendingDraft(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setBusy(false);
    }
  }, [
    sessionId,
    currentPersona,
    currentScenario,
    draft,
    historyForAI,
    aiOption,
  ]);

  const finishSession = useCallback(
    async (status: "completed" | "failed", resolvedFlag: boolean) => {
      if (sessionId == null) return;
      await bcDatabase.sessions.update(sessionId, {
        status,
        resolved: resolvedFlag,
        endedAt: Date.now(),
      });
      setResolved(resolvedFlag);
      setSessionId(null);
      setGuide(null);
      setCritique(null);
      setFeedback(null);
      await refreshHistory();
    },
    [sessionId, refreshHistory],
  );

  const resolveCase = useCallback(
    () => finishSession("completed", true),
    [finishSession],
  );

  // Feature #10: ending a session reviews the whole conversation and produces
  // a final summary + guide + rating of what the trainee is missing.
  const endSession = useCallback(async () => {
    if (sessionId == null) return;
    setBusy(true);
    setError("");
    try {
      let summaryData: BCTrainerSessionSummary | null = null;
      if (currentPersona && currentScenario && messages.length > 0) {
        try {
          const settingsRepo = new BCSettingsRepository();
          const aiConfig = await settingsRepo.getActiveAIConfig();
          summaryData = await bcTrainerSessionSummary(
            {
              persona: currentPersona,
              scenario: currentScenario,
              history: historyForAI(),
              aiOptions: aiOption,
            },
            aiConfig,
          );
        } catch {
          summaryData = null;
        }
      }
      await bcDatabase.sessions.update(sessionId, {
        status: "completed",
        resolved: false,
        endedAt: Date.now(),
        ...(summaryData ? { summary: summaryData.summary, summaryData } : {}),
      });
      setSessionSummary(summaryData);
      setSessionId(null);
      setGuide(null);
      setCritique(null);
      setFeedback(null);
      setDraft("");
      setPendingDraft("");
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end session");
    } finally {
      setBusy(false);
    }
  }, [
    sessionId,
    currentPersona,
    currentScenario,
    messages,
    historyForAI,
    aiOption,
    refreshHistory,
  ]);

  // Feature #6: load a past trainer session by its id.
  const loadSession = useCallback(async (id: number) => {
    setError("");
    setSavedToLibrary(false);
    setSessionSummary(null);
    try {
      const session = await bcDatabase.sessions.get(id);
      if (!session) {
        setError("Trainer session not found.");
        return;
      }
      const messageRows = await bcDatabase.messages
        .where("sessionId")
        .equals(id)
        .toArray();
      setSessionId(id);
      setMessages(
        messageRows.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
      );
      setPersonaId(session.personaId ?? null);
      setCaseId(session.caseId ?? null);
      setResolved(session.resolved ?? false);
      setSessionSummary(session.summaryData ?? null);
      setGuide(null);
      setCritique(null);
      setFeedback(null);
      setDraft("");
      setPendingDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    }
  }, []);

  const deleteSession = useCallback(
    async (id: number) => {
      setError("");
      try {
        await bcDatabase.messages.where("sessionId").equals(id).delete();
        await bcDatabase.sessions.delete(id);
        if (sessionId === id) {
          setSessionId(null);
          setMessages([]);
          setSessionSummary(null);
          setResolved(false);
        }
        await refreshHistory();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete session",
        );
      }
    },
    [sessionId, refreshHistory],
  );

  const clearHistory = useCallback(async () => {
    setError("");
    try {
      await bcDatabase.messages.clear();
      await bcDatabase.sessions.clear();
      setHistory([]);
      setSessionId(null);
      setMessages([]);
      setSessionSummary(null);
      setResolved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear history");
    }
  }, []);

  // Feature #11: save the current trainer session to the Playbook Library.
  const saveToPlaybook = useCallback(async () => {
    if (messages.length === 0) return;
    setSavingPlaybook(true);
    setError("");
    try {
      const transcript = messages
        .map(
          (m) =>
            `[${m.role}] ${m.external}${m.internal ? ` (${m.internal})` : ""}`,
        )
        .join("\n");
      const sentimentTrend = messages
        .filter((m) => m.sentiment != null)
        .map((m) => String(m.sentiment))
        .join(",");
      const title = `${currentScenario?.title ?? "Training session"} — Playbook`;
      await bcDatabase.playbooks.add({
        title,
        caseId: caseId ?? undefined,
        personaId: personaId ?? undefined,
        summary:
          sessionSummary?.summary ??
          "Training session saved to the playbook library.",
        transcript,
        sentimentTrend: sentimentTrend || undefined,
        tags: "trainer",
        status: "draft",
        createdAt: Date.now(),
      });
      // Also add a Communication Template so it shows up in the template library.
      await bcDatabase.templates.add({
        title,
        caseId: caseId ?? undefined,
        personaId: personaId ?? undefined,
        content: transcript,
        steps: sessionSummary?.guide?.join("\n") ?? "",
        source: "trainer",
        tags: "trainer",
        createdAt: Date.now(),
      });
      setSavedToLibrary(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save playbook");
    } finally {
      setSavingPlaybook(false);
    }
  }, [messages, currentScenario, caseId, personaId, sessionSummary]);

  const newThread = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setDraft("");
    setPendingDraft("");
    setFeedback(null);
    setGuide(null);
    setCritique(null);
    setResolved(false);
    setSessionSummary(null);
    setSavedToLibrary(false);
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
    pendingDraft,
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
  };
}
