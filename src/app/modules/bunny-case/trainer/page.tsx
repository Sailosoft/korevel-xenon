"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCTrainerComponent from "@/src/modules/bunny-case/src/modules/trainer/bc.trainer.component";

export default function BunnyCaseTrainerPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCTrainerComponent />
    </BCDocumentShell>
  );
}
