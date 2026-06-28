"use client";

import { useParams } from "next/navigation";
import BKThoughtDetailPage from "@/src/modules/bunny-thinker/src/pages/BKThoughtDetailPage";

export default function ThoughtDetailRoute() {
  const params = useParams();
  const thoughtId = params.id as string;

  return <BKThoughtDetailPage thoughtId={thoughtId} />;
}
