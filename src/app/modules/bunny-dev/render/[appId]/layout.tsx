"use client";

// Standalone application layout — viewport-filling, non-scrolling so the SPA
// shell inside owns all scrolling. Theme vars / data-bd-theme are applied by
// the shell component, not here.

export default function RenderAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-dvh overflow-hidden bg-[#f4f7fb]">{children}</div>;
}
