"use client";

// BDSpecRefine — "AI Document Assist · Refine". An interactive wizard that asks
// clarifying questions (four options each, one recommended) and revises the
// document per turn, at a chosen refinement level.

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { bdDB } from "../../BDDatabase";
import type {
  BDSpecDocMode,
  BDSpecRecord,
  BDSpecSection,
} from "../../BDDomain.Types";
import {
  BD_SPEC_REFINE_LEVELS,
  BD_SPEC_REFINE_LEVEL_ORDER,
  BD_SPEC_REFINEMENT_GENERIC,
  inferDocMode,
  slugify,
  specDraftToMarkdown,
  specRefinementTypes,
  type BDSpecRefineAnswer,
  type BDSpecRefineLevel,
  type BDSpecRefineQuestion,
  type BDSpecSectionDraft,
} from "./BDSpec.Types";
import { useBDAISettings } from "../ai-settings/BDAISettings.Context";
import {
  bdGenerateSpecQuestions,
  bdReviseSpec,
  type BDSpecDocumentInput,
} from "./BDSpecBuilder.Server";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import BDBadge from "../../components/BDBadge";
import BDMarkdownView from "../../components/BDMarkdownView";

type Phase = "setup" | "questions" | "review";

interface WorkingDoc {
  name: string;
  summary?: string;
  content?: string;
  sections: BDSpecSectionDraft[];
}

export interface BDSpecRefineComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  documents: BDSpecRecord[];
  initialDocumentId?: string;
  onApply: (recordId: string, patch: Partial<BDSpecRecord>) => void;
}

const LABEL = "text-[11px] font-medium text-slate-500";

function recordToWorking(record: BDSpecRecord): WorkingDoc {
  return {
    name: record.name,
    summary: record.summary,
    content: record.content,
    sections: record.sections.map((s) => ({
      title: s.title,
      level: s.level,
      summary: s.summary,
      content: s.content,
    })),
  };
}

function workingToInput(
  record: BDSpecRecord,
  doc: WorkingDoc,
  docMode: BDSpecDocMode,
): BDSpecDocumentInput {
  return {
    name: doc.name,
    type: record.type,
    summary: doc.summary,
    docMode,
    content: doc.content,
    sections: doc.sections.map((s) => ({
      title: s.title,
      level: s.level,
      summary: s.summary,
      content: s.content,
    })),
  };
}

