"use client";

import { useParams } from "next/navigation";
import BKPatternDetailPage from "@/src/modules/bunny-thinker/src/thought-pattern/BKPatternDetailPage";

export default function PatternDetailRoute() {
  const params = useParams();
  const patternId = params.id as string;

  return <BKPatternDetailPage patternId={patternId} />;
}
