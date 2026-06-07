import React, { createContext, useContext, ReactNode } from "react";
import { BunnyConfig } from "../Bunny.Interface";

interface BunnyContextType<TRow = unknown, TForm = unknown> {
  config: BunnyConfig<TRow, TForm>;
}

const BunnyContext = createContext<BunnyContextType<unknown, unknown> | null>(null);

export function BunnyProvider<TRow = unknown, TForm = unknown>({
  config,
  children,
}: {
  config: BunnyConfig<TRow, TForm>;
  children: ReactNode;
}) {
  return (
    <BunnyContext.Provider value={{ config } as BunnyContextType<unknown, unknown>}>{children}</BunnyContext.Provider>
  );
}

export function useBunnyConfig<TRow = unknown, TForm = unknown>() {
  const context = useContext(BunnyContext) as BunnyContextType<TRow, TForm>;

  if (!context) {
    throw new Error("useBunnyConfig must be used within a BunnyProvider");
  }

  return context.config;
}
