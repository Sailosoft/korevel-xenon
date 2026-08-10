"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCCaseComponent from "@/src/modules/bunny-case/src/modules/case-base/bc.case.component";

export default function BunnyCaseCasesPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCCaseComponent />
    </BCDocumentShell>
  );
}
