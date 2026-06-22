"use client";

import { use } from "react";
import BFlowRunComponent from "@/src/modules/bunny-flow/src/run/BFlowRun.Component";

interface PipelineRunPageProps {
  params: Promise<{
    id: string;
    pipelineId: string;
  }>;
}

export default function FlowScopedPipelineRunPage({
  params,
}: PipelineRunPageProps) {
  // The BFlowRunComponent uses useParams() internally,
  // which resolves the nearest [pipelineId] segment from the URL.
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <BFlowRunComponent />
    </div>
  );
}
