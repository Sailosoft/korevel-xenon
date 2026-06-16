"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowReportModule } from "./BFlowReport";

export default function BFlowReportComponent() {
  return (
    <Bunny config={bflowReportModule}>
      <BunnyForm />
    </Bunny>
  );
}
