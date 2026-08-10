// bc.simulator.hooks.ts
//
// useBCSimulator — orchestrates the observation flow: load personas, agent
// personas and cases; generate the ideal-agent dialogue (dual-view) with an
// optional turn count and ending (resolved / unresolved); persist each
// generated run to the `simulators` table and expose history operations
// (reload / delete). Extracted playbooks are saved to the Playbook Library
// (feature: fix save to playbook) as well as the Communication Templates.

"use client";

import { useCallback, useEffect, useState } from "react";
import type { BCCasePersona } from "../persona-architect/bc.persona.entity";
import type { BCCaseScenario } from "../case-base/bc.case.entity";
import type { BCAgentPersona } from "../agent-persona/bc.agent-persona.entity";
import type {
  BCSimulationResult,
  BCSimulationOutcome,
  BCSimulatorRecord,
} from "./bc.simulator.entity";
import { bcDatabase } from "../../database/bc.database";
import { bcSimulateConversation } from "./bc.simulator.server";
import { bcExtractPlaybook } from "../template/bc.template.server";
import BCSettingsRepository from "../settings/bc.settings.repository";
import type { BCGenAIOptionId } from "../generative-ai/bc.generative-ai.entity";
import { BC_GEN_AI_DEFAULT_OPTION_ID } from "../generative-ai/bc.generative-ai.entity";

export interface BCSimulatorState {
  personas: BCCasePersona[];
  cases: BCCaseScenario[];
  agentPersonas: BCAgentPersona[];
  personaId: number | null;
  caseId: number | null;
  agentPersonaId: number | null;
  /** Optional requested turn count (null = let the AI decide, default 6-10). */
  turnCount: number | null;
  /** How the conversation should end. */
  outcome: BCSimulationOutcome;
  /** Generative AI training-mode option. */
  aiOption: BCGenAIOptionId;
  result: BCSimulationResult | null;
  /** Id of the currently loaded simulator history record (if any). */
  simulatorId: number | null;
  /** Full history of generated simulations (newest first). */
  history: BCSimulatorRecord[];
  loading: boolean;
  extracting: boolean;
  saving: boolean;
  savedTemplateId: number | null;
  savedToLibrary: boolean;
  error: string;
  load: () => Promise<void>;
  setPersonaId: (id: number | null) => void;
  setCaseId: (id: number | null) => void;
  setAgentPersonaId: (id: number | null) => void;
  setTurnCount: (count: number | null) => void;
  setOutcome: (outcome: BCSimulationOutcome) => void;
  setAiOption: (id: BCGenAIOptionId) => void;
  /** Generates a simulation, persists it, and returns the new simulatorId. */
  generate: () => Promise<number | null>;
  loadSimulator: (id: number) => Promise<void>;
  deleteSimulator: (id: number) => Promise<void>;
  clearHistory: () => Promise<void>;
  extractTemplate: () => Promise<void>;
}

