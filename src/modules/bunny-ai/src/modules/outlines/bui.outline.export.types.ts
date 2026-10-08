// bui.outline.export.types.ts
//
// An Outline is a `books` row (`kind: "outline"`) and its items are chapters,
// so the Outline export surface reuses the Books export contracts verbatim.
// These aliases give the outlines module its own names without duplicating the
// shared shape, keeping the two export pipelines interchangeable.
export type {
  BUIBookLayoutTemplates as BUIOutlineLayoutTemplates,
  BUIBookComponentTemplates as BUIOutlineComponentTemplates,
  BUIBookTemplateState as BUIOutlineTemplateState,
  BUIBookGlobalAssetTemplates as BUIOutlineGlobalAssetTemplates,
  BUIBookHTMLTemplate as BUIOutlineHTMLTemplate,
} from "../books/bui.book.export.types";
