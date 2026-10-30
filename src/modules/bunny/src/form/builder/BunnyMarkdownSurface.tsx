"use client";

import dynamic from "next/dynamic";
import type { BunnyMarkdownSurfaceProps } from "./BunnyMarkdownSurface.impl";

const BunnyMarkdownSurfaceImpl = dynamic(
  () => import("./BunnyMarkdownSurface.impl"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] animate-pulse rounded-md bg-default-100" />
    ),
  },
);

export default function BunnyMarkdownSurface(props: BunnyMarkdownSurfaceProps) {
  return <BunnyMarkdownSurfaceImpl {...props} />;
}
