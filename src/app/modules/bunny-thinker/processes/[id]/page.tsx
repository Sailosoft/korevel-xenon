"use client";

import { useParams } from "next/navigation";
import BKProcessDetailPage from "@/src/modules/bunny-thinker/src/process/BKProcessDetailPage";

export default function ProcessDetailRoute() {
  const params = useParams();
  const processId = params.id as string;

  return <BKProcessDetailPage processId={processId} />;
}
