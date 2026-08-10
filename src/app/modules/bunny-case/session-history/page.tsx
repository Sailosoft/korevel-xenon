"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCSessionHistoryComponent from "@/src/modules/bunny-case/src/modules/session-history/bc.session-history.component";

export default function BunnyCaseSessionHistoryPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCSessionHistoryComponent />
    </BCDocumentShell>
  );
}
