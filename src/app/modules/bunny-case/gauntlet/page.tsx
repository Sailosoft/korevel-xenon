"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCGauntletComponent from "@/src/modules/bunny-case/src/modules/gauntlet/bc.gauntlet.component";

export default function BunnyCaseGauntletPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCGauntletComponent />
    </BCDocumentShell>
  );
}
