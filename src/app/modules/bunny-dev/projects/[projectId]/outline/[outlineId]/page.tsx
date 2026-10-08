"use client";

import { use } from "react";
import BDOutlineDetailComponent from "@/src/modules/bunny-dev/modules/outline/BDOutlineDetail.Component";

export default function OutlineDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; outlineId: string }>;
}) {
  const { outlineId } = use(params);

  return <BDOutlineDetailComponent outlineId={outlineId} />;
}
