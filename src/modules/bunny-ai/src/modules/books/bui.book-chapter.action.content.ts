// bui.book-chapter.actions.ts
import { BUIBookChapterRepository } from "./bui.book-chapter.repository";
import { BUIBookRepository } from "./bui.book.repository";
import BUIAuthorRepository from "../authors/bui.author.repository";
import { buiChapterServerGenerate } from "./bui.book-chapter.server";
import { BUIBookChapterParams } from "./bui.book.entity";
import { buiChapterServerContent } from "./bui.book-chapter.server.content";
import { BUIAIOption } from "../../modules/ai/bui.ai.interface";
import BUIAuthorSkillRelationRepository from "../author-skills/bui.author-skills.relation.repository";
import { BUIAuthorSkill } from "../author-skills/bui.author-skills.entity";

/**
 * Reusable client/shared operational script to gather context,
 * handle state updates, trigger AI actions, and commit content to the DB.
 */
export async function generateChapterContentAction(
  chapterId: number,
  promptType: string = "default",
  aiConfig?: BUIAIOption,
  useAuthorSkills: boolean = false,
) {
  const chapterRepo = new BUIBookChapterRepository();
  const bookRepo = new BUIBookRepository();
  const authorRepo = new BUIAuthorRepository();
  const skillRelationRepo = new BUIAuthorSkillRelationRepository();

  // 1. Fetch current chapter details
  const chapter = await chapterRepo.panelGetOne(chapterId);
  if (!chapter || !chapter.bookId) {
    throw new Error(
      `Chapter matching ID ${chapterId} or its Book relationship does not exist.`,
    );
  }

  // 2. Optimistic UI update: Set status to triggering transition
  await chapterRepo.panelUpdate(chapterId, {
    ...chapter,
    status: "being_generated",
  });

  try {
    // 3. Assemble full book matrix data requirements concurrently
    const [book, allChapters] = await Promise.all([
      bookRepo.panelGetOne(chapter.bookId),
      chapterRepo.getChaptersByBook(chapter.bookId),
    ]);

    let authorName = "Expert Professional";
    let authorDesc = "Experienced writer.";
    let authorId: number | undefined;

    if (book?.authorId) {
      const authorResult = await authorRepo.getList({});
      if (authorResult.isSuccess) {
        const matchingAuthor = authorResult.value.find(
          (auth) => auth.id === book.authorId,
        );
        if (matchingAuthor) {
          authorName = matchingAuthor.name;
          authorDesc = matchingAuthor.description || "";
          authorId = matchingAuthor.id;
        }
      }
    }

    // 4a. Fetch author skills if requested
    let skills: BUIAuthorSkill[] = [];
    if (useAuthorSkills && authorId) {
      skills = await skillRelationRepo.getSkillsByAuthor(authorId);
    }

    // 4b. Transform into prompt-ready properties
    const promptPayload: BUIBookChapterParams = {
      author: { name: authorName, description: authorDesc },
      book: {
        title: book?.title || "Untitled Blueprint Book",
        chapters: allChapters.map((ch) => ({
          number: ch.number,
          title: ch.title,
          description: ch.description || "",
        })),
      },
      currentChapter: {
        number: chapter.number,
        title: chapter.title,
        description: chapter.description || "",
        additionalPrompt: chapter.additionalPrompt || "",
      },
      skills: skills.length > 0 ? skills : undefined,
    };

    // 5. Invoke Server Action
    const result = await buiChapterServerContent(
      promptPayload,
      promptType,
      aiConfig,
    );

    if (result && result.success) {
      // Compute accurate absolute word total
      const rawText = result.content;
      const computedWordCount = rawText
        ? rawText.split(/\s+/).filter(Boolean).length
        : 0;

      // 6. Finalize transaction into the collection
      const finalRecord = {
        ...chapter,
        content: rawText,
        wordCount: computedWordCount,
        status: "done" as const,
      };

      await chapterRepo.panelUpdate(chapterId, finalRecord);
      return { success: true, record: finalRecord };
    } else {
      throw new Error("Empty payload returned from AI context pipeline.");
    }
  } catch (error) {
    console.error(
      `Pipeline failure handling Chapter ${chapter.number}:`,
      error,
    );

    // Fallback status reset on unexpected breakdown
    await chapterRepo.panelUpdate(chapterId, {
      ...chapter,
      status: "empty",
    });
    throw error;
  }
}
