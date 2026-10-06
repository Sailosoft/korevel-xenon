"use client";

import { use } from "react";
import BDDiagramBuilderComponent from "@/src/modules/bunny-dev/modules/diagram-builder/BDDiagramBuilder.Component";

export default function DiagramEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; groupId: string; diagramId: string }>;
}) {
  const { diagramId } = use(params);

  return <BDDiagramBuilderComponent initialDiagramId={diagramId} />;
}
