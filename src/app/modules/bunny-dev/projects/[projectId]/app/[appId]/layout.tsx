"use client";

import { Suspense, use } from "react";
import BDModuleLayout from "@/src/modules/bunny-dev/modules/shell/BDModuleLayout";

interface AppWorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string; appId: string }>;
}

export default function AppWorkspaceLayout({
  children,
  params,
}: AppWorkspaceLayoutProps) {
  const { projectId } = use(params);

  return (
    <Suspense fallback={null}>
      <BDModuleLayout projectId={projectId} feature="app">
        {children}
      </BDModuleLayout>
    </Suspense>
  );
}
