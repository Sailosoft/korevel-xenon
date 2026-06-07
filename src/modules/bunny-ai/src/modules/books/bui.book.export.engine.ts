import Handlebars from "handlebars";
import { marked } from "marked";
import { BUIBookHTMLTemplate } from './bui.book.export.types';
import { BUIBookChapterEntity, BUIBookEntity } from './bui.book.entity';

export class BUIBookExportEngine {
  private template: BUIBookHTMLTemplate;

  constructor(template: BUIBookHTMLTemplate) {
    this.template = template;

    // Override the default Handlebars escape expression with your custom logic
    Handlebars.Utils.escapeExpression = (value: unknown): string => {
      if (value === undefined || value === null) return "";

      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
    };
  }

  /**
   * Transforms the Book data utilizing Handlebars compilation engines.
   */
  public async transformToString(
    book: BUIBookEntity,
    chapters: BUIBookChapterEntity[]
  ): Promise<string> {
    const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);

    // 1. Compile Component Templates via Handlebars
    const sidebarLinkItemTemplate = Handlebars.compile(this.template.component.sidebarLinkItem);
    const mainIndexLinkItemTemplate = Handlebars.compile(this.template.component.mainIndexLinkItem);
    const chapterHeaderTemplate = Handlebars.compile(this.template.component.chapterHeader);
    const chapterBodyWrapperTemplate = Handlebars.compile(this.template.component.chapterBodyWrapper);
    const pageFooterTemplate = Handlebars.compile(this.template.component.pageFooter);

    // 2. Build Repeating UI Link Segments
    const sidebarLinks = sortedChapters
      .map((ch) =>
        sidebarLinkItemTemplate({
          chapterNumber: ch.number,
          paddedChapterNumber: ch.number.toString().padStart(2, "0"),
          chapterTitle: ch.title,
        })
      )
      .join("");

    const mainIndexHtml = sortedChapters
      .map((ch) =>
        mainIndexLinkItemTemplate({
          chapterNumber: ch.number,
          chapterTitle: ch.title,
        })
      )
      .join("");

    // 3. Render Markdown and Structural Chapter Blocks
    const chaptersHtmlArray = await Promise.all(
      sortedChapters.map(async (ch) => {
        const sanitizedContent = (ch.content || "_Content not generated yet._")
          .replace(/\$\\rightarrow\$/g, "→")
          .replace(/\\rightarrow/g, "→");

        // Still using marked for markdown parsing
        const parsedMarkdown = await marked.parse(sanitizedContent);

        const chapterHeader = chapterHeaderTemplate({
          chapterNumber: ch.number,
          chapterTitle: ch.title,
        });

        return chapterBodyWrapperTemplate({
          chapterNumber: ch.number,
          chapterHeader: chapterHeader,
          parsedContent: parsedMarkdown,
        });
      })
    );

    // 4. Compile Layout Templates via Handlebars
    const sidebarContainerTemplate = Handlebars.compile(this.template.layout.sidebarContainer);
    const mainHeaderWrapperTemplate = Handlebars.compile(this.template.layout.mainHeaderWrapper);
    const articleContainerTemplate = Handlebars.compile(this.template.layout.articleContainer);
    const mainContentWrapperTemplate = Handlebars.compile(this.template.layout.mainContentWrapper);
    const documentShellTemplate = Handlebars.compile(this.template.layout.documentShell);

    // 5. Assemble layout wrapper nesting tree
    const sidebarContainer = sidebarContainerTemplate({
      sidebarLinks: sidebarLinks,
    });

    const mainHeaderWrapper = mainHeaderWrapperTemplate({
      bookTitle: book.title,
      mainIndexHtml: mainIndexHtml,
    });

    const articleContainer = articleContainerTemplate({
      chaptersHtml: chaptersHtmlArray.join(""),
    });

    const pageFooter = pageFooterTemplate({
      currentYear: new Date().getFullYear(),
    });

    const mainContentWrapper = mainContentWrapperTemplate({
      mainHeaderWrapper: mainHeaderWrapper,
      articleContainer: articleContainer,
      pageFooter: pageFooter,
    });

    // 6. Injects layouts and global items into top level document shell
    return documentShellTemplate({
      bookTitle: book.title,
      globalAssets: {
        typographyFonts: this.template.globalAsset.typographyFonts,
        printStyles: this.template.globalAsset.printStyles,
      },
      sidebarContainer: sidebarContainer,
      mainContentWrapper: mainContentWrapper,
    });
  }
}