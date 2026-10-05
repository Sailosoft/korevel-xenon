import Handlebars from "handlebars";
import { Marked } from "marked";
import markedKatex from "marked-katex-extension";
import { BUIBookHTMLTemplate } from './bui.book.export.types';
import { BUIBookChapterEntity, BUIBookEntity } from './bui.book.entity';

const BUI_KATEX_ASSETS = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css">
<style>.katex-display{overflow-x:auto;overflow-y:hidden;}</style>`;

const buiMarked = new Marked(markedKatex({ throwOnError: false, strict: "ignore" }));

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
   * Derives a short plain-text excerpt from raw markdown chapter content.
   */
  private buildExcerpt(content?: string, maxLength = 160): string {
    if (!content) return "";

    const plain = content
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s{0,3}>\s?/gm, "")
      .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, "")
      .replace(/[*_~]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (plain.length <= maxLength) return plain;
    return plain.slice(0, maxLength).trimEnd() + "…";
  }

  /**
   * De-indents math-only lines so `marked` does not parse them as indented code
   * blocks (KaTeX auto/block rules only match at the start of a line). Fenced
   * code blocks are left untouched.
   */
  private normalizeMathMarkdown(content: string): string {
    let inFence = false;

    return content
      .split("\n")
      .map((line) => {
        if (/^\s*(```|~~~)/.test(line)) {
          inFence = !inFence;
          return line;
        }
        if (!inFence && /^[ \t]+\$/.test(line)) {
          return line.replace(/^[ \t]+/, "");
        }
        return line;
      })
      .join("\n");
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
          chapterExcerpt: this.buildExcerpt(ch.content),
        })
      )
      .join("");

    // 3. Render Markdown and Structural Chapter Blocks
    const chaptersHtmlArray = await Promise.all(
      sortedChapters.map(async (ch) => {
        const sanitizedContent = ch.content || "_Content not generated yet._";

        // Parse markdown with KaTeX math support (pre-rendered to static HTML)
        const parsedMarkdown = await buiMarked.parse(
          this.normalizeMathMarkdown(sanitizedContent)
        );

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
      bookTitle: book.title,
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
      bookTitle: book.title,
      mainHeaderWrapper: mainHeaderWrapper,
      articleContainer: articleContainer,
      pageFooter: pageFooter,
    });

    // 6. Injects layouts and global items into top level document shell
    const html = documentShellTemplate({
      bookTitle: book.title,
      globalAssets: {
        typographyFonts: this.template.globalAsset.typographyFonts,
        printStyles: this.template.globalAsset.printStyles,
      },
      sidebarContainer: sidebarContainer,
      mainContentWrapper: mainContentWrapper,
    });

    // 7. Inject KaTeX stylesheet so pre-rendered math displays correctly
    return html.includes("</head>")
      ? html.replace("</head>", `${BUI_KATEX_ASSETS}</head>`)
      : BUI_KATEX_ASSETS + html;
  }
}