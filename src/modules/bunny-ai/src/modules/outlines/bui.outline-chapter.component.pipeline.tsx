// bui.outline-chapter.component.pipeline.tsx
import React, { useEffect, useState } from "react";
import { Button, Modal } from "@heroui/react";
import {
  LoaderIcon,
  AlertTriangle,
  CheckCircle2,
  NotebookPenIcon,
} from "lucide-react";
import { BunnyKernel } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIOutlineItemEntity } from "./bui.outline.entity";
import { BUIOutlineChapterRepository } from "./bui.outline-chapter.repository";
import { BUIOutlineRepository } from "./bui.outline.repository";
import { generateItemContentAction } from "./bui.outline.action.content";
import { buiOutlineChapterPromptContent } from "./bui.outline-chapter.prompt.content";
import BUIAuthorSkillPicker from "../author-skills/bui.author-skills.picker.component";

type WriteMode = "empty" | "all";

interface BUIOutlineChapterComponentPipelineProps {
  outlineId: number;
  context: BunnyKernel<
    BUIOutlineItemEntity,
    BUIOutlineItemEntity
  >;
}

interface FirstItemState {
  number: number;
  title: string;
  isEmpty: boolean;
}

/** Per-item status shown by the parallel writing monitor. */
type PoolItemStatus = "pending" | "writing" | "done" | "failed";

interface PoolItem {
  id: number;
  number: number;
  title: string;
  status: PoolItemStatus;
  error?: string;
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error occurred while writing item content.";
  }
}

/** Modes that may run concurrently because each item is independent. */
function isParallelMode(mode: string): boolean {
  return mode === "parallel";
}

/**
 * Plan-only modes (critique / consolidate) return structured plans and must not
 * write raw output as item content; they are driven by the Refine wizard.
 */
function isPlanOnlyMode(mode: string): boolean {
  return (
    buiOutlineChapterPromptContent.modes.find((entry) => entry.key === mode)
      ?.planOnly === true
  );
}

/** The writable modes offered by the batch selector. */
const WRITABLE_MODES = buiOutlineChapterPromptContent.modes.filter(
  (mode) => !mode.planOnly,
);

/**
 * Number of item content generations running at once in Parallel mode. Each is
 * an independent request to the content Route Handler; Route Handlers are NOT
 * serialized the way Server Actions are, so these truly overlap. Everything not
 * in flight stays `pending` until a slot frees up.
 */
const PARALLEL_CONCURRENCY = 3;

