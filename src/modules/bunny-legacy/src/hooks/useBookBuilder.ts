/**
 * useBookBuilder - Custom hook for book builder state management.
 *
 * Single Responsibility: Manages all state and business logic coordination.
 * Separates state logic from UI presentation.
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "@heroui/react";
import { useLiveQuery } from "dexie-react-hooks";
import { BLDatabase, BLAuthorRepository, BLGenerationRepository, BLChapterRepository } from "../core/BLRepository";
import { BLBookBuilderService } from "../core/BLService";
import { BLRegenerationMode } from "../core/BLEntity";
import { useHelixAIOption } from "@/src/modules/helix";
import type { IBLAuthor, IBLAuthorSkill, IBLChapter, IBLGeneration } from "../core/BLEntity";
import type { HelixAIOption } from "@/src/modules/helix";

interface IBookBuilderState {
  /** Author */
  selectedAuthorId: string;
  authorName: string;
  authorDesc: string;
  skills: Partial<IBLAuthorSkill>[];
  newSkillName: string;

  /** Book Generation */
  bookTitle: string;
  bookDesc: string;
  isGeneratingOutline: boolean;
  isBulkGenerating: boolean;

  /** Saved Books & Chapters */
  selectedGenerationId: number | null;
  chapters: IBLChapter[];
  generatingChapterId: number | null;
  previewChapter: IBLChapter | null;
  isRegenerateDialogOpen: boolean;

  /** BLDialog (chapter regeneration confirmation) */
  isBLDialogOpen: boolean;
  pendingChapterForDialog: IBLChapter | null;

  /** Delete Book Confirmation Dialog */
  isDeleteBookDialogOpen: boolean;
  pendingDeleteGenerationId: number | null;

  /** Delete Chapter Confirmation Dialog */
  isDeleteChapterDialogOpen: boolean;
  pendingDeleteChapter: IBLChapter | null;

  /** Delete All Chapters Confirmation Dialog */
  isDeleteAllChaptersDialogOpen: boolean;
  pendingDeleteAllChaptersGenerationId: number | null;

  /** AI Config Modal */
  isAIConfigOpen: boolean;

  /** Loading */
  isLoading: boolean;
}

interface IBookBuilderActions {
  onSelectAuthor: (id: string) => void;
  onAuthorNameChange: (name: string) => void;
  onAuthorDescChange: (desc: string) => void;
  onNewSkillNameChange: (name: string) => void;
  onAddSkill: () => void;
  onRemoveSkill: (index: number) => void;
  onSaveAuthor: () => Promise<void>;
  onBookTitleChange: (title: string) => void;
  onBookDescChange: (desc: string) => void;
  onBulkGeneratingChange: (value: boolean) => void;
  onGenerateBook: () => Promise<void>;
  onSelectGeneration: (id: number | null) => void;
  onGenerateChapter: (chapter: IBLChapter) => Promise<void>;
  onPreviewChapter: (chapter: IBLChapter | null) => void;
  onExportMarkdown: () => void;
  onExportHTML: () => Promise<void>;
  onRegenerateDialogOpenChange: (open: boolean) => void;
  onRegenerationFlow: (mode: "all" | "empty") => Promise<void>;
  onBLDialogOpenChange: (open: boolean) => void;
  onBLDialogConfirm: () => Promise<void>;
  onAIConfigOpenChange: (open: boolean) => void;
  /** Delete a book (generation) — opens confirmation dialog */
  onDeleteBook: () => void;
  /** Delete book confirmation dialog visibility */
  onDeleteBookDialogOpenChange: (open: boolean) => void;
  /** Execute book deletion after confirmation */
  onDeleteBookConfirm: () => Promise<void>;
  /** Delete a single chapter — opens confirmation dialog */
  onDeleteChapter: (chapter: IBLChapter) => void;
  /** Delete chapter confirmation dialog visibility */
  onDeleteChapterDialogOpenChange: (open: boolean) => void;
  /** Execute chapter deletion after confirmation */
  onDeleteChapterConfirm: () => Promise<void>;
  /** Delete all chapters of the selected book — opens confirmation dialog */
  onDeleteAllChapters: () => void;
  /** Delete all chapters confirmation dialog visibility */
  onDeleteAllChaptersDialogOpenChange: (open: boolean) => void;
  /** Execute delete all chapters after confirmation */
  onDeleteAllChaptersConfirm: () => Promise<void>;
  /** Save/update the selected book's title and description */
  onSaveBook: () => Promise<void>;
  /** Reset book form for creating a new book */
  onNewBook: () => void;
}

