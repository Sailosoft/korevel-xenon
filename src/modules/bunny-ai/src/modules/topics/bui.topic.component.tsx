"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { buiTopicModule } from "./bui.topic.module";

export default function BUITopicComponent() {
  return (
    <Bunny config={buiTopicModule}>
      <BunnyForm />
    </Bunny>
  );
}
