"use client";

import { Suspense, use } from "react";
import BDSpecDetailComponent from "@/src/modules/bunny-dev/modules/specs/BDSpecDetail.Component";

export default function SpecDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; groupId: string; specId: string }>;
}) {
  const { groupId, specId } = use(params);

  return (
    <Suspense fallback={null}>
      <BDSpecDetailComponent groupId={groupId} specId={specId} />
    </Suspense>
  );
}
