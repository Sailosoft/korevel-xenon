"use client";

import BFlowDefinitionComponent from "@/src/modules/bunny-flow/src/definition/BFlowDefinition.Component";

export const dynamic = "force-dynamic";

export default function DefinitionsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <BFlowDefinitionComponent />
    </div>
  );
}
