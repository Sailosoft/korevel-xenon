"use client";

// BDProject.Context — exposes the active project to the project workspace.

import { createContext, useContext, type ReactNode } from "react";
import type { BDProject } from "../../BDDomain.Types";
import { useBDProject } from "./BDProject.Hooks";

export interface BDProjectContextValue {
  projectId: string;
  /** undefined = loading, null = not found, otherwise the project. */
  project: BDProject | null | undefined;
  isLoading: boolean;
  isMissing: boolean;
}

const BDProjectContext = createContext<BDProjectContextValue | null>(null);

export function BDProjectProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const project = useBDProject(projectId);

  return (
    <BDProjectContext.Provider
      value={{
        projectId,
        project,
        isLoading: project === undefined,
        isMissing: project === null,
      }}
    >
      {children}
    </BDProjectContext.Provider>
  );
}

export function useBDProjectContext(): BDProjectContextValue {
  const ctx = useContext(BDProjectContext);
  if (!ctx) {
    throw new Error("useBDProjectContext must be used within BDProjectProvider");
  }
  return ctx;
}
