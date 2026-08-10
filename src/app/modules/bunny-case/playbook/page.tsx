"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCPlaybookComponent from "@/src/modules/bunny-case/src/modules/playbook-library/bc.playbook.component";

export default function BunnyCasePlaybookPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCPlaybookComponent />
    </BCDocumentShell>
  );
}
