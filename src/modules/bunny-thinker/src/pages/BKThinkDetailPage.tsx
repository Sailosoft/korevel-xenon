"use client";

import React from "react";
import BKThinkStudio from "../think-studio/BKThinkStudio";

export default function BKThinkDetailPage({ thinkId }: { thinkId: string }) {
  return (
    <div className="space-y-6">
      <BKThinkStudio thinkId={thinkId} />
    </div>
  );
}
