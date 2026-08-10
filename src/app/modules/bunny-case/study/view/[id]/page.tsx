"use client";

import { use } from "react";
import BCDocumentShell from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell";
import { BC_SHELL_CONFIG } from "@/src/modules/bunny-case/src/modules/document-shell/bc.document-shell.config";
import { BCStudyViewComponent } from "@/src/modules/bunny-case/src/modules/study";

interface BunnyCaseStudyViewPageProps {
  params: Promise<{ id: string }>;
}

export default function BunnyCaseStudyViewPage({
  params,
}: BunnyCaseStudyViewPageProps) {
  const { id } = use(params);
  const studyId = Number(id);

  return (
    <BCDocumentShell config={BC_SHELL_CONFIG}>
      <BCStudyViewComponent
        studyId={Number.isFinite(studyId) && studyId > 0 ? studyId : 0}
      />
    </BCDocumentShell>
  );
}
