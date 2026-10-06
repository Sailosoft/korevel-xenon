"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { buiOutlineModule } from "./bui.outline.module";

export default function BUIOutlineComponent() {
  return (
    <Bunny config={buiOutlineModule}>
      <BunnyForm />
    </Bunny>
  );
}
