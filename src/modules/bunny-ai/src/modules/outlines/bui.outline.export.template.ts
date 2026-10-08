// bui.outline.export.template.ts
//
// Outlines reuse the Books HTML templates directly — the templates under
// `../books/html-templates/*` only know about `bookTitle`, chapter links and
// chapter bodies, which an outline renders identically. Rather than fork those
// designs, the outline registry points at the Books template set.
import {
  BUI_AVAILABLE_BOOK_TEMPLATES,
  buiBookGetTemplateOptions,
} from "../books/bui.book.export.template";
import { BUI_DEFAULT_BOOK_TEMPLATE } from "../books/bui.book.export.default";
import type { BUIOutlineHTMLTemplate } from "./bui.outline.export.types";

/** Every Book HTML template is a valid Outline HTML template. */
export const BUI_AVAILABLE_OUTLINE_TEMPLATES: BUIOutlineHTMLTemplate[] =
  BUI_AVAILABLE_BOOK_TEMPLATES;

/** Outline fallback template (same default used by Books). */
export const BUI_DEFAULT_OUTLINE_TEMPLATE = BUI_DEFAULT_BOOK_TEMPLATE;

/** Select options for the outline export template picker. */
export const buiOutlineGetTemplateOptions = buiBookGetTemplateOptions;

// Explicit re-exports so outline consumers can reference the shared
// html-templates without reaching into the books module.
export { BUIHTMLTemplateBook } from "../books/html-templates/bui.html-template.book";
export { BUIHTMLTemplateBunny } from "../books/html-templates/bui.html-template.bunny";
export { BUIHTMLTemplateBookAI } from "../books/html-templates/bui.html-template.book-ai";
export { BUIHTMLTemplateSleek } from "../books/html-templates/bui.html-template.sleek";
export { BUIHTMLTemplateLaravel } from "../books/html-templates/bui.html-template.laravel";
export { BUIHTMLTemplateMobile } from "../books/html-templates/bui.html-template.mobile";
export { BUIHTMLTemplateSwipe } from "../books/html-templates/bui.html-template.swipe";
export { BUIHTMLTemplateGitHub } from "../books/html-templates/bui.html-template.github";
