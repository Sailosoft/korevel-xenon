"use client";

import { use } from "react";
import BDApiDesignComponent from "@/src/modules/bunny-dev/modules/api-design/BDApiDesign.Component";

export default function ApiGroupPage({
  params,
}: {
  params: Promise<{ projectId: string; groupId: string }>;
}) {
  const { groupId } = use(params);

  return <BDApiDesignComponent initialGroupId={groupId} />;
}
