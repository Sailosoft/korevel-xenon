/**
 * useBookBuilder - Custom hook for book builder state management.
 *
 * Single Responsibility: Manages all state and business logic coordination.
 * Separates state logic from UI presentation.
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BLDatabase, BLAuthorRepository, BLGenerationRepository, BLChapterRepository } from "../core/BLRepository";
import { BLBookBuilderService } from "../core/BLService";
import { BLRegenerationMode } from "../core/BLEntity";
import type { IBLAuthor, IBLAuthorSkill, IBLChapter, IBLGeneration } from "../core/BLEntity";

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
}

export type TUseBookBuilderReturn = IBookBuilderState & IBookBuilderActions & {
  allAuthors: IBLAuthor[];
  allGenerations: IBLGeneration[];
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
    if (!authorName.trim()) return;
    setIsLoading(true);
    try {
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
    } catch (error) {
      console.error("Failed to save author:", error);
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
    if (!bookTitle || !bookDesc || selectedAuthorId === "new") return;

    setIsGeneratingOutline(true);
    try {
      const skillNames = skills.map((s) => s.name || "");
      const generationId = await serviceRef.current.generateOutline(
        bookTitle,
        bookDesc,
        authorName,
        skillNames,
        parseInt(selectedAuthorId),
        isBulkGenerating,
      );

      if (isBulkGenerating) {
        const newChapters = await serviceRef.current.getChapters(generationId);
        setSelectedGenerationId(generationId);

        await serviceRef.current.runAutoPipeline(
          generationId,
          newChapters,
          bookTitle,
          bookDesc,
          newChapters,
          authorName,
          authorDesc,
          skillNames,
          (chapterId) => setGeneratingChapterId(chapterId),
          () => serviceRef.current.getChapters(generationId).then(setChapters),
          (chapterNumber) => console.error(`Pipeline failed at chapter ${chapterNumber}`),
        );

        setGeneratingChapterId(null);
        setIsBulkGenerating(false);
      } else {
        setSelectedGenerationId(generationId);
      }
    } catch (error) {
      console.error("Failed to generate book:", error);
    } finally {
      setIsGeneratingOutline(false);
    }
  }, [bookTitle, bookDesc, selectedAuthorId, skills, authorName, authorDesc, isBulkGenerating]);

  const onSelectGeneration = useCallback((id: number | null) => {
    setSelectedGenerationId(id);
  }, []);

  const onGenerateChapter = useCallback(async (chapter: IBLChapter) => {
    if (selectedAuthorId === "new" || !chapter.id) return;

    setGeneratingChapterId(chapter.id);
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
      );

      await serviceRef.current.updateChapterContent(chapter.id, content);

      if (selectedGenerationId) {
        const updated = await serviceRef.current.getChapters(selectedGenerationId);
        setChapters(updated);
      }
    } catch (error) {
      console.error("Failed to generate chapter content:", error);
    } finally {
      setGeneratingChapterId(null);
    }
  }, [selectedAuthorId, bookTitle, bookDesc, chapters, authorName, authorDesc, skills, selectedGenerationId]);

  const onPreviewChapter = useCallback((chapter: IBLChapter | null) => {
    setPreviewChapter(chapter);
  }, []);

  const onExportMarkdown = useCallback(() => {
    if (!selectedGenerationId) return;
    const generation = allGenerations.find((g) => g.id === selectedGenerationId);
    if (!generation) return;

    serviceRef.current.exportMarkdown(generation, chapters);
  }, [selectedGenerationId, allGenerations, chapters]);

  const onExportHTML = useCallback(async () => {
    if (!selectedGenerationId) return;
    const generation = allGenerations.find((g) => g.id === selectedGenerationId);
    if (!generation) return;

    const { BLExportService } = await import("../core/BLService");
    const { marked } = await import("marked");

    const markdown = BLExportService.generateMarkdown(generation, chapters);
    const htmlContent = await marked.parse(markdown);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${generation.title}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <style>
        body { font-family: 'Georgia', serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; background-color: #fdfdfd; }
        h1 { text-align: center; font-size: 3em; margin-bottom: 0.2em; }
        blockquote { font-style: italic; color: #666; text-align: center; border: none; margin-bottom: 3em; }
        h2 { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 2em; }
        hr { border: 0; border-top: 1px dashed #ccc; margin: 3em 0; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>${htmlContent}</body>
</html>`;

    BLExportService.downloadFile(html, `${generation.title}.html`, "text/html");
  }, [selectedGenerationId, allGenerations, chapters]);

  const onRegenerateDialogOpenChange = useCallback((open: boolean) => {
    setIsRegenerateDialogOpen(open);
  }, []);

  const onRegenerationFlow = useCallback(async (mode: "all" | "empty") => {
    if (!selectedGenerationId) return;

    const chaptersToProcess = await serviceRef.current.getChaptersToRegenerate(
      selectedGenerationId,
      mode === "all" ? BLRegenerationMode.ALL : BLRegenerationMode.EMPTY,
    );

    if (chaptersToProcess.length === 0) return;

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
      (chapterId) => setGeneratingChapterId(chapterId),
      () => serviceRef.current.getChapters(selectedGenerationId).then(setChapters),
      (chapterNumber) => console.error(`Pipeline failed at chapter ${chapterNumber}`),
    );

    setGeneratingChapterId(null);
    setIsRegenerateDialogOpen(false);
  }, [selectedGenerationId, skills, bookTitle, bookDesc, chapters, authorName, authorDesc]);

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

    // Queries
    allAuthors,
    allGenerations,
  };
}
