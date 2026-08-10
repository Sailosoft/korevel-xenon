"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCAnalyticsComponent from "@/src/modules/bunny-case/src/modules/analytics/bc.analytics.component";

export default function BunnyCaseAnalyticsPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCAnalyticsComponent />
    </BCDocumentShell>
  );
}
