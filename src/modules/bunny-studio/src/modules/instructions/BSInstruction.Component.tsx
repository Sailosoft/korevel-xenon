// BSInstruction.Component — Instructions page rendered through Bunny.

"use client";

import React from "react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bsInstructionModule } from "./BSInstruction.Module";

export function BSInstructionComponent() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Bunny config={bsInstructionModule}>
          <BunnyForm />
        </Bunny>
      </div>
    </div>
  );
}

export default BSInstructionComponent;
