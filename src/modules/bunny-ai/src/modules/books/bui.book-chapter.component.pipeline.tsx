// bui.book-chapter.component.pipeline.tsx
import React, { useEffect, useState } from "react";
import { Button, Modal } from "@heroui/react";
import {
  LoaderIcon,
  AlertTriangle,
  CheckCircle2,
  NotebookPenIcon,
} from "lucide-react";
import { BunnyKernel } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIBookChapterEntity } from "./bui.book.entity";
import { BUIBookChapterRepository } from "./bui.book-chapter.repository";
import { generateChapterContentAction } from "./bui.book-chapter.action.content";
import { buiChapterPromptContent } from "./bui.book-chapter.prompt.content";

type WriteMode = "empty" | "all";

interface BUIBookChapterComponentPipelineProps {
  bookId: number;
  context: BunnyKernel<BUIBookChapterEntity, BUIBookChapterEntity>;
}

interface FirstChapterState {
  number: number;
  title: string;
  isEmpty: boolean;
}

/** Normalize any thrown value into a readable user-facing message. */
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
    return "Unknown error occurred while writing chapter content.";
  }
}

export default function BUIBookChapterComponentPipeline({
  bookId,
  context,
}: BUIBookChapterComponentPipelineProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Pipeline Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [promptType, setPromptType] = useState<string>("default");
  const [useAuthorProfile, setUseAuthorProfile] = useState(true);
  const [useAuthorSkills, setUseAuthorSkills] = useState(false);
  const [currentChapterTitle, setCurrentChapterTitle] = useState("");
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<
    string | null
  >(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Content writing mode: rewrite all content OR write only empty content
  const [writeMode, setWriteMode] = useState<WriteMode>("empty");
  // First chapter overview used to decide whether content writing should start
  const [firstChapter, setFirstChapter] = useState<FirstChapterState | null>(
    null,
  );
  // AI / pipeline error surfaced through a popup
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inspect the first chapter whenever the setup panel opens so we can
  // report whether content writing should start and recommend a mode.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    (async () => {
      try {
        const repo = new BUIBookChapterRepository();
        const records = await repo.getChaptersByBook(bookId);
        if (cancelled) return;

        const sorted = [...records].sort((a, b) => a.number - b.number);
        const first = sorted[0];

        if (first) {
          const isEmpty =
            !first.content || first.content.trim().length === 0;
          setFirstChapter({
            number: first.number,
            title: first.title,
            isEmpty,
          });
          // A clean opening chapter means content writing can start from
          // scratch; existing drafts imply a partial book, so rewriting all
          // is the more likely intent.
          setWriteMode(isEmpty ? "empty" : "all");
        } else {
          setFirstChapter(null);
          setWriteMode("empty");
        }
      } catch (error) {
        console.error("Failed to load chapter overview:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, bookId]);

  const handleStartPipeline = async () => {
    // 1. Close modal immediately
    setIsOpen(false);

    // 2. Set processing state and refresh the target data grid module
    setIsProcessing(true);
    setErrorMessage(null);
    context.adminPanel?.table?.refresh?.();
    setSelectedSystemPrompt(null);

    try {
      const repo = new BUIBookChapterRepository();
      const records = await repo.getChaptersByBook(bookId);

      // Select chapters based on the chosen writing mode
      const targetedChapters =
        writeMode === "all"
          ? records.filter((record) => record.id)
          : records.filter(
              (record) =>
                record.id &&
                (record.status !== "done" ||
                  !record.content ||
                  record.content.trim().length === 0),
            );

      if (targetedChapters.length === 0) {
        setIsProcessing(false);
        setErrorMessage(
          writeMode === "all"
            ? "No chapters found to rewrite. This book does not have any chapters yet."
            : "No empty or pending chapters found to process. Every chapter already has content.",
        );
        return;
      }

      setProgress({ current: 0, total: targetedChapters.length });

      // 3. Loop sequentially through target records
      for (let i = 0; i < targetedChapters.length; i++) {
        const chapter = targetedChapters[i];

        setCurrentChapterTitle(`Ch.${chapter.number} - ${chapter.title}`);
        setProgress((prev) => ({ ...prev, current: i + 1 }));

        await generateChapterContentAction(
          chapter.id!,
          promptType,
          undefined,
          useAuthorSkills,
          useAuthorProfile,
        );

        // Mid-execution interface stream sync update
        context.adminPanel?.table?.refresh?.();
      }
    } catch (error) {
      console.error("Batch processing pipeline encountered errors:", error);
      // Surface AI / pipeline failures (500 or any other issue) via popup
      setErrorMessage(resolveErrorMessage(error));
    } finally {
      // 4. Complete routine execution loops
      setIsProcessing(false);
      setCurrentChapterTitle("");
      context.adminPanel?.table?.refresh?.();
    }
  };

  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-warning-50 border border-warning-200 rounded-lg animate-pulse shadow-sm">
        <LoaderIcon className="w-4 h-4 text-warning animate-spin" />
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-warning-800 leading-none">
            Writing Chapters ({progress.current}/{progress.total})
          </span>
          {currentChapterTitle && (
            <span className="text-[10px] text-warning-600 truncate max-w-[180px] font-medium mt-0.5">
              {currentChapterTitle}
            </span>
          )}
        </div>
      </div>
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
              <Modal.Header>Sequential Writing Pipeline</Modal.Header>
              <Modal.Body className="gap-4">
                <p className="text-sm text-default-500">
                  This triggers sequential processing of all chapters under this
                  outline layout currently marked as
                  <span className="font-semibold text-default-700">
                    {" "}
                    Empty
                  </span>{" "}
                  or
                  <span className="font-semibold text-primary"> Pending</span>.
                </p>

                {/* First chapter status — only shown when the first chapter already
                    has content. Hidden during first writing (empty first chapter). */}
                {firstChapter && !firstChapter.isEmpty && (
                  <div className="p-3 rounded-lg border flex items-start gap-2.5 bg-success-50 border-success-200">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-success-800">
                        Some chapters already have content
                      </span>
                      <span className="text-[11px] text-default-600 leading-relaxed">
                        Some existing drafts are detected. Choose a writing mode
                        below.
                      </span>
                    </div>
                  </div>
                )}

                {/* Content writing mode — only shown when the first chapter already
                    has content. Hidden during first writing (empty first chapter). */}
                {firstChapter && !firstChapter.isEmpty && (
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
                          Generate chapters that have no existing content.
                          Completed chapters are skipped.
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
                          Regenerate every chapter, overwriting any existing
                          content.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-default-500">
                    AI Author Writing Persona Template
                  </label>
                  <select
                    aria-label="Select Persona"
                    value={promptType}
                    onChange={(e) => {
                      const key = e.target.value;
                      setPromptType(key);
                      const entry = buiChapterPromptContent.prompt.find(
                        (p) => p.key === key,
                      );
                      setSelectedSystemPrompt(
                        entry?.systemPrompt?.trim() ?? null,
                      );
                    }}
                    className="w-full min-h-10 px-3 py-2 rounded-xl border-2 border-default-200 bg-transparent text-sm hover:border-default-400 focus:border-primary focus:outline-none transition-colors"
                  >
                    {buiChapterPromptContent.prompt.map((entry) => (
                      <option key={entry.key} value={entry.key}>
                        {entry.label}
                      </option>
                    ))}
                  </select>

                  {selectedSystemPrompt && (
                    <div className="mt-1 p-2 rounded-lg bg-primary-50 border border-primary-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 block mb-1">
                        System Prompt Preview
                      </span>
                      <pre className="text-[11px] text-primary-800 leading-relaxed whitespace-pre-wrap font-sans">
                        {selectedSystemPrompt}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 border-t pt-3 border-default-100">
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
                    Include Author Skills in chapter content
                  </label>
                </div>

                <div className="p-3 bg-default-50 border border-default-200 rounded-lg flex gap-2.5 items-start">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-default-600 leading-relaxed">
                    Once launched, this setup panel closes. The generation
                    monitor hooks directly into the header toolbars layout until
                    complete.
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

      {/* AI / pipeline error popup */}
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
                      The pipeline stopped. Failed chapters may have been reset
                      to "empty". Please check your AI configuration and retry.
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
