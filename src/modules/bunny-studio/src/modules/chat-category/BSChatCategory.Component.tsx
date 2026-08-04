// BSChatCategory.Component — Chat Categories page rendered through Bunny.

"use client";

import React from "react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bsChatCategoryModule } from "./BSChatCategory.Module";

export function BSChatCategoryComponent() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Bunny config={bsChatCategoryModule}>
          <BunnyForm />
        </Bunny>
      </div>
    </div>
  );
}

export default BSChatCategoryComponent;
