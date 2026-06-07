// bui.book.export.service.ts
import { BUIBookEntity, BUIBookChapterEntity } from "./bui.book.entity"; //
import { BUIBookExportEngine } from "./bui.book.export.engine"; //
import { BUI_DEFAULT_BOOK_TEMPLATE } from "./bui.book.export.default"; //
import { BUIBookHTMLTemplate } from "./bui.book.export.types"; //
import { BUIBookRepository } from "./bui.book.repository"; //
import { BUIBookChapterRepository } from "./bui.book-chapter.repository"; //

export class BUIBookExportService {
  public bookRepo = new BUIBookRepository(); //
  private chapterRepo = new BUIBookChapterRepository(); //

  /**
   * Fetches a book and its chapters by its ID and returns a compiled HTML document string.
   * * @param bookId The database identifier of the book record to export.
   * @param customTemplate Optional design variations matching the template interface rules.
   * @returns A Promise resolving to the finished HTML document string.
   */
  public async exportByBookId(
    bookId: number,
    customTemplate?: BUIBookHTMLTemplate
  ): Promise<string> {
    // 1. Fetch both the book entity and its chapters collection concurrently
    const [book, chapters] = await Promise.all([
      this.bookRepo.panelGetOne(bookId), //
      this.chapterRepo.getChaptersByBook(bookId), //
    ]);

    if (!book) {
      throw new Error(`Cannot export book: Book entity with ID ${bookId} was not found.`); //
    }

    // 2. Attach the fetched chapters directly to the domain entity model references
    const fullyPopulatedBook: BUIBookEntity = {
      ...book,
      chapters: chapters || [], //
    };

    // 3. Delegate to the core export mapping mechanism
    return this.exportToHTML(fullyPopulatedBook, customTemplate); //
  }

  /**
   * Generates a fully compiled, standalone HTML document string from a pre-loaded book entity.
   * * @param book The domain book entity containing metadata and chapter items.
   * @param customTemplate Optional design variations matching the template interface rules.
   * @returns A Promise resolving to the finished HTML document string text.
   */
  public async exportToHTML(
    book: BUIBookEntity, //
    customTemplate?: BUIBookHTMLTemplate //
  ): Promise<string> {
    if (!book) {
      throw new Error("Cannot export book: Target book entity profile is undefined."); //
    }

    // Map core fields to the internal engine generator contract
    const generationPayload: BUIBookEntity = { //
      title: book.title || "Untitled Document", //
      description: book.description || "" //
    };

    const sourceChapters = book.chapters || []; //

    // Map database domain records cleanly into structured properties
    const mappedChapters: BUIBookChapterEntity[] = sourceChapters.map((ch: BUIBookChapterEntity) => ({ //
      number: typeof ch.number === 'number' ? ch.number : 0, //
      title: ch.title || `Chapter ${ch.number}`, //
      content: ch.content || "_Content not generated yet._", //
    }));

    // Select the custom template variations or fall back directly to the base global defaults
    const activeTemplate = customTemplate || BUI_DEFAULT_BOOK_TEMPLATE; //

    // Initialize the rendering engine wrapper
    const engine = new BUIBookExportEngine(activeTemplate); //

    // Execute string interpolations and markdown parsers
    return await engine.transformToString(generationPayload, mappedChapters); //
  }
}