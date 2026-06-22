"use client";

import { use } from "react";
import BFlowGlobalVariableDetailComponent from "@/src/modules/bunny-flow/src/global-variable/BFlowGlobalVariableDetail.Component";

interface GlobalVariableDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function GlobalVariableDetailPage({
  params,
}: GlobalVariableDetailPageProps) {
  const { id } = use(params);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <BFlowGlobalVariableDetailComponent id={id} />
    </div>
  );
}
