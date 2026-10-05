"use client";

import { use } from "react";
import BDArchitectureBuilderComponent from "@/src/modules/bunny-dev/modules/architecture/BDArchitectureBuilder.Component";

export default function ArchitectureGroupPage({
  params,
}: {
  params: Promise<{ projectId: string; groupId: string }>;
}) {
  const { groupId } = use(params);

  return <BDArchitectureBuilderComponent initialGroupId={groupId} />;
}
