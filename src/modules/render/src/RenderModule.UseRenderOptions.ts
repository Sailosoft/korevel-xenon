"use client";

// ───────────────────────────────────────────────────────────────────────────────
// Render Module — useRenderOptions Hook
//
// React hook that returns all registered render formats as `RenderOptionItem[]`,
// suitable for populating dropdowns, radio groups, or other UI pickers.
//
// Each module that registers custom adapters gets its options included
// automatically alongside the built-in ones.
//
// Usage:
// ```tsx
// const allOptions = useRenderOptions();
// // [{ format: "markdown", displayName: "Markdown", ... }, ...]
//
// // Only formats from a specific module:
// const myOptions = useRenderOptions("lemon-coder");
//
// // Only built-in formats:
// const builtins = useRenderOptions("builtin");
// ```
// ───────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { renderRegistry } from "./RenderModule.Registry";
import type { RenderOptionItem } from "./RenderModule.Types";

// ─── Notification system ────────────────────────────────────────────────────
//
// A simple counter-based notification system. Modules call `notifyRenderOptionsChanged()`
// after registering/unregistering adapters to trigger re-renders in any active hook.
//
// Alternatively, modules using `ModuleRenderer` from RenderModule.Extend get this
// automatically when they call register/unregister/dispose.

let _version = 0;
const _listeners = new Set<() => void>();

/** @internal Notify all active `useRenderOptions` hooks that the registry changed. */
export function notifyRenderOptionsChanged(): void {
  _version++;
  for (const listener of _listeners) {
    listener();
  }
}

// ─── Patch the registry to auto-notify ─────────────────────────────────────

const _origRegister = renderRegistry.register.bind(renderRegistry);
renderRegistry.register = ((adapter: any, sourceModule?: string) => {
  _origRegister(adapter, sourceModule);
  notifyRenderOptionsChanged();
}) as typeof renderRegistry.register;

const _origRegisterAll = renderRegistry.registerAll.bind(renderRegistry);
renderRegistry.registerAll = ((adapters: any[], sourceModule?: string) => {
  _origRegisterAll(adapters, sourceModule);
  notifyRenderOptionsChanged();
}) as typeof renderRegistry.registerAll;

const _origUnregister = renderRegistry.unregister.bind(renderRegistry);
renderRegistry.unregister = ((format: any) => {
  const result = _origUnregister(format);
  if (result) notifyRenderOptionsChanged();
  return result;
}) as typeof renderRegistry.unregister;

const _origClear = renderRegistry.clear.bind(renderRegistry);
renderRegistry.clear = (() => {
  _origClear();
  notifyRenderOptionsChanged();
}) as typeof renderRegistry.clear;

// ─── Built-in format list ──────────────────────────────────────────────────

const BUILTIN_FORMATS = new Set([
  "markdown",
  "mermaid",
  "csv",
  "tailwind",
  "html",
  "plain",
  "json",
]);

// ─── Snapshot computation ──────────────────────────────────────────────────

function computeOptions(): RenderOptionItem[] {
  const items: RenderOptionItem[] = [];

  for (const entry of renderRegistry.getAllEntries()) {
    items.push({
      format: entry.adapter.format,
      displayName: entry.adapter.displayName ?? entry.adapter.format,
      description: entry.adapter.description ?? "",
      isBuiltin: BUILTIN_FORMATS.has(entry.adapter.format) && !entry.sourceModule,
      sourceModule: entry.sourceModule,
    });
  }

  // Sort: built-in first in canonical order, then module-registered alphabetically
  const builtinOrder = ["markdown", "mermaid", "csv", "tailwind", "html", "plain", "json"];
  items.sort((a, b) => {
    const aIdx = builtinOrder.indexOf(a.format);
    const bIdx = builtinOrder.indexOf(b.format);
    const aBuiltin = aIdx >= 0 ? aIdx : 99;
    const bBuiltin = bIdx >= 0 ? bIdx : 99;
    if (aBuiltin !== bBuiltin) return aBuiltin - bBuiltin;
    if (a.sourceModule && b.sourceModule && a.sourceModule !== b.sourceModule) {
      return a.sourceModule.localeCompare(b.sourceModule);
    }
    return a.displayName.localeCompare(b.displayName);
  });

  return items;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Returns all registered render formats as display-ready items.
 * Re-computes when adapters are registered or unregistered.
 *
 * @param sourceModule - Optional filter:
 *   - omit / undefined: all formats
 *   - "builtin": only built-in formats
 *   - "module-name": only formats from that module
 */
export function useRenderOptions(sourceModule?: string): RenderOptionItem[] {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allItems = computeOptions();

  if (!sourceModule) return allItems;
  if (sourceModule === "builtin") {
    return allItems.filter((item) => item.isBuiltin);
  }
  return allItems.filter((item) => item.sourceModule === sourceModule);
}
