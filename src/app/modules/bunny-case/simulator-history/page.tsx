"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCSimulatorHistoryComponent from "@/src/modules/bunny-case/src/modules/simulator-history/bc.simulator-history.component";

export default function BunnyCaseSimulatorHistoryPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCSimulatorHistoryComponent />
    </BCDocumentShell>
  );
}
