"use client";

import { Suspense, use } from "react";
import BDModuleLayout from "@/src/modules/bunny-dev/modules/shell/BDModuleLayout";

interface SchemaGroupLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string; groupId: string }>;
}

export default function SchemaGroupLayout({
  children,
  params,
}: SchemaGroupLayoutProps) {
  const { projectId } = use(params);

  return (
    <Suspense fallback={null}>
      <BDModuleLayout projectId={projectId} feature="schema">
        {children}
      </BDModuleLayout>
    </Suspense>
  );
}
