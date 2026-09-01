// bui.book.templates.ts
import { BUI_DEFAULT_BOOK_TEMPLATE } from "./bui.book.export.default";
import { BUIBookHTMLTemplate } from "./bui.book.export.types";
import { BUIHTMLTemplateBook } from "./html-templates/bui.html-template.book";
import { BUIHTMLTemplateLaravel } from "./html-templates/bui.html-template.laravel";
import { BUIHTMLTemplateBookAI } from "./html-templates/bui.html-template.book-ai";
import { BUIHTMLTemplateFacebook } from "./html-templates/bui.html-template.facebook";
import { BUIHTMLTemplateMobile } from "./html-templates/bui.html-template.mobile";
import { BUIHTMLTemplateSleek } from "./html-templates/bui.html-template.sleek";
import { BUIHTMLTemplateSwipe } from "./html-templates/bui.html-template.swipe";

export const BUI_AVAILABLE_BOOK_TEMPLATES: BUIBookHTMLTemplate[] = [
  BUI_DEFAULT_BOOK_TEMPLATE,
  BUIHTMLTemplateSleek,
  BUIHTMLTemplateBook,
  BUIHTMLTemplateLaravel,
  BUIHTMLTemplateMobile,
  BUIHTMLTemplateSwipe,
  BUIHTMLTemplateBookAI,
  BUIHTMLTemplateFacebook,
];

export const buiBookGetTemplateOptions = () => {
  return BUI_AVAILABLE_BOOK_TEMPLATES.map((t) => ({
    label: t.description || t.name,
    value: t.name,
  }));
};
