import BUIBookChapterComponent from "@/src/modules/bunny-ai/src/modules/books/bui.book-chapter.component";


interface BookPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookDetailPage({ params }: BookPageProps) {
  // Await params safely for Next.js 15/16 compatibility
  const resolvedParams = await params;
  const id = resolvedParams.id; 
  
  return (
    <BUIBookChapterComponent bookId={Number(id)} />
  )
}