// bc.study.library.tsx
//
// Study Library — renders the Study Bunny CRUD module (`bcStudyModule`) to
// display the generated handbook records. The row "View" action opens the
// dedicated viewer route (`/modules/bunny-case/study/view/<id>`) and the
// header "Generate Handbook" action opens the generator
// (`/modules/bunny-case/study/generate`).

"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bcStudyModule } from "./bc.study.module";

export default function BCStudyLibraryComponent() {
  return (
    <Bunny config={bcStudyModule}>
      <BunnyForm />
    </Bunny>
  );
}
