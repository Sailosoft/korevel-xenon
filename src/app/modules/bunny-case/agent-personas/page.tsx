"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCAgentPersonaComponent from "@/src/modules/bunny-case/src/modules/agent-persona/bc.agent-persona.component";

export default function BunnyCaseAgentPersonasPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCAgentPersonaComponent />
    </BCDocumentShell>
  );
}
