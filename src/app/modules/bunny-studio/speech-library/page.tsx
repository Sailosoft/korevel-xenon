"use client";

import React from "react";
import { BSSpeechLibrary } from "@/src/modules/bunny-studio/src/modules/speech-generator/BSSpeechLibrary.Component";

export default function BunnyStudioSpeechLibraryRoute() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <BSSpeechLibrary />
      </div>
    </div>
  );
}
