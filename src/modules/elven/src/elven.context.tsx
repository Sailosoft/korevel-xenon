import { createContext } from "react";
import { ElvenContextType } from "./interfaces/elven.hooks.interface";
import useElven from "./hooks/use-elven";

export const ElvenContext = createContext<ElvenContextType | null>(null);

export const ElvenProvider = ({ children }: { children: React.ReactNode }) => {
  const context = useElven();

  if (!context) {
    throw new Error("useElvenContext must be used within an ElvenProvider");
  }

  return (
    <ElvenContext.Provider value={context}>{children}</ElvenContext.Provider>
  );
};
