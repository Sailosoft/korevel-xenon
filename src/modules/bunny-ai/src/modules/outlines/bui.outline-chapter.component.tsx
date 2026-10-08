"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { buiOutlineChapterModule } from "./bui.outline-chapter.module";
import { BUIOutlineComponentCard } from "./bui.outline.component.card";

interface BUIOutlineChapterComponentProps {
  outlineId: number;
  hideOutlineDetail?: boolean;
}

export default function BUIOutlineChapterComponent({
  outlineId,
  hideOutlineDetail,
}: BUIOutlineChapterComponentProps) {
  if (!outlineId) return <div>Invalid Outline ID</div>;

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-7xl mx-auto">
      {!hideOutlineDetail && <BUIOutlineComponentCard outlineId={outlineId} />}

      <Bunny config={buiOutlineChapterModule(outlineId)}>
        <BunnyForm />
      </Bunny>
    </div>
  );
}
