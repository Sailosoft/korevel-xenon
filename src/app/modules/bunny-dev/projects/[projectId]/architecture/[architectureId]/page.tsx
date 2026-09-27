"use client";

import { use } from "react";
import BDArchitectureBuilderComponent from "@/src/modules/bunny-dev/modules/architecture/BDArchitectureBuilder.Component";

export default function ArchitectureWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string; architectureId: string }>;
}) {
  const { architectureId } = use(params);

  return <BDArchitectureBuilderComponent initialId={architectureId} />;
}
