"use client";

import "./book-builder.css";
import "@mdxeditor/editor/style.css";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BookOpen,
  BookText,
  Edit3,
  Eye,
  FileText,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";

import BookBuilderDB from "./book-builder.db";
import {
  IBookBuilderAuthor,
  IBookBuilderAuthorSkill,
  IBookBuilderChapter,
  IBookBuilderGeneration,
} from "./book-builder.interface";

// UI Components
import { Badge } from "@/src/shadcnui/components/ui/badge";
import { Button } from "@/src/shadcnui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/shadcnui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/shadcnui/components/ui/dialog";
import { Input } from "@/src/shadcnui/components/ui/input";
import { Label } from "@/src/shadcnui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/shadcnui/components/ui/select";
import { Separator } from "@/src/shadcnui/components/ui/separator";

// Server Actions
import {
  bookBuilderGenerateChapterContentWithContextAction,
  bookBuilderGenerateChaptersAction,
} from "./book-builder.actions";

import Markdown from "react-markdown";
import BookBuilderExportService from "./book-builder.export.service";
import { JSX } from "react/jsx-runtime";
import BookBuilderEditor from "./book-builder.editor";
import BookBuilderExportServiceInteractive from "./book-builder.export.service.interactive";
import BookBuilderComponentRegenerate from "./components/book-builder.component.regenerate";

const db = new BookBuilderDB();

