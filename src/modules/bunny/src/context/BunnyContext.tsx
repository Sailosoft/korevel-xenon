import React, { createContext, useContext, ReactNode } from "react";
import { BunnyConfig } from "../Bunny.Interface";

interface BunnyContextType<TRow = any, TForm = any> {
  config: BunnyConfig<TRow, TForm>;
}

const BunnyContext = createContext<BunnyContextType<any, any> | null>(null);

export function BunnyProvider<TRow = any, TForm = any>({
  config,
  children,
}: {
  config: BunnyConfig<TRow, TForm>;
  children: ReactNode;
}) {
  return (
    <BunnyContext.Provider value={{ config }}>{children}</BunnyContext.Provider>
  );
}

export function useBunnyConfig<TRow = any, TForm = any>() {
  const context = useContext(BunnyContext) as BunnyContextType<TRow, TForm>;

  if (!context) {
    throw new Error("useBunnyConfig must be used within a BunnyProvider");
  }

  return context.config;
}
