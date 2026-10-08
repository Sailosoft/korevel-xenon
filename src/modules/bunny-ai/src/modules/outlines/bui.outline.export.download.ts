// bui.outline.export.download.ts
import type { BUIOutlineHTMLTemplate } from "./bui.outline.export.types";
import { BUIOutlineExportService } from "./bui.outline.export.service";

/**
 * Reusable functional action to compile an outline and trigger an immediate
 * local browser file download, dynamically named using the outline title.
 */
export async function buiOutlineExportDownload(
  outlineId: number,
  customTemplate?: BUIOutlineHTMLTemplate,
): Promise<void> {
  try {
    const exportService = new BUIOutlineExportService();

    // 1. Compile the complete standalone HTML string payload through the engine
    const compiledHtmlString = await exportService.exportByOutlineId(
      outlineId,
      customTemplate,
    );

    // 2. Read the outline title to build a safe file name
    const outline = await exportService.outlineRepo.panelGetOne(outlineId);

    const sanitizedTitle = outline?.title
      ? outline.title.replace(/[/\\?%*:|"<>\s]+/g, "_")
      : `outline_export_${outlineId}`;

    const finalFileName = `${sanitizedTitle}.html`;

    // 3. Generate a browser file blob object from the raw text string
    const blob = new Blob([compiledHtmlString], {
      type: "text/html;charset=utf-8;",
    });
    const blobUrl = URL.createObjectURL(blob);

    // 4. Mount a virtual anchor node to trigger the download lifecycle
    const virtualLink = document.createElement("a");
    virtualLink.href = blobUrl;
    virtualLink.setAttribute("download", finalFileName);

    document.body.appendChild(virtualLink);
    virtualLink.click();

    // 5. Clean up nodes and object URLs
    document.body.removeChild(virtualLink);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("The automated outline export file pipeline broke:", error);
    alert("Failed to compile the target outline into an HTML document.");
  }
}
