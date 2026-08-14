"use client";

import React from "react";
import { BSVideoLibrary } from "@/src/modules/bunny-studio/src/modules/video-generator/BSVideoLibrary.Component";

export default function BunnyStudioVideoLibraryRoute() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <BSVideoLibrary />
      </div>
    </div>
  );
}
