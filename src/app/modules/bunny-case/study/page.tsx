"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import { BCStudyLibraryComponent } from "@/src/modules/bunny-case/src/modules/study";

export default function BunnyCaseStudyPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCStudyLibraryComponent />
    </BCDocumentShell>
  );
}
