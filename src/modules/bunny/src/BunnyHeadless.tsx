// BunnyHeadless.tsx
//
// Pure headless version of Bunny — provides only the context providers
// (AdminPanelProvider + BunnyProvider) without rendering any UI chrome
// such as Card, Header, Table, Modal, Dialog, or Toast.
//
// Use this when you need the Bunny kernel context available (e.g. for
// useBunnyKernel) but want to supply your own layout or embed components
// outside the standard admin-panel table view.
//
// Usage:
//   <BunnyHeadless config={myConfig}>
//     <MyCustomPage />
//   </BunnyHeadless>

"use client";

import type { ReactNode } from "react";
import { AdminPanelProvider } from "../../admin-panel/features/provider";
import { BunnyProvider } from "./context/BunnyContext";
import type { BunnyConfig } from "./Bunny.Interface";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface BunnyHeadlessProps<TRow, TForm> {
  children: ReactNode;
  config: BunnyConfig<TRow, TForm>;
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function BunnyHeadless<TRow, TForm>({
  children,
  config,
}: BunnyHeadlessProps<TRow, TForm>) {
  return (
    <AdminPanelProvider query={config.query} mutation={config.mutation}>
      <BunnyProvider config={config}>{children}</BunnyProvider>
    </AdminPanelProvider>
  );
}
