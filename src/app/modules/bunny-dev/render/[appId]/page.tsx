"use client";

import { use } from "react";
import BDAppRenderingComponent from "@/src/modules/bunny-dev/modules/app-builder/BDAppRendering.Component";

export default function RenderAppPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = use(params);

  return <BDAppRenderingComponent appId={appId} embedded={false} standalone />;
}
