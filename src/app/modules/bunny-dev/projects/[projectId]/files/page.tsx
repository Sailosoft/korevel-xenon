"use client";

import { Suspense } from "react";
import BDFileManagerComponent from "@/src/modules/bunny-dev/modules/file-management/BDFile.Manager.Component";

export default function FilesPage() {
  return (
    <Suspense fallback={null}>
      <BDFileManagerComponent />
    </Suspense>
  );
}
