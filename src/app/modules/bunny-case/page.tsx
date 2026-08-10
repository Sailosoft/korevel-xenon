"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCCaseDashboard from "@/src/modules/bunny-case/src/modules/dashboard/bc.case.dashboard";

export default function BunnyCasePage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCCaseDashboard />
    </BCDocumentShell>
  );
}
