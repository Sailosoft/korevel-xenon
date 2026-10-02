"use client";

import { use } from "react";
import BDAppBuilderComponent from "@/src/modules/bunny-dev/modules/app-builder/BDAppBuilder.Component";

export default function AppWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string; appId: string }>;
}) {
  const { appId } = use(params);

  return <BDAppBuilderComponent initialAppId={appId} />;
}
