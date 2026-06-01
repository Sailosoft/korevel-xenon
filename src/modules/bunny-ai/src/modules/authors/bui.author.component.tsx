"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { buiAuthorModule } from "./bui.author.module";
import BunnyDialogAction from "@/src/modules/bunny/src/dialog/BunnyDialogAction";

export default function BUIAuthorComponent() {
  return (
    <Bunny config={buiAuthorModule}>
      <BunnyForm />
      <BunnyDialogAction />
    </Bunny>
  );
}
