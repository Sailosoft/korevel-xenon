import { useBunnyKernel } from "@/src/modules/bunny/src/kernel";
import { Button, Modal } from "@heroui/react";
import { LoaderIcon, Rocket, AlertTriangle } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { BUIBookRepository } from "./bui.book.repository";
import { BUIBookChapterRepository } from "./bui.book-chapter.repository";
import { buiChapterServerGenerate } from "./bui.book-chapter.server";
import { buiChapterPrompt } from "./bui.book-chapter.prompt";
import { BUIBookEntity, BUIBookChapterEntity } from "./bui.book.entity";
import BUIAuthorSkillRelationRepository from "../author-skills/bui.author-skills.relation.repository";
import { BUIAuthorSkill } from "../author-skills/bui.author-skills.entity";

interface BUIBookChapterComponentGenerateProps {
  bookId: number;
}

/** Strategy selected by the user when overlapping chapters are detected. */
type ConflictStrategy = "skip" | "rewrite" | "extend" | null;

/** Describes one overlapping chapter for the confirmation UI. */
interface OverlapInfo {
  number: number;
  existingTitle: string;
  incomingTitle: string;
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

  // ── Conflict resolution state ────────────────────────────────────────────
  const [conflictOverlaps, setConflictOverlaps] = useState<OverlapInfo[]>([]);
  const [conflictGenerated, setConflictGenerated] = useState<
    BUIBookChapterEntity[]
  >([]);
  const [conflictResolving, setConflictResolving] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);

  useEffect(() => {
    async function loadContext() {
      try {
        const bookRepo = new BUIBookRepository();
        const bookResponse = await bookRepo.panelGetOne(bookId);
        if (bookResponse) {
          setBookData(bookResponse);
        }
      } catch (error) {
        console.error("Failed loading configuration profiles:", error);
      }
    }
    if (bookId) loadContext();
  }, [bookId]);

  /** Persist the generated chapters after a strategy has been chosen. */
  const persistChapters = useCallback(
    async (
      generated: BUIBookChapterEntity[],
      strategy: ConflictStrategy,
      existingChapters: BUIBookChapterEntity[],
    ) => {
      const chapterRepo = new BUIBookChapterRepository();
      const existingNumbers = new Set(existingChapters.map((c) => c.number));
      const maxExisting = Math.max(0, ...existingNumbers);

      let toCreate: BUIBookChapterEntity[];

      switch (strategy) {
        case "skip":
          // Only create chapters whose number does NOT already exist
          toCreate = generated.filter(
            (item) => !existingNumbers.has(item.number),
          );
          break;

        case "rewrite":
          // Delete all overlapping chapters first, then create all generated
          const overlapToDelete = existingChapters.filter((ex) =>
            generated.some((gen) => gen.number === ex.number),
          );
          await Promise.all(
            overlapToDelete.map((ex) => chapterRepo.delete(ex.id!)),
          );
          toCreate = generated;
          break;

        case "extend":
          // Only keep chapters with numbers beyond the maximum existing
          toCreate = generated.filter((item) => item.number > maxExisting);
          break;

        default:
          toCreate = [];
      }

      // Persist the filtered list
      for (const item of toCreate) {
        await chapterRepo.panelCreate({
          bookId,
          number: item.number,
          title: item.title,
          description: item.description,
          status: "pending",
        });
      }

      // Force refresh core pipeline data table arrays
      kernel.adminPanel.table.refresh();
    },
    [bookId, kernel],
  );

  /** Resolve a conflict by applying the chosen strategy. */
  const resolveConflict = useCallback(
    async (strategy: ConflictStrategy) => {
      if (!strategy || conflictGenerated.length === 0) return;
      setConflictResolving(true);
      setShowConflictModal(false);

      try {
        const chapterRepo = new BUIBookChapterRepository();
        const existingChapters = await chapterRepo.getChaptersByBook(bookId);
        await persistChapters(conflictGenerated, strategy, existingChapters);
      } catch (error) {
        console.error("Failed to apply conflict strategy:", error);
      } finally {
        setConflictResolving(false);
        setConflictGenerated([]);
        setConflictOverlaps([]);
      }
    },
    [bookId, conflictGenerated, persistChapters],
  );

  const handleGenerate = useCallback(async () => {
    if (!bookData) return;
    setIsGenerating(true);
    kernel.adminPanel.table.loadingOn();

    try {
      // Fetch author skills if requested
      let skills: BUIAuthorSkill[] | undefined;
      if (useAuthorSkills && bookData.authorId) {
        const skillRelationRepo = new BUIAuthorSkillRelationRepository();
        skills = await skillRelationRepo.getSkillsByAuthor(bookData.authorId);
      }

      // Load existing chapters so the AI can be aware of them
      const chapterRepo = new BUIBookChapterRepository();
      const existingChapters = await chapterRepo.getChaptersByBook(bookId);

      const response = await buiChapterServerGenerate(
        {
          book: bookData,
          author: bookData.author,
          existingChapters,
        },
        templateType,
        useAuthorProfile,
        undefined,
        skills,
      );

      // Raw array parse pipeline execution
      const generatedChapters: BUIBookChapterEntity[] = JSON.parse(response);

      if (!Array.isArray(generatedChapters) || generatedChapters.length === 0) {
        return;
      }

      // ── Check for overlaps with existing chapters ──────────────────────────
      if (existingChapters.length > 0) {
        const existingByNumber = new Map(
          existingChapters.map((c) => [c.number, c]),
        );
        const overlaps: OverlapInfo[] = [];

        for (const gen of generatedChapters) {
          const existing = existingByNumber.get(gen.number);
          if (existing) {
            overlaps.push({
              number: gen.number,
              existingTitle: existing.title,
              incomingTitle: gen.title,
            });
          }
        }

        if (overlaps.length > 0) {
          // ── Conflict detected — show dialog ──────────────────────────────
          setConflictOverlaps(overlaps);
          setConflictGenerated(generatedChapters);
          setShowConflictModal(true);
          setIsGenerating(false);
          kernel.adminPanel.table.loadingOff();
          return; // wait for user strategy choice
        }
      }

      // ── No conflicts — persist directly ────────────────────────────────────
      for (const item of generatedChapters) {
        await chapterRepo.panelCreate({
          bookId,
          number: item.number,
          title: item.title,
          description: item.description,
          status: "pending",
        });
      }
      // Force refresh core pipeline data table arrays
      kernel.adminPanel.table.refresh();
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
    templateType,
  ]);

  return (
    <>
      {/* ── Trigger button ───────────────────────────────────────────── */}
      <Button variant="secondary" onPress={handleGenerate}>
        <LoaderIcon />
        <span className="hidden sm:inline ml-1">
          {isGenerating ? "Generating Chapters..." : "Generate Chapters"}
        </span>
      </Button>

      {/* ── Conflict resolution modal ────────────────────────────────── */}
      <Modal.Backdrop
        isOpen={showConflictModal}
        onOpenChange={(open) => {
          if (!open && !conflictResolving) {
            setShowConflictModal(false);
            setConflictOverlaps([]);
            setConflictGenerated([]);
          }
        }}
        isDismissable={!conflictResolving}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[520px]">
            <Modal.CloseTrigger
              isDisabled={conflictResolving}
            />
            <Modal.Header>
              <Modal.Icon className="bg-amber-100 text-amber-600">
                <AlertTriangle className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Chapter Overlap Detected</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-sm text-default-500">
                The AI generated <strong>{conflictOverlaps.length}</strong>{" "}
                chapter{conflictOverlaps.length > 1 ? "s" : ""} that{" "}
                {conflictOverlaps.length > 1 ? "number" : "number "} already
                exist{conflictOverlaps.length > 1 ? "" : "s"}. Choose how to
                proceed:
              </p>

              {/* Overlap list */}
              <div className="max-h-40 overflow-y-auto border border-default-200 rounded-lg divide-y divide-default-100">
                {conflictOverlaps.map((ov) => (
                  <div
                    key={ov.number}
                    className="flex items-start gap-3 px-3 py-2 text-xs"
                  >
                    <span className="font-bold text-default-500 shrink-0 w-6">
                      #{ov.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-default-400 line-through">
                        {ov.existingTitle}
                      </span>
                      <br />
                      <span className="text-default-700">
                        {ov.incomingTitle}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Strategy options */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => resolveConflict("skip")}
                  disabled={conflictResolving}
                  className="flex items-start gap-3 p-3 rounded-lg border border-default-200 hover:border-primary hover:bg-primary/5 transition-colors text-left cursor-pointer disabled:opacity-50"
                >
                  <div className="mt-0.5">
                    <span className="text-sm font-semibold text-default-800">
                      ⏭️ Skip
                    </span>
                    <p className="text-xs text-default-500">
                      Keep existing chapters unchanged. Only create chapters
                      with brand-new numbers.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => resolveConflict("rewrite")}
                  disabled={conflictResolving}
                  className="flex items-start gap-3 p-3 rounded-lg border border-default-200 hover:border-red-400 hover:bg-red-50 transition-colors text-left cursor-pointer disabled:opacity-50"
                >
                  <div className="mt-0.5">
                    <span className="text-sm font-semibold text-default-800">
                      🔄 Rewrite
                    </span>
                    <p className="text-xs text-default-500">
                      Delete existing overlapping chapters and replace them
                      with the newly generated versions.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => resolveConflict("extend")}
                  disabled={conflictResolving}
                  className="flex items-start gap-3 p-3 rounded-lg border border-default-200 hover:border-green-400 hover:bg-green-50 transition-colors text-left cursor-pointer disabled:opacity-50"
                >
                  <div className="mt-0.5">
                    <span className="text-sm font-semibold text-default-800">
                      📖 Extend
                    </span>
                    <p className="text-xs text-default-500">
                      Append only chapters beyond the last existing chapter
                      number. Existing chapters are preserved entirely.
                    </p>
                  </div>
                </button>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="ghost"
                isDisabled={conflictResolving}
                onPress={() => {
                  setShowConflictModal(false);
                  setConflictOverlaps([]);
                  setConflictGenerated([]);
                }}
              >
                Cancel
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
