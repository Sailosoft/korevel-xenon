// bui.book-chapter.component.pipeline.tsx
import React, { useState } from "react";
import { Button, Modal } from "@heroui/react";
import {
  Wand2,
  LoaderIcon,
  AlertTriangle,
  NotebookPenIcon,
} from "lucide-react";
import { BunnyKernel } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUIBookChapterEntity } from "./bui.book.entity";
import { BUIBookChapterRepository } from "./bui.book-chapter.repository";
import { generateChapterContentAction } from "./bui.book-chapter.action.content";
import { buiChapterPromptContent } from "./bui.book-chapter.prompt.content";

interface BUIBookChapterComponentPipelineProps {
  bookId: number;
  context: BunnyKernel<BUIBookChapterEntity, BUIBookChapterEntity>;
}

export default function BUIBookChapterComponentPipeline({
  bookId,
  context,
}: BUIBookChapterComponentPipelineProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Pipeline Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [promptType, setPromptType] = useState<string>("default");
  const [useAuthorSkills, setUseAuthorSkills] = useState(false);
  const [currentChapterTitle, setCurrentChapterTitle] = useState("");
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<
    string | null
  >(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleStartPipeline = async () => {
    // 1. Close modal immediately
    setIsOpen(false);

    // 2. Set processing state and refresh the target data grid module
    setIsProcessing(true);
    context.adminPanel?.table?.refresh?.();
    setSelectedSystemPrompt(null);

    try {
      const repo = new BUIBookChapterRepository();
      const records = await repo.getChaptersByBook(bookId);

      const targetedChapters = records.filter(
        (record) => record.status !== "done" && record.id,
      );

      if (targetedChapters.length === 0) {
        setIsProcessing(false);
        alert("No empty or pending chapters found to process.");
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
        );

        // Mid-execution interface stream sync update
        context.adminPanel?.table?.refresh?.();
      }
    } catch (error) {
      console.error("Batch processing pipeline encountered errors:", error);
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
    </>
  );
}
