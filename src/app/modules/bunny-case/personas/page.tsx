"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCPersonaComponent from "@/src/modules/bunny-case/src/modules/persona-architect/bc.persona.component";

export default function BunnyCasePersonasPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCPersonaComponent />
    </BCDocumentShell>
  );
}
