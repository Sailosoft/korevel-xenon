"use client";

import { use } from "react";
import BDSchemaBuilderComponent from "@/src/modules/bunny-dev/modules/schema-builder/BDSchemaBuilder.Component";

export default function SchemaGroupPage({
  params,
}: {
  params: Promise<{ projectId: string; groupId: string }>;
}) {
  const { groupId } = use(params);

  return <BDSchemaBuilderComponent initialGroupId={groupId} />;
}
