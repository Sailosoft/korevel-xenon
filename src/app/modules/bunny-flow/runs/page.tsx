"use client";

import BFlowRunsList from "@/src/modules/bunny-flow/src/runs/BFlowRunsList.Component";

export default function RunsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <BFlowRunsList />
    </div>
  );
}
