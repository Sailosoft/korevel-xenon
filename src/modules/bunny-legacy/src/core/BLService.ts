/**
 * Bunny Legacy - Business Logic Service
 *
 * Orchestrates business operations between repositories and AI actions.
 * Single Responsibility: coordinates all book building operations.
 * Dependency Inversion: depends on repository abstractions, not concrete data access.
 */

import type { HelixAIOption } from "@/src/modules/helix";
import type {
  IBLAuthor,
  IBLAuthorSkill,
  IBLChapter,
  IBLGeneration,
  IBLBookOutline,
} from "./BLEntity";
import type { IBLAiChapter, IBLAiOutline, IBLAiAuthor } from "./BLInterface";
import { BLAuthorProfile, BLRegenerationMode } from "./BLEntity";
import {
  BLAuthorRepository,
  BLGenerationRepository,
  BLChapterRepository,
} from "./BLRepository";
import {
  blaiGenerateChaptersAction,
  blaiGenerateChapterContentWithContextAction,
} from "../ai/BLAIAction";

/**
 * Export service: generates Markdown and HTML for books.
 * Single responsibility: book export/formatting.
 */
export class BLExportService {
  static generateMarkdown(
    book: IBLGeneration,
    chapters: IBLChapter[],
  ): string {
    let markdown = `# ${book.title}\n\n`;
    if (book.description) markdown += `> ${book.description}\n\n---\n\n`;

    chapters
      .sort((a, b) => a.number - b.number)
      .forEach((ch) => {
        markdown += `## Chapter ${ch.number}: ${ch.title}\n\n`;
        markdown += `${ch.content || "_Content not generated yet._"}\n\n`;
        markdown += `\n---\n\n`;
      });

    return markdown;
  }

