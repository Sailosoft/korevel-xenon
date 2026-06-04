"use client";

// import { useParams } from "next/navigation";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import BunnyDialogAction from "@/src/modules/bunny/src/dialog/BunnyDialogAction";
import { buiBookChapterModule } from "./bui.book-chapter.module";
import { BUIBookComponentCard } from "./bui.book.component.card";

interface BUIBookChapterComponentProps {
  bookId: number;
}

export default function BUIBookChapterComponent({
  bookId,
}: BUIBookChapterComponentProps) {
  // const params = useParams();
  // const bookId = Number(params.id);

  if (!bookId) return <div>Invalid Book ID</div>;

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-7xl mx-auto">
      {/* Upper HeroUI Context Layer showcasing Book details */}
      <BUIBookComponentCard bookId={bookId} />

      {/* Structured Chapters Workplace */}
      <Bunny config={buiBookChapterModule(bookId)}>
        <BunnyForm />
        <BunnyDialogAction />
      </Bunny>
    </div>
  );
}
