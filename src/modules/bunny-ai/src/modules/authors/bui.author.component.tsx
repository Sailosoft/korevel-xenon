"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { buiAuthorModule } from "./bui.author.module";

export default function BUIAuthorComponent() {
  return (
    <Bunny config={buiAuthorModule}>
      <BunnyForm />
    </Bunny>
  );
}