  static downloadFile(
    content: string,
    filename: string,
    contentType: string,
  ): void {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * Map IBLChapter[] to IBLAiChapter[] for AI service compatibility.
 */
function mapToBLAiChapters(chapters: IBLChapter[]): IBLAiChapter[] {
  return chapters.map((ch) => ({
    id: ch.id?.toString(),
    number: ch.number,
    title: ch.title,
    description: ch.description,
    content: ch.content,
    additionalPrompt: ch.additionalPrompt,
    generationId: ch.generationId,
  }));
}

function mapToBLAiChapter(chapter: IBLChapter): IBLAiChapter {
  return {
    id: chapter.id?.toString(),
    number: chapter.number,
    title: chapter.title,
    description: chapter.description,
    content: chapter.content,
    additionalPrompt: chapter.additionalPrompt,
    generationId: chapter.generationId,
  };
}

/**
 * Main Business Logic Service for Bunny Legacy Book Builder.
 * Encapsulates all coordinated operations.
 */
export class BLBookBuilderService {
  private readonly authorRepo: BLAuthorRepository;
  private readonly generationRepo: BLGenerationRepository;
  private readonly chapterRepo: BLChapterRepository;

  constructor(db: import("./BLRepository").BLDatabase) {
    this.authorRepo = new BLAuthorRepository(db);
    this.generationRepo = new BLGenerationRepository(db);
    this.chapterRepo = new BLChapterRepository(db);
  }

  // ─── Author Operations ───────────────────────────────────────────

  async getAllAuthors(): Promise<IBLAuthor[]> {
    return this.authorRepo.getAll();
  }

  async getAuthorSkills(authorId: number): Promise<IBLAuthorSkill[]> {
    return this.authorRepo.getSkills(authorId);
  }

  async saveAuthor(
    author: IBLAuthor,
    skills: IBLAuthorSkill[],
    existingId?: string,
  ): Promise<number> {
    const profile = new BLAuthorProfile(author.name, author.description);
    const authorData = profile.toEntity();

    let authorId: number;

    if (existingId && existingId !== "new") {
      authorId = parseInt(existingId);
      authorData.id = authorId;
      await this.authorRepo.save(authorData);
      await this.authorRepo.replaceSkills(authorId, skills);
    } else {
      authorId = await this.authorRepo.save(authorData);
      const skillsWithAuthor = skills.map((s) => ({
        ...s,
        authorId,
      })) as IBLAuthorSkill[];
      await this.authorRepo.saveSkills(skillsWithAuthor);
    }

    return authorId;
  }

  async loadAuthorData(
    id: number,
  ): Promise<{ author: IBLAuthor; skills: IBLAuthorSkill[] }> {
    const author = await this.authorRepo.getById(id);
    const skills = await this.authorRepo.getSkills(id);
    if (!author) throw new Error(`Author with id ${id} not found`);
    return { author, skills };
  }

  // ─── Generation (Book) Operations ─────────────────────────────────

  async getAllGenerations(): Promise<IBLGeneration[]> {
    return this.generationRepo.getAll();
  }

  async getGenerationById(id: number): Promise<IBLGeneration | undefined> {
    return this.generationRepo.getById(id);
  }

  async getChapters(generationId: number): Promise<IBLChapter[]> {
    return this.chapterRepo.getByGenerationId(generationId);
  }

  /**
   * Returns a map of generationId → chapter count for all chapters.
   */
  async getChapterCounts(): Promise<Record<number, number>> {
    const all = await this.chapterRepo.getAll();
    const counts: Record<number, number> = {};
    for (const ch of all) {
      counts[ch.generationId] = (counts[ch.generationId] || 0) + 1;
    }
    return counts;
  }

  async updateGeneration(id: number, title: string, description: string): Promise<void> {
    await this.generationRepo.update(id, { title, description });
  }

  async generateOutline(
    bookTitle: string,
    bookDesc: string,
    authorName: string,
    skillNames: string[],
    authorId: number,
    isBulkGenerating: boolean,
    aiConfig?: HelixAIOption,
  ): Promise<number> {
    const outlineChapters = await blaiGenerateChaptersAction(
      bookTitle,
      bookDesc,
      authorName,
      skillNames,
      aiConfig,
    );

    const generationId = await this.generationRepo.save({
      title: bookTitle,
      description: bookDesc,
      authorId,
    });

    const chaptersToSave: IBLChapter[] = outlineChapters.map((ch) => ({
      number: ch.number,
      title: ch.title,
      description: ch.description,
      generationId,
      content: "",
    }));

    await this.chapterRepo.bulkAdd(chaptersToSave);

    return generationId;
  }

  async generateChapterContent(
    chapter: IBLChapter,
    bookTitle: string,
    bookDesc: string,
    allChapters: IBLChapter[],
    authorName: string,
    authorDesc: string,
    skillNames: string[],
    aiConfig?: HelixAIOption,
  ): Promise<string> {
    const content = await blaiGenerateChapterContentWithContextAction({
      book: {
        title: bookTitle,
        description: bookDesc,
        chapters: mapToBLAiChapters(allChapters),
      },
      chapter: mapToBLAiChapter(chapter),
      author: { name: authorName, description: authorDesc },
      skills: skillNames,
      aiConfig,
    });

    return content;
  }

  async updateChapterContent(
    chapterId: number,
    content: string,
  ): Promise<void> {
    await this.chapterRepo.update(chapterId, { content });
  }

  async runAutoPipeline(
    generationId: number,
    chaptersToGenerate: IBLChapter[],
    bookTitle: string,
    bookDesc: string,
    allChapters: IBLChapter[],
    authorName: string,
    authorDesc: string,
    skillNames: string[],
    onChapterStart: (chapterId: number) => void,
    onChapterComplete: () => void,
    onError: (chapterNumber: number, error: unknown) => void,
    aiConfig?: HelixAIOption,
  ): Promise<void> {
    for (const chapter of chaptersToGenerate) {
      onChapterStart(chapter.id!);

      try {
        const content = await this.generateChapterContent(
          chapter,
          bookTitle,
          bookDesc,
          allChapters,
          authorName,
          authorDesc,
          skillNames,
          aiConfig,
        );

        await this.updateChapterContent(chapter.id!, content);
        onChapterComplete();
      } catch (e) {
        onError(chapter.number, e);
        break;
      }
    }
  }

  async getChaptersToRegenerate(
    generationId: number,
    mode: BLRegenerationMode,
  ): Promise<IBLChapter[]> {
    let chapters = await this.chapterRepo.getByGenerationId(generationId);

    if (mode === BLRegenerationMode.EMPTY) {
      chapters = chapters.filter(
        (ch) => !ch.content || ch.content.trim() === "",
      );
    }

    return chapters;
  }

  // ─── Delete Operations ────────────────────────────────────────────

  async deleteGeneration(id: number): Promise<void> {
    await this.generationRepo.delete(id);
  }

  async deleteChapter(id: number): Promise<void> {
    await this.chapterRepo.delete(id);
  }

  async deleteAllChapters(generationId: number): Promise<void> {
    await this.chapterRepo.deleteByGenerationId(generationId);
  }

  // ─── Export Operations ────────────────────────────────────────────

  exportMarkdown(
    generation: IBLGeneration,
    chapters: IBLChapter[],
  ): void {
    const content = BLExportService.generateMarkdown(generation, chapters);
    BLExportService.downloadFile(
      content,
      `${generation.title}.md`,
      "text/markdown",
    );
  }
}
