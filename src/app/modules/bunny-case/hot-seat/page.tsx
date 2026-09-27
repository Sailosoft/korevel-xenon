"use client";

import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import BCHotSeatComponent from "@/src/modules/bunny-case/src/modules/hot-seat/bc.hot-seat.component";

export default function BunnyCaseHotSeatPage() {
  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCHotSeatComponent />
    </BCDocumentShell>
  );
}
