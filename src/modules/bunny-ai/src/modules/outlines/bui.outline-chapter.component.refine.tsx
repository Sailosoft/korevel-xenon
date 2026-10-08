// bui.outline-chapter.component.refine.tsx
//
// The guided Refine wizard: scope → critique → review/apply → iterative refine.
// `critique` returns a structured, actionable plan; the user approves findings;
// applying is transactional; then targeted items are polished in a bounded loop.
import React, { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "@heroui/react";
import {
  ArrowRight,
  CheckCircle2,
  LoaderIcon,
  ScrollText,
  Sparkles,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { BunnyKernel } from "@/src/modules/bunny/src/Bunny.Interface";
import {
  BUIOutlineItemEntity,
  BUIOutlineRefinementFinding,
  BUIOutlineRefinementPlan,
} from "./bui.outline.entity";
import { BUIOutlineChapterRepository } from "./bui.outline-chapter.repository";
import { BUIOutlineRepository } from "./bui.outline.repository";
import {
  AppliedRefinementSummary,
  ConsolidateMergeResult,
  applyRefinementPlanAction,
  persistRefinementPlanAction,
  runConsolidateMergeAction,
  runCritiquePlanAction,
  runIterativeRefineAction,
} from "./bui.outline.action.content";
import BUISettingsRepository from "../settings/bui.settings.repository";
import BUIAuthorSkillPicker from "../author-skills/bui.author-skills.picker.component";

type WizardStep = "scope" | "critique" | "apply" | "refine" | "done";

interface BUIOutlineChapterRefineProps {
  outlineId: number;
  context: BunnyKernel<BUIOutlineItemEntity, BUIOutlineItemEntity>;
}

const REFINE_PASSES_DEFAULT = 2;

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error during refinement.";
  }
}

function findingLabel(finding: BUIOutlineRefinementFinding): string {
  switch (finding.type) {
    case "insert":
      return `Insert: ${finding.title}`;
    case "merge":
      return `Merge ${finding.sourceIds.length + 1} items into #${finding.anchorId}`;
    case "reorder":
      return `Reorder ${finding.order.length} items`;
    case "refine":
      return `Refine item id ${finding.itemId}`;
  }
}

function findingDetail(finding: BUIOutlineRefinementFinding): string {
  switch (finding.type) {
    case "insert":
      return finding.description || "New coverage proposed by critique.";
    case "merge":
      return `Sources: ${finding.sourceIds.join(", ")}`;
    case "reorder":
      return `Order: ${finding.order.join(", ")}`;
    case "refine":
      return finding.directive;
  }
}

