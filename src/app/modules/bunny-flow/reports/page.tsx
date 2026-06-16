"use client";

import BFlowReportComponent from "@/src/modules/bunny-flow/src/report/BFlowReport.Component";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <BFlowReportComponent />
    </div>
  );
}
