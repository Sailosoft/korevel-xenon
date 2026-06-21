"use client";

import { use } from "react";
import BFlowFlowAIConfigPage from "@/src/modules/bunny-flow/src/ai-config/BFlowFlowAIConfigPage";

interface FlowAIConfigRouteProps {
  params: Promise<{ id: string }>;
}

export default function FlowAIConfigRoute({ params }: FlowAIConfigRouteProps) {
  const { id } = use(params);

  return <BFlowFlowAIConfigPage flowId={id} />;
}
