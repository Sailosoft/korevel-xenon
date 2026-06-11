"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { buiAuthorSkillModule } from "./bui.author-skills.module";
import SkillViewAuthors from "./bui.author-skills.view-authors.component";

export default function BUIAuthorSkillComponent() {
  return (
    <Bunny config={buiAuthorSkillModule}>
      <BunnyForm />
      <SkillViewAuthors />
    </Bunny>
  );
}
