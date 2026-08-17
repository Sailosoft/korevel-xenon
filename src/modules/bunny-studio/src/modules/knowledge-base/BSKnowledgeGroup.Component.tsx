// BSKnowledgeGroup.Component — Knowledge Groups page rendered through Bunny.
//
// Knowledge groups organize the RAG corpus. They are created here and selected
// in chat (Chat Settings → Knowledge Base) so the assistant can answer from
// the group's indexed knowledges (feature: knowledge base tool).

"use client";

import React from "react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bsKnowledgeGroupModule } from "./BSKnowledgeGroup.Module";

export function BSKnowledgeGroupComponent() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Bunny config={bsKnowledgeGroupModule}>
          <BunnyForm />
        </Bunny>
      </div>
    </div>
  );
}

export default BSKnowledgeGroupComponent;
