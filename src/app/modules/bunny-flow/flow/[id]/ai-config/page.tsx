"use client";

import { use } from "react";
import BFlowFlowAIConfigPage from "@/src/modules/bunny-flow/src/ai-config/BFlowFlowAIConfigPage";

export const dynamic = "force-dynamic";

interface FlowAIConfigRouteProps {
  params: Promise<{ id: string }>;
}

export default function FlowAIConfigRoute({ params }: FlowAIConfigRouteProps) {
  const { id } = use(params);

  return <BFlowFlowAIConfigPage flowId={id} />;
}
