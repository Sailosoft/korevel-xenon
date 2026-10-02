"use client";

// Standalone application layout — no bunny-dev shell, just the rendered app on
// a neutral canvas.

export default function RenderAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f7fb] p-4 md:p-6">{children}</div>
  );
}
