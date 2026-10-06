// bui.outline-chapter.read-content.tsx
import BUIBookChapterReadContentModule from "../books/bui.book-chapter.read-content";

interface BUIOutlineChapterReadContentModuleProps {
  content: string;
}

export default function BUIOutlineChapterReadContentModule({
  content,
}: BUIOutlineChapterReadContentModuleProps) {
  return <BUIBookChapterReadContentModule content={content} />;
}
