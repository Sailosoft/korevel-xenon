"use client";

// ThinkStudioRoute — Anonymous Think Studio route.
// Renders BKThinkStudio without a thinkId, triggering anonymous mode.

import BKThinkStudio from "@/src/modules/bunny-thinker/src/think-studio/BKThinkStudio";

export default function ThinkStudioRoute() {
  return (
    <div className="space-y-6">
      <BKThinkStudio />
    </div>
  );
}
