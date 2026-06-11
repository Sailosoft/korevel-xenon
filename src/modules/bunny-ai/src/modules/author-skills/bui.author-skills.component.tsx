"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { buiAuthorSkillModule } from "./bui.author-skills.module";

export default function BUIAuthorSkillComponent() {
  return (
    <Bunny config={buiAuthorSkillModule}>
      <BunnyForm />
    </Bunny>
  );
}