export default function BUIOutlineChapterRefine({
  outlineId,
  context,
}: BUIOutlineChapterRefineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("scope");
  const [items, setItems] = useState<BUIOutlineItemEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState<"critique" | "apply" | "refine" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [scopeIds, setScopeIds] = useState<number[]>([]);
  const [plan, setPlan] = useState<BUIOutlineRefinementPlan | null>(null);
  const [approvedIds, setApprovedIds] = useState<string[]>([]);
  const [refinePasses, setRefinePasses] = useState(REFINE_PASSES_DEFAULT);
  const [applySummary, setApplySummary] =
    useState<AppliedRefinementSummary | null>(null);

  const [includeTopic, setIncludeTopic] = useState(true);
  const [useAuthorProfile, setUseAuthorProfile] = useState(true);
  const [useAuthorSkills, setUseAuthorSkills] = useState(false);
  const [selectedSkillNames, setSelectedSkillNames] = useState<string[]>([]);

  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentTitle, setCurrentTitle] = useState("");

  const runOptions = useMemo(
    () => ({
      includeTopic,
      useAuthorProfile,
      useAuthorSkills,
      selectedSkillNames,
    }),
    [includeTopic, useAuthorProfile, useAuthorSkills, selectedSkillNames],
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    (async () => {
      try {
        const chapterRepo = new BUIOutlineChapterRepository();
        const outlineRepo = new BUIOutlineRepository();
        const [records, outline] = await Promise.all([
          chapterRepo.getItemsByOutline(outlineId),
          outlineRepo.panelGetOne(outlineId),
        ]);
        if (cancelled) return;

        const sorted = [...records].sort((a, b) => a.number - b.number);
        setItems(sorted);
        setScopeIds(
          sorted.map((item) => item.id).filter((id): id is number => id != null),
        );

        const persisted = outline?.refinementPlan;
        if (persisted && persisted.findings.length > 0) {
          setPlan(persisted);
          setApprovedIds(
            persisted.approvedIds.length > 0
              ? persisted.approvedIds
              : persisted.findings.map((finding) => finding.id),
          );
          setRefinePasses(persisted.refinePasses ?? REFINE_PASSES_DEFAULT);
          setStep("apply");
        } else {
          setPlan(null);
          setStep("scope");
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(resolveErrorMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, outlineId]);

  const approvedFindings = useMemo(
    () =>
      (plan?.findings ?? []).filter((finding) =>
        approvedIds.includes(finding.id),
      ),
    [plan, approvedIds],
  );

  const mergeFindings = approvedFindings.filter(
    (finding) => finding.type === "merge",
  );
  const refineTargetCount = useMemo(() => {
    const ids = new Set<number>();
    for (const finding of approvedFindings) {
      if (finding.type === "refine") ids.add(finding.itemId);
      if (finding.type === "merge") ids.add(finding.anchorId);
    }
    return ids.size;
  }, [approvedFindings]);

  const toggleScope = (id: number) => {
    setScopeIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  };

  const toggleApproval = (id: string) => {
    const next = approvedIds.includes(id)
      ? approvedIds.filter((entry) => entry !== id)
      : [...approvedIds, id];
    setApprovedIds(next);
    if (plan) {
      void persistRefinementPlanAction(outlineId, {
        ...plan,
        approvedIds: next,
        refinePasses,
      }).catch((error) => {
        console.error("Failed to persist approvals:", error);
      });
    }
  };

  const handleRunCritique = async () => {
    setBusy("critique");
    setErrorMessage(null);
    try {
      const aiConfig = await new BUISettingsRepository().getActiveAIConfig();
      const { plan: nextPlan } = await runCritiquePlanAction(
        outlineId,
        scopeIds,
        aiConfig,
        runOptions,
      );
      setPlan(nextPlan);
      setApprovedIds(nextPlan.findings.map((finding) => finding.id));
      setRefinePasses(nextPlan.refinePasses ?? REFINE_PASSES_DEFAULT);
      setStep("apply");
      context.adminPanel?.table?.refresh?.();
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const handleApply = async () => {
    if (!plan) return;
    setBusy("apply");
    setErrorMessage(null);
    try {
      const aiConfig = await new BUISettingsRepository().getActiveAIConfig();
      const merges: Record<string, ConsolidateMergeResult> = {};

      setProgress({ current: 0, total: mergeFindings.length });
      for (let index = 0; index < mergeFindings.length; index += 1) {
        const finding = mergeFindings[index];
        if (finding.type !== "merge") continue;
        setCurrentTitle(`Merging into #${finding.anchorId}`);
        merges[finding.id] = await runConsolidateMergeAction(
          outlineId,
          { anchorId: finding.anchorId, sourceIds: finding.sourceIds },
          aiConfig,
          runOptions,
        );
        setProgress({ current: index + 1, total: mergeFindings.length });
      }

      const nextPlan: BUIOutlineRefinementPlan = {
        ...plan,
        approvedIds,
        refinePasses,
      };
      const summary = await applyRefinementPlanAction(
        outlineId,
        nextPlan,
        merges,
      );
      setPlan(nextPlan);
      setApplySummary(summary);
      context.adminPanel?.table?.refresh?.();
      setStep("refine");
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
    } finally {
      setBusy(null);
      setCurrentTitle("");
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleRunRefine = async () => {
    if (!plan) return;
    setBusy("refine");
    setErrorMessage(null);
    try {
      const aiConfig = await new BUISettingsRepository().getActiveAIConfig();

      const targets: { itemId: number; directive?: string }[] = [];
      const seen = new Set<number>();
      for (const finding of approvedFindings) {
        if (finding.type === "refine" && !seen.has(finding.itemId)) {
          seen.add(finding.itemId);
          targets.push({ itemId: finding.itemId, directive: finding.directive });
        }
        if (finding.type === "merge" && !seen.has(finding.anchorId)) {
          seen.add(finding.anchorId);
          targets.push({ itemId: finding.anchorId });
        }
      }

      setProgress({ current: 0, total: targets.length });
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        setCurrentTitle(`Refining item id ${target.itemId}`);
        await runIterativeRefineAction(
          target.itemId,
          target.directive,
          refinePasses,
          aiConfig,
          runOptions,
        );
        setProgress({ current: index + 1, total: targets.length });
        context.adminPanel?.table?.refresh?.();
      }

      setStep("done");
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
    } finally {
      setBusy(null);
      setCurrentTitle("");
    }
  };

  const allInScope =
    items.length > 0 && scopeIds.length === items.filter((i) => i.id != null).length;

  const handleOpen = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsOpen(true);
  };

  return (
    <>
      <Button
        onPress={handleOpen}
        size="sm"
        className="font-medium shadow-sm flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        <span className="hidden sm:inline ml-1">Refine Outline</span>
      </Button>

      <Modal isOpen={isOpen}>
        <Modal.Backdrop onClick={() => setIsOpen(false)}>
          <Modal.Container>
            <Modal.Dialog
              className="max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Modal.CloseTrigger onClick={() => setIsOpen(false)} />
              <Modal.Header>Refine Outline</Modal.Header>
              <Modal.Body className="gap-4 max-h-[70vh] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-default-500">
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    Loading items…
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-sm text-default-500">
                    This outline has no items to refine.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs font-semibold text-default-500">
                      <StepDot active={step === "scope"} label="1. Scope" />
                      <ArrowRight className="w-3 h-3" />
                      <StepDot active={step === "critique"} label="2. Critique" />
                      <ArrowRight className="w-3 h-3" />
                      <StepDot active={step === "apply"} label="3. Apply" />
                      <ArrowRight className="w-3 h-3" />
                      <StepDot active={step === "refine"} label="4. Refine" />
                    </div>

                    {step === "scope" && (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-default-500">
                          Pick the items to audit. Critique reads capped content
                          and returns a structured plan.
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wide text-default-500">
                            Scope ({scopeIds.length}/{items.length})
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={() =>
                              setScopeIds(
                                allInScope
                                  ? []
                                  : items
                                      .map((item) => item.id)
                                      .filter(
                                        (id): id is number => id != null,
                                      ),
                              )
                            }
                          >
                            {allInScope ? "Clear all" : "Select all"}
                          </Button>
                        </div>
                        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
                          {items.map((item) => {
                            const id = item.id!;
                            const checked = scopeIds.includes(id);
                            const hasContent =
                              !!item.content && item.content.trim().length > 0;
                            return (
                              <label
                                key={id}
                                className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 cursor-pointer ${
                                  checked
                                    ? "border-primary bg-primary-50"
                                    : "border-default-200"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleScope(id)}
                                  className="accent-primary"
                                />
                                <span className="text-sm text-default-800 truncate">
                                  {item.number}. {item.title}
                                </span>
                                <span
                                  className={`ml-auto shrink-0 text-[10px] font-semibold uppercase ${
                                    hasContent
                                      ? "text-success-600"
                                      : "text-default-400"
                                  }`}
                                >
                                  {hasContent ? "has content" : "empty"}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex flex-col gap-2 border-t pt-3 border-default-100">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeTopic}
                              onChange={(e) => setIncludeTopic(e.target.checked)}
                              className="accent-primary"
                            />
                            Include the selected Topic
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useAuthorProfile}
                              onChange={(e) =>
                                setUseAuthorProfile(e.target.checked)
                              }
                              className="accent-primary"
                            />
                            Align with Author Profile
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useAuthorSkills}
                              onChange={(e) =>
                                setUseAuthorSkills(e.target.checked)
                              }
                              className="accent-primary"
                            />
                            Include Author Skills
                          </label>
                          {useAuthorSkills && (
                            <div className="pl-6">
                              <BUIAuthorSkillPicker
                                selectedNames={selectedSkillNames}
                                onChange={setSelectedSkillNames}
                              />
                            </div>
                          )}
                        </div>
                        <Button
                          className="w-full"
                          isDisabled={scopeIds.length === 0 || busy === "critique"}
                          onClick={handleRunCritique}
                        >
                          {busy === "critique" ? (
                            <>
                              <LoaderIcon className="w-4 h-4 animate-spin" />
                              Running critique…
                            </>
                          ) : (
                            <>
                              <ScrollText className="w-4 h-4" />
                              Run Critique
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {step === "apply" && plan && (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-default-500">
                          Approve the findings to apply. Merge content is
                          generated per group; applying is transactional.
                        </p>

                        {plan.findings.length === 0 ? (
                          <div className="p-3 rounded-lg border border-default-200 bg-default-50 text-sm text-default-600">
                            Critique found no actionable changes.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {plan.findings.map((finding) => {
                              const checked = approvedIds.includes(finding.id);
                              return (
                                <label
                                  key={finding.id}
                                  className={`flex items-start gap-3 p-2.5 rounded-lg border-2 cursor-pointer ${
                                    checked
                                      ? "border-primary bg-primary-50"
                                      : "border-default-200"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleApproval(finding.id)}
                                    className="mt-0.5 accent-primary"
                                  />
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-semibold text-default-800">
                                      <span className="uppercase text-[10px] tracking-wide text-primary-600 mr-1.5">
                                        {finding.type}
                                      </span>
                                      {findingLabel(finding)}
                                    </span>
                                    <span className="text-xs text-default-500 whitespace-pre-wrap">
                                      {findingDetail(finding)}
                                    </span>
                                    {finding.rationale && (
                                      <span className="text-[11px] text-default-400">
                                        {finding.rationale}
                                      </span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        <div className="p-3 bg-default-50 border border-default-200 rounded-lg flex flex-col gap-1 text-xs text-default-600">
                          <span className="font-semibold">
                            Dry-run preview
                          </span>
                          <span>
                            {approvedFindings.filter((f) => f.type === "insert").length}{" "}
                            insertion(s)
                          </span>
                          <span>{mergeFindings.length} merge group(s)</span>
                          <span>
                            {approvedFindings.filter((f) => f.type === "reorder").length}{" "}
                            reorder plan(s)
                          </span>
                          <span>
                            Numbers renormalized to contiguous ascending.
                          </span>
                        </div>

                        <div className="flex flex-col gap-2 border-t pt-3 border-default-100">
                          <label className="flex items-center gap-2 text-sm">
                            Iterative refine passes
                            <input
                              type="number"
                              min={1}
                              max={3}
                              value={refinePasses}
                              onChange={(e) =>
                                setRefinePasses(
                                  Math.min(
                                    3,
                                    Math.max(1, Number(e.target.value) || 1),
                                  ),
                                )
                              }
                              className="w-16 px-2 py-1 rounded-lg border border-default-200 bg-transparent"
                            />
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onPress={() => setStep("scope")}
                            isDisabled={busy !== null}
                          >
                            Back
                          </Button>
                          <Button
                            className="flex-1"
                            isDisabled={
                              busy === "apply" || approvedIds.length === 0
                            }
                            onClick={handleApply}
                          >
                            {busy === "apply" ? (
                              <>
                                <LoaderIcon className="w-4 h-4 animate-spin" />
                                Applying…
                                {progress.total > 0
                                  ? ` (${progress.current}/${progress.total})`
                                  : ""}
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4" />
                                Apply Approved Plan
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {step === "refine" && plan && (
                      <div className="flex flex-col gap-3">
                        <div className="p-3 rounded-lg border flex items-start gap-2.5 bg-success-50 border-success-200">
                          <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                          <div className="flex flex-col gap-0.5 text-xs text-default-600">
                            <span className="font-bold text-success-800">
                              Plan applied
                            </span>
                            {applySummary && (
                              <span>
                                {applySummary.inserted} inserted ·{" "}
                                {applySummary.mergedGroups} merged ·{" "}
                                {applySummary.deleted} deleted ·{" "}
                                {applySummary.renumbered} renumbered ·{" "}
                                {applySummary.referencesRemapped} refs remapped
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-default-500">
                          Run a bounded iterative-refine loop on the{" "}
                          {refineTargetCount} targeted item(s) (refine findings +
                          merged anchors). Stops early on convergence.
                        </p>

                        {busy === "refine" && progress.total > 0 && (
                          <div className="flex items-center gap-2 text-xs text-warning-700">
                            <LoaderIcon className="w-4 h-4 animate-spin" />
                            {currentTitle} ({progress.current}/{progress.total})
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="flex-1"
                            isDisabled={busy === "refine" || refineTargetCount === 0}
                            onClick={handleRunRefine}
                          >
                            {busy === "refine" ? (
                              <>
                                <LoaderIcon className="w-4 h-4 animate-spin" />
                                Refining…
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Run Iterative Refine ({refineTargetCount})
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onPress={() => setStep("done")}
                            isDisabled={busy === "refine"}
                          >
                            Skip
                          </Button>
                        </div>
                      </div>
                    )}

                    {step === "done" && (
                      <div className="flex flex-col gap-3">
                        <div className="p-4 rounded-lg border flex items-start gap-3 bg-success-50 border-success-200">
                          <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-success-800">
                              Refinement complete
                            </span>
                            <span className="text-xs text-default-600">
                              The plan was applied and targeted items refined.
                              The table has been refreshed.
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onPress={() => setIsOpen(false)}
                        >
                          Close
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {errorMessage && (
                  <div className="p-3 rounded-lg border border-danger-200 bg-danger-50 flex items-start gap-2.5">
                    <TriangleAlert className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-danger-800">
                        Refinement error
                      </span>
                      <span className="text-[11px] text-danger-700 whitespace-pre-wrap">
                        {errorMessage}
                      </span>
                    </div>
                  </div>
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

function StepDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={
        active
          ? "text-primary-600 font-bold"
          : "text-default-400 font-medium"
      }
    >
      {label}
    </span>
  );
}
