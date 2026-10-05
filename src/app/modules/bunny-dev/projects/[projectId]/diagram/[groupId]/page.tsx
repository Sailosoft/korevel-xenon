"use client";

import { use } from "react";
import BDDiagramListComponent from "@/src/modules/bunny-dev/modules/diagram-builder/BDDiagrams.Component";

export default function DiagramGroupPage({
  params,
}: {
  params: Promise<{ projectId: string; groupId: string }>;
}) {
  const { groupId } = use(params);

  return <BDDiagramListComponent groupId={groupId} />;
}
