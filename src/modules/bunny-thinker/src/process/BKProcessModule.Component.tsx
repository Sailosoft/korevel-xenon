"use client";

// BKProcessModule.Component.tsx
//
// Standard BunnyFeature component for the Process list view.

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bkProcessModule } from "./BKProcessModule";

export default function BKProcessComponent() {
  return (
    <Bunny config={bkProcessModule}>
      <BunnyForm />
    </Bunny>
  );
}
