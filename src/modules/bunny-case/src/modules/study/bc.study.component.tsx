// bc.study.component.tsx
//
// Study — pick a case (optionally a persona) and generate a 1000-2000 word
// handbook / guide book. Features:
//  - "Generate type" selector (feature #12): default / manual / case study /
//    generative instruction / tips & guides / to-do list / beginner /
//    advanced.
//  - Training mode (case handling / job interview) via the shared Generative
//    AI options — single source of truth (feature #5).
//  - Every generated handbook creates its record in the Study library and is
//    viewable (feature #4).
//  - The handbook content is rendered as markdown using the Render module
//    (feature #4).

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import {
  BookOpen,
  Sparkles,
  Save,
  CheckCircle2,
  ListChecks,
  FileText,
  Clock,
  RefreshCw,
  ExternalLink,
  Eye,
} from "lucide-react";
import { RenderView } from "@/src/modules/render";
import { bcDatabase } from "../../database/bc.database";
import { bcGenerateStudy } from "./bc.study.server";
import { bcStudyWordCount } from "./bc.study.entity";
import type {
  BCStudy,
  BCStudyGenerateType,
  BCStudyOutlinePoint,
} from "./bc.study.entity";
import { bcStudyGenerateTypeList } from "./bc.study.prompt";
import type { BCCasePersona } from "../persona-architect/bc.persona.entity";
import type { BCCaseScenario } from "../case-base/bc.case.entity";
import { BCGenAIOptionSelector } from "../generative-ai/bc.generative-ai.selector";
import type { BCGenAIOptionId } from "../generative-ai/bc.generative-ai.entity";
import { BC_GEN_AI_DEFAULT_OPTION_ID } from "../generative-ai/bc.generative-ai.entity";
import BCSettingsRepository from "../settings/bc.settings.repository";

