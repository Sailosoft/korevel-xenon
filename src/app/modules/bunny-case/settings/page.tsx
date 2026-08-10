"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCSettingsComponent from "@/src/modules/bunny-case/src/modules/settings/bc.settings.component";

export default function BunnyCaseSettingsPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCSettingsComponent />
    </BCDocumentShell>
  );
}
