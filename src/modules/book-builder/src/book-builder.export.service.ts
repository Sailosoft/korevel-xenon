// book-builder.export.ts
import {
  IBookBuilderGeneration,
  IBookBuilderChapter,
} from "./book-builder.interface";
import { marked } from "marked"; // You may need to: npm install marked

export default class BookBuilderExportService {
  /**
   * Generates a single Markdown string for the entire book
   */
  static generateMarkdown(
    book: IBookBuilderGeneration,
    chapters: IBookBuilderChapter[],
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

  /**
   * Generates a self-contained HTML file with embedded CSS
   */
  static async generateHTML(
    book: IBookBuilderGeneration,
    chapters: IBookBuilderChapter[],
  ): Promise<string> {
    const mdContent = this.generateMarkdown(book, chapters);
    const htmlContent = await marked.parse(mdContent);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${book.title}</title>
    <style>
        body { 
          font-family: 'Georgia', serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 800px; 
          margin: 40px auto; 
          padding: 0 20px;
          background-color: #fdfdfd;
        }
        h1 { text-align: center; font-size: 3em; margin-bottom: 0.2em; }
        blockquote { font-style: italic; color: #666; text-align: center; border: none; margin-bottom: 3em; }
        h2 { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 2em; page-break-before: always; }
        hr { border: 0; border-top: 1px dashed #ccc; margin: 3em 0; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        @media print {
            body { margin: 0; max-width: 100%; }
            h2 { page-break-before: always; }
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
  }

  /**
   * Triggers a browser download
   */
  static downloadFile(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
