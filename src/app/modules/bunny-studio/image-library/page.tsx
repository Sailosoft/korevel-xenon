"use client";

import React from "react";
import { BSImageLibrary } from "@/src/modules/bunny-studio/src/modules/image-generator/BSImageLibrary.Component";

export default function BunnyStudioImageLibraryRoute() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <BSImageLibrary />
      </div>
    </div>
  );
}
