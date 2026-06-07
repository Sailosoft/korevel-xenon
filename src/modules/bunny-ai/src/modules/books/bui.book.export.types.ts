export interface BUIBookLayoutTemplates {
  /** The absolute outer HTML wrapper containing <head>, body scripts, and global styles */
  documentShell: string;
  /** The navigation rail layout container (<aside>) */
  sidebarContainer: string;
  /** The main layout grid/container that constrains content width and padding */
  mainContentWrapper: string;
  /** The primary hero/title header wrapper */
  mainHeaderWrapper: string;
  /** The wrapper around the entire collection of chapters */
  articleContainer: string;
  /** The wrapper around the main content area */
}

export interface BUIBookComponentTemplates {
  /** Individual link design inside the sidebar navigation loop */
  sidebarLinkItem: string;
  /** Individual link design inside the main index/quick-routing loop */
  mainIndexLinkItem: string;
  /** Header design for chapters (e.g., Chapter number and title layout) */
  chapterHeader: string;
  /** Styling wrapper for rendered markdown text (e.g., Tailwind Typography classes) */
  chapterBodyWrapper: string;
  /** Page footer template containing copyright and closing metadata */
  pageFooter: string;
}

export interface BUIBookTemplateState extends BUIBookComponentTemplates, BUIBookLayoutTemplates {}

export interface BUIBookGlobalAssetTemplates {
  /** External font packages/stylesheets injected into the head */
  typographyFonts: string;
  /** CSS styling overrides handling print-specific media queries */
  printStyles: string;
}

export interface BUIBookHTMLTemplate {
  name: string;
  description?: string;
  layout: BUIBookLayoutTemplates;
  component: BUIBookComponentTemplates;
  globalAsset: BUIBookGlobalAssetTemplates;
}