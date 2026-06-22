// BFlowFlowContext.tsx
//
// React context that provides the currently selected flow (definition) to
// all pages rendered inside the inner document shell (/bunny-flow/[id]/...).
// The definition ID is automatically captured from the URL — no manual selection needed.

"use client";

import React, { createContext, useContext } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { bflowDB } from "../database/BFlowDatabase";
import type { BFlowDefinitionEntity } from "../definition/BFlowDefinition.Types";

// ── Context Shape ──────────────────────────────────────────────────────────────

export interface BFlowFlowContextValue {
  /** The flow (definition) ID from the URL params. */
  flowId: string;
  /** The full flow (definition) entity, or null while loading. */
  flow: BFlowDefinitionEntity | null | undefined;
  /** True while the DB query is resolving. */
  isLoading: boolean;
}

const BFlowFlowContext = createContext<BFlowFlowContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export interface BFlowFlowProviderProps {
  /** The `id` param extracted from the Next.js route segment. */
  flowId: string;
  children: React.ReactNode;
}

/**
 * Fetches the flow (definition) from IndexedDB and provides it to descendants.
 * Wraps this inside `[id]/layout.tsx` so every inner page automatically has
 * access to the flow ID and entity.
 */
export function BFlowFlowProvider({
  flowId,
  children,
}: BFlowFlowProviderProps) {
  const definition = useLiveQuery(
    () => bflowDB.definitions.get(flowId),
    [flowId],
  );

  const value: BFlowFlowContextValue = {
    flowId,
    flow: definition ?? null,
    isLoading: definition === undefined,
  };

  return (
    <BFlowFlowContext.Provider value={value}>
      {children}
    </BFlowFlowContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Returns the current flow context.  Throws if used outside of a
 * `<BFlowFlowProvider>` (i.e. outside of `/modules/bunny-flow/[id]`).
 */
export function useBFlowFlow(): BFlowFlowContextValue {
  const ctx = useContext(BFlowFlowContext);
  if (!ctx) {
    throw new Error(
      "[useBFlowFlow] must be used inside a <BFlowFlowProvider> – are you rendering outside /modules/bunny-flow/[id]?",
    );
  }
  return ctx;
}