export function BDSpecRefineComponent({
  open,
  onOpenChange,
  projectId,
  documents,
  initialDocumentId,
  onApply,
}: BDSpecRefineComponentProps) {
  const { aiConfig: globalAiConfig } = useBDAISettings();
  const overrideKey = `project-${projectId}`;
  const projectOverride = useLiveQuery(
    () => bdDB.aiSettings.get(overrideKey),
    [overrideKey],
  );
  const aiConfig = projectOverride
    ? { provider: projectOverride.provider, model: projectOverride.model }
    : globalAiConfig;

  const [phase, setPhase] = useState<Phase>("setup");
  const [documentId, setDocumentId] = useState(initialDocumentId ?? "");
  const [level, setLevel] = useState<BDSpecRefineLevel>("medium");
  const [refinementType, setRefinementType] = useState<string>(
    BD_SPEC_REFINEMENT_GENERIC,
  );
  const [turnIndex, setTurnIndex] = useState(0);
  const [working, setWorking] = useState<WorkingDoc | null>(null);
  const [questions, setQuestions] = useState<BDSpecRefineQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<WorkingDoc | null>(null);
  const [priorAnswers, setPriorAnswers] = useState<BDSpecRefineAnswer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPhase("setup");
      setDocumentId(initialDocumentId ?? documents[0]?.id ?? "");
      setLevel("medium");
      setRefinementType(BD_SPEC_REFINEMENT_GENERIC);
      setTurnIndex(0);
      setWorking(null);
      setQuestions([]);
      setAnswers({});
      setPending(null);
      setPriorAnswers([]);
      setBusy(false);
      setError(null);
    }
  }

  const selectedDocument =
    documents.find((d) => d.id === documentId) ?? null;
  const docMode: BDSpecDocMode = selectedDocument
    ? inferDocMode(selectedDocument)
    : "sectioned";
  const levelConfig = BD_SPEC_REFINE_LEVELS[level];

  const typeOptions = selectedDocument
    ? specRefinementTypes(selectedDocument.type)
    : [];

  const close = () => {
    if (busy) return;
    onOpenChange(false);
  };

  const answersArray = (): BDSpecRefineAnswer[] =>
    questions.map((q) => ({
      question: q.question,
      answer: answers[q.id] ?? "",
    }));

  const fetchQuestions = async (
    turn: number,
    doc: WorkingDoc,
    prior: BDSpecRefineAnswer[],
  ) => {
    if (!selectedDocument) return;
    setBusy(true);
    setError(null);
    try {
      const qs = await bdGenerateSpecQuestions({
        document: workingToInput(selectedDocument, doc, docMode),
        level,
        turnIndex: turn,
        totalTurns: levelConfig.turns,
        minQuestions: levelConfig.minQuestions,
        maxQuestions: levelConfig.maxQuestions,
        refinementType,
        priorAnswers: prior,
        aiConfig: { provider: aiConfig.provider, model: aiConfig.model },
      });
      setQuestions(qs);
      setAnswers(
        Object.fromEntries(
          qs.map((q) => [
            q.id,
            (q.options.find((o) => o.recommended) ?? q.options[0])?.label ?? "",
          ]),
        ),
      );
      setPriorAnswers(prior);
      setTurnIndex(turn);
      setPending(null);
      setPhase("questions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate questions.");
    } finally {
      setBusy(false);
    }
  };

  const handleStart = () => {
    if (!selectedDocument) {
      setError("Select a document to refine.");
      return;
    }
    const doc = recordToWorking(selectedDocument);
    setWorking(doc);
    void fetchQuestions(0, doc, []);
  };

  const generateRevision = async (doc: WorkingDoc, answersList: BDSpecRefineAnswer[]) => {
    if (!selectedDocument) return;
    setBusy(true);
    setError(null);
    try {
      const revision = await bdReviseSpec({
        document: workingToInput(selectedDocument, doc, docMode),
        refinementType,
        answers: answersList,
        docMode,
        aiConfig: { provider: aiConfig.provider, model: aiConfig.model },
      });
      setPending({
        name: revision.name?.trim() || doc.name,
        summary: revision.summary ?? doc.summary,
        content: docMode === "single" ? revision.content ?? doc.content : doc.content,
        sections:
          docMode === "sectioned"
            ? revision.sections ?? doc.sections
            : doc.sections,
      });
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revise the document.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitAnswers = () => {
    if (!working) return;
    void generateRevision(working, answersArray());
  };

  const handleRetry = () => {
    if (!working) return;
    void generateRevision(working, answersArray());
  };

  const finish = (doc: WorkingDoc) => {
    if (!selectedDocument) return;
    const patch: Partial<BDSpecRecord> = {
      name: doc.name,
      summary: doc.summary,
      updatedAt: new Date().toISOString(),
    };
    if (docMode === "single") {
      patch.content = doc.content ?? "";
    } else {
      const existing = selectedDocument.sections;
      patch.sections = doc.sections.map((s, i) => {
        const prev = existing[i];
        const section: BDSpecSection = {
          id: prev?.id ?? crypto.randomUUID(),
          title: s.title,
          level: (s.level ?? 2) as BDSpecSection["level"],
          anchor: slugify(s.title),
          summary: s.summary,
          content: s.content ?? "",
          position: i,
        };
        return section;
      });
    }
    onApply(selectedDocument.id, patch);
    onOpenChange(false);
  };

  const handleAccept = (andFinish: boolean) => {
    if (!pending) return;
    const isLastTurn = turnIndex + 1 >= levelConfig.turns;
    if (andFinish || isLastTurn) {
      finish(pending);
      return;
    }
    const doc = pending;
    setWorking(doc);
    const nextPrior = [...priorAnswers, ...answersArray()];
    setPriorAnswers(nextPrior);
    void fetchQuestions(turnIndex + 1, doc, nextPrior);
  };

  const recommendedFirst = (q: BDSpecRefineQuestion) =>
    [...q.options].sort(
      (a, b) => Number(b.recommended) - Number(a.recommended),
    );

  const footer =
    phase === "setup" ? (
      <>
        <BDButton variant="ghost" onClick={close} disabled={busy}>
          Cancel
        </BDButton>
        <BDButton icon={Sparkles} isLoading={busy} onClick={handleStart}>
          Start refinement
        </BDButton>
      </>
    ) : phase === "questions" ? (
      <>
        <BDButton variant="ghost" onClick={close} disabled={busy}>
          Cancel
        </BDButton>
        <BDButton icon={Sparkles} isLoading={busy} onClick={handleSubmitAnswers}>
          Submit answers
        </BDButton>
      </>
    ) : turnIndex + 1 >= levelConfig.turns ? (
      <>
        <BDButton
          variant="ghost"
          icon={RotateCcw}
          onClick={handleRetry}
          disabled={busy}
        >
          Retry
        </BDButton>
        <BDButton icon={Check} isLoading={busy} onClick={() => handleAccept(true)}>
          Apply revision
        </BDButton>
      </>
    ) : (
      <>
        <BDButton
          variant="ghost"
          icon={RotateCcw}
          onClick={handleRetry}
          disabled={busy}
        >
          Retry
        </BDButton>
        <BDButton
          variant="secondary"
          onClick={() => handleAccept(true)}
          disabled={busy}
        >
          Finish now
        </BDButton>
        <BDButton icon={Check} isLoading={busy} onClick={() => handleAccept(false)}>
          Accept &amp; continue
        </BDButton>
      </>
    );

  const title =
    phase === "setup"
      ? "AI Document Assist · Refine"
      : `Refine · Turn ${turnIndex + 1} of ${levelConfig.turns}`;

  return (
    <BDModal
      open={open}
      onClose={close}
      title={title}
      description={
        phase === "setup"
          ? "Choose how thoroughly to refine and pick a refinement type."
          : `${levelConfig.label} · ${refinementType}`
      }
      size="full"
      footer={footer}
    >
      <div className="flex h-full flex-col gap-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">
            {error}
          </p>
        )}

        {phase === "setup" && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Document</span>
              <select
                value={documentId}
                onChange={(e) => {
                  setDocumentId(e.target.value);
                  setRefinementType(BD_SPEC_REFINEMENT_GENERIC);
                }}
                disabled={documents.length === 0}
                className="max-w-md rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50"
              >
                <option value="">
                  {documents.length
                    ? "Select a document…"
                    : "No documents yet"}
                </option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2">
              <span className={LABEL}>How much refinement</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {BD_SPEC_REFINE_LEVEL_ORDER.map((value) => {
                  const config = BD_SPEC_REFINE_LEVELS[value];
                  return (
                    <label
                      key={value}
                      className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-xs ${
                        level === value
                          ? "border-blue-300 bg-blue-50/60"
                          : "border-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="bd-spec-refine-level"
                          checked={level === value}
                          onChange={() => setLevel(value)}
                        />
                        <span className="font-semibold text-slate-700">
                          {config.label}
                        </span>
                      </span>
                      <span className="text-slate-400">{config.hint}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className={LABEL}>Refinement type</span>
              <select
                value={refinementType}
                onChange={(e) => setRefinementType(e.target.value)}
                className="max-w-md rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
              >
                <option value={BD_SPEC_REFINEMENT_GENERIC}>
                  {BD_SPEC_REFINEMENT_GENERIC}
                </option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-[11px] text-slate-400">
              Using {aiConfig.provider} / {aiConfig.model}
            </p>
          </div>
        )}

        {phase === "questions" && working && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Wand2 className="h-4 w-4 text-blue-500" />
              Answer each question to guide the revision for this turn.
            </div>
            {questions.map((q, qi) => (
              <div
                key={q.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="text-sm font-medium text-slate-800">
                  {qi + 1}. {q.question}
                </p>
                {q.rationale && (
                  <p className="mt-0.5 text-xs text-slate-400">{q.rationale}</p>
                )}
                <div className="mt-3 flex flex-col gap-2">
                  {recommendedFirst(q).map((opt) => {
                    const selected = answers[q.id] === opt.label;
                    return (
                      <label
                        key={opt.label}
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs ${
                          selected
                            ? "border-blue-300 bg-blue-50/60"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          className="mt-0.5"
                          name={`bd-spec-refine-${q.id}`}
                          checked={selected}
                          onChange={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [q.id]: opt.label,
                            }))
                          }
                        />
                        <span className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            {opt.label}
                            {opt.recommended && (
                              <BDBadge color="info">Recommended</BDBadge>
                            )}
                          </span>
                          {opt.description && (
                            <span className="text-slate-400">
                              {opt.description}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {phase === "review" && pending && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Check className="h-4 w-4 text-green-600" />
              Review the revised document. Accept to keep it
              {turnIndex + 1 >= levelConfig.turns
                ? " and apply."
                : " and continue to the next turn."}
            </div>
            <div className="bd-scroll min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 p-4">
              <BDMarkdownView content={specDraftToMarkdown(pending)} />
            </div>
          </div>
        )}
      </div>
    </BDModal>
  );
}

export default BDSpecRefineComponent;
