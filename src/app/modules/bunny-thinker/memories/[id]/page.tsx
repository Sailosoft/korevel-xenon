"use client";

import { useParams } from "next/navigation";
import BKMemoryDetailPage from "@/src/modules/bunny-thinker/src/memory/BKMemoryDetailPage";

export default function MemoryDetailRoute() {
  const params = useParams();
  const memoryId = params.id as string;

  return <BKMemoryDetailPage memoryId={memoryId} />;
}
