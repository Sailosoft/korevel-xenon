"use client";

import { use } from "react";
import BDDocDetailComponent from "@/src/modules/bunny-dev/modules/docs/BDDocDetail.Component";

export default function DocDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; docId: string }>;
}) {
  const { docId } = use(params);

  return <BDDocDetailComponent docId={docId} />;
}
