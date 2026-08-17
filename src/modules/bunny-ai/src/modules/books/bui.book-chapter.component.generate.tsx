import { useBunnyKernel } from "@/src/modules/bunny/src/kernel";
import { Button, Modal } from "@heroui/react";
import { LoaderIcon, Rocket, AlertTriangle } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { BUIBookRepository } from "./bui.book.repository";
import { BUIBookChapterRepository } from "./bui.book-chapter.repository";
import { buiChapterServerGenerate } from "./bui.book-chapter.server";
import { buiChapterPrompt } from "./bui.book-chapter.prompt";
import { BUIBookEntity } from "./bui.book.entity";
import { BUIAuthorSkill } from "../author-skills/bui.author-skills.entity";
import { buiAuthorSkillResolveForGeneration } from "../author-skills/bui.author-skills.util";
import BUIAuthorSkillPicker from "../author-skills/bui.author-skills.picker.component";

type ConflictMode = "overwrite" | "skip" | "extend";

interface BUIBookChapterComponentGenerateProps {
  bookId: number;
}

export default function BUIBookChapterComponentGenerate({
  bookId,
}: BUIBookChapterComponentGenerateProps) {
  const kernel = useBunnyKernel();
  const [bookData, setBookData] = useState<BUIBookEntity | null>(null);
  const [useAuthorProfile, setUseAuthorProfile] = useState(true);
  const [useAuthorSkills, setUseAuthorSkills] = useState(false);
  const [templateType, setTemplateType] = useState<string>("default");
  const [isGenerating, setIsGenerating] = useState(false);
  const [existingChaptersCount, setExistingChaptersCount] = useState(0);
  const [conflictMode, setConflictMode] = useState<ConflictMode>("overwrite");
  const [selectedSkillNames, setSelectedSkillNames] = useState<string[]>([]);

  useEffect(() => {
    async function loadContext() {
      try {
        const bookRepo = new BUIBookRepository();
        // Presumes book layout includes author profile object nesting structures
        const bookResponse = await bookRepo.panelGetOne(bookId);
        if (bookResponse) {
          setBookData(bookResponse);
        }

        // Check for existing chapters to handle conflict resolution
        const chapterRepo = new BUIBookChapterRepository();
        const chapters = await chapterRepo.getChaptersByBook(bookId);
        setExistingChaptersCount(chapters.length);
      } catch (error) {
        console.error("Failed loading configuration profiles:", error);
      }
    }
    if (bookId) loadContext();
  }, [bookId]);

  const handleGenerate = useCallback(async () => {
    if (!bookData) return;
    setIsGenerating(true);
    kernel.adminPanel.table.loadingOn();

    try {
      const chapterRepo = new BUIBookChapterRepository();

      // Overwrite: delete all existing chapters before generating
      if (conflictMode === "overwrite") {
        const existingChapters = await chapterRepo.getChaptersByBook(bookId);
        if (existingChapters.length > 0) {
          const deletePromises = existingChapters
            .filter((ch) => ch.id)
            .map((ch) => chapterRepo.delete(ch.id!));
          await Promise.all(deletePromises);
        }
      }

      // Resolve skills if requested — either the explicitly selected skills
      // or the skills attached to the book's author.
      let skills: BUIAuthorSkill[] | undefined;
      if (useAuthorSkills) {
        skills = await buiAuthorSkillResolveForGeneration(
          selectedSkillNames,
          bookData.authorId,
        );
      }

      const response = await buiChapterServerGenerate(
        {
          book: bookData,
          author: bookData.author,
        },
        templateType,
        useAuthorProfile,
        undefined,
        skills,
      );

      // Raw array parse pipeline execution
      const generatedChapters = JSON.parse(response);
      const chapterRepoForCreate = new BUIBookChapterRepository();

      if (Array.isArray(generatedChapters)) {
        // Extend: compute starting number offset to append after existing chapters
        let numberOffset = 0;
        if (conflictMode === "extend") {
          const existing = await chapterRepoForCreate.getChaptersByBook(bookId);
          if (existing.length > 0) {
            numberOffset = Math.max(...existing.map((ch) => ch.number));
          }
        }

        for (const item of generatedChapters) {
          await chapterRepoForCreate.panelCreate({
            bookId,
            number: item.number + numberOffset,
            title: item.title,
            description: item.description,
            status: "pending",
          });
        }
        // Force refresh core pipeline data table arrays
        kernel.adminPanel.table.refresh();
      }
    } catch (error) {
      console.error("Pipeline breakdown processing payload:", error);
    } finally {
      setIsGenerating(false);
      kernel.adminPanel.table.loadingOff();
    }
  }, [
    kernel,
    bookId,
    bookData,
    useAuthorProfile,
    useAuthorSkills,
    selectedSkillNames,
    templateType,
    conflictMode,
  ]);

  const conflictOptions: {
    mode: ConflictMode;
    label: string;
    description: string;
  }[] = [
    {
      mode: "overwrite",
      label: "Overwrite",
      description: "Clear all chapters then generate new ones",
    },
    {
      mode: "skip",
      label: "Skip",
      description: "Keep existing chapters, do nothing",
    },
    {
      mode: "extend",
      label: "Extend",
      description: "Keep existing chapters, add new ones after",
    },
  ];

  // Loading state displayed inline when generation is in progress
  if (isGenerating) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg shadow-sm animate-pulse">
        <LoaderIcon className="w-4 h-4 text-primary animate-spin" />
        <span className="text-sm font-medium text-primary-700">
          Generating Chapters...
        </span>
      </div>
    );
  }

  return (
    <Modal>
      <Button variant="secondary">
        <Rocket />
        <span className="hidden sm:inline ml-1">Generate Chapters</span>
      </Button>

      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[460px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-primary/10 text-primary">
                <Rocket className="size-5" />
              </Modal.Icon>
              <Modal.Heading>AI Chapter Builder Configuration</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-sm text-default-500">
                Configure execution parameters to populate missing structural
                modules.
              </p>

              {/* Conflict resolution — shown only when chapters already exist */}
              {existingChaptersCount > 0 && (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                    <span className="text-sm font-semibold text-warning-800">
                      Chapters Already Exist ({existingChaptersCount})
                    </span>
                  </div>
                  <p className="text-xs text-warning-700 -mt-1">
                    This book already has chapters. Choose how to handle them:
                  </p>
                  <div className="flex flex-col gap-2">
                    {conflictOptions.map((option) => (
                      <label
                        key={option.mode}
                        className={`flex items-start gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                          conflictMode === option.mode
                            ? "border-warning-500 bg-warning-100/50"
                            : "border-warning-200/60 bg-transparent hover:border-warning-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="conflictMode"
                          value={option.mode}
                          checked={conflictMode === option.mode}
                          onChange={() => setConflictMode(option.mode)}
                          className="mt-0.5 accent-warning"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-warning-800">
                            {option.label}
                          </span>
                          <span className="text-xs text-warning-600">
                            {option.description}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t pt-3 border-default-100">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAuthorProfile}
                    onChange={(e) => setUseAuthorProfile(e.target.checked)}
                    className="rounded border-default-300 accent-primary"
                  />
                  Align logic structure based on Author Profile
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAuthorSkills}
                    onChange={(e) => setUseAuthorSkills(e.target.checked)}
                    className="rounded border-default-300 accent-primary"
                  />
                  Include Author Skills in chapter generation
                </label>
              </div>

              {/* Conditional skills selection — shown only when the checkbox is checked */}
              {useAuthorSkills && (
                <div className="flex flex-col gap-1 mt-2">
                  <label className="text-xs font-semibold uppercase text-default-400">
                    Select Skills to Include
                  </label>
                  <BUIAuthorSkillPicker
                    selectedNames={selectedSkillNames}
                    onChange={setSelectedSkillNames}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1 mt-2">
                <label className="text-xs font-semibold uppercase text-default-400">
                  Template Engine Style
                </label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  className="w-full bg-default-100 p-2 rounded-md text-sm outline-none border border-transparent focus:border-primary"
                >
                  {buiChapterPrompt.generateChapters.map((entry) => (
                    <option key={entry.key} value={entry.key}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 p-3 bg-default-50 border border-default-200 rounded-md">
                <span className="text-[10px] font-bold uppercase text-default-400 block mb-1">
                  Active Prompter Directives
                </span>
                <p className="text-xs text-default-600 italic">
                  {
                    buiChapterPrompt.generateChapters.find(
                      (p) => p.key === templateType,
                    )?.systemPrompt
                  }
                </p>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                className="w-full"
                variant="outline"
                isDisabled={isGenerating || !bookData}
                onClick={async () => {
                  // Skip mode: do nothing, user can close modal manually
                  if (conflictMode === "skip" && existingChaptersCount > 0) {
                    return;
                  }
                  await handleGenerate();
                }}
              >
                {isGenerating
                  ? "Processing Modules..."
                  : conflictMode === "skip" && existingChaptersCount > 0
                    ? "Close this window to cancel"
                    : "Confirm & Launch Engine"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