export default function AuthorManager() {
  // --- Author State ---
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>("new");
  const [authorName, setAuthorName] = useState("");
  const [authorDesc, setAuthorDesc] = useState("");
  const [skills, setSkills] = useState<Partial<IBookBuilderAuthorSkill>[]>([]);
  const [newSkillName, setNewSkillName] = useState("");

  // --- Book Generation State ---
  const [bookTitle, setBookTitle] = useState("");
  const [bookDesc, setBookDesc] = useState("");
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  // --- Saved Books & Chapters ---
  const [selectedGenerationId, setSelectedGenerationId] = useState<
    number | null
  >(null);
  const [chapters, setChapters] = useState<IBookBuilderChapter[]>([]);
  const [generatingChapterId, setGeneratingChapterId] = useState<number | null>(
    null,
  );
  const [previewChapter, setPreviewChapter] =
    useState<IBookBuilderChapter | null>(null);

  const allAuthors = useLiveQuery(() => db.authors.toArray()) || [];
  const allGenerations = useLiveQuery(() => db.generations.toArray()) || [];

  // --- Auto Generation ---
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);

  // Load author data
  useEffect(() => {
    if (selectedAuthorId !== "new") {
      loadAuthorData(parseInt(selectedAuthorId));
    } else {
      resetForm();
    }
  }, [selectedAuthorId]);

  // Load chapters when a book is selected
  useEffect(() => {
    if (selectedGenerationId) {
      loadChapters(selectedGenerationId);
    } else {
      setChapters([]);
    }
  }, [selectedGenerationId]);

  const loadAuthorData = async (id: number) => {
    const author = await db.authors.get(id);
    const authorSkills = await db.authorSkills
      .where("authorId")
      .equals(id)
      .toArray();
    if (author) {
      setAuthorName(author.name);
      setAuthorDesc(author.description);
      setSkills(authorSkills);
    }
  };

  const loadChapters = async (genId: number) => {
    const chaps = await db.chapters
      .where("generationId")
      .equals(genId)
      .toArray();
    setChapters(chaps.sort((a, b) => a.number - b.number));
  };

  const resetForm = () => {
    setAuthorName("");
    setAuthorDesc("");
    setSkills([]);
    setNewSkillName("");
  };

  const addSkillToList = () => {
    if (!newSkillName.trim()) return;
    setSkills([
      ...skills,
      { name: newSkillName, description: "", type: "general" },
    ]);
    setNewSkillName("");
  };

  const saveAuthor = async () => {
    if (!authorName.trim()) return;

    const authorData: IBookBuilderAuthor = {
      name: authorName,
      description: authorDesc,
    };

    let authorId: number;
    if (selectedAuthorId === "new") {
      authorId = (await db.authors.add(authorData)) as number;
    } else {
      authorId = parseInt(selectedAuthorId);
      await db.authors.update(authorId, authorData);
      await db.authorSkills.where("authorId").equals(authorId).delete();
    }

    const skillsToSave = skills.map((s) => ({
      ...s,
      authorId,
    })) as IBookBuilderAuthorSkill[];

    await db.authorSkills.bulkAdd(skillsToSave);
    setSelectedAuthorId(authorId.toString());
    alert("Author saved successfully!");
  };

  // Generate Book Outline + Save
  const handleGenerateBook = async () => {
    if (!bookTitle || !bookDesc || selectedAuthorId === "new") {
      alert("Please select an author and provide book details.");
      return;
    }

    setIsGeneratingOutline(true);
    try {
      const skillNames = skills.map((s) => s.name || "");
      const outlineChapters = await bookBuilderGenerateChaptersAction(
        bookTitle,
        bookDesc,
        authorName,
        skillNames,
      );

      // Save Generation
      const generationData: IBookBuilderGeneration = {
        title: bookTitle,
        description: bookDesc,
        authorId: parseInt(selectedAuthorId),
        chapters: [],
      };

      const generationId = (await db.generations.add(generationData)) as number;

      // Save Chapters
      const chaptersToSave = outlineChapters.map((ch: any) => ({
        ...ch,
        generationId,
        content: "",
      }));

      await db.chapters.bulkAdd(chaptersToSave);

      setSelectedGenerationId(generationId);
      alert("Book outline generated and saved successfully!");

      // New: If toggle is on, start the loop
      if (isBulkGenerating) {
        // Fetch the newly created chapters from DB so they have IDs
        const newlyCreated = await db.chapters
          .where("generationId")
          .equals(generationId)
          .toArray();
        await runAutoPipeline(generationId, newlyCreated);
      } else {
        setSelectedGenerationId(generationId);
      }
    } catch (error) {
      console.error(error);
      alert("Error generating chapters. Make sure Ollama is running.");
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  // Generate Full Chapter Content
  const generateChapterContent = async (chapter: IBookBuilderChapter) => {
    if (!selectedAuthorId || selectedAuthorId === "new") return;

    setGeneratingChapterId(chapter.id!);
    try {
      const skillNames = skills.map((s) => s.name || "");
      const content = await bookBuilderGenerateChapterContentWithContextAction({
        book: {
          title: bookTitle,
          description: bookDesc,
          chapters,
        },
        chapter,
        author: {
          name: authorName,
          description: authorDesc,
        },
        skills: skillNames,
      });

      await db.chapters.update(chapter.id!, { content });

      // Refresh chapters
      if (selectedGenerationId) {
        await loadChapters(selectedGenerationId);
      }

      alert(`Chapter ${chapter.number} content generated successfully!`);
    } catch (error) {
      console.error(error);
      alert("Failed to generate chapter content.");
    } finally {
      setGeneratingChapterId(null);
    }
  };

  const runAutoPipeline = async (
    generationId: number,
    chaptersToGenerate: IBookBuilderChapter[],
    rewrite: boolean = false,
  ) => {
    setIsBulkGenerating(true);

    for (const chapter of chaptersToGenerate) {
      // Only generate if content is empty, or you can force overwrite
      if (!chapter.content || rewrite) {
        setGeneratingChapterId(chapter.id!);
        try {
          const skillNames = skills.map((s) => s.name || "");
          const content =
            await bookBuilderGenerateChapterContentWithContextAction({
              book: {
                title: bookTitle,
                description: bookDesc,
                chapters: chaptersToGenerate,
              },
              chapter,
              author: { name: authorName, description: authorDesc },
              skills: skillNames,
            });

          await db.chapters.update(chapter.id!, { content });
          await loadChapters(generationId);
        } catch (e) {
          console.error(`Failed at chapter ${chapter.number}`, e);
          break; // Stop pipeline on error
        }
      }
    }

    await loadChapters(generationId); // Final refresh
    setGeneratingChapterId(null);
    setIsBulkGenerating(false);
    alert("Bulk generation complete!");
  };

  const handleRegenerateAllChapters = async () => {
    if (!selectedGenerationId) return;

    // 1. Add the confirmation dialog
    const userConfirmed = window.confirm(
      "Warning: This will reset all existing chapter content. Are you sure you want to continue?",
    );

    // 2. Exit if the user clicks 'Cancel'
    if (!userConfirmed) return;

    const book = allGenerations.find((g) => g.id === selectedGenerationId);
    if (!book) return;

    const chaptersToGenerate = await db.chapters
      .where("generationId")
      .equals(selectedGenerationId)
      .toArray();

    await runAutoPipeline(selectedGenerationId, chaptersToGenerate);
  };

  const handleRegenerationFlow = async (mode: "all" | "empty") => {
    if (!selectedGenerationId) return;

    let chaptersToProcess = await db.chapters
      .where("generationId")
      .equals(selectedGenerationId)
      .toArray();
    console.log("chaptersToProcess", chaptersToProcess);

    if (mode === "empty") {
      // Only target chapters that have no content or just whitespace
      chaptersToProcess = chaptersToProcess.filter(
        (ch) => !ch.content || ch.content.trim() === "",
      );
    }

    if (chaptersToProcess.length === 0) {
      console.log("No chapters to generate.");
      return;
    }

    runAutoPipeline(selectedGenerationId, chaptersToProcess, true);
    setIsRegenerateDialogOpen(false); // Close dialog after starting
  };

  const handleExportMarkdown = () => {
    const book = allGenerations.find((g) => g.id === selectedGenerationId);
    if (!book) return;
    const content = BookBuilderExportService.generateMarkdown(book, chapters);
    BookBuilderExportService.downloadFile(
      content,
      `${book.title}.md`,
      "text/markdown",
    );
  };

  const handleExportHTML = async () => {
    const book = allGenerations.find((g) => g.id === selectedGenerationId);
    if (!book) return;
    const content =
      await BookBuilderExportServiceInteractive.generateTailwindHTML(
        book,
        chapters,
      );
    BookBuilderExportService.downloadFile(
      content,
      `${book.title}.html`,
      "text/html",
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 p-6">
      {/* AUTHOR MANAGEMENT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Authors</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedAuthorId}
              onValueChange={setSelectedAuthorId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Author" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  <UserPlus className="inline w-4 h-4 mr-2" /> New Author
                </SelectItem>
                {allAuthors.map((auth) => (
                  <SelectItem key={auth.id} value={auth.id?.toString() || ""}>
                    {auth.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedAuthorId === "new" ? "Create Author" : "Edit Author"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Bio</Label>
              <Input
                value={authorDesc}
                onChange={(e) => setAuthorDesc(e.target.value)}
              />
            </div>
            <Separator />
            <Label>Skills</Label>
            <div className="flex gap-2">
              <Input
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="e.g. Fantasy Writing"
              />
              <Button variant="secondary" onClick={addSkillToList}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => (
                <Badge key={i} variant="outline" className="gap-2">
                  {s.name}{" "}
                  <Trash2
                    className="w-3 h-3 cursor-pointer"
                    onClick={() =>
                      setSkills(skills.filter((_, idx) => idx !== i))
                    }
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={saveAuthor} className="w-full">
              <Save className="w-4 h-4 mr-2" /> Save Profile
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* SAVED BOOKS LIST */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookText className="w-5 h-5" /> My Books
          </CardTitle>
          <CardDescription>
            Select a book to view and edit its chapters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedGenerationId?.toString() || ""}
            onValueChange={(val) =>
              setSelectedGenerationId(val ? parseInt(val) : null)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a saved book" />
            </SelectTrigger>
            <SelectContent>
              {allGenerations.map((gen) => (
                <SelectItem key={gen.id} value={gen.id!.toString()}>
                  {gen.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* GENERATE NEW BOOK OUTLINE */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" /> AI Book Builder
          </CardTitle>
          <CardDescription>
            Generate a new book chapter outline using your selected author.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Book Title</Label>
            <Input
              placeholder="The Secrets of TypeScript..."
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Concept / Description</Label>
            {/* <Textarea
              placeholder="What is this book about?"
              value={bookDesc}
              onChange={(e) => setBookDesc(e.target.value)}
            /> */}
            <div className="border rounded-md bg-white dark:bg-slate-950 overflow-hidden">
              <BookBuilderEditor
                markdown={bookDesc}
                onChange={(markdown) => setBookDesc(markdown)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 py-2">
            <input
              type="checkbox"
              id="auto-pipeline"
              checked={isBulkGenerating}
              onChange={(e) => setIsBulkGenerating(e.target.checked)}
            />
            <Label htmlFor="auto-pipeline">
              Automatically generate all chapters in sequence
            </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleGenerateBook}
            disabled={isGeneratingOutline}
            className="w-full h-12 text-lg"
          >
            {isGeneratingOutline ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating
                Outline...
              </>
            ) : (
              <>
                <BookOpen className="w-5 h-5 mr-2" /> Generate Chapter Outline
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* CHAPTERS SECTION */}
      {selectedGenerationId && chapters.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>
              Chapters —{" "}
              {allGenerations.find((g) => g.id === selectedGenerationId)?.title}
            </CardTitle>

            {/* ADDED EXPORT BUTTONS */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRegenerateDialogOpen(true)}
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Regenerate All Chapters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportMarkdown}
              >
                <FileText className="w-4 h-4 mr-2" /> .MD
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportHTML}>
                <Globe className="w-4 h-4 mr-2" /> .HTML
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="p-6 border rounded-xl bg-card hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-1">
                      Chapter {chapter.number}: {chapter.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {chapter.description}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateChapterContent(chapter)}
                      disabled={generatingChapterId === chapter.id}
                    >
                      {generatingChapterId === chapter.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Edit3 className="w-4 h-4 mr-2" />
                      )}
                      {chapter.content ? "Regenerate" : "Write Chapter"}
                    </Button>

                    {chapter.content && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setPreviewChapter(chapter)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="!w-[90vw] !max-w-[90vw] h-[90vh] overflow-y-auto flex flex-col gap-6">
                          <DialogHeader className="shrink-0 border-b pb-4">
                            <DialogTitle className="text-2xl md:text-3xl font-bold tracking-tight">
                              Chapter {chapter.number}: {chapter.title}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto pr-2 pb-8">
                            <div className="prose prose-lg dark:prose-invert max-w-none text-lg leading-relaxed space-y-4">
                              <Markdown>{chapter.content}</Markdown>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>

                {chapter.content && (
                  <div className="mt-4 text-xs text-emerald-600 font-medium">
                    ✓ Content generated ({chapter.content.length} characters)
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <BookBuilderComponentRegenerate
        isOpen={isRegenerateDialogOpen}
        onOpenChange={(open) => setIsRegenerateDialogOpen(open)}
        onConfirm={handleRegenerationFlow}
      />
    </div>
  );
}
