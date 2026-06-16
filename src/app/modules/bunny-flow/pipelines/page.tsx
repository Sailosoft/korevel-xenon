"use client";

import BFlowPipelineComponent from "@/src/modules/bunny-flow/src/pipeline/BFlowPipeline.Component";

export const dynamic = "force-dynamic";

export default function PipelinesPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <BFlowPipelineComponent />
    </div>
  );
}
