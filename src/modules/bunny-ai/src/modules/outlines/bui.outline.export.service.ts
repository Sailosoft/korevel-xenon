// bui.outline.export.service.ts
//
// Reuses the Books export pipeline end-to-end: an Outline is a `books` row and
// its items are chapters, so the inherited `exportToHTML` (Books engine +
// HTML templates) produces the document. Only the data loading differs — it
// reads through the outline repositories, scoped to `kind: "outline"`.
import { BUIBookExportService } from "../books/bui.book.export.service";
import type {
  BUIOutlineEntity,
  BUIOutlineItemEntity,
} from "./bui.outline.entity";
import { BUIOutlineRepository } from "./bui.outline.repository";
import { BUIOutlineChapterRepository } from "./bui.outline-chapter.repository";
import type { BUIOutlineHTMLTemplate } from "./bui.outline.export.types";

export class BUIOutlineExportService extends BUIBookExportService {
  public outlineRepo = new BUIOutlineRepository();
  private itemRepo = new BUIOutlineChapterRepository();

  /**
   * Fetches an outline and its items by id and returns a compiled HTML document
   * string using the shared Books template engine.
   */
  public async exportByOutlineId(
    outlineId: number,
    customTemplate?: BUIOutlineHTMLTemplate,
  ): Promise<string> {
    const [outline, items] = await Promise.all([
      this.outlineRepo.panelGetOne(outlineId),
      this.itemRepo.getItemsByOutline(outlineId),
    ]);

    if (!outline) {
      throw new Error(
        `Cannot export outline: Outline entity with ID ${outlineId} was not found.`,
      );
    }

    return this.exportOutlineToHTML(
      outline,
      items ?? [],
      customTemplate,
    );
  }

  /**
   * Generates a fully compiled, standalone HTML document from a pre-loaded
   * outline entity and its items, delegating to the inherited Books exporter.
   */
  public async exportOutlineToHTML(
    outline: BUIOutlineEntity,
    items: BUIOutlineItemEntity[],
    customTemplate?: BUIOutlineHTMLTemplate,
  ): Promise<string> {
    if (!outline) {
      throw new Error(
        "Cannot export outline: Target outline entity is undefined.",
      );
    }

    return this.exportToHTML(
      { ...outline, chapters: items ?? [] },
      customTemplate,
    );
  }
}
