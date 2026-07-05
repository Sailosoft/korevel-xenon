"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LCStudio from "@/src/modules/lemon-coder/src/LCStudio";

function LemonCoderStudioContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen text-sm opacity-60">
        No project selected.{" "}
        <a href="/modules/lemon-coder" className="underline ml-1">
          Go back to landing
        </a>
      </div>
    );
  }

  return <LCStudio projectId={projectId} />;
}

export default function LemonCoderStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-sm opacity-60">
          Loading…
        </div>
      }
    >
      <LemonCoderStudioContent />
    </Suspense>
  );
}