export default function BUIOutlineChapterComponentPipeline({
  outlineId,
  context,
}: BUIOutlineChapterComponentPipelineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generationMode, setGenerationMode] = useState<string>("sequential");
  /** The outline's own Generation Mode; the default for this batch. */
  const [outlineGenerationMode, setOutlineGenerationMode] =
    useState<string>("sequential");
  /** When true the batch follows the outline's mode; false overrides it. */
  const [useOutlineDefaults, setUseOutlineDefaults] = useState(true);
  const [referencing, setReferencing] = useState(true);
  const [includeTopic, setIncludeTopic] = useState(true);
  const [useAuthorProfile, setUseAuthorProfile] = useState(true);
  const [useAuthorSkills, setUseAuthorSkills] = useState(false);
  const [selectedSkillNames, setSelectedSkillNames] = useState<string[]>([]);
  const [currentTitle, setCurrentTitle] = useState("");
  /** Per-item status during a Parallel / Independent batch. */
  const [poolItems, setPoolItems] = useState<PoolItem[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [writeMode, setWriteMode] = useState<WriteMode>("empty");
  const [firstItem, setFirstItem] = useState<FirstItemState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    (async () => {
      try {
        const repo = new BUIOutlineChapterRepository();
        const outlineRepo = new BUIOutlineRepository();
        const [records, outline] = await Promise.all([
          repo.getItemsByOutline(outlineId),
          outlineRepo.panelGetOne(outlineId),
        ]);
        if (cancelled) return;

        // Default the mode to the outline's own Generation Mode.
        const outlineMode = outline?.generationMode || "sequential";
        const writableMode = isPlanOnlyMode(outlineMode)
          ? "sequential"
          : outlineMode;
        setOutlineGenerationMode(writableMode);
        setGenerationMode(writableMode);

        const sorted = [...records].sort((a, b) => a.number - b.number);
        const first = sorted[0];

        if (first) {
          const isEmpty = !first.content || first.content.trim().length === 0;
          setFirstItem({
            number: first.number,
            title: first.title,
            isEmpty,
          });
          setWriteMode(isEmpty ? "empty" : "all");
        } else {
          setFirstItem(null);
          setWriteMode("empty");
        }
      } catch (error) {
        console.error("Failed to load item overview:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, outlineId]);

  // Effective mode: the outline's own mode unless the user overrides it.
  const effectiveGenerationMode = useOutlineDefaults
    ? outlineGenerationMode
    : generationMode;

  // Mode-context preview for the currently effective mode (derived, no state).
  const selectedSystemPrompt = (() => {
    const mode = buiOutlineChapterPromptContent.modes.find(
      (m) => m.key === effectiveGenerationMode,
    );
    return mode
      ? `${mode.contextInjection}\n\n${mode.systemInstruction}`.trim()
      : null;
  })();

  const handleStartPipeline = async () => {
    setIsOpen(false);
    setIsProcessing(true);
    setErrorMessage(null);
    context.adminPanel?.table?.refresh?.();

    try {
      const repo = new BUIOutlineChapterRepository();
      const records = await repo.getItemsByOutline(outlineId);

      const targeted =
        writeMode === "all"
          ? records.filter((record) => record.id)
          : records.filter(
              (record) =>
                record.id &&
                (record.status !== "done" ||
                  !record.content ||
                  record.content.trim().length === 0),
            );

      if (targeted.length === 0) {
        setIsProcessing(false);
        setErrorMessage(
          writeMode === "all"
            ? "No items found to rewrite."
            : "No empty or pending items found to process.",
        );
        return;
      }

      setProgress({ current: 0, total: targeted.length });

      const runOne = async (item: (typeof targeted)[number]) => {
        setCurrentTitle(`#${item.number} - ${item.title}`);
        await generateItemContentAction(
          item.id!,
          effectiveGenerationMode,
          undefined,
          {
            includeTopic,
            useAuthorProfile,
            useAuthorSkills,
            selectedSkillNames,
            referencing,
          },
        );
        setProgress((prev) => ({ ...prev, current: prev.current + 1 }));
        context.adminPanel?.table?.refresh?.();
      };

      if (isParallelMode(effectiveGenerationMode)) {
        // Sliding pool of PARALLEL_CONCURRENCY. Each item generation is an
        // independent Route Handler request, so the in-flight ones truly overlap
        // while the rest stay `pending` until a slot frees up.
        const queue = [...targeted];
        const failures: string[] = [];

        setPoolItems(
          targeted.map((item) => ({
            id: item.id!,
            number: item.number,
            title: item.title,
            status: "pending" as const,
          })),
        );

        const mark = (id: number, patch: Partial<PoolItem>) =>
          setPoolItems((prev) =>
            prev.map((entry) =>
              entry.id === id ? { ...entry, ...patch } : entry,
            ),
          );

        const runNext = async (): Promise<void> => {
          const item = queue.shift();
          if (!item) return;

          mark(item.id!, { status: "writing" });
          try {
            await generateItemContentAction(
              item.id!,
              effectiveGenerationMode,
              undefined,
              {
                includeTopic,
                useAuthorProfile,
                useAuthorSkills,
                selectedSkillNames,
                referencing,
              },
            );
            mark(item.id!, { status: "done" });
          } catch (error) {
            const message = resolveErrorMessage(error);
            failures.push(`#${item.number}: ${message}`);
            mark(item.id!, { status: "failed", error: message });
          } finally {
            setProgress((prev) => ({ ...prev, current: prev.current + 1 }));
            context.adminPanel?.table?.refresh?.();
          }

          await runNext();
        };

        await Promise.all(
          Array.from(
            { length: Math.min(PARALLEL_CONCURRENCY, queue.length) },
            () => runNext(),
          ),
        );

        if (failures.length > 0) {
          throw new Error(failures.join("; "));
        }
      } else {
        // Sequential / Chain-of-Thought / Control / Iterative Refine /
        // Critique / Consolidate: process in ascending number order.
        for (const item of targeted) {
          await runOne(item);
        }
      }
    } catch (error) {
      console.error("Batch item pipeline encountered errors:", error);
      setErrorMessage(resolveErrorMessage(error));
    } finally {
      setIsProcessing(false);
      setCurrentTitle("");
      setPoolItems([]);
      context.adminPanel?.table?.refresh?.();
    }
  };

  const isParallelRun = isParallelMode(effectiveGenerationMode);
  const poolWriting = poolItems.filter((item) => item.status === "writing");
  const poolPending = poolItems.filter((item) => item.status === "pending");
  const poolFailed = poolItems.filter((item) => item.status === "failed");

  if (isProcessing) {
    return (
      <>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-warning-50 border border-warning-200 rounded-lg animate-pulse shadow-sm">
          <LoaderIcon className="w-4 h-4 text-warning animate-spin" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-warning-800 leading-none">
              Writing Items ({progress.current}/{progress.total})
            </span>
            {isParallelRun ? (
              <span className="text-[10px] text-warning-600 font-medium mt-0.5">
                {poolWriting.length} writing · {poolPending.length} pending
              </span>
            ) : (
              currentTitle && (
                <span className="text-[10px] text-warning-600 truncate max-w-[180px] font-medium mt-0.5">
                  {currentTitle}
                </span>
              )
            )}
          </div>
        </div>

        {/* Parallel mode has no single "current" row: show every item's live
            status (writing / pending / failed) in a dedicated monitor modal. */}
        <Modal isOpen={isParallelRun}>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog>
                <Modal.Header>Parallel Writing In Progress</Modal.Header>
                <Modal.Body className="gap-4">
                  <p className="text-sm text-default-500">
                    Writing {progress.total} item(s), up to{" "}
                    {PARALLEL_CONCURRENCY} at a time. Everything else stays
                    pending until a slot frees up.
                  </p>

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warning-600">
                      Writing ({poolWriting.length}/{PARALLEL_CONCURRENCY})
                    </span>
                    {poolWriting.length === 0 ? (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-warning-200 bg-warning-50">
                        <LoaderIcon className="w-4 h-4 text-warning animate-spin shrink-0" />
                        <span className="text-sm font-medium text-default-700">
                          Starting workers…
                        </span>
                      </div>
                    ) : (
                      poolWriting.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-warning-200 bg-warning-50"
                        >
                          <LoaderIcon className="w-4 h-4 text-warning animate-spin shrink-0" />
                          <span className="text-sm font-medium text-default-800 truncate">
                            #{item.number} - {item.title}
                          </span>
                          <span className="ml-auto text-[11px] text-warning-600 shrink-0">
                            writing…
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-default-500">
                      Pending ({poolPending.length})
                    </span>
                    {poolPending.length === 0 ? (
                      <span className="text-xs text-default-400">None</span>
                    ) : (
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                        {poolPending.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-default-200"
                          >
                            <span className="text-sm text-default-600 truncate">
                              #{item.number} - {item.title}
                            </span>
                            <span className="ml-auto text-[11px] text-default-400 shrink-0">
                              pending
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {poolFailed.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-danger-600">
                        Failed ({poolFailed.length})
                      </span>
                      {poolFailed.map((item) => (
                        <div
                          key={item.id}
                          className="px-2.5 py-1.5 rounded-lg border border-danger-200 bg-danger-50 text-xs text-danger-700 truncate"
                        >
                          #{item.number} - {item.title}: {item.error}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs font-medium text-default-500">
                    Completed {progress.current} / {progress.total}
                  </div>
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </>
    );
  }

  return (
    <>
      <Button
        onPress={() => setIsOpen(true)}
        size="sm"
        className="font-medium shadow-sm flex items-center gap-2"
      >
        <NotebookPenIcon className="w-4 h-4" />
        <span className="hidden sm:inline ml-1">AI Content Writing</span>
      </Button>

      <Modal isOpen={isOpen}>
        <Modal.Backdrop onClick={() => setIsOpen(false)}>
          <Modal.Container>
            <Modal.Dialog onClick={(e) => e.stopPropagation()}>
              <Modal.CloseTrigger onClick={() => setIsOpen(false)} />
              <Modal.Header>Item Writing Pipeline</Modal.Header>
              <Modal.Body className="gap-4">
                <p className="text-sm text-default-500">
                  Writes content for items marked as
                  <span className="font-semibold text-default-700"> Empty</span>{" "}
                  or
                  <span className="font-semibold text-primary"> Pending</span>.
                  The Generation Mode defaults to the outline&apos;s and can be
                  overridden below.
                </p>

                {firstItem && !firstItem.isEmpty && (
                  <div className="p-3 rounded-lg border flex items-start gap-2.5 bg-success-50 border-success-200">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-success-800">
                        Some items already have content
                      </span>
                      <span className="text-[11px] text-default-600 leading-relaxed">
                        Choose a writing mode below.
                      </span>
                    </div>
                  </div>
                )}

                {firstItem && !firstItem.isEmpty && (
                  <div className="flex flex-col gap-2 border-t pt-3 border-default-100">
                    <span className="text-xs font-bold uppercase text-default-500">
                      Content Writing Mode
                    </span>
                    <label
                      className={`flex items-start gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                        writeMode === "empty"
                          ? "border-primary bg-primary-50"
                          : "border-default-200 bg-transparent hover:border-default-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="writeMode"
                        value="empty"
                        checked={writeMode === "empty"}
                        onChange={() => setWriteMode("empty")}
                        className="mt-0.5 accent-primary"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-default-800">
                          Write only empty content
                        </span>
                        <span className="text-xs text-default-500">
                          Generate items that have no existing content.
                        </span>
                      </div>
                    </label>
                    <label
                      className={`flex items-start gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                        writeMode === "all"
                          ? "border-primary bg-primary-50"
                          : "border-default-200 bg-transparent hover:border-default-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="writeMode"
                        value="all"
                        checked={writeMode === "all"}
                        onChange={() => setWriteMode("all")}
                        className="mt-0.5 accent-primary"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-default-800">
                          Rewrite all content
                        </span>
                        <span className="text-xs text-default-500">
                          Regenerate every item, overwriting existing
                          content.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                <div className="flex flex-col gap-2 border-t pt-3 border-default-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase text-default-500">
                      Generation Mode
                    </span>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-default-600">
                      <input
                        type="checkbox"
                        checked={useOutlineDefaults}
                        onChange={(e) => setUseOutlineDefaults(e.target.checked)}
                        className="rounded border-default-300 accent-primary"
                      />
                      Use the outline&apos;s Generation Mode
                    </label>
                  </div>
                  <select
                    aria-label="Select Generation Mode"
                    value={effectiveGenerationMode}
                    disabled={useOutlineDefaults}
                    onChange={(e) => setGenerationMode(e.target.value)}
                    className={`w-full min-h-10 px-3 py-2 rounded-xl border-2 border-default-200 bg-transparent text-sm transition-colors focus:outline-none ${
                      useOutlineDefaults
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:border-default-400 focus:border-primary"
                    }`}
                  >
                    {WRITABLE_MODES.map((mode) => (
                      <option key={mode.key} value={mode.key}>
                        {mode.label}
                      </option>
                    ))}
                  </select>

                  {selectedSystemPrompt && (
                    <div className="mt-1 p-2 rounded-lg bg-primary-50 border border-primary-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 block mb-1">
                        Mode Context
                      </span>
                      <pre className="text-[11px] text-primary-800 leading-relaxed whitespace-pre-wrap font-sans">
                        {selectedSystemPrompt}
                      </pre>
                    </div>
                  )}
                </div>

                {effectiveGenerationMode === "control" && (
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={referencing}
                      onChange={(e) => setReferencing(e.target.checked)}
                      className="rounded border-default-300 accent-primary"
                    />
                    Reference sibling/prior context (uncheck for standalone)
                  </label>
                )}

                <div className="flex flex-col gap-2 border-t pt-3 border-default-100">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTopic}
                      onChange={(e) => setIncludeTopic(e.target.checked)}
                      className="rounded border-default-300 accent-primary"
                    />
                    Include the selected Topic
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAuthorProfile}
                      onChange={(e) => setUseAuthorProfile(e.target.checked)}
                      className="rounded border-default-300 accent-primary"
                    />
                    Align writing with Author Profile
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAuthorSkills}
                      onChange={(e) => setUseAuthorSkills(e.target.checked)}
                      className="rounded border-default-300 accent-primary"
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

                <div className="p-3 bg-default-50 border border-default-200 rounded-lg flex gap-2.5 items-start">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-default-600 leading-relaxed">
                    Once launched, this panel closes. The monitor hooks into the
                    header toolbar until complete.
                  </p>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleStartPipeline}
                >
                  Launch Execution Engine
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={!!errorMessage}>
        <Modal.Backdrop onClick={() => setErrorMessage(null)}>
          <Modal.Container>
            <Modal.Dialog onClick={(e) => e.stopPropagation()}>
              <Modal.CloseTrigger onClick={() => setErrorMessage(null)} />
              <Modal.Header>AI Writing Error</Modal.Header>
              <Modal.Body className="gap-3">
                <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-danger mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-danger-800">
                      The AI encountered an error while writing content
                    </span>
                    <p className="text-xs text-danger-700 leading-relaxed break-words">
                      {errorMessage}
                    </p>
                    <p className="text-[11px] text-danger-500 leading-relaxed">
                      The pipeline stopped. Failed items may have been
                      reset to empty. Check your AI configuration and retry.
                    </p>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setErrorMessage(null)}
                >
                  Close
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
