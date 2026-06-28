"use client";

import { useParams } from "next/navigation";
import BKThinkDetailPage from "@/src/modules/bunny-thinker/src/pages/BKThinkDetailPage";

export default function ThinkDetailRoute() {
  const params = useParams();
  const thinkId = params.id as string;

  return <BKThinkDetailPage thinkId={thinkId} />;
}
