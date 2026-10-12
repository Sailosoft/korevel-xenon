"use client";

import { use } from "react";
import BDSpecBuilderComponent from "@/src/modules/bunny-dev/modules/specs/BDSpecBuilder.Component";

export default function SpecGroupPage({
  params,
}: {
  params: Promise<{ projectId: string; groupId: string }>;
}) {
  const { groupId } = use(params);

  return <BDSpecBuilderComponent initialGroupId={groupId} />;
}