export type TUseBookBuilderReturn = IBookBuilderState & IBookBuilderActions & {
  allAuthors: IBLAuthor[];
  allGenerations: IBLGeneration[];
  chapterCounts: Record<number, number>;
};

const db = new BLDatabase();

function createService(): BLBookBuilderService {
  return new BLBookBuilderService(db);
}

function resetFormState(): Pick<IBookBuilderState, "authorName" | "authorDesc" | "skills" | "newSkillName"> {
  return {
    authorName: "",
    authorDesc: "",
    skills: [],
    newSkillName: "",
  };
}

export function useBookBuilder(): TUseBookBuilderReturn {
  const serviceRef = useRef<BLBookBuilderService>(createService());

  const allAuthors = useLiveQuery(() => serviceRef.current.getAllAuthors()) ?? [];
  const allGenerations = useLiveQuery(() => serviceRef.current.getAllGenerations()) ?? [];
  const chapterCounts = useLiveQuery(() => serviceRef.current.getChapterCounts()) ?? {};

  // ─── AI Config from Dexie ───────────────────────────────────────────
  const aiOption = useHelixAIOption({ table: db.aiSettings, key: "default" });
  const aiConfig: HelixAIOption | undefined = aiOption;

  // ─── State ──────────────────────────────────────────────────────────
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>("new");
  const [authorName, setAuthorName] = useState("");
  const [authorDesc, setAuthorDesc] = useState("");
  const [skills, setSkills] = useState<Partial<IBLAuthorSkill>[]>([]);
  const [newSkillName, setNewSkillName] = useState("");

  const [bookTitle, setBookTitle] = useState("");
  const [bookDesc, setBookDesc] = useState("");
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const [selectedGenerationId, setSelectedGenerationId] = useState<number | null>(null);
  const [chapters, setChapters] = useState<IBLChapter[]>([]);
  const [generatingChapterId, setGeneratingChapterId] = useState<number | null>(null);
  const [previewChapter, setPreviewChapter] = useState<IBLChapter | null>(null);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);

  /** BLDialog (chapter regeneration confirmation) */
  const [isBLDialogOpen, setIsBLDialogOpen] = useState(false);
  const [pendingChapterForDialog, setPendingChapterForDialog] = useState<IBLChapter | null>(null);

  /** Delete Book Confirmation Dialog */
  const [isDeleteBookDialogOpen, setIsDeleteBookDialogOpen] = useState(false);
  const [pendingDeleteGenerationId, setPendingDeleteGenerationId] = useState<number | null>(null);

  /** Delete Chapter Confirmation Dialog */
  const [isDeleteChapterDialogOpen, setIsDeleteChapterDialogOpen] = useState(false);
  const [pendingDeleteChapter, setPendingDeleteChapter] = useState<IBLChapter | null>(null);

  /** Delete All Chapters Confirmation Dialog */
  const [isDeleteAllChaptersDialogOpen, setIsDeleteAllChaptersDialogOpen] = useState(false);
  const [pendingDeleteAllChaptersGenerationId, setPendingDeleteAllChaptersGenerationId] = useState<number | null>(null);

  /** AI Config Modal */
  const [isAIConfigOpen, setIsAIConfigOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // ─── Author Data Loading ─────────────────────────────────────────────
  useEffect(() => {
    if (selectedAuthorId !== "new") {
      const id = parseInt(selectedAuthorId);
      serviceRef.current.loadAuthorData(id).then(({ author, skills: authorSkills }) => {
        setAuthorName(author.name);
        setAuthorDesc(author.description);
        setSkills(authorSkills);
      }).catch(() => {
        resetForm();
      });
    } else {
      resetForm();
    }
  }, [selectedAuthorId]);

  // ─── Chapters Loading ────────────────────────────────────────────────
  useEffect(() => {
    if (selectedGenerationId) {
      serviceRef.current.getChapters(selectedGenerationId).then(setChapters);
    } else {
      setChapters([]);
    }
  }, [selectedGenerationId]);

  const resetForm = useCallback(() => {
    const form = resetFormState();
    setAuthorName(form.authorName);
    setAuthorDesc(form.authorDesc);
    setSkills(form.skills);
    setNewSkillName(form.newSkillName);
  }, []);

  // ─── Actions ─────────────────────────────────────────────────────────

  const onSelectAuthor = useCallback((id: string) => {
    setSelectedAuthorId(id);
  }, []);

  const onAuthorNameChange = useCallback((name: string) => {
    setAuthorName(name);
  }, []);

  const onAuthorDescChange = useCallback((desc: string) => {
    setAuthorDesc(desc);
  }, []);

  const onNewSkillNameChange = useCallback((name: string) => {
    setNewSkillName(name);
  }, []);

  const onAddSkill = useCallback(() => {
    if (!newSkillName.trim()) return;
    setSkills((prev) => [
      ...prev,
      { name: newSkillName, description: "", type: "general" },
    ]);
    setNewSkillName("");
  }, [newSkillName]);

  const onRemoveSkill = useCallback((index: number) => {
    setSkills((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const onSaveAuthor = useCallback(async () => {
    if (!authorName.trim()) {
      toast.warning("Author name is required");
      return;
    }
    setIsLoading(true);
    try {
      const isUpdate = selectedAuthorId !== "new";
      const authorData: IBLAuthor = { name: authorName, description: authorDesc };
      const skillsToSave = skills.map((s) => ({
        name: s.name || "",
        description: s.description || "",
        type: s.type || "general",
      })) as IBLAuthorSkill[];

      const authorId = await serviceRef.current.saveAuthor(
        authorData,
        skillsToSave,
        selectedAuthorId,
      );

      setSelectedAuthorId(authorId.toString());

      if (isUpdate) {
        toast.success(`Author "${authorName}" updated successfully`);
      } else {
        toast.success(`Author "${authorName}" created successfully`);
      }
    } catch (error) {
      console.error("Failed to save author:", error);
      toast.danger("Failed to save author. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [authorName, authorDesc, skills, selectedAuthorId]);

  const onBookTitleChange = useCallback((title: string) => {
    setBookTitle(title);
  }, []);

  const onBookDescChange = useCallback((desc: string) => {
    setBookDesc(desc);
  }, []);

  const onBulkGeneratingChange = useCallback((value: boolean) => {
    setIsBulkGenerating(value);
  }, []);

  const onGenerateBook = useCallback(async () => {
    if (!bookTitle || !bookDesc) {
      toast.warning("Please provide a book title and description");
      return;
    }
    if (selectedAuthorId === "new") {
      toast.warning("Please select or create an author first");
      return;
    }

    setIsGeneratingOutline(true);
    toast("Generating book outline...");
    try {
      const skillNames = skills.map((s) => s.name || "");
      const generationId = await serviceRef.current.generateOutline(
        bookTitle,
        bookDesc,
        authorName,
        skillNames,
        parseInt(selectedAuthorId),
        isBulkGenerating,
        aiConfig,
      );

      toast.success(`Book "${bookTitle}" outline generated (${isBulkGenerating ? "with chapters" : "chapters ready"})`);

      if (isBulkGenerating) {
        const newChapters = await serviceRef.current.getChapters(generationId);
        setSelectedGenerationId(generationId);

        toast("Bulk generating all chapters...");
        await serviceRef.current.runAutoPipeline(
          generationId,
          newChapters,
          bookTitle,
          bookDesc,
          newChapters,
          authorName,
          authorDesc,
          skillNames,
          (chapterId) => {
            setGeneratingChapterId(chapterId);
            toast(`Generating chapter ${newChapters.find(c => c.id === chapterId)?.number || ""}...`);
          },
          () => serviceRef.current.getChapters(generationId).then(setChapters),
          (chapterNumber) => {
            console.error(`Pipeline failed at chapter ${chapterNumber}`);
            toast.danger(`Failed to generate chapter ${chapterNumber}`);
          },
          aiConfig,
        );

        setGeneratingChapterId(null);
        setIsBulkGenerating(false);
        toast.success("All chapters generated successfully!");
      } else {
        setSelectedGenerationId(generationId);
      }
    } catch (error) {
      console.error("Failed to generate book:", error);
      toast.danger("Failed to generate book. Please try again.");
    } finally {
      setIsGeneratingOutline(false);
    }
  }, [bookTitle, bookDesc, selectedAuthorId, skills, authorName, authorDesc, isBulkGenerating, aiConfig]);

  const onSelectGeneration = useCallback((id: number | null) => {
    setSelectedGenerationId(id);
    if (id !== null) {
      // Use a direct DB read to ensure we always get the latest persisted data,
      // bypassing any staleness in the useLiveQuery for allGenerations.
      serviceRef.current.getGenerationById(id).then((generation) => {
        if (generation) {
          setBookTitle(generation.title);
          setBookDesc(generation.description);
        }
        if (generation?.authorId) {
          const authorId = generation.authorId;
          setSelectedAuthorId(authorId.toString());
          serviceRef.current.loadAuthorData(authorId).then(({ author, skills: authorSkills }) => {
            setAuthorName(author.name);
            setAuthorDesc(author.description);
            setSkills(authorSkills);
          }).catch(() => {
            // If author data fails to load, keep current form state
            console.warn(`Failed to load author data for authorId=${authorId}`);
          });
        }
      });
    } else {
      // Reset book form when deselecting
      setBookTitle("");
      setBookDesc("");
    }
  }, []);

  const doGenerateChapter = useCallback(async (chapter: IBLChapter) => {
    if (selectedAuthorId === "new") {
      toast.warning("Please select or create an author first");
      return;
    }
    if (!chapter.id) {
      toast.danger("Chapter ID is missing");
      return;
    }

    setGeneratingChapterId(chapter.id);
    toast(`Generating Chapter ${chapter.number}: ${chapter.title}...`);
    try {
      const skillNames = skills.map((s) => s.name || "");
      const content = await serviceRef.current.generateChapterContent(
        chapter,
        bookTitle,
        bookDesc,
        chapters,
        authorName,
        authorDesc,
        skillNames,
        aiConfig,
      );

      await serviceRef.current.updateChapterContent(chapter.id, content);

      if (selectedGenerationId) {
        const updated = await serviceRef.current.getChapters(selectedGenerationId);
        setChapters(updated);
      }

      toast.success(`Chapter ${chapter.number}: ${chapter.title} generated successfully`);
    } catch (error) {
      console.error("Failed to generate chapter content:", error);
      toast.danger(`Failed to generate Chapter ${chapter.number}: ${chapter.title}`);
    } finally {
      setGeneratingChapterId(null);
    }
  }, [selectedAuthorId, bookTitle, bookDesc, chapters, authorName, authorDesc, skills, selectedGenerationId, aiConfig]);

  const onGenerateChapter = useCallback(async (chapter: IBLChapter) => {
    // If the chapter already has content, show the BLDialog confirmation first
    const hasContent = !!chapter.content && chapter.content.trim().length > 0;
    if (hasContent) {
      setPendingChapterForDialog(chapter);
      setIsBLDialogOpen(true);
      return;
    }
    // Otherwise generate directly
    await doGenerateChapter(chapter);
  }, [doGenerateChapter]);

  const onBLDialogOpenChange = useCallback((open: boolean) => {
    setIsBLDialogOpen(open);
    if (!open) {
      setPendingChapterForDialog(null);
    }
  }, []);

  const onBLDialogConfirm = useCallback(async () => {
    const chapter = pendingChapterForDialog;
    setPendingChapterForDialog(null);
    setIsBLDialogOpen(false);
    if (chapter) {
      await doGenerateChapter(chapter);
    }
  }, [pendingChapterForDialog, doGenerateChapter]);

  const onAIConfigOpenChange = useCallback((open: boolean) => {
    setIsAIConfigOpen(open);
  }, []);

  // ─── Delete Book Actions ──────────────────────────────────────────────

  const onDeleteBook = useCallback(() => {
    if (!selectedGenerationId) {
      toast.warning("No book selected to delete");
      return;
    }
    setPendingDeleteGenerationId(selectedGenerationId);
    setIsDeleteBookDialogOpen(true);
  }, [selectedGenerationId]);

  const onDeleteBookDialogOpenChange = useCallback((open: boolean) => {
    setIsDeleteBookDialogOpen(open);
    if (!open) {
      setPendingDeleteGenerationId(null);
    }
  }, []);

  const onDeleteBookConfirm = useCallback(async () => {
    const generationId = pendingDeleteGenerationId;
    setPendingDeleteGenerationId(null);
    setIsDeleteBookDialogOpen(false);

    if (generationId === null) return;

    setIsLoading(true);
    try {
      const generation = allGenerations.find((g) => g.id === generationId);
      const bookTitle_ = generation?.title || "Book";
      await serviceRef.current.deleteGeneration(generationId);

      // Clear selection if the deleted book was selected
      if (selectedGenerationId === generationId) {
        setSelectedGenerationId(null);
        setChapters([]);
      }

      toast.success(`"${bookTitle_}" deleted successfully`);
    } catch (error) {
      console.error("Failed to delete book:", error);
      toast.danger("Failed to delete book. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [pendingDeleteGenerationId, allGenerations, selectedGenerationId]);

  // ─── Delete Chapter Actions ───────────────────────────────────────────

  const onDeleteChapter = useCallback((chapter: IBLChapter) => {
    setPendingDeleteChapter(chapter);
    setIsDeleteChapterDialogOpen(true);
  }, []);

  const onDeleteChapterDialogOpenChange = useCallback((open: boolean) => {
    setIsDeleteChapterDialogOpen(open);
    if (!open) {
      setPendingDeleteChapter(null);
    }
  }, []);

  const onDeleteChapterConfirm = useCallback(async () => {
    const chapter = pendingDeleteChapter;
    setPendingDeleteChapter(null);
    setIsDeleteChapterDialogOpen(false);

    if (!chapter || !chapter.id) return;

    setIsLoading(true);
    try {
      await serviceRef.current.deleteChapter(chapter.id);

      // Refresh chapters list
      if (selectedGenerationId) {
        const updated = await serviceRef.current.getChapters(selectedGenerationId);
        setChapters(updated);
      }

      toast.success(`Chapter ${chapter.number}: "${chapter.title}" deleted`);
    } catch (error) {
      console.error("Failed to delete chapter:", error);
      toast.danger("Failed to delete chapter. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [pendingDeleteChapter, selectedGenerationId]);

  // ─── Delete All Chapters Actions ───────────────────────────────────────

  const onDeleteAllChapters = useCallback(() => {
    if (!selectedGenerationId) {
      toast.warning("No book selected");
      return;
    }
    setPendingDeleteAllChaptersGenerationId(selectedGenerationId);
    setIsDeleteAllChaptersDialogOpen(true);
  }, [selectedGenerationId]);

  const onDeleteAllChaptersDialogOpenChange = useCallback((open: boolean) => {
    setIsDeleteAllChaptersDialogOpen(open);
    if (!open) {
      setPendingDeleteAllChaptersGenerationId(null);
    }
  }, []);

  const onDeleteAllChaptersConfirm = useCallback(async () => {
    const generationId = pendingDeleteAllChaptersGenerationId;
    setPendingDeleteAllChaptersGenerationId(null);
    setIsDeleteAllChaptersDialogOpen(false);

    if (generationId === null) return;

    setIsLoading(true);
    try {
      const generation = allGenerations.find((g) => g.id === generationId);
      const title = generation?.title || "Book";
      await serviceRef.current.deleteAllChapters(generationId);

      // Refresh chapters list
      if (selectedGenerationId === generationId) {
        const updated = await serviceRef.current.getChapters(generationId);
        setChapters(updated);
      }

      toast.success(`All chapters deleted from "${title}"`);
    } catch (error) {
      console.error("Failed to delete all chapters:", error);
      toast.danger("Failed to delete chapters. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [pendingDeleteAllChaptersGenerationId, allGenerations, selectedGenerationId]);

  // ─── Save / New Book Actions ───────────────────────────────────────────

  const onSaveBook = useCallback(async () => {
    if (!selectedGenerationId) {
      toast.warning("No book selected to update");
      return;
    }
    if (!bookTitle.trim()) {
      toast.warning("Book title is required");
      return;
    }

    setIsLoading(true);
    try {
      await serviceRef.current.updateGeneration(selectedGenerationId, bookTitle, bookDesc);
      toast.success(`Book "${bookTitle}" updated successfully`);
    } catch (error) {
      console.error("Failed to update book:", error);
      toast.danger("Failed to update book. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenerationId, bookTitle, bookDesc]);

  const onNewBook = useCallback(() => {
    setBookTitle("");
    setBookDesc("");
    setIsBulkGenerating(false);
    // Don't change selectedGenerationId — user can still see which book was selected
    // but the form is cleared for creating a new book
    toast("Book form cleared. Fill in new details and generate.");
  }, []);

  const onPreviewChapter = useCallback((chapter: IBLChapter | null) => {
    setPreviewChapter(chapter);
  }, []);

  const onExportMarkdown = useCallback(() => {
    if (!selectedGenerationId) {
      toast.warning("No book selected to export");
      return;
    }
    const generation = allGenerations.find((g) => g.id === selectedGenerationId);
    if (!generation) return;

    serviceRef.current.exportMarkdown(generation, chapters);
    toast.success(`"${generation.title}.md" downloaded`);
  }, [selectedGenerationId, allGenerations, chapters]);

  const onExportHTML = useCallback(async () => {
    if (!selectedGenerationId) {
      toast.warning("No book selected to export");
      return;
    }
    const generation = allGenerations.find((g) => g.id === selectedGenerationId);
    if (!generation) return;

    toast("Generating HTML export...");
    try {
      const { BLExportHTMLService } = await import("../core/BLExportHTMLService");
      const html = await BLExportHTMLService.generateHTML(generation, chapters);
      BLExportHTMLService.downloadHTML(html, `${generation.title}.html`);
      toast.success(`"${generation.title}.html" downloaded`);
    } catch (error) {
      console.error("Failed to export HTML:", error);
      toast.danger("Failed to export HTML. Please try again.");
    }
  }, [selectedGenerationId, allGenerations, chapters]);

  const onRegenerateDialogOpenChange = useCallback((open: boolean) => {
    setIsRegenerateDialogOpen(open);
  }, []);

  const onRegenerationFlow = useCallback(async (mode: "all" | "empty") => {
    if (!selectedGenerationId) return;

    // Close dialog immediately upon user action
    setIsRegenerateDialogOpen(false);

    const chaptersToProcess = await serviceRef.current.getChaptersToRegenerate(
      selectedGenerationId,
      mode === "all" ? BLRegenerationMode.ALL : BLRegenerationMode.EMPTY,
    );

    if (chaptersToProcess.length === 0) {
      toast("All chapters already have content — nothing to regenerate");
      return;
    }

    const label = mode === "all" ? "all" : "empty";
    toast(`Regenerating ${chaptersToProcess.length} ${label} chapter(s)...`);

    const skillNames = skills.map((s) => s.name || "");

    await serviceRef.current.runAutoPipeline(
      selectedGenerationId,
      chaptersToProcess,
      bookTitle,
      bookDesc,
      chapters,
      authorName,
      authorDesc,
      skillNames,
      (chapterId) => {
        setGeneratingChapterId(chapterId);
        const ch = chaptersToProcess.find(c => c.id === chapterId);
        if (ch) toast(`Regenerating Chapter ${ch.number}: ${ch.title}...`);
      },
      () => serviceRef.current.getChapters(selectedGenerationId).then(setChapters),
      (chapterNumber) => {
        console.error(`Pipeline failed at chapter ${chapterNumber}`);
        toast.danger(`Failed to regenerate chapter ${chapterNumber}`);
      },
      aiConfig,
    );

    setGeneratingChapterId(null);
    toast.success(`All ${chaptersToProcess.length} chapter(s) regenerated successfully`);
  }, [selectedGenerationId, skills, bookTitle, bookDesc, chapters, authorName, authorDesc, aiConfig]);

  // ─── Return ─────────────────────────────────────────────────────────
  return {
    // State
    selectedAuthorId,
    authorName,
    authorDesc,
    skills,
    newSkillName,
    bookTitle,
    bookDesc,
    isGeneratingOutline,
    isBulkGenerating,
    selectedGenerationId,
    chapters,
    generatingChapterId,
    previewChapter,
    isRegenerateDialogOpen,
    isBLDialogOpen,
    pendingChapterForDialog,
    isDeleteBookDialogOpen,
    pendingDeleteGenerationId,
    isDeleteChapterDialogOpen,
    pendingDeleteChapter,
    isDeleteAllChaptersDialogOpen,
    pendingDeleteAllChaptersGenerationId,
    isAIConfigOpen,
    isLoading,

    // Actions
    onSelectAuthor,
    onAuthorNameChange,
    onAuthorDescChange,
    onNewSkillNameChange,
    onAddSkill,
    onRemoveSkill,
    onSaveAuthor,
    onBookTitleChange,
    onBookDescChange,
    onBulkGeneratingChange,
    onGenerateBook,
    onSelectGeneration,
    onGenerateChapter,
    onPreviewChapter,
    onExportMarkdown,
    onExportHTML,
    onRegenerateDialogOpenChange,
    onRegenerationFlow,
    onBLDialogOpenChange,
    onBLDialogConfirm,
    onDeleteBook,
    onDeleteBookDialogOpenChange,
    onDeleteBookConfirm,
    onDeleteChapter,
    onDeleteChapterDialogOpenChange,
    onDeleteChapterConfirm,
    onDeleteAllChapters,
    onDeleteAllChaptersDialogOpenChange,
    onDeleteAllChaptersConfirm,
    onSaveBook,
    onNewBook,
    onAIConfigOpenChange,

    // Queries
    allAuthors,
    allGenerations,
    chapterCounts,
  };
}