export default function BCStudyComponent() {
  const [cases, setCases] = useState<BCCaseScenario[]>([]);
  const [personas, setPersonas] = useState<BCCasePersona[]>([]);
  const [caseId, setCaseId] = useState<number | null>(null);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [generateType, setGenerateType] =
    useState<BCStudyGenerateType>("default");
  const [aiOption, setAiOption] = useState<BCGenAIOptionId>(
    BC_GEN_AI_DEFAULT_OPTION_ID,
  );
  const [study, setStudy] = useState<BCStudy | null>(null);
  const [studyId, setStudyId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const loadedParamRef = useRef<number | null>(null);

  // Keep `?studyId=<id>` in sync with the currently displayed study so it can
  // be reopened from the Study library (feature #4).
  const updateStudyParam = useCallback((id: number | null) => {
    const url = new URL(window.location.href);
    if (id == null) {
      url.searchParams.delete("studyId");
    } else {
      url.searchParams.set("studyId", String(id));
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [caseRows, personaRows] = await Promise.all([
          bcDatabase.cases.toArray(),
          bcDatabase.personas.toArray(),
        ]);
        if (!cancelled) {
          setCases(caseRows);
          setPersonas(personaRows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load cases");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load a study from the `?studyId=<id>` query parameter.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("studyId");
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const record = await bcDatabase.studies.get(id);
        if (!cancelled && record) {
          loadedParamRef.current = id;
          setStudy(record);
          setStudyId(record.id ?? id);
          setSaved(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load study");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = async () => {
    setError("");
    setSaved(false);
    if (caseId == null) {
      setError("Select a case first.");
      return;
    }
    const scenario = cases.find((c) => c.id === caseId);
    // Persona is optional (feature): when none is selected or linked, the
    // handbook is generated from the case alone.
    const persona = personaId
      ? personas.find((p) => p.id === personaId)
      : personas.find((p) => p.id === scenario?.personaId);
    if (!scenario) {
      setError("Could not resolve the selected case.");
      return;
    }

    setLoading(true);
    setStudy(null);
    setStudyId(null);
    try {
      const settingsRepo = new BCSettingsRepository();
      const aiConfig = await settingsRepo.getActiveAIConfig();
      const generated = await bcGenerateStudy(
        {
          persona,
          scenario,
          generateType,
          aiOptions: aiOption,
        },
        aiConfig,
      );
      const studyRecord: BCStudy = {
        caseId: scenario.id,
        personaId: persona?.id,
        caseTitle: scenario.title,
        personaName: persona?.name,
        title: generated.title,
        content: generated.content,
        outline: generated.outline,
        wordCount: bcStudyWordCount(generated.content),
        generateType,
        trainingMode: aiOption,
        createdAt: Date.now(),
      };
      // Feature #4: generating immediately creates its record in the library.
      const id = await bcDatabase.studies.add(studyRecord);
      setStudy({ ...studyRecord, id });
      setStudyId(id);
      setSaved(true);
      updateStudyParam(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const saveStudy = async () => {
    if (!study) return;
    setSaving(true);
    setError("");
    try {
      if (study.id != null) {
        await bcDatabase.studies.put(study);
        setStudyId(study.id);
      } else {
        const id = await bcDatabase.studies.add(study);
        setStudyId(id);
      }
      setSaved(true);
      updateStudyParam(studyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save study");
    } finally {
      setSaving(false);
    }
  };

  const newStudy = useCallback(() => {
    setStudy(null);
    setStudyId(null);
    setSaved(false);
    updateStudyParam(null);
  }, [updateStudyParam]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-indigo-400 rounded-xl flex items-center justify-center shadow-lg shadow-sky-100">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Study</h1>
          <p className="text-sm text-slate-400">
            Generate a 1000–2000 word handbook & guide book for any case.
          </p>
        </div>
        {studyId != null && (
          <button
            onClick={newStudy}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border text-slate-500 border-slate-200 hover:bg-slate-50"
            title="Start a new study"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">New Study</span>
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Configuration ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Case
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              value={caseId ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                setCaseId(id);
                // Auto-select the linked persona when the case changes.
                const scenario = cases.find((c) => c.id === id);
                if (scenario?.personaId) setPersonaId(scenario.personaId);
              }}
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
              Persona{" "}
              <span className="normal-case text-slate-400">(optional)</span>
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              value={personaId ?? ""}
              onChange={(e) =>
                setPersonaId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Auto (linked persona)</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Generate Type{" "}
              <span className="normal-case text-slate-400">(feature #12)</span>
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              value={generateType}
              onChange={(e) =>
                setGenerateType(e.target.value as BCStudyGenerateType)
              }
            >
              {bcStudyGenerateTypeList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              {
                bcStudyGenerateTypeList.find((t) => t.id === generateType)
                  ?.description
              }
            </p>
          </div>
          <div>
            <BCGenAIOptionSelector
              value={aiOption}
              onChange={setAiOption}
              label="Training Mode"
            />
          </div>
        </div>
        <Button
          onPress={() => void generate()}
          isDisabled={loading}
          className="w-full bg-sky-600 text-white"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" color="current" />
              Writing handbook…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Handbook
            </span>
          )}
        </Button>
        <p className="text-xs text-slate-400">
          Generating creates a record in the Study library with a view button
          to reopen it later.
        </p>
      </div>

      {/* ── Generated handbook ────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center gap-2 justify-center py-10">
          <Spinner color="success" size="lg" />
          <p className="text-sm text-slate-400">
            Writing the handbook… this may take a moment.
          </p>
        </div>
      )}

      {study && !loading && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {study.title}
                </h2>
                <p className="text-xs text-slate-400">
                  {study.caseTitle} · {study.personaName ?? "No persona"} ·{" "}
                  <span className="inline-flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {study.wordCount} words
                  </span>{" "}
                  ·{" "}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {study.createdAt
                      ? new Date(study.createdAt).toLocaleString()
                      : "—"}
                  </span>{" "}
                  {study.generateType && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-100 text-sky-600 px-2 py-0.5">
                      {
                        bcStudyGenerateTypeList.find(
                          (t) => t.id === study.generateType,
                        )?.label
                      }
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {studyId != null ? (
                  <Button
                    onPress={saveStudy}
                    isDisabled={saving}
                    className={
                      saved
                        ? "bg-emerald-100 text-emerald-600 shrink-0"
                        : "bg-slate-800 text-white shrink-0"
                    }
                  >
                    {saved ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Saved
                      </span>
                    ) : saving ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="sm" color="current" /> Saving…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save
                      </span>
                    )}
                  </Button>
                ) : (
                  <Button
                    onPress={() => void saveStudy()}
                    isDisabled={saving}
                    className="bg-slate-800 text-white shrink-0"
                  >
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" /> Save to Library
                    </span>
                  </Button>
                )}
                {studyId != null && (
                  <a
                    href={`/modules/bunny-case/study/view/${studyId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 text-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-50 shrink-0"
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Open in Viewer
                    </span>
                  </a>
                )}
                <a
                  href="/modules/bunny-case/study"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 text-slate-500 px-4 py-2 text-sm font-medium hover:bg-slate-50 shrink-0"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" /> View Library
                  </span>
                </a>
              </div>
            </div>

            {/* Feature #4: render the handbook markdown with the Render module */}
            <div className="border-t border-slate-100 pt-4">
              <RenderView format="markdown" content={study.content} />
            </div>
          </div>

          {study.outline && study.outline.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <ListChecks className="w-4 h-4 text-sky-500" />
                Quick Summary — memorize these
              </div>
              <div className="space-y-2">
                {study.outline.map((point: BCStudyOutlinePoint, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="text-sm font-semibold text-slate-700">
                      {point.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {point.summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!study && !loading && (
        <p className="text-center text-sm text-slate-400 py-10">
          Select a case and a generate type, then generate a handbook to study
          it deeply.
        </p>
      )}
    </div>
  );
}
