// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Core Types, Adapter Interface, and Render Format Definitions
//
// This module is standalone with zero dependencies on other modules.
// It uses an adapter pattern so new rendering strategies can be added dynamically.
// ───────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import type { Components } from "react-markdown";

// ─── Render Format Enum ──────────────────────────────────────────────────────

/**
 * Supported render formats.
 * This is a const array for runtime iteration; the type is derived from it.
 */
export const RenderFormats = [
  "markdown",
  "mermaid",
  "mindmap",
  "csv",
  "tailwind",
  "html",
  "plain",
  "json",
  "yaml",
] as const;

/** Union type of all built-in render formats */
export type RenderFormat = (typeof RenderFormats)[number];

// ─── Render Options ──────────────────────────────────────────────────────────

/** Generic options passed to every adapter render method */
export interface RenderOptions {
  /** CSS class name to apply to the root wrapper element */
  className?: string;
  /** Whether to enable dark mode for rendering */
  darkMode?: boolean;
  /** Maximum height for scrollable content (e.g. "600px") */
  maxHeight?: string;
  /** Additional format-specific options passthrough */
  [key: string]: unknown;
}

// ─── Render Result ──────────────────────────────────────────────────────────

/**
 * Result object returned by `renderHtml()` on every adapter.
 * The `html` property is a fully-formed HTML fragment (not a full document)
 * that can be embedded into the export shell.
 */
export interface RenderHtmlResult {
  /** The original raw input content */
  raw: string;
  /** The processed HTML fragment suitable for embedding */
  html: string;
  /** The format that produced this result */
  format: RenderFormat;
  /** Optional metadata extracted during processing (e.g. image URLs) */
  meta?: Record<string, unknown>;
}

// ─── Render Adapter Interface ───────────────────────────────────────────────

/**
 * A render adapter knows how to transform content of a specific format into
 * an HTML fragment for export / server-side rendering.
 *
 * React rendering is handled by the View component layer, which reads the
 * adapter's processed data and renders it using format-specific React components.
 *
 * To add a new render format:
 * 1. Implement this interface
 * 2. Register it with `RenderRegistry.register()`
 * 3. Add a rendering case in the View component (if React rendering is needed)
 */
export interface RenderAdapter {
  /** The format identifier this adapter handles */
  format: RenderFormat;

  /**
   * Render content as an HTML string fragment suitable for export,
   * embedding into a standalone HTML document, or SSR.
   */
  renderHtml(content: string, options?: RenderOptions): RenderHtmlResult;

  /**
   * Optional display name shown in UI pickers (e.g. "Markdown", "Mermaid Diagram").
   * Falls back to the format identifier if not provided.
   */
  displayName?: string;

  /**
   * Optional description shown in tooltips or help panels.
   */
  description?: string;
}

// ─── Registry Entry ─────────────────────────────────────────────────────────

/** Internal wrapper stored in the registry */
export interface RenderRegistryEntry {
  adapter: RenderAdapter;
  registeredAt: number;
  /** Optional identifier for the module that registered this adapter */
  sourceModule?: string;
}

// ─── Render Engine Options ──────────────────────────────────────────────────

/** Options passed to `RenderEngine.render()` */
export interface RenderEngineOptions {
  /** Preferred format to render */
  format: RenderFormat;
  /** The raw content to render */
  content: string;
  /** Additional rendering options */
  options?: RenderOptions;
}

// ─── Render Engine Result ───────────────────────────────────────────────────

/** Result from RenderEngine.renderHtml() */
export interface RenderEngineHtmlResult {
  html: RenderHtmlResult;
  adapter: RenderAdapter;
}

// ─── React Component Props ──────────────────────────────────────────────────

/** Props for the RenderView component */
export interface RenderTableColors {
  /** Background colour for table header cells */
  headerBackground?: string;
  /** Text colour for table header cells */
  headerColor?: string;
  /** Border colour for all table cells */
  border?: string;
  /** Text colour for body cells */
  cellColor?: string;
  /** Background colour for alternating rows */
  rowAlternateBackground?: string;
}

/** Props for the RenderView component */
export interface RenderViewProps {
  /** The format to render */
  format: RenderFormat;
  /** Raw content to render */
  content: string;
  /** Optional CSS class name */
  className?: string;
  /** Additional rendering options */
  options?: RenderOptions;
  /** Fallback content shown when no adapter is found */
  fallback?: ReactNode;
  /**
   * Optional ReactMarkdown component overrides.
   *
   * Use this to theme markdown rendering for a specific host module.
   * When omitted, RenderView falls back to a neutral, generic default theme.
   */
  markdownComponents?: Components;
  /**
   * Optional colour overrides for the CSV/table renderer.
   *
   * When omitted, RenderView uses the same neutral palette as the default
   * markdown theme.
   */
  tableColors?: RenderTableColors;
}

// ─── Render Option Item (for UI pickers) ────────────────────────────────────

/**
 * A display-ready item describing a registered render format.
 * Used by `useRenderOptions()` and `RenderOptionsSelect` to build UI pickers.
 */
export interface RenderOptionItem {
  /** The format identifier */
  format: RenderFormat;
  /** Human-readable name (e.g. "Markdown", "Mermaid Diagram") */
  displayName: string;
  /** Short description of what this format does */
  description: string;
  /** Whether this is a built-in adapter or registered by a module */
  isBuiltin: boolean;
  /** Which module registered this adapter (undefined for built-in) */
  sourceModule?: string;
}
