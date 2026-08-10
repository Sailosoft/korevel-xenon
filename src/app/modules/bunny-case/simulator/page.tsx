"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCSimulatorComponent from "@/src/modules/bunny-case/src/modules/simulator/bc.simulator.component";

export default function BunnyCaseSimulatorPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCSimulatorComponent />
    </BCDocumentShell>
  );
}
