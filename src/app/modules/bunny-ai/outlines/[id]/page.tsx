import BUIOutlineChapterComponent from "@/src/modules/bunny-ai/src/modules/outlines/bui.outline-chapter.component";

interface OutlinePageProps {
  params: Promise<{ id: string }>;
}

export default async function OutlineDetailPage({ params }: OutlinePageProps) {
  // Await params safely for Next.js 15/16 compatibility
  const resolvedParams = await params;
  const id = resolvedParams.id;

  return <BUIOutlineChapterComponent outlineId={Number(id)} />;
}