export function useBCSimulator(): BCSimulatorState {
  const [personas, setPersonas] = useState<BCCasePersona[]>([]);
  const [cases, setCases] = useState<BCCaseScenario[]>([]);
  const [agentPersonas, setAgentPersonas] = useState<BCAgentPersona[]>([]);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [caseId, setCaseId] = useState<number | null>(null);
  const [agentPersonaId, setAgentPersonaId] = useState<number | null>(null);
  const [turnCount, setTurnCount] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<BCSimulationOutcome>("resolved");
  const [aiOption, setAiOption] = useState<BCGenAIOptionId>(
    BC_GEN_AI_DEFAULT_OPTION_ID,
  );
  const [result, setResult] = useState<BCSimulationResult | null>(null);
  const [simulatorId, setSimulatorId] = useState<number | null>(null);
  const [history, setHistory] = useState<BCSimulatorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTemplateId, setSavedTemplateId] = useState<number | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [personaRows, caseRows, agentRows, simRows] = await Promise.all([
        bcDatabase.personas.toArray(),
        bcDatabase.cases.toArray(),
        bcDatabase.agentPersonas.toArray(),
        bcDatabase.simulators.toArray(),
      ]);
      setPersonas(personaRows);
      setCases(caseRows);
      setAgentPersonas(agentRows);
      setHistory(simRows.reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [personaRows, caseRows, agentRows, simRows] = await Promise.all([
          bcDatabase.personas.toArray(),
          bcDatabase.cases.toArray(),
          bcDatabase.agentPersonas.toArray(),
          bcDatabase.simulators.toArray(),
        ]);
        if (!cancelled) {
          setPersonas(personaRows);
          setCases(caseRows);
          setAgentPersonas(agentRows);
          setHistory(simRows.reverse());
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

  const generate = useCallback(async (): Promise<number | null> => {
    setError("");
    setSavedTemplateId(null);
    setSavedToLibrary(false);
    if (personaId == null || caseId == null) {
      setError("Select a persona and a case first.");
      return null;
    }
    const persona = personas.find((p) => p.id === personaId);
    const scenario = cases.find((c) => c.id === caseId);
    const agentPersona = agentPersonaId
      ? agentPersonas.find((a) => a.id === agentPersonaId)
      : undefined;
    if (!persona || !scenario) {
      setError("Could not resolve the selected persona / case.");
      return null;
    }

    setLoading(true);
    try {
      const settingsRepo = new BCSettingsRepository();
      const aiConfig = await settingsRepo.getActiveAIConfig();
      const simulation = await bcSimulateConversation(
        {
          persona,
          scenario,
          agentPersona,
          turns: turnCount ?? undefined,
          outcome,
          aiOptions: aiOption,
        },
        aiConfig,
      );
      setResult(simulation);

      // Feature #1: persist every generated run to the simulator history table
      // and set the current simulatorId so it can be shared / reloaded via
      // `?simulatorId=<id>`.
      const record: BCSimulatorRecord = {
        personaId,
        caseId,
        agentPersonaId: agentPersona?.id,
        personaName: persona.name,
        caseTitle: scenario.title,
        agentPersonaName: agentPersona?.name,
        result: simulation,
        createdAt: Date.now(),
      };
      const id = await bcDatabase.simulators.add(record);
      setSimulatorId(id);
      const simRows = await bcDatabase.simulators.toArray();
      setHistory(simRows.reverse());
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    personaId,
    caseId,
    agentPersonaId,
    personas,
    cases,
    agentPersonas,
    turnCount,
    outcome,
    aiOption,
  ]);

  const loadSimulator = useCallback(async (id: number) => {
    setError("");
    setSavedTemplateId(null);
    setSavedToLibrary(false);
    try {
      const record = await bcDatabase.simulators.get(id);
      if (!record) {
        setError("Simulator record not found.");
        return;
      }
      setResult(record.result);
      setSimulatorId(record.id ?? id);
      if (record.personaId != null) setPersonaId(record.personaId);
      if (record.caseId != null) setCaseId(record.caseId);
      if (record.agentPersonaId != null) setAgentPersonaId(record.agentPersonaId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load simulator");
    }
  }, []);

  const deleteSimulator = useCallback(async (id: number) => {
    setError("");
    try {
      await bcDatabase.simulators.delete(id);
      if (simulatorId === id) {
        setSimulatorId(null);
        setResult(null);
      }
      const simRows = await bcDatabase.simulators.toArray();
      setHistory(simRows.reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete simulator");
    }
  }, [simulatorId]);

  const clearHistory = useCallback(async () => {
    setError("");
    try {
      await bcDatabase.simulators.clear();
      setHistory([]);
      setSimulatorId(null);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear history");
    }
  }, []);

  const extractTemplate = useCallback(async () => {
    if (!result || result.turns.length === 0) return;
    setExtracting(true);
    setError("");
    setSavedTemplateId(null);
    setSavedToLibrary(false);
    try {
      const persona = personas.find((p) => p.id === personaId);
      const scenario = cases.find((c) => c.id === caseId);
      const settingsRepo = new BCSettingsRepository();
      const aiConfig = await settingsRepo.getActiveAIConfig();
      const playbook = await bcExtractPlaybook(
        result.turns,
        persona?.name ?? "",
        scenario?.title ?? "",
        aiConfig,
      );

      // Keep the Communication Template behaviour.
      const id = await bcDatabase.templates.add({
        title: playbook.title,
        caseId: caseId ?? undefined,
        personaId: personaId ?? undefined,
        content: playbook.content,
        steps: playbook.steps.join("\n"),
        source: "simulator",
        tags: playbook.tags.join(", "),
        createdAt: Date.now(),
      });
      setSavedTemplateId(id);

      // Feature #2 (fix): also save to the Playbook Library so the extracted
      // playbook actually shows up in the library module.
      const transcript = result.turns
        .map((t) => `[${t.speaker}] ${t.external}`)
        .join("\n");
      await bcDatabase.playbooks.add({
        title: playbook.title,
        caseId: caseId ?? undefined,
        personaId: personaId ?? undefined,
        summary: result.summary,
        transcript,
        keyPhrases: result.tips?.keyPhrases?.join(", "),
        recommendedPhrases: playbook.steps.join(", "),
        tags: playbook.tags.join(", "),
        status: "draft",
        createdAt: Date.now(),
      });
      setSavedToLibrary(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }, [result, personaId, caseId, personas, cases]);

  return {
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
    saving,
    savedTemplateId,
    savedToLibrary,
    error,
    load,
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
  };
}
