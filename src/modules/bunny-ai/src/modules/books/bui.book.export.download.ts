// bui.book.export.download.ts
import { BUIBookHTMLTemplate } from "./bui.book.export.types";
import { BUIBookExportService } from "./bui.book.export.service";

/**
 * Reusable functional action to compile a book and trigger an immediate local browser file download
 * dynamically named using the retrieved Book Title.
 */
export async function buiBookExportDownload(
  bookId: number,
  customTemplate?: BUIBookHTMLTemplate
): Promise<void> {
  try {
    const exportService = new BUIBookExportService();

    // 1. Compile the complete standalone HTML string payload through the engine
    const compiledHtmlString = await exportService.exportByBookId(bookId, customTemplate);

    // 2. Safely resolve the Book Profile via the internal Export Service instance to read its exact title
    const bookEntity = await exportService.bookRepo.panelGetOne(bookId);

    // Sanitize string to clean out file system character symbols while maintaining whitespace letters
    const sanitizedTitle = bookEntity?.title
      ? bookEntity.title.replace(/[/\\?%*:|"<>\s]+/g, "_")
      : `book_export_${bookId}`;

    const finalFileName = `${sanitizedTitle}.html`;

    // 3. Generate a browser file blob object from the raw text string
    const blob = new Blob([compiledHtmlString], { type: "text/html;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);

    // 4. Mount a virtual anchor node element to execute a click download lifecycle trigger
    const virtualLink = document.createElement("a");
    virtualLink.href = blobUrl;
    virtualLink.setAttribute("download", finalFileName);

    document.body.appendChild(virtualLink);
    virtualLink.click();

    // 5. Perform dynamic cleanup of DOM nodes and reference maps safely
    document.body.removeChild(virtualLink);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("The automated book export file pipeline broke:", error);
    alert("Failed to compile down target book matching title configuration.");
  }
}