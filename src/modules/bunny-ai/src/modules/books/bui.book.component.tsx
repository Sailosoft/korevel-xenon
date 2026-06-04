"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import BunnyDialogAction from "@/src/modules/bunny/src/dialog/BunnyDialogAction";
import { buiBookModule } from "./bui.book.module";

export default function BUIBookComponent() {
  return (
    <Bunny config={buiBookModule}>
      <BunnyForm />
      <BunnyDialogAction />
    </Bunny>
  );
}
