"use client";

import { Suspense, use } from "react";
import BDModuleLayout from "@/src/modules/bunny-dev/modules/shell/BDModuleLayout";

interface ArchitectureWorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string; architectureId: string }>;
}

export default function ArchitectureWorkspaceLayout({
  children,
  params,
}: ArchitectureWorkspaceLayoutProps) {
  const { projectId } = use(params);

  return (
    <Suspense fallback={null}>
      <BDModuleLayout projectId={projectId} feature="architecture">
        {children}
      </BDModuleLayout>
    </Suspense>
  );
}
