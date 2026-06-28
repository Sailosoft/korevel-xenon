"use client";

import { useParams } from "next/navigation";
import BKThoughtAssociationDetailPage from "@/src/modules/bunny-thinker/src/thought-association/BKThoughtAssociationDetailPage";

export default function ThoughtAssociationDetailRoute() {
  const params = useParams();
  const associationId = params.id as string;

  return <BKThoughtAssociationDetailPage associationId={associationId} />;
}
