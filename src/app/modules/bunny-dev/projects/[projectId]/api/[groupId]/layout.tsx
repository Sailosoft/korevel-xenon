"use client";

import { Suspense, use } from "react";
import BDModuleLayout from "@/src/modules/bunny-dev/modules/shell/BDModuleLayout";

interface ApiGroupLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string; groupId: string }>;
}

export default function ApiGroupLayout({
  children,
  params,
}: ApiGroupLayoutProps) {
  const { projectId } = use(params);

  return (
    <Suspense fallback={null}>
      <BDModuleLayout projectId={projectId} feature="api">
        {children}
      </BDModuleLayout>
    </Suspense>
  );
}
