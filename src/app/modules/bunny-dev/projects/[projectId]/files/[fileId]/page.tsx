"use client";

import { Suspense, use } from "react";
import BDFileEditorPageComponent from "@/src/modules/bunny-dev/modules/file-management/BDFileEditorPage.Component";

export default function FileEditorPage({
  params,
}: {
  params: Promise<{ projectId: string; fileId: string }>;
}) {
  const { fileId } = use(params);

  return (
    <Suspense fallback={null}>
      <BDFileEditorPageComponent fileId={fileId} />
    </Suspense>
  );
}
